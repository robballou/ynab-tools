export interface IYNAB {
  getCategories (budgetId: string);
  getCategoryAmount (budgetId: string, categoryId: string, month?: string);
  getCategoryTransactions (budgetId: string, categoryId: string, options?: object);
}
