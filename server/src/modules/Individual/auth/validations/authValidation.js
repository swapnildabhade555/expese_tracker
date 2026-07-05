import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
    email: z.string({
      required_error: 'Email is required',
    })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
    password: z.string({
      required_error: 'Password is required',
    })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
    passwordConfirm: z.string({
      required_error: 'Password confirmation is required',
    }),
    currency: z.enum(['INR', 'USD', 'EUR', 'AUD']).optional(),
  }).refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
    password: z.string({
      required_error: 'Password is required',
    }),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required',
    }).trim(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters').trim().optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'AUD']).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field to update must be provided',
  }),
});
