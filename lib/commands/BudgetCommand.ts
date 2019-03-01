import debug from 'debug';
import { ICommand } from '../interfaces/ICommand';
import { IYNAB } from '../interfaces/IYNAB';

const filterHidden = function filterHidden(list) {
  return list.filter((item) => !item.hidden);
};

const addTotalProperty = function addTotalProperty(group) {
  return { ...group, total: 0 };
};

const sortedCategoryGroupKeys = function sortedCategoryGroupKeys(groups: Object): string[] {
  return Object.keys(groups).sort((groupKey1, groupKey2) => {
    const group1 = groups[groupKey1];
    const group2 = groups[groupKey2];

    if (group1.total > group2.total) {
      return 1;
    }

    if (group1.total < group2.total) {
      return -1;
    }

    return 1;
  });
};

export class BudgetCommand implements ICommand {
  debug = debug('ynab-tools:budget');
  keyword = 'budget';
  ynab: IYNAB;

  constructor(ynab: IYNAB) {
    this.ynab = ynab;
  }

  run(args) {
    this.debug('run');

    const budgetId = process.env.YNAB_BUDGET;
    this.debug('Budget ID', budgetId);
    const categories = this.ynab.getCategories(budgetId);

    const categoryGroups = {};
    const categoryGroupIndex = {};
    const categoryAmounts = [];

    categories.then((categories) => {
      filterHidden(categories.data.category_groups)
        .forEach((group) => {
          categoryGroups[group.id] = addTotalProperty(group);
          filterHidden(group.categories).forEach((category) => {
            categoryGroupIndex[category.id] = category.category_group_id;
            categoryAmounts.push(this.ynab.getCategoryTransactions(budgetId, category.id, {
              query: {
                since_date: '2019-02-01',
              },
            }));
          });
        });
    }).then(() => {
      this.debug(`Waiting for ${categoryAmounts.length} promises`);
      return Promise.all(categoryAmounts)
        .then((categories) => {
          const categoryString = categories.length === 1 ? 'category' : 'categories';
          this.debug(`Totaling transactions from ${categories.length} ${categoryString}`);
          categories
            .filter((category) => category.data.transactions.length > 0)
            .forEach((category) => {
              // this.debug(category);
              // this.debug(category.data.transactions[0]);
              const transactionsTotal = category.data.transactions
                .reduce((total, transaction) => total + transaction.amount, 0);
              const categoryId = category.data.transactions[0].category_id;
              const categoryGroupId = categoryGroupIndex[categoryId];
              categoryGroups[categoryGroupId].total += transactionsTotal;
            });
        })
        .catch((err) => {
          console.error(err);
        });
    }).then(() => {
      let incomeDivision = false;
      sortedCategoryGroupKeys(categoryGroups).forEach((group) => {
        const thisGroup = categoryGroups[group];
        if (thisGroup.total === 0) {
          return;
        }
        const totalAmount = Math.abs(thisGroup.total / 1000);
        if (thisGroup.total > 0 && !incomeDivision) {
          incomeDivision = true;
          console.log('---------------------------------------');
        }
        console.log(`${thisGroup.name}: ${totalAmount}`);
      });
    })
    .catch((err) => {
    });

    return true;
  }
}
