import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  createRecurringExpense,
  getRecurringExpenses,
  getRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from './expenseController.js';
import { protect } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  getExpensesQuerySchema,
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
} from './expenseValidation.js';

const router = express.Router();

// Protect all routes within the expense module
router.use(protect);

// Summary analytics endpoint (placed above /:id to avoid route clashes)
router.get('/summary', getExpenseSummary);

// Recurring expense templates endpoints
router.route('/recurring')
  .get(getRecurringExpenses)
  .post(validate(createRecurringExpenseSchema), createRecurringExpense);

router.route('/recurring/:id')
  .get(getRecurringExpense)
  .patch(validate(updateRecurringExpenseSchema), updateRecurringExpense)
  .delete(deleteRecurringExpense);

router.route('/')
  .get(validate(getExpensesQuerySchema), getExpenses)
  .post(validate(createExpenseSchema), createExpense);

router.route('/:id')
  .get(getExpense)
  .patch(validate(updateExpenseSchema), updateExpense)
  .delete(deleteExpense);

export default router;
