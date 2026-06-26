import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * @desc    Get all default categories and custom user categories
 * @route   GET /api/categories
 * @access  Private
 */
export const getCategories = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isDefault: true },
        { userId: userId },
      ],
    },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Create a custom user category
 * @route   POST /api/categories
 * @access  Private
 */
export const createCategory = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const userId = req.user.id;

  // 1. Check if category with the same name already exists for this user or as default
  const existingCategory = await prisma.category.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive', // Case-insensitive matching
      },
      OR: [
        { isDefault: true },
        { userId: userId },
      ],
    },
  });

  if (existingCategory) {
    return next(
      new AppError(
        `Category '${name}' already exists (either as a default or custom category).`,
        400
      )
    );
  }

  // 2. Create category
  const newCategory = await prisma.category.create({
    data: {
      name,
      isDefault: false,
      userId,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      category: newCategory,
    },
  });
});

/**
 * @desc    Delete a custom user category
 * @route   DELETE /api/categories/:id
 * @access  Private
 */
export const deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  // 1. Find category
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // 2. Check if it is default
  if (category.isDefault) {
    return next(new AppError('Cannot delete system default category.', 403));
  }

  // 3. Check ownership
  if (category.userId !== userId) {
    return next(new AppError('You do not have permission to delete this category.', 403));
  }

  // 4. Delete
  await prisma.category.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
