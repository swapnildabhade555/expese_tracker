import * as memberService from '../services/memberService.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const approveMember = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const { memberUserId } = req.body;
  const operatorId = req.user.id;

  const member = await memberService.approveMember(groupId, operatorId, memberUserId);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});

export const rejectMember = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const { memberUserId } = req.body;
  const operatorId = req.user.id;

  const member = await memberService.rejectMember(groupId, operatorId, memberUserId);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});

export const updateMemberRole = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const { memberUserId, role } = req.body;
  const operatorId = req.user.id;

  const member = await memberService.updateMemberRole(groupId, operatorId, memberUserId, role);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});

export const transferOwnership = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const { memberUserId } = req.body;
  const operatorId = req.user.id;

  const result = await memberService.transferOwnership(groupId, operatorId, memberUserId);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const removeMember = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const { memberUserId } = req.body;
  const operatorId = req.user.id;

  const member = await memberService.removeMember(groupId, operatorId, memberUserId);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});

export const leaveGroup = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const member = await memberService.leaveGroup(groupId, userId);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});
