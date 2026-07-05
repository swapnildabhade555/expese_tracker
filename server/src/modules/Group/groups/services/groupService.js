import { randomBytes } from 'crypto';
import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import { logActivity } from '../../activityLogs/services/activityLogService.js';

/**
 * Generates a unique 8-character uppercase group join code
 */
const generateUniqueJoinCode = async () => {
  let attempts = 0;
  while (attempts < 5) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const existing = await prisma.group.findUnique({
      where: { joinCode: code },
    });
    if (!existing) return code;
    attempts++;
  }
  throw new AppError('Failed to generate a unique join code. Please try again.', 500);
};

/**
 * Creates a new group and automatically registers the creator as OWNER
 */
export const createGroup = async (userId, data) => {
  const { name, description, currency } = data;
  const joinCode = await generateUniqueJoinCode();

  const group = await prisma.$transaction(async (tx) => {
    // 1. Create Group
    const newGroup = await tx.group.create({
      data: {
        name,
        description,
        currency,
        joinCode,
        ownerId: userId,
        status: 'ACTIVE',
      },
    });

    // 2. Add owner as approved Group Member
    await tx.groupMember.create({
      data: {
        groupId: newGroup.id,
        userId,
        role: 'OWNER',
        status: 'APPROVED',
      },
    });

    return newGroup;
  });

  // 3. Log Activity (outside transaction block so foreign key constraint is satisfied)
  await logActivity(group.id, userId, 'Group created', { groupName: name });

  return group;
};

/**
 * Updates a group's details (Owner or Admins only)
 */
export const updateGroup = async (groupId, userId, data) => {
  const { name, description, currency } = data;

  // Fetch group and verify status
  const group = await prisma.group.findFirst({
    where: { id: groupId, status: { not: 'DELETED' } },
    include: {
      members: {
        where: { userId, status: 'APPROVED' },
      },
    },
  });

  if (!group) {
    throw new AppError('Group not found.', 404);
  }

  // Authorize: user must be OWNER or ADMIN
  const membership = group.members[0];
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only the group owner or admins can edit group details.', 403);
  }

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: {
      name: name || undefined,
      description: description !== undefined ? description : undefined,
      currency: currency || undefined,
    },
  });

  await logActivity(groupId, userId, 'Group updated', { updatedFields: Object.keys(data) });

  return updated;
};

/**
 * Soft deletes a group (Owner only)
 */
export const softDeleteGroup = async (groupId, userId) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, status: { not: 'DELETED' } },
  });

  if (!group) {
    throw new AppError('Group not found.', 404);
  }

  // Authorize: Only the group owner can delete it
  if (group.ownerId !== userId) {
    throw new AppError('Unauthorized. Only the group owner can delete the group.', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.group.update({
      where: { id: groupId },
      data: { status: 'DELETED' },
    });

    await logActivity(groupId, userId, 'Group deleted');
  });

  return { message: 'Group deleted successfully.' };
};

/**
 * Archives a group (Owner or Admins only)
 */
export const archiveGroup = async (groupId, userId) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, status: { not: 'DELETED' } },
    include: {
      members: {
        where: { userId, status: 'APPROVED' },
      },
    },
  });

  if (!group) {
    throw new AppError('Group not found.', 404);
  }

  // Authorize: OWNER or ADMIN
  const membership = group.members[0];
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only the group owner or admins can archive the group.', 403);
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { status: 'ARCHIVED' },
  });

  await logActivity(groupId, userId, 'Group archived');

  return { message: 'Group archived successfully.' };
};

/**
 * Unarchives a group (Owner or Admins only)
 */
export const unarchiveGroup = async (groupId, userId) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, status: 'ARCHIVED' },
    include: {
      members: {
        where: { userId, status: 'APPROVED' },
      },
    },
  });

  if (!group) {
    throw new AppError('Group not found or is not archived.', 404);
  }

  // Authorize: OWNER or ADMIN
  const membership = group.members[0];
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new AppError('Unauthorized. Only the group owner or admins can unarchive the group.', 403);
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { status: 'ACTIVE' },
  });

  await logActivity(groupId, userId, 'Group unarchived');

  return { message: 'Group unarchived successfully.' };
};

/**
 * Retrieves the details of a group for a member
 */
export const getGroupDetails = async (groupId, userId) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, status: { not: 'DELETED' } },
    include: {
      members: {
        where: { status: 'APPROVED' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    throw new AppError('Group not found.', 404);
  }

  // Check if current user is an approved member of this group
  const isMember = group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError('Unauthorized. You must be an approved member to view this group.', 403);
  }

  return group;
};

/**
 * Lists all active/archived groups where the user is an approved member
 */
export const listUserGroups = async (userId) => {
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId,
      status: 'APPROVED',
      group: {
        status: { not: 'DELETED' },
      },
    },
    include: {
      group: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => m.group);
};
