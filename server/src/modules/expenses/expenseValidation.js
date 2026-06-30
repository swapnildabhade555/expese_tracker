import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string({
      required_error: 'Description is required',
    })
    .min(2, 'Description must be at least 2 characters')
    .max(100, 'Description cannot exceed 100 characters')
    .trim(),
    amount: z.coerce.number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be a positive number'),
    date: z.coerce.date().optional(),
    categoryId: z.string({
      required_error: 'Category ID is required',
    })
    .uuid('Invalid category ID'),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Expense ID is required' }).uuid('Invalid expense ID'),
  }),
  body: z.object({
    description: z.string()
      .min(2, 'Description must be at least 2 characters')
      .max(100, 'Description cannot exceed 100 characters')
      .trim()
      .optional(),
    amount: z.coerce.number({ invalid_type_error: 'Amount must be a number' })
      .positive('Amount must be a positive number')
      .optional(),
    date: z.coerce.date().optional(),
    categoryId: z.string().uuid('Invalid category ID').optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field to update must be provided',
  }),
});

export const getExpensesQuerySchema = z.object({
  query: z.object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minAmount: z.coerce.number().positive().optional(),
    maxAmount: z.coerce.number().positive().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(10),
    sortBy: z.string().optional().default('date:desc'),
  }),
});

export const createRecurringExpenseSchema = z.object({
  body: z.object({
    description: z.string({
      required_error: 'Description is required',
    })
    .min(2, 'Description must be at least 2 characters')
    .max(100, 'Description cannot exceed 100 characters')
    .trim(),
    amount: z.coerce.number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be a positive number'),
    startDate: z.coerce.date().optional(),
    interval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      required_error: 'Interval is required',
      invalid_type_error: 'Interval must be one of DAILY, WEEKLY, MONTHLY, YEARLY',
    }),
    categoryId: z.string({
      required_error: 'Category ID is required',
    })
    .uuid('Invalid category ID'),
  }),
});

export const updateRecurringExpenseSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Recurring expense ID is required' }).uuid('Invalid recurring expense ID'),
  }),
  body: z.object({
    description: z.string()
      .min(2, 'Description must be at least 2 characters')
      .max(100, 'Description cannot exceed 100 characters')
      .trim()
      .optional(),
    amount: z.coerce.number({ invalid_type_error: 'Amount must be a number' })
      .positive('Amount must be a positive number')
      .optional(),
    startDate: z.coerce.date().optional(),
    interval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    categoryId: z.string().uuid('Invalid category ID').optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field to update must be provided',
  }),
});
