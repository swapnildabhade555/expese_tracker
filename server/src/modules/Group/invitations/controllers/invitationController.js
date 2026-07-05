import * as invitationService from '../services/invitationService.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const createEmailInvitation = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const { invitedEmail } = req.body;
  const operatorId = req.user.id;

  const invitation = await invitationService.createEmailInvitation(groupId, operatorId, invitedEmail);

  res.status(201).json({
    status: 'success',
    data: { invitation },
  });
});

export const getJoinCode = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const operatorId = req.user.id;

  const joinCode = await invitationService.getJoinCode(groupId, operatorId);

  res.status(200).json({
    status: 'success',
    data: { joinCode },
  });
});

export const joinWithCode = catchAsync(async (req, res, next) => {
  const { joinCode } = req.body;
  const userId = req.user.id;

  const member = await invitationService.joinWithCode(userId, joinCode);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});

export const joinWithInviteToken = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  const userId = req.user.id;

  const member = await invitationService.joinWithInviteToken(userId, token);

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});
