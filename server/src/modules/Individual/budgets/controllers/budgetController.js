import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import catchAsync from '../../../../utils/catchAsync.js';
import { convertAmount } from '../../expenses/services/currencyService.js';

/**
 * @desc    Upsert (create or update) a budget for a specific category
 * @route   POST /api/budgets/category
 * @access  Private
 */
export const upsertCategoryBudget = catchAsync(async (req, res, next) => {
  const { categoryId, limit } = req.body;
  const userId = req.user.id;
  const homeCurrency = req.user.currency;

  // 1. Verify category exists and belongs to user or is default
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [
        { isDefault: true },
        { userId: userId },
      ],
    },
  });

  if (!category) {
    return next(new AppError('Category not found or access denied.', 404));
  }

  // 2. Upsert the category budget
  const budget = await prisma.categoryBudget.upsert({
    where: {
      userId_categoryId: {
        userId,
        categoryId,
      },
    },
    create: {
      userId,
      categoryId,
      limit,
      currency: homeCurrency, // Lock budget currency to user's home currency
    },
    update: {
      limit,
      currency: homeCurrency, // Update currency to user's current home currency
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      budget: {
        ...budget,
        limit: Number(budget.limit),
      },
    },
  });
});

/**
 * @desc    Delete a category budget limit
 * @route   DELETE /api/budgets/category/:categoryId
 * @access  Private
 */
export const deleteCategoryBudget = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const userId = req.user.id;

  // Check if budget exists
  const existingBudget = await prisma.categoryBudget.findUnique({
    where: {
      userId_categoryId: {
        userId,
        categoryId,
      },
    },
  });

  if (!existingBudget) {
    return next(new AppError('Category budget not found.', 404));
  }

  // Delete it
  await prisma.categoryBudget.delete({
    where: {
      userId_categoryId: {
        userId,
        categoryId,
      },
    },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * @desc    Upsert (create or update) the overall monthly spending budget
 * @route   POST /api/budgets/monthly
 * @access  Private
 */
export const upsertMonthlyBudget = catchAsync(async (req, res, next) => {
  const { limit } = req.body;
  const userId = req.user.id;
  const homeCurrency = req.user.currency;

  const monthlyBudget = await prisma.monthlyBudget.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      limit,
      currency: homeCurrency, // Lock overall budget currency to user's home currency
    },
    update: {
      limit,
      currency: homeCurrency, // Update currency to user's current home currency
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      monthlyBudget: {
        ...monthlyBudget,
        limit: Number(monthlyBudget.limit),
      },
    },
  });
});

/**
 * @desc    Delete the overall monthly budget limit
 * @route   DELETE /api/budgets/monthly
 * @access  Private
 */
export const deleteMonthlyBudget = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Check if budget exists
  const existingBudget = await prisma.monthlyBudget.findUnique({
    where: { userId },
  });

  if (!existingBudget) {
    return next(new AppError('Overall monthly budget not found.', 404));
  }

  await prisma.monthlyBudget.delete({
    where: { userId },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * @desc    Get real-time tracking summaries of all active user budgets
 * @route   GET /api/budgets
 * @access  Private
 */
export const getBudgets = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // 1. Fetch all user budgets
  const [categoryBudgets, monthlyBudget, categories] = await Promise.all([
    prisma.categoryBudget.findMany({
      where: { userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    }),
    prisma.monthlyBudget.findUnique({
      where: { userId },
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { isDefault: true },
          { userId },
        ],
      },
    }),
  ]);

  // 2. Fetch all expenses in the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const expenses = await prisma.expense.findMany({
    where: {
      paidById: userId,
      groupId: null, // Personal expenses only
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: {
      amount: true,
      currency: true,
      categoryId: true,
    },
  });

  // 3. Format Category Budgets
  const formattedCategoryBudgets = categoryBudgets.map((budget) => {
    // Filter expenses belonging to this category
    const catExpenses = expenses.filter((exp) => exp.categoryId === budget.categoryId);

    // Sum in-memory after converting to budget currency
    const totalSpend = catExpenses.reduce((sum, exp) => {
      return sum + convertAmount(exp.amount, exp.currency, budget.currency);
    }, 0);

    const percentUsed = (totalSpend / Number(budget.limit)) * 100;
    let status = 'healthy';
    if (percentUsed >= 100) {
      status = 'exceeded';
    } else if (percentUsed >= 80) {
      status = 'warning';
    }

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      categoryIcon: budget.category.icon,
      limit: Number(budget.limit),
      currency: budget.currency,
      currentSpend: parseFloat(totalSpend.toFixed(2)),
      percentUsed: parseFloat(percentUsed.toFixed(2)),
      status,
    };
  });

  // 4. Format Overall Monthly Budget
  let formattedMonthlyBudget = null;
  if (monthlyBudget) {
    // Sum all current month's expenses converted to overall budget currency
    const overallSpend = expenses.reduce((sum, exp) => {
      return sum + convertAmount(exp.amount, exp.currency, monthlyBudget.currency);
    }, 0);

    const percentUsed = (overallSpend / Number(monthlyBudget.limit)) * 100;
    let status = 'healthy';
    if (percentUsed >= 100) {
      status = 'exceeded';
    } else if (percentUsed >= 80) {
      status = 'warning';
    }

    formattedMonthlyBudget = {
      id: monthlyBudget.id,
      limit: Number(monthlyBudget.limit),
      currency: monthlyBudget.currency,
      currentSpend: parseFloat(overallSpend.toFixed(2)),
      percentUsed: parseFloat(percentUsed.toFixed(2)),
      status,
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      overallBudget: formattedMonthlyBudget,
      categoryBudgets: formattedCategoryBudgets,
    },
  });
});
