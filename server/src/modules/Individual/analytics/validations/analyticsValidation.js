import { z } from 'zod';

export const breakdownSchema = z.object({
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

export const trendsSchema = z.object({
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    interval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().default('monthly'),
  }),
});

export const comparisonSchema = z.object({
  query: z.object({
    currentStartDate: z.coerce.date({
      required_error: 'currentStartDate is required',
      invalid_type_error: 'currentStartDate must be a valid date',
    }),
    currentEndDate: z.coerce.date({
      required_error: 'currentEndDate is required',
      invalid_type_error: 'currentEndDate must be a valid date',
    }),
    compareStartDate: z.coerce.date({
      required_error: 'compareStartDate is required',
      invalid_type_error: 'compareStartDate must be a valid date',
    }),
    compareEndDate: z.coerce.date({
      required_error: 'compareEndDate is required',
      invalid_type_error: 'compareEndDate must be a valid date',
    }),
  }),
});

export const driversSchema = z.object({
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(50).optional().default(5),
    categoryId: z.string().uuid('Invalid category ID').optional(),
  }),
});
