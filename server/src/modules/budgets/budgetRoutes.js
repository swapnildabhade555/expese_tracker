import express from 'express';
import { protect } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  upsertCategoryBudget,
  deleteCategoryBudget,
  upsertMonthlyBudget,
  deleteMonthlyBudget,
  getBudgets,
} from './budgetController.js';
import { categoryBudgetSchema, monthlyBudgetSchema } from './budgetValidation.js';

const router = express.Router();

// All budget endpoints require authentication
router.use(protect);

router.get('/', getBudgets);
router.post('/category', validate(categoryBudgetSchema), upsertCategoryBudget);
router.delete('/category/:categoryId', deleteCategoryBudget);
router.post('/monthly', validate(monthlyBudgetSchema), upsertMonthlyBudget);
router.delete('/monthly', deleteMonthlyBudget);

export default router;
