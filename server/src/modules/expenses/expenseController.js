import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { processRecurringExpenses, advanceDate } from './recurringExpenseService.js';
import { convertAmount } from './currencyService.js';

/**
 * @desc    Record a new expense
 * @route   POST /api/expenses
 * @access  Private
 */
export const createExpense = catchAsync(async (req, res, next) => {
  const { description, amount, date, categoryId, currency } = req.body;
  const userId = req.user.id;
  const homeCurrency = req.user.currency;

  // 1. Verify category exists and belongs to user (or is default)
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

  // 2. Create the expense
  const newExpense = await prisma.expense.create({
    data: {
      description,
      amount,
      currency: currency || homeCurrency,
      date: date ? new Date(date) : new Date(),
      categoryId,
      paidById: userId,
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

  res.status(201).json({
    status: 'success',
    data: {
      expense: newExpense,
    },
  });
});

/**
 * @desc    Get all user's personal expenses with filters, search, pagination, and sorting
 * @route   GET /api/expenses
 * @access  Private
 */
export const getExpenses = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const homeCurrency = req.user.currency;

  // Process any due recurring expenses before querying
  await processRecurringExpenses(userId);
  const {
    categoryId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    page,
    limit,
    sortBy,
    targetCurrency,
  } = req.query;

  const displayCurrency = targetCurrency || homeCurrency;

  // 1. Build dynamic where filter
  const where = {
    paidById: userId,
    groupId: null, // Personal expenses only (group expenses handled separately)
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount.gte = minAmount;
    if (maxAmount !== undefined) where.amount.lte = maxAmount;
  }

  if (search) {
    where.description = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // 2. Sorting logic
  let orderBy = { date: 'desc' };
  if (sortBy) {
    const [field, order] = sortBy.split(':');
    if (['date', 'amount', 'createdAt'].includes(field) && ['asc', 'desc'].includes(order)) {
      orderBy = { [field]: order };
    }
  }

  // 3. Pagination calculations
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // 4. Query DB in parallel
  const [expenses, totalCount] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
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
    prisma.expense.count({ where }),
  ]);

  res.status(200).json({
    status: 'success',
    results: expenses.length,
    meta: {
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      targetCurrency: displayCurrency,
    },
    data: {
      expenses: expenses.map((exp) => ({
        ...exp,
        amount: Number(exp.amount),
        convertedAmount: convertAmount(exp.amount, exp.currency, displayCurrency),
      })),
    },
  });
});

/**
 * @desc    Get details of a single personal expense
 * @route   GET /api/expenses/:id
 * @access  Private
 */
export const getExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const expense = await prisma.expense.findUnique({
    where: { id },
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

  if (!expense) {
    return next(new AppError('Expense not found.', 404));
  }

  // Ownership Check
  if (expense.paidById !== userId) {
    return next(new AppError('You do not have permission to view this expense.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      expense,
    },
  });
});

/**
 * @desc    Update a personal expense
 * @route   PATCH /api/expenses/:id
 * @access  Private
 */
export const updateExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { description, amount, date, categoryId } = req.body;
  const userId = req.user.id;

  // 1. Fetch expense & perform ownership guard
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    return next(new AppError('Expense not found.', 404));
  }

  if (expense.paidById !== userId) {
    return next(new AppError('You do not have permission to edit this expense.', 403));
  }

  // 2. Validate new category ownership if it is changing
  if (categoryId && categoryId !== expense.categoryId) {
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
  }

  // 3. Perform update
  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: {
      description,
      amount,
      date: date ? new Date(date) : undefined,
      categoryId,
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
      expense: updatedExpense,
    },
  });
});

/**
 * @desc    Delete a personal expense
 * @route   DELETE /api/expenses/:id
 * @access  Private
 */
export const deleteExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  // 1. Fetch expense & perform ownership guard
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    return next(new AppError('Expense not found.', 404));
  }

  if (expense.paidById !== userId) {
    return next(new AppError('You do not have permission to delete this expense.', 403));
  }

  // 2. Delete from DB
  await prisma.expense.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * @desc    Get aggregate analytics summary for user's personal expenses
 * @route   GET /api/expenses/summary
 * @access  Private
 */
export const getExpenseSummary = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const homeCurrency = req.user.currency;
  const { targetCurrency } = req.query;
  const displayCurrency = targetCurrency || homeCurrency;

  // Process any due recurring expenses before querying
  await processRecurringExpenses(userId);

  // Fetch all personal expenses
  const expenses = await prisma.expense.findMany({
    where: {
      paidById: userId,
      groupId: null,
    },
  });

  let totalAmount = 0;
  const totalCount = expenses.length;
  
  // Group and sum in memory
  const categorySums = {}; // categoryId -> { amount: 0, count: 0 }

  expenses.forEach((exp) => {
    const converted = convertAmount(exp.amount, exp.currency, displayCurrency);
    totalAmount += converted;

    if (!categorySums[exp.categoryId]) {
      categorySums[exp.categoryId] = { amount: 0, count: 0 };
    }
    categorySums[exp.categoryId].amount += converted;
    categorySums[exp.categoryId].count += 1;
  });

  // Fetch categories to map names and icons
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isDefault: true },
        { userId: userId },
      ],
    },
  });

  const categoryMap = new Map(
    categories.map((c) => [c.id, { name: c.name, icon: c.icon }])
  );

  // Map to the breakdown array
  const breakdown = Object.entries(categorySums).map(([catId, data]) => {
    const details = categoryMap.get(catId) || { name: 'Unknown Category', icon: '📁' };
    const percentage = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(2) : '0.00';

    return {
      categoryId: catId,
      categoryName: details.name,
      categoryIcon: details.icon,
      totalAmount: parseFloat(data.amount.toFixed(2)),
      count: data.count,
      percentage: parseFloat(percentage),
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalCount,
        currency: displayCurrency,
        breakdown,
      },
    },
  });
});

/**
 * @desc    Create a recurring expense template
 * @route   POST /api/expenses/recurring
 * @access  Private
 */
export const createRecurringExpense = catchAsync(async (req, res, next) => {
  const { description, amount, currency, startDate, interval, categoryId } = req.body;
  const userId = req.user.id;
  const homeCurrency = req.user.currency;

  // 1. Verify category exists and belongs to user (or is default)
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

  // 2. Create the recurring expense
  const start = startDate ? new Date(startDate) : new Date();
  const newRecurringExpense = await prisma.recurringExpense.create({
    data: {
      description,
      amount,
      currency: currency || homeCurrency,
      startDate: start,
      nextDueDate: start,
      interval,
      categoryId,
      paidById: userId,
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

  // 3. Immediately trigger engine to backfill any occurrences due
  await processRecurringExpenses(userId);

  res.status(201).json({
    status: 'success',
    data: {
      recurringExpense: newRecurringExpense,
    },
  });
});

/**
 * @desc    Get all user's recurring expense templates
 * @route   GET /api/expenses/recurring
 * @access  Private
 */
export const getRecurringExpenses = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: {
      paidById: userId,
    },
    orderBy: {
      createdAt: 'desc',
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
    results: recurringExpenses.length,
    data: {
      recurringExpenses,
    },
  });
});

/**
 * @desc    Get details of a single recurring expense
 * @route   GET /api/expenses/recurring/:id
 * @access  Private
 */
export const getRecurringExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const recurringExpense = await prisma.recurringExpense.findUnique({
    where: { id },
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

  if (!recurringExpense) {
    return next(new AppError('Recurring expense not found.', 404));
  }

  if (recurringExpense.paidById !== userId) {
    return next(new AppError('You do not have permission to view this recurring expense.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      recurringExpense,
    },
  });
});

/**
 * @desc    Update a recurring expense
 * @route   PATCH /api/expenses/recurring/:id
 * @access  Private
 */
export const updateRecurringExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { description, amount, startDate, interval, categoryId, isActive } = req.body;
  const userId = req.user.id;

  // 1. Fetch template & check ownership
  const recExpense = await prisma.recurringExpense.findUnique({
    where: { id },
  });

  if (!recExpense) {
    return next(new AppError('Recurring expense not found.', 404));
  }

  if (recExpense.paidById !== userId) {
    return next(new AppError('You do not have permission to edit this recurring expense.', 403));
  }

  // 2. Validate category if updated
  if (categoryId && categoryId !== recExpense.categoryId) {
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
  }

  // 3. Prepare updates
  const updateData = {
    description,
    amount,
    currency,
    isActive,
    categoryId,
  };

  // Resumption behavior: if template is reactivated (isActive changes from false to true)
  // we advance nextDueDate to the next future occurrence/cycle to skip backfilling
  if (isActive === true && recExpense.isActive === false) {
    let currentNextDue = startDate ? new Date(startDate) : new Date(recExpense.nextDueDate);
    const targetInterval = interval || recExpense.interval;
    const now = new Date();

    while (currentNextDue <= now) {
      currentNextDue = advanceDate(currentNextDue, targetInterval);
    }
    updateData.nextDueDate = currentNextDue;
  } else {
    // Standard updates to dates if not reactivating
    if (startDate) {
      const newStart = new Date(startDate);
      updateData.startDate = newStart;
      updateData.nextDueDate = newStart;
    }
    
    if (interval && interval !== recExpense.interval) {
      updateData.interval = interval;
      const baseDate = startDate ? new Date(startDate) : new Date(recExpense.startDate);
      updateData.nextDueDate = baseDate;
    }
  }

  const updatedRecurringExpense = await prisma.recurringExpense.update({
    where: { id },
    data: updateData,
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

  // If set to active, run processor immediately to see if any instances are due
  if (isActive !== false) {
    await processRecurringExpenses(userId);
  }

  res.status(200).json({
    status: 'success',
    data: {
      recurringExpense: updatedRecurringExpense,
    },
  });
});

/**
 * @desc    Delete a recurring expense template
 * @route   DELETE /api/expenses/recurring/:id
 * @access  Private
 */
export const deleteRecurringExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const recExpense = await prisma.recurringExpense.findUnique({
    where: { id },
  });

  if (!recExpense) {
    return next(new AppError('Recurring expense not found.', 404));
  }

  if (recExpense.paidById !== userId) {
    return next(new AppError('You do not have permission to delete this recurring expense.', 403));
  }

  await prisma.recurringExpense.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
