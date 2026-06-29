import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * Helper function to calculate start-of-week (Monday) or date-interval keys in JS
 */
function getIntervalKey(date, interval) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (interval === 'daily') {
    return `${year}-${month}-${day}`;
  }
  
  if (interval === 'weekly') {
    // Find Monday of the week
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const mYear = monday.getFullYear();
    const mMonth = String(monday.getMonth() + 1).padStart(2, '0');
    const mDay = String(monday.getDate()).padStart(2, '0');
    return `${mYear}-${mMonth}-${mDay}`;
  }
  
  if (interval === 'yearly') {
    return `${year}`;
  }
  
  // Default to monthly: YYYY-MM
  return `${year}-${month}`;
}

/**
 * @desc    Get category-wise expense breakdown with totals and percentages
 * @route   GET /api/analytics/category-breakdown
 * @access  Private
 */
export const getCategoryBreakdown = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  // Build filters
  const where = {
    paidById: userId,
    groupId: null, // Personal expenses only
  };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  // 1. Get total spending across personal expenses
  const totalAggregate = await prisma.expense.aggregate({
    where,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  const totalAmount = totalAggregate._sum.amount || 0;
  const totalCount = totalAggregate._count.id || 0;

  // 2. Group expenses by category
  const categoryBreakdown = await prisma.expense.groupBy({
    by: ['categoryId'],
    where,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    _avg: {
      amount: true,
    },
  });

  // 3. Fetch active categories for mapping
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

  // 4. Map results with percentages and sorted order
  const breakdown = categoryBreakdown.map((item) => {
    const details = categoryMap.get(item.categoryId) || { name: 'Unknown Category', icon: '📁' };
    const categoryAmount = item._sum.amount || 0;
    const categoryCount = item._count.id || 0;
    const categoryAvg = item._avg.amount || 0;
    const percentage = totalAmount > 0 ? ((Number(categoryAmount) / Number(totalAmount)) * 100).toFixed(2) : '0.00';

    return {
      categoryId: item.categoryId,
      categoryName: details.name,
      categoryIcon: details.icon,
      totalAmount: Number(categoryAmount),
      count: categoryCount,
      averageAmount: Number(categoryAvg),
      percentage: parseFloat(percentage),
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  res.status(200).json({
    status: 'success',
    data: {
      totalAmount: Number(totalAmount),
      totalCount,
      breakdown,
    },
  });
});

/**
 * @desc    Get category-wise expense trends over time (time series)
 * @route   GET /api/analytics/category-trends
 * @access  Private
 */
export const getCategoryTrends = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { startDate, endDate, interval } = req.query;

  // Build filters
  const where = {
    paidById: userId,
    groupId: null,
  };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  // Fetch all matching personal expenses
  const expenses = await prisma.expense.findMany({
    where,
    select: {
      amount: true,
      date: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Group in Memory for cross-platform/cross-database safety
  const trendsMap = {};
  const categoriesSet = new Set();

  expenses.forEach((expense) => {
    const key = getIntervalKey(expense.date, interval);
    const categoryName = expense.category?.name || 'Unknown Category';
    const amount = Number(expense.amount);

    categoriesSet.add(categoryName);

    if (!trendsMap[key]) {
      trendsMap[key] = { date: key };
    }

    if (!trendsMap[key][categoryName]) {
      trendsMap[key][categoryName] = 0;
    }

    trendsMap[key][categoryName] += amount;
  });

  const categoriesList = Array.from(categoriesSet);
  const trendData = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));

  // Ensure all data points have all categories initialized to 0 for charting libraries
  trendData.forEach((node) => {
    categoriesList.forEach((catName) => {
      if (node[catName] === undefined) {
        node[catName] = 0;
      } else {
        node[catName] = parseFloat(node[catName].toFixed(2));
      }
    });
  });

  res.status(200).json({
    status: 'success',
    data: {
      categories: categoriesList,
      trends: trendData,
    },
  });
});

/**
 * @desc    Compare category-wise spending between two date ranges (period-over-period)
 * @route   GET /api/analytics/category-comparison
 * @access  Private
 */
export const getCategoryComparison = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { currentStartDate, currentEndDate, compareStartDate, compareEndDate } = req.query;

  // 1. Fetch aggregations for both periods
  const [currentPeriodData, comparePeriodData] = await Promise.all([
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        paidById: userId,
        groupId: null,
        date: {
          gte: new Date(currentStartDate),
          lte: new Date(currentEndDate),
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        paidById: userId,
        groupId: null,
        date: {
          gte: new Date(compareStartDate),
          lte: new Date(compareEndDate),
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  // 2. Fetch categories map
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isDefault: true },
        { userId: userId },
      ],
    },
  });

  const currentMap = new Map(currentPeriodData.map((item) => [item.categoryId, Number(item._sum.amount || 0)]));
  const compareMap = new Map(comparePeriodData.map((item) => [item.categoryId, Number(item._sum.amount || 0)]));

  // 3. Calculate variance side-by-side
  const comparison = categories.map((cat) => {
    const currentAmount = currentMap.get(cat.id) || 0;
    const compareAmount = compareMap.get(cat.id) || 0;
    const difference = currentAmount - compareAmount;
    
    let percentageChange = 0;
    if (compareAmount > 0) {
      percentageChange = (difference / compareAmount) * 100;
    } else if (currentAmount > 0) {
      percentageChange = 100; // 100% increase if started from zero
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      currentPeriodAmount: currentAmount,
      comparePeriodAmount: compareAmount,
      difference: parseFloat(difference.toFixed(2)),
      percentageChange: parseFloat(percentageChange.toFixed(2)),
    };
  })
  .filter((item) => item.currentPeriodAmount > 0 || item.comparePeriodAmount > 0)
  .sort((a, b) => b.currentPeriodAmount - a.currentPeriodAmount);

  res.status(200).json({
    status: 'success',
    data: {
      comparison,
    },
  });
});

/**
 * @desc    Get the top driver expenses (largest transactions)
 * @route   GET /api/analytics/category-drivers
 * @access  Private
 */
export const getCategoryDrivers = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { startDate, endDate, limit, categoryId } = req.query;

  // Build filter
  const where = {
    paidById: userId,
    groupId: null,
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const topExpenses = await prisma.expense.findMany({
    where,
    orderBy: {
      amount: 'desc',
    },
    take: limit,
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

  const formattedDrivers = topExpenses.map((exp) => ({
    id: exp.id,
    description: exp.description,
    amount: Number(exp.amount),
    date: exp.date,
    category: exp.category,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      drivers: formattedDrivers,
    },
  });
});
