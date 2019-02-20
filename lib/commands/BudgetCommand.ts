import debug from 'debug';
import { ICommand } from '../interfaces/ICommand';
import { IYNAB } from '../interfaces/IYNAB';

const filterHidden = function filterHidden(list) {
  return list.filter((item) => !item.hidden);
};

const addTotalProperty = function addTotalProperty(group) {
  return { ...group, total: 0 };
}

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
      Object.keys(categoryGroups).forEach((group) => {
        const thisGroup = categoryGroups[group];
        const totalAmount = Math.abs(thisGroup.total / 1000);
        console.log(`${thisGroup.name}: ${totalAmount}`);
      });
    })
    .catch((err) => {
    });

    return true;
  }
}
