import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Group name is required',
    }).trim().min(1, 'Group name cannot be empty').max(100, 'Group name cannot exceed 100 characters'),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'AUD'], {
      invalid_type_error: 'Supported currencies are INR, USD, EUR, or AUD',
    }).default('INR'),
  }),
});

export const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Group name cannot be empty').max(100, 'Group name cannot exceed 100 characters').optional(),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'AUD'], {
      invalid_type_error: 'Supported currencies are INR, USD, EUR, or AUD',
    }).optional(),
  }),
});

export const memberActionSchema = z.object({
  body: z.object({
    memberUserId: z.string({
      required_error: 'Member User ID is required',
    }).uuid('Invalid user ID format'),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    memberUserId: z.string({
      required_error: 'Member User ID is required',
    }).uuid('Invalid user ID format'),
    role: z.enum(['ADMIN', 'MEMBER'], {
      required_error: 'Role is required',
      invalid_type_error: 'Role must be ADMIN or MEMBER',
    }),
  }),
});

export const createInvitationSchema = z.object({
  body: z.object({
    invitedEmail: z.string({
      required_error: 'Invited email is required',
    }).email('Invalid email address format'),
  }),
});

export const joinWithCodeSchema = z.object({
  body: z.object({
    joinCode: z.string({
      required_error: 'Join code is required',
    }).trim().min(1, 'Join code cannot be empty'),
  }),
});

export const joinWithInviteTokenSchema = z.object({
  body: z.object({
    token: z.string({
      required_error: 'Invitation token is required',
    }).trim().min(1, 'Invitation token cannot be empty'),
  }),
});

const splitItemSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required in split item',
  }).uuid('Invalid user ID format in split item'),
  amountOwed: z.coerce.number().positive('Owed amount must be a positive number').optional(),
  share: z.coerce.number().positive('Share must be a positive number').optional(),
});

export const createExpenseSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Expense title is required',
    }).trim().min(1, 'Expense title cannot be empty').max(100, 'Title cannot exceed 100 characters'),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
    amount: z.coerce.number({
      required_error: 'Expense amount is required',
    }).positive('Expense amount must be a positive number'),
    paidById: z.string({
      required_error: 'Paid-by user ID is required',
    }).uuid('Invalid paid-by user ID format'),
    category: z.enum(['Food', 'Fuel', 'Hotel', 'Shopping', 'Travel', 'Entertainment', 'Medical', 'Miscellaneous'], {
      required_error: 'Category is required',
      invalid_type_error: 'Unsupported category',
    }),
    splitType: z.enum(['EQUAL', 'EXACT', 'SHARES', 'CUSTOM'], {
      required_error: 'Split type is required',
      invalid_type_error: 'Unsupported split type',
    }),
    splits: z.array(splitItemSchema).optional().default([]),
    receiptImage: z.string().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Expense title cannot be empty').max(100, 'Title cannot exceed 100 characters').optional(),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
    amount: z.coerce.number().positive('Expense amount must be a positive number').optional(),
    paidById: z.string().uuid('Invalid paid-by user ID format').optional(),
    category: z.enum(['Food', 'Fuel', 'Hotel', 'Shopping', 'Travel', 'Entertainment', 'Medical', 'Miscellaneous'], {
      invalid_type_error: 'Unsupported category',
    }).optional(),
    splitType: z.enum(['EQUAL', 'EXACT', 'SHARES', 'CUSTOM'], {
      invalid_type_error: 'Unsupported split type',
    }).optional(),
    splits: z.array(splitItemSchema).optional(),
    receiptImage: z.string().optional(),
  }),
});

export const recordSettlementSchema = z.object({
  body: z.object({
    payerId: z.string({
      required_error: 'Payer user ID is required',
    }).uuid('Invalid payer user ID format'),
    receiverId: z.string({
      required_error: 'Receiver user ID is required',
    }).uuid('Invalid receiver user ID format'),
    amount: z.coerce.number({
      required_error: 'Settlement amount is required',
    }).positive('Settlement amount must be a positive number'),
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED'], {
      invalid_type_error: 'Unsupported status',
    }).optional(),
  }),
});

export const updateSettlementStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED'], {
      required_error: 'Status is required',
      invalid_type_error: 'Unsupported status',
    }),
  }),
});
