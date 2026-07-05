import prisma from '../../../../config/db.js';
import AppError from '../../../../utils/AppError.js';
import catchAsync from '../../../../utils/catchAsync.js';
import { getApprovedMemberRole } from '../../members/services/memberService.js';

export const getActivityLogs = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  // 1. Authorize: user must be approved member
  const role = await getApprovedMemberRole(groupId, userId);
  if (!role) {
    throw new AppError('Unauthorized. You are not an approved member of this group.', 403);
  }

  // 2. Fetch logs
  const logs = await prisma.groupActivityLog.findMany({
    where: { groupId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  res.status(200).json({
    status: 'success',
    data: { logs },
  });
});
