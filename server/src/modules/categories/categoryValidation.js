import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Category name is required',
    })
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name cannot exceed 50 characters')
    .trim(),
    icon: z.string()
    .min(1, 'Icon must be at least 1 character')
    .max(10, 'Icon cannot exceed 10 characters')
    .trim()
    .optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Category ID is required' }).uuid('Invalid category ID'),
  }),
  body: z.object({
    name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name cannot exceed 50 characters')
    .trim()
    .optional(),
    icon: z.string()
    .min(1, 'Icon must be at least 1 character')
    .max(10, 'Icon cannot exceed 10 characters')
    .trim()
    .optional(),
  }).refine(data => data.name || data.icon, {
    message: 'At least one of name or icon must be provided',
  }),
});
