import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import { logActivity } from '../../activityLogs/services/activityLogService.js';
import { createNotification } from '../../notifications/services/notificationService.js';

/**
 * Helper to check role of a member who must be APPROVED
 */
export const getApprovedMemberRole = async (groupId, userId) => {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member || member.status !== 'APPROVED') return null;
  return member.role;
};

/**
 * Approve a pending member (Owner or Admins only)
 */
export const approveMember = async (groupId, operatorId, targetUserId) => {
  // 1. Authorize: Operator must be OWNER or ADMIN
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole || (operatorRole !== 'OWNER' && operatorRole !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only the group owner or admins can approve members.', 403);
  }

  // 2. Find target membership
  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMember) {
    throw new AppError('Membership request not found.', 404);
  }

  if (targetMember.status !== 'PENDING') {
    throw new AppError(`Membership request is not pending (current status: ${targetMember.status}).`, 400);
  }

  const updated = await prisma.groupMember.update({
    where: { id: targetMember.id },
    data: { status: 'APPROVED' },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  // 3. Log Activity & Create Notification
  await logActivity(groupId, operatorId, 'Member approved', { approvedUserId: targetUserId, approvedUserName: updated.user.name });
  await createNotification(targetUserId, 'Group Request Approved', `Your request to join group has been approved.`, { groupId });

  return updated;
};

/**
 * Reject a pending member (Owner or Admins only)
 */
export const rejectMember = async (groupId, operatorId, targetUserId) => {
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole || (operatorRole !== 'OWNER' && operatorRole !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only the group owner or admins can reject members.', 403);
  }

  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMember) {
    throw new AppError('Membership request not found.', 404);
  }

  if (targetMember.status !== 'PENDING') {
    throw new AppError('Membership request is not pending.', 400);
  }

  const updated = await prisma.groupMember.update({
    where: { id: targetMember.id },
    data: { status: 'REJECTED' },
  });

  await logActivity(groupId, operatorId, 'Member rejected', { rejectedUserId: targetUserId });
  await createNotification(targetUserId, 'Group Request Rejected', `Your request to join group has been rejected.`, { groupId });

  return updated;
};

/**
 * Appoint or remove Admin role (Owner only, max 3 admins)
 */
export const updateMemberRole = async (groupId, operatorId, targetUserId, newRole) => {
  // 1. Authorize: Only OWNER can change roles
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (operatorRole !== 'OWNER') {
    throw new AppError('Unauthorized. Only the group owner can update member roles.', 403);
  }

  if (newRole !== 'ADMIN' && newRole !== 'MEMBER') {
    throw new AppError('Invalid role. Role must be ADMIN or MEMBER.', 400);
  }

  // 2. Find target member
  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    include: {
      user: { select: { name: true } },
    },
  });

  if (!targetMember || targetMember.status !== 'APPROVED') {
    throw new AppError('Member is not an approved member of this group.', 404);
  }

  if (targetMember.role === 'OWNER') {
    throw new AppError('Cannot modify the role of the Group Owner.', 400);
  }

  // 3. Admin count validation (max 3 admins)
  if (newRole === 'ADMIN' && targetMember.role !== 'ADMIN') {
    const adminCount = await prisma.groupMember.count({
      where: {
        groupId,
        role: 'ADMIN',
        status: 'APPROVED',
      },
    });

    if (adminCount >= 3) {
      throw new AppError('Limit exceeded. A group can have a maximum of 3 admins.', 400);
    }
  }

  const updated = await prisma.groupMember.update({
    where: { id: targetMember.id },
    data: { role: newRole },
  });

  const actionMsg = newRole === 'ADMIN' ? 'Admin assigned' : 'Admin removed';
  await logActivity(groupId, operatorId, actionMsg, { targetUserId, targetUserName: targetMember.user.name });
  
  if (newRole === 'ADMIN') {
    await createNotification(targetUserId, 'Assigned as Admin', `You have been appointed as Admin in the group.`, { groupId });
  }

  return updated;
};

/**
 * Transfer Group Ownership (Owner only)
 */
export const transferOwnership = async (groupId, currentOwnerId, newOwnerUserId) => {
  // 1. Verify operator is OWNER
  const operatorRole = await getApprovedMemberRole(groupId, currentOwnerId);
  if (operatorRole !== 'OWNER') {
    throw new AppError('Unauthorized. Only the group owner can transfer ownership.', 403);
  }

  // 2. Find new owner member details
  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: newOwnerUserId } },
    include: { user: { select: { name: true } } },
  });

  if (!targetMember || targetMember.status !== 'APPROVED') {
    throw new AppError('New owner must be an approved member of the group.', 400);
  }

  // Find old owner member record
  const ownerMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: currentOwnerId } },
  });

  // 3. Transfer in a transaction
  await prisma.$transaction(async (tx) => {
    // Set old owner to MEMBER
    await tx.groupMember.update({
      where: { id: ownerMember.id },
      data: { role: 'MEMBER' },
    });

    // Set new owner to OWNER
    await tx.groupMember.update({
      where: { id: targetMember.id },
      data: { role: 'OWNER' },
    });

    // Update Owner in Group model
    await tx.group.update({
      where: { id: groupId },
      data: { ownerId: newOwnerUserId },
    });
  });

  await logActivity(groupId, currentOwnerId, 'Ownership transferred', { newOwnerId: newOwnerUserId, newOwnerName: targetMember.user.name });
  await createNotification(newOwnerUserId, 'Ownership Transferred', `You are now the Owner of the group.`, { groupId });

  return { message: 'Group ownership transferred successfully.' };
};

/**
 * Remove a member from the group (Owner or Admins only)
 */
export const removeMember = async (groupId, operatorId, targetUserId) => {
  // 1. Authorize: Operator must be OWNER or ADMIN
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole || (operatorRole !== 'OWNER' && operatorRole !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only the group owner or admins can remove members.', 403);
  }

  // 2. Find target member
  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMember || targetMember.status !== 'APPROVED') {
    throw new AppError('Member not found or not approved.', 404);
  }

  // 3. Prevent self-removal or Owner removal
  if (targetMember.role === 'OWNER') {
    throw new AppError('Cannot remove the group owner.', 400);
  }

  // Admins cannot remove other Admins or Owner (only Owner can remove Admins)
  if (operatorRole === 'ADMIN' && targetMember.role === 'ADMIN') {
    throw new AppError('Unauthorized. Admins cannot remove other admins.', 403);
  }

  const updated = await prisma.groupMember.update({
    where: { id: targetMember.id },
    data: { status: 'REMOVED' },
    include: { user: { select: { name: true } } },
  });

  await logActivity(groupId, operatorId, 'Member removed', { removedUserId: targetUserId, removedUserName: updated.user.name });
  await createNotification(targetUserId, 'Removed from Group', `You have been removed from the group.`, { groupId });

  return updated;
};

/**
 * Approve a member to leave the group (Self-leave, Owner cannot leave without transfer)
 */
export const leaveGroup = async (groupId, userId) => {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!member || member.status !== 'APPROVED') {
    throw new AppError('You are not an approved member of this group.', 404);
  }

  if (member.role === 'OWNER') {
    throw new AppError('The group owner cannot leave the group. You must transfer ownership first.', 400);
  }

  const updated = await prisma.groupMember.update({
    where: { id: member.id },
    data: { status: 'LEFT' },
  });

  await logActivity(groupId, userId, 'Member left');

  return updated;
};
