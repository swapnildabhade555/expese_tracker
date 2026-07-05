import express from 'express';
import { getCategories, createCategory, deleteCategory, updateCategory } from '../controllers/categoryController.js';
import { protect } from '../../../../middlewares/auth.js';
import { validate } from '../../../../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation.js';

const router = express.Router();

// Apply route protection middleware to all category endpoints
router.use(protect);

router.route('/')
  .get(getCategories)
  .post(validate(createCategorySchema), createCategory);

router.route('/:id')
  .patch(validate(updateCategorySchema), updateCategory)
  .delete(deleteCategory);

export default router;
