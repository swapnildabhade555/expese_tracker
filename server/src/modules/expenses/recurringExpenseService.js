import prisma from '../../config/db.js';

/**
 * Calculates the next due date based on the interval
 * @param {Date|string} date - Current next due date
 * @param {string} interval - DAILY, WEEKLY, MONTHLY, or YEARLY
 * @returns {Date} The advanced date
 */
export function advanceDate(date, interval) {
  const d = new Date(date);
  switch (interval) {
    case 'DAILY':
      d.setDate(d.getDate() + 1);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported recurrence interval: ${interval}`);
  }
  return d;
}

/**
 * Scan database for active recurring expenses that are due and generate standard Expense records.
 * Runs in transactions to prevent duplicate records or broken state.
 * @param {string} [userId] - Optional. If provided, processes recurring expenses only for this user.
 */
export const processRecurringExpenses = async (userId = null) => {
  try {
    const now = new Date();

    // 1. Fetch active recurring expenses that are due
    const whereClause = {
      isActive: true,
      nextDueDate: {
        lte: now,
      },
    };

    if (userId) {
      whereClause.paidById = userId;
    }

    const dueRecurringExpenses = await prisma.recurringExpense.findMany({
      where: whereClause,
    });

    if (dueRecurringExpenses.length === 0) {
      return;
    }

    console.log(`[Recurring Process] Found ${dueRecurringExpenses.length} recurring expenses to process.`);

    for (const recExpense of dueRecurringExpenses) {
      let currentDueDate = new Date(recExpense.nextDueDate);
      const expensesToCreate = [];

      // Calculate all occurrences that are due
      while (currentDueDate <= now) {
        expensesToCreate.push({
          description: recExpense.description,
          amount: recExpense.amount,
          date: new Date(currentDueDate),
          categoryId: recExpense.categoryId,
          paidById: recExpense.paidById,
          recurringExpenseId: recExpense.id,
        });

        currentDueDate = advanceDate(currentDueDate, recExpense.interval);
      }

      // Perform updates inside a transaction
      await prisma.$transaction(async (tx) => {
        // Create the individual expense entries
        if (expensesToCreate.length > 0) {
          // prisma.createMany is ideal here
          await tx.expense.createMany({
            data: expensesToCreate,
          });
        }

        // Update the template next due date
        await tx.recurringExpense.update({
          where: { id: recExpense.id },
          data: {
            nextDueDate: currentDueDate,
          },
        });
      });

      console.log(
        `[Recurring Process] Processed ${expensesToCreate.length} occurrences for recurring expense "${recExpense.description}" (ID: ${recExpense.id}). Next due date is now: ${currentDueDate.toISOString()}`
      );
    }
  } catch (error) {
    console.error('❌ Error processing recurring expenses:', error);
  }
};
