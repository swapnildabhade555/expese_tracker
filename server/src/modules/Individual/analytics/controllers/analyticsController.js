import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import catchAsync from '../../../../utils/catchAsync.js';
import { convertAmount } from '../../expenses/services/currencyService.js';

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
  const homeCurrency = req.user.currency;
  const { startDate, endDate, targetCurrency } = req.query;
  const displayCurrency = targetCurrency || homeCurrency;

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

  // Fetch all matching personal expenses
  const expenses = await prisma.expense.findMany({ where });

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

  // Fetch active categories for mapping
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

  const breakdown = Object.entries(categorySums).map(([catId, data]) => {
    const details = categoryMap.get(catId) || { name: 'Unknown Category', icon: '📁' };
    const percentage = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(2) : '0.00';

    return {
      categoryId: catId,
      categoryName: details.name,
      categoryIcon: details.icon,
      totalAmount: parseFloat(data.amount.toFixed(2)),
      count: data.count,
      averageAmount: parseFloat((data.amount / data.count).toFixed(2)),
      percentage: parseFloat(percentage),
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  res.status(200).json({
    status: 'success',
    data: {
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      totalCount,
      currency: displayCurrency,
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
  const homeCurrency = req.user.currency;
  const { startDate, endDate, interval, targetCurrency } = req.query;
  const displayCurrency = targetCurrency || homeCurrency;

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
      currency: true,
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
    const amount = convertAmount(expense.amount, expense.currency, displayCurrency);

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
      currency: displayCurrency,
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
  const homeCurrency = req.user.currency;
  const { currentStartDate, currentEndDate, compareStartDate, compareEndDate, targetCurrency } = req.query;
  const displayCurrency = targetCurrency || homeCurrency;

  // 1. Fetch expenses for both periods
  const [currentExpenses, compareExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: {
        paidById: userId,
        groupId: null,
        date: {
          gte: new Date(currentStartDate),
          lte: new Date(currentEndDate),
        },
      },
    }),
    prisma.expense.findMany({
      where: {
        paidById: userId,
        groupId: null,
        date: {
          gte: new Date(compareStartDate),
          lte: new Date(compareEndDate),
        },
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

  // 3. Aggregate converted amounts in memory maps
  const currentMap = new Map();
  const compareMap = new Map();

  currentExpenses.forEach((exp) => {
    const converted = convertAmount(exp.amount, exp.currency, displayCurrency);
    currentMap.set(exp.categoryId, (currentMap.get(exp.categoryId) || 0) + converted);
  });

  compareExpenses.forEach((exp) => {
    const converted = convertAmount(exp.amount, exp.currency, displayCurrency);
    compareMap.set(exp.categoryId, (compareMap.get(exp.categoryId) || 0) + converted);
  });

  // 4. Calculate variance side-by-side
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
      currentPeriodAmount: parseFloat(currentAmount.toFixed(2)),
      comparePeriodAmount: parseFloat(compareAmount.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      percentageChange: parseFloat(percentageChange.toFixed(2)),
    };
  })
  .filter((item) => item.currentPeriodAmount > 0 || item.comparePeriodAmount > 0)
  .sort((a, b) => b.currentPeriodAmount - a.currentPeriodAmount);

  res.status(200).json({
    status: 'success',
    data: {
      currency: displayCurrency,
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
  const homeCurrency = req.user.currency;
  const { startDate, endDate, limit, categoryId, targetCurrency } = req.query;
  const displayCurrency = targetCurrency || homeCurrency;
  const limitNum = parseInt(limit, 10) || 5;

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

  // Fetch matching expenses
  const expenses = await prisma.expense.findMany({
    where,
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

  // Convert amounts and sort in memory by converted amount to handle mixed currencies properly
  const formattedDrivers = expenses.map((exp) => {
    const converted = convertAmount(exp.amount, exp.currency, displayCurrency);
    return {
      id: exp.id,
      description: exp.description,
      amount: Number(exp.amount),
      currency: exp.currency,
      convertedAmount: converted,
      date: exp.date,
      category: exp.category,
    };
  })
  .sort((a, b) => b.convertedAmount - a.convertedAmount)
  .slice(0, limitNum);

  res.status(200).json({
    status: 'success',
    data: {
      currency: displayCurrency,
      drivers: formattedDrivers,
    },
  });
});
