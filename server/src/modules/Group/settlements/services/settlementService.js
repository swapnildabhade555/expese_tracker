import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import { logActivity } from '../../activityLogs/services/activityLogService.js';
import { createNotification } from '../../notifications/services/notificationService.js';
import { getApprovedMemberRole } from '../../members/services/memberService.js';

/**
 * Calculates net balances for all approved group members taking into account
 * expenses paid, splits owed, and completed settlements.
 */
export const calculateNetBalances = async (groupId) => {
  const members = await prisma.groupMember.findMany({
    where: { groupId, status: 'APPROVED' },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const memberIds = members.map((m) => m.userId);

  // 1. Fetch group expenses
  const expenses = await prisma.groupExpense.findMany({
    where: { groupId },
    select: {
      id: true,
      amount: true,
      paidById: true,
    },
  });

  // 2. Fetch splits
  const splits = await prisma.groupExpenseSplit.findMany({
    where: {
      groupExpense: { groupId },
    },
    select: {
      userId: true,
      amountOwed: true,
    },
  });

  // 3. Fetch completed settlements
  const settlements = await prisma.groupSettlement.findMany({
    where: { groupId, status: 'COMPLETED' },
    select: {
      payerId: true,
      receiverId: true,
      amount: true,
    },
  });

  // 4. Map sums in memory
  const balanceMap = {};
  for (const mid of memberIds) {
    balanceMap[mid] = 0;
  }

  // Add paid expenses
  for (const exp of expenses) {
    if (balanceMap[exp.paidById] !== undefined) {
      balanceMap[exp.paidById] += Number(exp.amount);
    }
  }

  // Subtract owed splits
  for (const spl of splits) {
    if (balanceMap[spl.userId] !== undefined) {
      balanceMap[spl.userId] -= Number(spl.amountOwed);
    }
  }

  // Adjust for completed settlements: payer sent money (+), receiver received money (-)
  for (const set of settlements) {
    if (balanceMap[set.payerId] !== undefined) {
      balanceMap[set.payerId] += Number(set.amount);
    }
    if (balanceMap[set.receiverId] !== undefined) {
      balanceMap[set.receiverId] -= Number(set.amount);
    }
  }

  return members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    balance: Number.parseFloat(balanceMap[m.userId].toFixed(2)),
  }));
};

/**
 * Real-time Settlement Optimization Engine (Greedy payment minimizer)
 */
export const getSuggestedSettlements = async (groupId, userId) => {
  // Authorize: must be approved member
  const role = await getApprovedMemberRole(groupId, userId);
  if (!role) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  const balances = await calculateNetBalances(groupId);

  // Separate debtors and creditors
  let debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ ...b, balance: -b.balance })) // Work with positive values for debtor debt
    .sort((a, b) => b.balance - a.balance); // Sort descending (most debt first)

  let creditors = balances
    .filter((b) => b.balance > 0.005)
    .sort((a, b) => b.balance - a.balance); // Sort descending (most credit first)

  const suggestions = [];

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amountToPay = parseFloat(Math.min(debtor.balance, creditor.balance).toFixed(2));

    suggestions.push({
      payerId: debtor.userId,
      payerName: debtor.name,
      payerEmail: debtor.email,
      receiverId: creditor.userId,
      receiverName: creditor.name,
      receiverEmail: creditor.email,
      amount: amountToPay,
    });

    debtor.balance = parseFloat((debtor.balance - amountToPay).toFixed(2));
    creditor.balance = parseFloat((creditor.balance - amountToPay).toFixed(2));

    if (debtor.balance < 0.005) {
      debtors.shift();
    }
    if (creditor.balance < 0.005) {
      creditors.shift();
    }

    // Re-sort to maintain greedy ordering
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);
  }

  return suggestions;
};

/**
 * Records a settlement transaction
 */
export const recordSettlement = async (groupId, operatorId, data) => {
  const { payerId, receiverId, amount, status = 'PENDING' } = data;

  // 1. Authorize: operator must be approved member
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  // 2. Validate payer and receiver
  const [payerRole, receiverRole] = await Promise.all([
    getApprovedMemberRole(groupId, payerId),
    getApprovedMemberRole(groupId, receiverId),
  ]);

  if (!payerRole || !receiverRole) {
    throw new AppError('Payer and receiver must be approved members of the group.', 400);
  }

  // 3. Create settlement
  const settlement = await prisma.groupSettlement.create({
    data: {
      groupId,
      payerId,
      receiverId,
      amount,
      status,
    },
    include: {
      payer: { select: { name: true } },
      receiver: { select: { name: true } },
    },
  });

  const actionMsg = status === 'COMPLETED' ? 'Settlement completed' : 'Settlement recorded';
  await logActivity(groupId, operatorId, actionMsg, {
    payerName: settlement.payer.name,
    receiverName: settlement.receiver.name,
    amount: Number(amount),
  });

  // Notify receiver
  await createNotification(
    receiverId,
    'Settlement Record Created',
    `${settlement.payer.name} recorded a settlement of ${amount} to you. Status: ${status}`,
    { groupId, settlementId: settlement.id }
  );

  return settlement;
};

/**
 * Updates status of a recorded settlement
 */
export const updateSettlementStatus = async (groupId, settlementId, operatorId, status) => {
  // 1. Authorize: operator must be approved member
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  // 2. Find settlement
  const settlement = await prisma.groupSettlement.findFirst({
    where: { id: settlementId, groupId },
    include: {
      payer: { select: { name: true } },
      receiver: { select: { name: true } },
    },
  });

  if (!settlement) {
    throw new AppError('Settlement not found.', 404);
  }

  // Owner/Admin or Payer/Receiver can update status
  const isAuthorized =
    operatorRole === 'OWNER' ||
    operatorRole === 'ADMIN' ||
    settlement.payerId === operatorId ||
    settlement.receiverId === operatorId;

  if (!isAuthorized) {
    throw new AppError('Unauthorized. You do not have permission to update this settlement.', 403);
  }

  const updated = await prisma.groupSettlement.update({
    where: { id: settlementId },
    data: { status },
  });

  if (status === 'COMPLETED') {
    await logActivity(groupId, operatorId, 'Settlement completed', {
      payerName: settlement.payer.name,
      receiverName: settlement.receiver.name,
      amount: Number(settlement.amount),
    });

    // Notify payer/receiver
    await createNotification(
      settlement.payerId,
      'Settlement Marked Completed',
      `Your settlement payment of ${settlement.amount} to ${settlement.receiver.name} was marked COMPLETED.`,
      { groupId, settlementId }
    );
  }

  return updated;
};

/**
 * Lists settlements in a group
 */
export const listSettlements = async (groupId, userId) => {
  const role = await getApprovedMemberRole(groupId, userId);
  if (!role) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  return prisma.groupSettlement.findMany({
    where: { groupId },
    include: {
      payer: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};
