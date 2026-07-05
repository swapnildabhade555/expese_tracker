import express from 'express';
import {
  getCategoryBreakdown,
  getCategoryTrends,
  getCategoryComparison,
  getCategoryDrivers,
} from '../controllers/analyticsController.js';
import { protect } from '../../../../middlewares/auth.js';
import { validate } from '../../../../middlewares/validate.js';
import {
  breakdownSchema,
  trendsSchema,
  comparisonSchema,
  driversSchema,
} from '../validations/analyticsValidation.js';

const router = express.Router();

// Apply auth protection middleware to all analytics endpoints
router.use(protect);

router.get('/category-breakdown', validate(breakdownSchema), getCategoryBreakdown);
router.get('/category-trends', validate(trendsSchema), getCategoryTrends);
router.get('/category-comparison', validate(comparisonSchema), getCategoryComparison);
router.get('/category-drivers', validate(driversSchema), getCategoryDrivers);

export default router;
