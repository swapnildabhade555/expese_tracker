import * as reportService from '../services/reportService.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const getGroupSummary = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const summary = await reportService.getGroupSummary(groupId, userId);

  res.status(200).json({
    status: 'success',
    data: { summary },
  });
});

export const getCategorySummary = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const categorySummary = await reportService.getCategorySummary(groupId, userId);

  res.status(200).json({
    status: 'success',
    data: { categorySummary },
  });
});

export const getMonthlySummary = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const monthlySummary = await reportService.getMonthlySummary(groupId, userId);

  res.status(200).json({
    status: 'success',
    data: { monthlySummary },
  });
});
