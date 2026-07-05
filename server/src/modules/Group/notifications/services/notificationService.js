import prisma from '../../../../config/db.js';

/**
 * Creates a notification history entry for a user
 * @param {string} userId - User ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {object} [metadata] - Optional metadata
 */
export const createNotification = async (userId, title, message, metadata = {}) => {
  try {
    return await prisma.groupNotification.create({
      data: {
        userId,
        title,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};
