import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * @desc    Record a new expense
 * @route   POST /api/expenses
 * @access  Private
 */
export const createExpense = catchAsync(async (req, res, next) => {
  const { description, amount, date, categoryId } = req.body;
  const userId = req.user.id;

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
  } = req.query;

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
    },
    data: {
      expenses,
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

  // 1. Get total sum of personal expenses
  const totalAggregate = await prisma.expense.aggregate({
    where: {
      paidById: userId,
      groupId: null,
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  const totalAmount = totalAggregate._sum.amount || 0;
  const totalCount = totalAggregate._count.id || 0;

  // 2. Group personal expenses by category to aggregate amounts
  const categoryBreakdown = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: {
      paidById: userId,
      groupId: null,
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  // 3. Fetch all active categories to map names and icons
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

  // 4. Map and calculate breakdown details
  const breakdown = categoryBreakdown.map((item) => {
    const details = categoryMap.get(item.categoryId) || { name: 'Unknown Category', icon: '📁' };
    const categoryAmount = item._sum.amount || 0;
    const percentage = totalAmount > 0 ? ((Number(categoryAmount) / Number(totalAmount)) * 100).toFixed(2) : '0.00';

    return {
      categoryId: item.categoryId,
      categoryName: details.name,
      categoryIcon: details.icon,
      totalAmount: categoryAmount,
      count: item._count.id,
      percentage: parseFloat(percentage),
    };
  }).sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalAmount,
        totalCount,
        breakdown,
      },
    },
  });
});
