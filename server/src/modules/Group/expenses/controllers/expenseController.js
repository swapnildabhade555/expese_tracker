import * as expenseService from '../services/expenseService.js';
import catchAsync from '../../../../utils/catchAsync.js';

export const createExpense = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const createdById = req.user.id;

  const expense = await expenseService.createExpense(groupId, createdById, req.body);

  res.status(201).json({
    status: 'success',
    data: { expense },
  });
});

export const updateExpense = catchAsync(async (req, res, next) => {
  const { id: groupId, expenseId } = req.params;
  const operatorId = req.user.id;

  const expense = await expenseService.updateExpense(groupId, expenseId, operatorId, req.body);

  res.status(200).json({
    status: 'success',
    data: { expense },
  });
});

export const deleteExpense = catchAsync(async (req, res, next) => {
  const { id: groupId, expenseId } = req.params;
  const operatorId = req.user.id;

  const result = await expenseService.deleteExpense(groupId, expenseId, operatorId);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const listExpenses = catchAsync(async (req, res, next) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  const expenses = await expenseService.listExpenses(groupId, userId, req.query);

  res.status(200).json({
    status: 'success',
    data: { expenses },
  });
});
