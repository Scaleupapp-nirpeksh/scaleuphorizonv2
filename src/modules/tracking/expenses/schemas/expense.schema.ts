import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ExpenseStatus, RecurringFrequency, PaymentMethod, TRACKING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Enums ============

export const expenseStatusSchema = z
  .enum(Object.values(ExpenseStatus) as [string, ...string[]])
  .openapi({
    description: 'Expense status',
    example: 'draft',
  });

export const recurringFrequencySchema = z
  .enum(Object.values(RecurringFrequency) as [string, ...string[]])
  .openapi({
    description: 'Recurring frequency',
    example: 'monthly',
  });

export const paymentMethodSchema = z
  .enum(Object.values(PaymentMethod) as [string, ...string[]])
  .openapi({
    description: 'Payment method',
    example: 'bank_transfer',
  });

// ============ Create Expense Schema ============

export const createExpenseSchema = z.object({
  body: z
    .object({
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .openapi({ description: 'Expense account from Chart of Accounts (expense type only)' }),
      vendorId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid vendor ID format')
        .optional()
        .openapi({ description: 'Vendor ID' }),
      amount: z.number().positive('Amount must be positive').openapi({ example: 250.0 }),
      date: z
        .string()
        .datetime({ message: 'Invalid date format' })
        .openapi({ example: '2024-03-15T00:00:00.000Z' }),
      dueDate: z.string().datetime({ message: 'Invalid date format' }).optional(),
      description: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
        .openapi({ example: 'Office supplies' }),
      status: expenseStatusSchema.optional(),
      isRecurring: z.boolean().optional().default(false),
      recurringFrequency: recurringFrequencySchema.optional(),
      recurringEndDate: z.string().datetime({ message: 'Invalid date format' }).optional(),
      receipt: z.string().optional(),
      attachments: z.array(z.string()).max(TRACKING_CONSTANTS.MAX_ATTACHMENTS).optional(),
      department: z.string().max(100).optional(),
      costCenter: z.string().max(100).optional(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
    })
    .refine(
      (data) => {
        if (data.isRecurring && !data.recurringFrequency) {
          return false;
        }
        return true;
      },
      {
        message: 'Recurring frequency is required for recurring expenses',
        path: ['recurringFrequency'],
      }
    )
    .openapi('CreateExpenseRequest'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];

// ============ Update Expense Schema ============

export const updateExpenseSchema = z.object({
  body: z
    .object({
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional(),
      vendorId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid vendor ID format')
        .optional()
        .nullable(),
      amount: z.number().positive('Amount must be positive').optional(),
      date: z.string().datetime({ message: 'Invalid date format' }).optional(),
      dueDate: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
      description: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
        .optional(),
      isRecurring: z.boolean().optional(),
      recurringFrequency: recurringFrequencySchema.optional().nullable(),
      recurringEndDate: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
      receipt: z.string().optional().nullable(),
      attachments: z.array(z.string()).max(TRACKING_CONSTANTS.MAX_ATTACHMENTS).optional(),
      department: z.string().max(100).optional().nullable(),
      costCenter: z.string().max(100).optional().nullable(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
    })
    .openapi('UpdateExpenseRequest'),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];

// ============ Workflow Schemas ============

export const approveExpenseSchema = z.object({
  body: z
    .object({
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
    })
    .openapi('ApproveExpenseRequest'),
});

export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>['body'];

export const rejectExpenseSchema = z.object({
  body: z
    .object({
      reason: z
        .string()
        .min(1, 'Rejection reason is required')
        .max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH)
        .openapi({ example: 'Missing receipt' }),
    })
    .openapi('RejectExpenseRequest'),
});

export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>['body'];

export const payExpenseSchema = z.object({
  body: z
    .object({
      paymentMethod: paymentMethodSchema.openapi({ example: 'bank_transfer' }),
      paymentReference: z.string().max(TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH).optional(),
      paidAt: z.string().datetime({ message: 'Invalid date format' }).optional(),
    })
    .openapi('PayExpenseRequest'),
});

export type PayExpenseInput = z.infer<typeof payExpenseSchema>['body'];

// ============ Query Schema ============

export const expenseQuerySchema = z.object({
  query: z
    .object({
      status: expenseStatusSchema.optional(),
      vendorId: z.string().optional(),
      accountId: z.string().optional(),
      category: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      minAmount: z.coerce.number().optional(),
      maxAmount: z.coerce.number().optional(),
      isRecurring: z.coerce.boolean().optional(),
      department: z.string().optional(),
      costCenter: z.string().optional(),
      search: z.string().optional(),
      tags: z.string().optional(), // Comma-separated
      isArchived: z.coerce.boolean().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['date', 'amount', 'dueDate', 'createdAt', 'status']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('ExpenseQueryParams'),
});

export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>['query'];

// ============ Response Schemas ============

export const expenseResponseSchema = z
  .object({
    id: z.string(),
    organization: z.string(),
    account: z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        type: z.string(),
        subtype: z.string(),
      })
      .optional(),
    vendor: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
    amount: z.number(),
    date: z.string(),
    dueDate: z.string().optional(),
    description: z.string(),
    category: z.string(),
    status: expenseStatusSchema,
    submittedBy: z.string().optional(),
    submittedAt: z.string().optional(),
    approvedBy: z.string().optional(),
    approvedAt: z.string().optional(),
    approvalNotes: z.string().optional(),
    rejectedBy: z.string().optional(),
    rejectedAt: z.string().optional(),
    rejectionReason: z.string().optional(),
    paidAt: z.string().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    paymentReference: z.string().optional(),
    isRecurring: z.boolean(),
    recurringFrequency: recurringFrequencySchema.optional(),
    recurringEndDate: z.string().optional(),
    receipt: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    transaction: z.string().optional(),
    department: z.string().optional(),
    costCenter: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Expense');

export const singleExpenseResponseSchema = z.object({
  success: z.literal(true),
  data: expenseResponseSchema,
});

export const expenseListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(expenseResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export const expenseSummaryResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      totalAmount: z.number(),
      expenseCount: z.number(),
      byCategory: z.record(z.number()),
      byVendor: z.record(z.number()),
      byStatus: z.record(z.number()),
      pendingApprovals: z.number(),
      recurringTotal: z.number(),
    }),
  })
  .openapi('ExpenseSummaryResponse');
