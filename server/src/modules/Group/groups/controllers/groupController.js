import * as groupService from '../services/groupService.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const createGroup = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const group = await groupService.createGroup(userId, req.body);

  res.status(201).json({
    status: 'success',
    data: { group },
  });
});

export const updateGroup = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const group = await groupService.updateGroup(id, userId, req.body);

  res.status(200).json({
    status: 'success',
    data: { group },
  });
});

export const softDeleteGroup = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await groupService.softDeleteGroup(id, userId);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const archiveGroup = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await groupService.archiveGroup(id, userId);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const unarchiveGroup = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await groupService.unarchiveGroup(id, userId);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const getGroupDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const group = await groupService.getGroupDetails(id, userId);

  res.status(200).json({
    status: 'success',
    data: { group },
  });
});

export const listUserGroups = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const groups = await groupService.listUserGroups(userId);

  res.status(200).json({
    status: 'success',
    data: { groups },
  });
});
