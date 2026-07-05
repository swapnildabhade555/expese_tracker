import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import { logActivity } from '../../activityLogs/services/activityLogService.js';
import { createNotification } from '../../notifications/services/notificationService.js';
import { getApprovedMemberRole } from '../../members/services/memberService.js';

/**
 * Helper to save base64 receipt to public uploads folder
 */
export const saveReceiptImage = (base64String, uploaderId) => {
  if (!base64String) return null;

  // Parse base64 string
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new AppError('Invalid receipt format. Must be a valid base64 data URI.', 400);
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  // Extension check
  let ext = '';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') ext = 'jpg';
  else if (mimeType === 'image/png') ext = 'png';
  else if (mimeType === 'application/pdf') ext = 'pdf';
  else {
    throw new AppError('Unsupported receipt format. File must be jpg, jpeg, png, or pdf.', 400);
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'receipts');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `receipt_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`;
  const filePath = join(uploadDir, filename);
  writeFileSync(filePath, buffer);

  return `/uploads/receipts/${filename}`;
};

/**
 * Helper to validate splits and compute exact amounts owed per member
 */
const validateAndComputeSplits = (amount, splitType, splitsInput, approvedMemberIds) => {
  const totalAmount = Number(amount);
  let computedSplits = [];

  // Check that all split users are approved group members
  for (const s of splitsInput) {
    if (!approvedMemberIds.includes(s.userId)) {
      throw new AppError(`User ${s.userId} is not an approved member of the group.`, 400);
    }
  }

  if (splitType === 'EQUAL') {
    // If no explicit split members list is passed, split among all approved group members
    const splitUsers = splitsInput.length > 0
      ? splitsInput.map(s => s.userId)
      : approvedMemberIds;

    const count = splitUsers.length;
    if (count === 0) throw new AppError('No members available to split with.', 400);

    const shareAmount = parseFloat((totalAmount / count).toFixed(2));

    // Adjust final member split to cover any rounding division difference
    let sum = 0;
    computedSplits = splitUsers.map((userId, idx) => {
      let owed = shareAmount;
      if (idx === count - 1) {
        owed = parseFloat((totalAmount - sum).toFixed(2));
      }
      sum += owed;
      return { userId, amountOwed: owed };
    });
  }

  else if (splitType === 'EXACT' || splitType === 'CUSTOM') {
    if (!splitsInput || splitsInput.length === 0) {
      throw new AppError('Splits list is required for EXACT/CUSTOM splits.', 400);
    }

    let sum = 0;
    computedSplits = splitsInput.map((s) => {
      const owed = Number(s.amountOwed);
      if (isNaN(owed) || owed <= 0) {
        throw new AppError('Each split amount must be a positive number.', 400);
      }
      sum += owed;
      return { userId: s.userId, amountOwed: owed };
    });

    if (Math.abs(sum - totalAmount) > 0.01) {
      throw new Error(`Total split amounts (${sum}) must equal the expense amount (${totalAmount}).`);
    }
  }

  else if (splitType === 'SHARES') {
    if (!splitsInput || splitsInput.length === 0) {
      throw new AppError('Splits list is required for SHARES splits.', 400);
    }

    const totalShares = splitsInput.reduce((sum, s) => {
      const sh = Number(s.share);
      if (isNaN(sh) || sh <= 0) {
        throw new AppError('Shares value must be a positive number.', 400);
      }
      return sum + sh;
    }, 0);

    if (totalShares === 0) throw new AppError('Total shares cannot be zero.', 400);

    let sum = 0;
    computedSplits = splitsInput.map((s, idx) => {
      const shareVal = Number(s.share);
      let owed = parseFloat(((shareVal / totalShares) * totalAmount).toFixed(2));

      if (idx === splitsInput.length - 1) {
        owed = parseFloat((totalAmount - sum).toFixed(2));
      }
      sum += owed;
      return { userId: s.userId, amountOwed: owed, share: shareVal };
    });
  }

  return computedSplits;
};

/**
 * Creates a new Group Expense inside a transaction
 */
export const createExpense = async (groupId, createdById, data) => {
  const { title, description, amount, paidById, category, splitType, splits = [], receiptImage } = data;

  // 1. Fetch group active members to authorize
  const group = await prisma.group.findFirst({
    where: { id: groupId, status: { not: 'DELETED' } },
    include: {
      members: { where: { status: 'APPROVED' } },
    },
  });

  if (!group) throw new AppError('Group not found.', 404);

  const approvedMemberIds = group.members.map((m) => m.userId);

  // Authorize creator
  if (!approvedMemberIds.includes(createdById)) {
    throw new AppError('Unauthorized. Only approved group members can record expenses.', 403);
  }

  // Verify payer is approved
  if (!approvedMemberIds.includes(paidById)) {
    throw new AppError('Payer must be an approved group member.', 400);
  }

  // 2. Validate and Compute splits
  const computedSplits = validateAndComputeSplits(amount, splitType, splits, approvedMemberIds);

  // 3. Process base64 receipt
  let receiptPath = null;
  if (receiptImage) {
    receiptPath = saveReceiptImage(receiptImage, createdById);
  }

  // 4. Create in Database transaction
  const newExpense = await prisma.$transaction(async (tx) => {
    const exp = await tx.groupExpense.create({
      data: {
        title,
        description,
        amount,
        currency: group.currency,
        category,
        receiptPath,
        receiptUploadedBy: receiptPath ? createdById : null,
        receiptUploadedAt: receiptPath ? new Date() : null,
        paidById,
        createdById,
        groupId,
        splitType,
        splits: {
          create: computedSplits.map((cs) => ({
            userId: cs.userId,
            amountOwed: cs.amountOwed,
            share: cs.share,
          })),
        },
      },
      include: {
        splits: true,
      },
    });

    return exp;
  });

  // 5. Log activity & Notify members
  await logActivity(groupId, createdById, 'Expense created', { title, amount: Number(amount) });

  const notifyUsers = approvedMemberIds.filter((id) => id !== createdById);
  for (const uid of notifyUsers) {
    await createNotification(
      uid,
      'Group Expense Added',
      `A new expense of ${amount} ${group.currency} for "${title}" has been added in the group.`,
      { groupId, expenseId: newExpense.id }
    );
  }

  return newExpense;
};

/**
 * Updates a Group Expense (Owner/Admins or Expense Creator only)
 */
export const updateExpense = async (groupId, expenseId, operatorId, data) => {
  const { title, description, amount, paidById, category, splitType, splits, receiptImage } = data;

  // 1. Fetch group, membership, and expense
  const [group, expense] = await Promise.all([
    prisma.group.findFirst({
      where: { id: groupId, status: { not: 'DELETED' } },
      include: {
        members: { where: { status: 'APPROVED' } },
      },
    }),
    prisma.groupExpense.findFirst({
      where: { id: expenseId, groupId },
      include: { splits: true },
    }),
  ]);

  if (!group) throw new AppError('Group not found.', 404);
  if (!expense) throw new AppError('Expense not found.', 404);

  const approvedMemberIds = group.members.map((m) => m.userId);
  const operatorMembership = group.members.find((m) => m.userId === operatorId);

  // Authorization Check: OWNER, ADMIN, or creator of expense
  if (!operatorMembership) {
    throw new AppError('Unauthorized. You are not a member of this group.', 403);
  }

  const isAuthorized =
    operatorMembership.role === 'OWNER' ||
    operatorMembership.role === 'ADMIN' ||
    expense.createdById === operatorId;

  if (!isAuthorized) {
    throw new AppError("Unauthorized. You can only edit expenses that you created.", 403);
  }

  // 2. Validate update parameters if amount or splits are changing
  let computedSplits = null;
  const targetAmount = amount !== undefined ? amount : Number(expense.amount);
  const targetSplitType = splitType !== undefined ? splitType : expense.splitType;

  if (amount !== undefined || splitType !== undefined || splits !== undefined) {
    const inputSplits = splits !== undefined ? splits : expense.splits;
    computedSplits = validateAndComputeSplits(targetAmount, targetSplitType, inputSplits, approvedMemberIds);
  }

  // Check payer validation if changing
  if (paidById && !approvedMemberIds.includes(paidById)) {
    throw new AppError('Payer must be an approved group member.', 400);
  }

  // 3. Process base64 receipt
  let receiptPath = undefined;
  if (receiptImage) {
    receiptPath = saveReceiptImage(receiptImage, operatorId);
  }

  // 4. Update in Database transaction
  const updatedExpense = await prisma.$transaction(async (tx) => {
    // If splits changed, drop old splits first
    if (computedSplits) {
      await tx.groupExpenseSplit.deleteMany({
        where: { groupExpenseId: expenseId },
      });
    }

    const exp = await tx.groupExpense.update({
      where: { id: expenseId },
      data: {
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        amount: amount !== undefined ? amount : undefined,
        category: category || undefined,
        paidById: paidById || undefined,
        receiptPath: receiptPath !== undefined ? receiptPath : undefined,
        receiptUploadedBy: receiptPath ? operatorId : undefined,
        receiptUploadedAt: receiptPath ? new Date() : undefined,
        splitType: splitType || undefined,
        splits: computedSplits ? {
          create: computedSplits.map((cs) => ({
            userId: cs.userId,
            amountOwed: cs.amountOwed,
            share: cs.share,
          })),
        } : undefined,
      },
      include: {
        splits: true,
      },
    });

    return exp;
  });

  // 5. Log activity & Notify members
  await logActivity(groupId, operatorId, 'Expense updated', { title: updatedExpense.title, expenseId });

  const notifyUsers = approvedMemberIds.filter((id) => id !== operatorId);
  for (const uid of notifyUsers) {
    await createNotification(
      uid,
      'Group Expense Updated',
      `The expense "${updatedExpense.title}" has been updated in the group.`,
      { groupId, expenseId }
    );
  }

  return updatedExpense;
};

/**
 * Deletes a Group Expense
 */
export const deleteExpense = async (groupId, expenseId, operatorId) => {
  // Fetch group and expense details
  const [group, expense] = await Promise.all([
    prisma.group.findFirst({
      where: { id: groupId, status: { not: 'DELETED' } },
      include: {
        members: { where: { status: 'APPROVED' } },
      },
    }),
    prisma.groupExpense.findFirst({
      where: { id: expenseId, groupId },
    }),
  ]);

  if (!group) throw new AppError('Group not found.', 404);
  if (!expense) throw new AppError('Expense not found.', 404);

  const operatorMembership = group.members.find((m) => m.userId === operatorId);

  // Authorize: OWNER, ADMIN, or creator of expense
  if (!operatorMembership) {
    throw new AppError('Unauthorized. You are not a member of this group.', 403);
  }

  const isAuthorized =
    operatorMembership.role === 'OWNER' ||
    operatorMembership.role === 'ADMIN' ||
    expense.createdById === operatorId;

  if (!isAuthorized) {
    throw new AppError("Unauthorized. You can only delete expenses that you created.", 403);
  }

  await prisma.groupExpense.delete({
    where: { id: expenseId },
  });

  await logActivity(groupId, operatorId, 'Expense deleted', { title: expense.title });

  return { message: 'Expense deleted successfully.' };
};

/**
 * Lists expenses for a group
 */
export const listExpenses = async (groupId, userId, query = {}) => {
  const { category, search, limit = 20, page = 1 } = query;

  // 1. Authorize: user must be an approved member
  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: 'APPROVED' },
  });

  if (!member) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  const offset = (Number(page) - 1) * Number(limit);

  const expenses = await prisma.groupExpense.findMany({
    where: {
      groupId,
      category: category || undefined,
      title: search ? { contains: search, mode: 'insensitive' } : undefined,
    },
    include: {
      paidBy: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      splits: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: { expenseDate: 'desc' },
    take: Number(limit),
    skip: offset,
  });

  return expenses;
};
