import { randomBytes } from 'node:crypto';
import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import { logActivity } from '../../activityLogs/services/activityLogService.js';
import { createNotification } from '../../notifications/services/notificationService.js';
import { getApprovedMemberRole } from '../../members/services/memberService.js';

/**
 * Creates an invite token and invitation record for an email
 */
export const createEmailInvitation = async (groupId, operatorId, invitedEmail) => {
  // 1. Authorize: OWNER or ADMIN
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole || (operatorRole !== 'OWNER' && operatorRole !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only group owner or admins can send invitations.', 403);
  }

  // 2. Generate unique token
  const token = randomBytes(24).toString('hex');
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

  const invitation = await prisma.groupInvitation.create({
    data: {
      groupId,
      token,
      invitedEmail: invitedEmail.toLowerCase().trim(),
      expiryTime,
      status: 'PENDING',
    },
  });

  await logActivity(groupId, operatorId, 'Member invited', { invitedEmail });

  // 3. Optional: Notify user if they are already registered in the system
  const invitedUser = await prisma.user.findUnique({
    where: { email: invitedEmail.toLowerCase().trim() },
  });

  if (invitedUser) {
    await createNotification(
      invitedUser.id,
      'Group Invitation Received',
      `You have been invited to join a group. Token: ${token}`,
      { groupId, token }
    );
  }

  return invitation;
};

/**
 * Returns the join code of a group (Owner or Admins only)
 */
export const getJoinCode = async (groupId, operatorId) => {
  const operatorRole = await getApprovedMemberRole(groupId, operatorId);
  if (!operatorRole || (operatorRole !== 'OWNER' && operatorRole !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only group owner or admins can fetch the join code.', 403);
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { joinCode: true },
  });

  if (!group) {
    throw new AppError('Group not found.', 404);
  }

  return group.joinCode;
};

/**
 * Helper to notify admins and owner about a new pending membership request
 */
const notifyGroupAdmins = async (groupId, requesterName) => {
  const admins = await prisma.groupMember.findMany({
    where: {
      groupId,
      status: 'APPROVED',
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  for (const admin of admins) {
    await createNotification(
      admin.userId,
      'New Join Request Submitted',
      `${requesterName} has requested to join your group.`,
      { groupId }
    );
  }
};

/**
 * Requests to join a group using a join code (sets status to PENDING)
 */
export const joinWithCode = async (userId, joinCode) => {
  // 1. Find group
  const group = await prisma.group.findFirst({
    where: { joinCode, status: 'ACTIVE' },
  });

  if (!group) {
    throw new AppError('Active group with this join code not found.', 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  // 2. Check membership
  const existingMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });

  if (existingMember) {
    if (existingMember.status === 'APPROVED') {
      throw new AppError('You are already an approved member of this group.', 400);
    }
    if (existingMember.status === 'PENDING') {
      throw new AppError('Your request to join this group is already pending.', 400);
    }

    // Re-request if left/removed/rejected
    const updated = await prisma.groupMember.update({
      where: { id: existingMember.id },
      data: { status: 'PENDING', role: 'MEMBER' },
    });

    await logActivity(group.id, userId, 'Join request submitted');
    await notifyGroupAdmins(group.id, user.name);

    return updated;
  }

  // Create new membership
  const member = await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: 'MEMBER',
      status: 'PENDING',
    },
  });

  await logActivity(group.id, userId, 'Join request submitted');
  await notifyGroupAdmins(group.id, user.name);

  return member;
};

/**
 * Requests to join a group using an invitation token (sets status to PENDING)
 */
export const joinWithInviteToken = async (userId, token) => {
  // 1. Find invitation
  const invitation = await prisma.groupInvitation.findUnique({
    where: { token },
    include: {
      group: true,
    },
  });

  if (!invitation || invitation.group.status !== 'ACTIVE') {
    throw new AppError('Invitation token is invalid.', 404);
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(`Invitation token is already ${invitation.status.toLowerCase()}.`, 400);
  }

  // 2. Expiry check
  if (invitation.expiryTime < new Date()) {
    await prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('Invitation token has expired.', 400);
  }

  // 3. User verification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (invitation.invitedEmail && invitation.invitedEmail !== user.email.toLowerCase()) {
    throw new AppError('This invitation was sent to a different email address.', 403);
  }

  // 4. Check membership
  const existingMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invitation.groupId, userId } },
  });

  let membership;

  if (existingMember) {
    if (existingMember.status === 'APPROVED') {
      throw new AppError('You are already an approved member of this group.', 400);
    }
    if (existingMember.status === 'PENDING') {
      throw new AppError('Your request to join this group is already pending.', 400);
    }

    membership = await prisma.groupMember.update({
      where: { id: existingMember.id },
      data: { status: 'PENDING', role: 'MEMBER' },
    });
  } else {
    membership = await prisma.groupMember.create({
      data: {
        groupId: invitation.groupId,
        userId,
        role: 'MEMBER',
        status: 'PENDING',
      },
    });
  }

  // Update invitation status to ACCEPTED
  await prisma.groupInvitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTED' },
  });

  await logActivity(invitation.groupId, userId, 'Join request submitted');
  await notifyGroupAdmins(invitation.groupId, user.name);

  return membership;
};
