import express from 'express';
import { getCategories, createCategory, deleteCategory } from './categoryController.js';
import { protect } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createCategorySchema } from './categoryValidation.js';

const router = express.Router();

// Apply route protection middleware to all category endpoints
router.use(protect);

router.route('/')
  .get(getCategories)
  .post(validate(createCategorySchema), createCategory);

router.route('/:id')
  .delete(deleteCategory);

export default router;
