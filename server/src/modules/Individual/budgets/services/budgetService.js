import prisma from '../../../../config/db.js';
import { convertAmount } from '../../expenses/services/currencyService.js';

/**
 * Checks if a new expense transaction (amount/currency/date/categoryId) triggers
 * a warning (>=80%) or an exceeded (>=100%) status for Category and/or Overall Monthly Budgets.
 * 
 * @param {string} userId - The user ID
 * @param {string} categoryId - The expense category ID
 * @param {number|Decimal} amount - The amount of the new expense
 * @param {string} currency - The currency of the new expense
 * @param {Date} [transactionDate] - The date of the transaction (defaults to now)
 * @param {string} [excludeExpenseId] - Optional expense ID to exclude (used for updates)
 * @returns {Promise<object|null>} Combined alert details, or null if no alerts triggered
 */
export const checkBudgets = async (userId, categoryId, amount, currency, transactionDate = new Date(), excludeExpenseId = null) => {
  const date = new Date(transactionDate);
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  const alerts = {};

  // Fetch category and overall budgets in parallel
  const [categoryBudget, monthlyBudget, category] = await Promise.all([
    prisma.categoryBudget.findUnique({
      where: { userId_categoryId: { userId, categoryId } },
    }),
    prisma.monthlyBudget.findUnique({
      where: { userId },
    }),
    prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true, icon: true },
    }),
  ]);

  // 1. Category Budget Check
  if (categoryBudget) {
    // Get all expenses in this category for the current month
    const categoryExpenses = await prisma.expense.findMany({
      where: {
        paidById: userId,
        categoryId,
        groupId: null, // Personal expenses only
        date: { gte: startOfMonth, lte: endOfMonth },
        id: excludeExpenseId ? { not: excludeExpenseId } : undefined,
      },
      select: { amount: true, currency: true },
    });

    // Sum in-memory after converting to budget currency
    let currentCategorySpend = categoryExpenses.reduce((sum, exp) => {
      return sum + convertAmount(exp.amount, exp.currency, categoryBudget.currency);
    }, 0);

    const addedAmountInBudgetCurrency = convertAmount(amount, currency, categoryBudget.currency);
    const newCategorySpend = currentCategorySpend + addedAmountInBudgetCurrency;
    const percentUsed = (newCategorySpend / Number(categoryBudget.limit)) * 100;

    if (percentUsed >= 80) {
      const catName = category ? `${category.name} ${category.icon}` : 'Category';
      const exceededAmount = newCategorySpend - Number(categoryBudget.limit);
      alerts.categoryBudget = {
        categoryId,
        categoryName: category?.name || 'Unknown',
        categoryIcon: category?.icon || '📁',
        limit: Number(categoryBudget.limit),
        currency: categoryBudget.currency,
        currentSpend: parseFloat(newCategorySpend.toFixed(2)),
        percentUsed: parseFloat(percentUsed.toFixed(2)),
        status: percentUsed >= 100 ? 'exceeded' : 'warning',
        message: percentUsed >= 100
          ? `Monthly budget of ${categoryBudget.limit} ${categoryBudget.currency} for ${catName} exceeded by ${exceededAmount.toFixed(2)} ${categoryBudget.currency}!`
          : `You have used ${percentUsed.toFixed(2)}% of your monthly budget limit (${categoryBudget.limit} ${categoryBudget.currency}) for ${catName}.`,
      };
    }
  }

  // 2. Overall Monthly Budget Check
  if (monthlyBudget) {
    // Get all personal expenses for the current month
    const allExpenses = await prisma.expense.findMany({
      where: {
        paidById: userId,
        groupId: null, // Personal expenses only
        date: { gte: startOfMonth, lte: endOfMonth },
        id: excludeExpenseId ? { not: excludeExpenseId } : undefined,
      },
      select: { amount: true, currency: true },
    });

    // Sum in-memory after converting to overall budget currency
    let currentOverallSpend = allExpenses.reduce((sum, exp) => {
      return sum + convertAmount(exp.amount, exp.currency, monthlyBudget.currency);
    }, 0);

    const addedAmountInOverallCurrency = convertAmount(amount, currency, monthlyBudget.currency);
    const newOverallSpend = currentOverallSpend + addedAmountInOverallCurrency;
    const percentUsed = (newOverallSpend / Number(monthlyBudget.limit)) * 100;

    if (percentUsed >= 80) {
      const exceededAmount = newOverallSpend - Number(monthlyBudget.limit);
      alerts.overallBudget = {
        limit: Number(monthlyBudget.limit),
        currency: monthlyBudget.currency,
        currentSpend: parseFloat(newOverallSpend.toFixed(2)),
        percentUsed: parseFloat(percentUsed.toFixed(2)),
        status: percentUsed >= 100 ? 'exceeded' : 'warning',
        message: percentUsed >= 100
          ? `Monthly overall spend limit of ${monthlyBudget.limit} ${monthlyBudget.currency} exceeded by ${exceededAmount.toFixed(2)} ${monthlyBudget.currency}!`
          : `You have used ${percentUsed.toFixed(2)}% of your monthly overall spend limit (${monthlyBudget.limit} ${monthlyBudget.currency}).`,
      };
    }
  }

  // Return the alerts if any were triggered, otherwise null
  return Object.keys(alerts).length > 0 ? alerts : null;
};
