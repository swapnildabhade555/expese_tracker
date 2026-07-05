import * as settlementService from '../services/settlementService.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const getSuggestedSettlements = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const suggestions = await settlementService.getSuggestedSettlements(groupId, userId);

  res.status(200).json({
    status: 'success',
    data: { suggestions },
  });
});

export const recordSettlement = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const operatorId = req.user.id;

  const settlement = await settlementService.recordSettlement(groupId, operatorId, req.body);

  res.status(201).json({
    status: 'success',
    data: { settlement },
  });
});

export const updateSettlementStatus = catchAsync(async (req, res, next) => {
  const { id: groupId, settlementId } = req.params;
  const operatorId = req.user.id;
  const { status } = req.body;

  const settlement = await settlementService.updateSettlementStatus(groupId, settlementId, operatorId, status);

  res.status(200).json({
    status: 'success',
    data: { settlement },
  });
});

export const listSettlements = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const settlements = await settlementService.listSettlements(groupId, userId);

  res.status(200).json({
    status: 'success',
    data: { settlements },
  });
});
