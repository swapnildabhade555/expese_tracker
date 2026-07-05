import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import { getApprovedMemberRole } from '../../members/services/memberService.js';
import { calculateNetBalances } from '../../settlements/services/settlementService.js';

/**
 * Gets a high-level summary of group spending, member payments/debts/balances, and settlements
 */
export const getGroupSummary = async (groupId, userId) => {
  // 1. Authorize: user must be approved member
  const role = await getApprovedMemberRole(groupId, userId);
  if (!role) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  // 2. Fetch all expenses to get total group expense
  const expenses = await prisma.groupExpense.findMany({
    where: { groupId },
    select: { amount: true },
  });
  const totalGroupExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // 3. Fetch user balance breakdown using shared balances logic (includes settlements)
  const memberBalances = await calculateNetBalances(groupId);

  // 4. Count settlements
  const [pendingCount, completedCount] = await Promise.all([
    prisma.groupSettlement.count({ where: { groupId, status: 'PENDING' } }),
    prisma.groupSettlement.count({ where: { groupId, status: 'COMPLETED' } }),
  ]);

  return {
    totalGroupExpense: parseFloat(totalGroupExpense.toFixed(2)),
    memberBalances,
    pendingSettlementsCount: pendingCount,
    completedSettlementsCount: completedCount,
  };
};

/**
 * Gets spending breakdown grouped by categories
 */
export const getCategorySummary = async (groupId, userId) => {
  const role = await getApprovedMemberRole(groupId, userId);
  if (!role) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  const expenses = await prisma.groupExpense.findMany({
    where: { groupId },
    select: { amount: true, category: true },
  });

  const categoryMap = {};
  for (const exp of expenses) {
    const cat = exp.category;
    if (!categoryMap[cat]) {
      categoryMap[cat] = 0;
    }
    categoryMap[cat] += Number(exp.amount);
  }

  return Object.keys(categoryMap).map((cat) => ({
    category: cat,
    totalAmount: parseFloat(categoryMap[cat].toFixed(2)),
  }));
};

/**
 * Gets spending breakdown grouped by months (YYYY-MM)
 */
export const getMonthlySummary = async (groupId, userId) => {
  const role = await getApprovedMemberRole(groupId, userId);
  if (!role) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  const expenses = await prisma.groupExpense.findMany({
    where: { groupId },
    select: { amount: true, expenseDate: true },
  });

  const monthMap = {};
  for (const exp of expenses) {
    const date = new Date(exp.expenseDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = 0;
    }
    monthMap[monthKey] += Number(exp.amount);
  }

  const result = Object.keys(monthMap).map((mKey) => ({
    month: mKey,
    totalAmount: parseFloat(monthMap[mKey].toFixed(2)),
  }));

  // Sort chronological YYYY-MM
  return result.sort((a, b) => a.month.localeCompare(b.month));
};
