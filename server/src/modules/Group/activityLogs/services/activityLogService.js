import prisma from '../../../../config/db.js';

/**
 * Creates an immutable activity log entry for a group action
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID who triggered the action
 * @param {string} action - The action string
 * @param {object} [metadata] - Optional metadata
 */
export const logActivity = async (groupId, userId, action, metadata = {}) => {
  try {
    return await prisma.groupActivityLog.create({
      data: {
        groupId,
        userId,
        action,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error.message);
  }
};
