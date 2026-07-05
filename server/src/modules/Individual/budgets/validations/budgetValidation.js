import { z } from 'zod';

export const categoryBudgetSchema = z.object({
  body: z.object({
    categoryId: z.string({
      required_error: 'Category ID is required',
    }).uuid('Invalid category ID'),
    limit: z.coerce.number({
      required_error: 'Budget limit amount is required',
      invalid_type_error: 'Limit must be a number',
    }).positive('Budget limit must be a positive number'),
  }),
});

export const monthlyBudgetSchema = z.object({
  body: z.object({
    limit: z.coerce.number({
      required_error: 'Budget limit amount is required',
      invalid_type_error: 'Limit must be a number',
    }).positive('Budget limit must be a positive number'),
  }),
});
