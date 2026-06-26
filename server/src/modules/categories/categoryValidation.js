import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Category name is required',
    })
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name cannot exceed 50 characters')
    .trim(),
  }),
});
