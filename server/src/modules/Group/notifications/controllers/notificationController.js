import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const listNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const notifications = await prisma.groupNotification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    status: 'success',
    data: { notifications },
  });
});

export const markNotificationRead = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await prisma.groupNotification.findUnique({
    where: { id },
  });

  if (!notification) {
    return next(new AppError('Notification not found.', 404));
  }

  if (notification.userId !== userId) {
    return next(new AppError('Unauthorized.', 403));
  }

  const updated = await prisma.groupNotification.update({
    where: { id },
    data: { isRead: true },
  });

  res.status(200).json({
    status: 'success',
    data: { notification: updated },
  });
});
