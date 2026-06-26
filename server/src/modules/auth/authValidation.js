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
