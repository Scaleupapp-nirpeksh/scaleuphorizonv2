import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  TransactionType,
  TransactionStatus,
  TransactionSource,
  PaymentMethod,
  LinkedEntityType,
  TRACKING_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

// ============ Enums ============

export const transactionTypeSchema = z
  .enum(Object.values(TransactionType) as [string, ...string[]])
  .openapi({
    description: 'Transaction type',
    example: 'expense',
  });

export const transactionStatusSchema = z
  .enum(Object.values(TransactionStatus) as [string, ...string[]])
  .openapi({
    description: 'Transaction status',
    example: 'pending',
  });

export const transactionSourceSchema = z
  .enum(Object.values(TransactionSource) as [string, ...string[]])
  .openapi({
    description: 'Transaction source',
    example: 'manual',
  });

export const paymentMethodSchema = z
  .enum(Object.values(PaymentMethod) as [string, ...string[]])
  .openapi({
    description: 'Payment method',
    example: 'bank_transfer',
  });

export const linkedEntityTypeSchema = z
  .enum(Object.values(LinkedEntityType) as [string, ...string[]])
  .openapi({
    description: 'Linked entity type',
    example: 'expense',
  });

// ============ Linked Entity Schema ============

export const linkedEntitySchema = z
  .object({
    entityType: linkedEntityTypeSchema,
    entityId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  })
  .openapi('LinkedEntity');

// ============ Create Transaction Schema ============

export const createTransactionSchema = z.object({
  body: z
    .object({
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .openapi({ description: 'Chart of Accounts account ID (leaf account only)' }),
      type: transactionTypeSchema,
      amount: z.number().positive('Amount must be positive').openapi({ example: 1500.0 }),
      date: z
        .string()
        .datetime({ message: 'Invalid date format' })
        .openapi({ example: '2024-03-15T00:00:00.000Z' }),
      description: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
        .openapi({ example: 'Office supplies purchase' }),
      reference: z
        .string()
        .max(TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH)
        .optional()
        .openapi({ example: 'INV-2024-001' }),
      paymentMethod: paymentMethodSchema.optional(),
      status: transactionStatusSchema.optional(),
      source: transactionSourceSchema.optional(),
      linkedEntities: z.array(linkedEntitySchema).optional(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
      attachments: z.array(z.string()).max(TRACKING_CONSTANTS.MAX_ATTACHMENTS).optional(),
    })
    .openapi('CreateTransactionRequest'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];

// ============ Update Transaction Schema ============

export const updateTransactionSchema = z.object({
  body: z
    .object({
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional(),
      type: transactionTypeSchema.optional(),
      amount: z.number().positive('Amount must be positive').optional(),
      date: z.string().datetime({ message: 'Invalid date format' }).optional(),
      description: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
        .optional(),
      reference: z.string().max(TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH).optional().nullable(),
      paymentMethod: paymentMethodSchema.optional().nullable(),
      status: transactionStatusSchema.optional(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
      attachments: z.array(z.string()).max(TRACKING_CONSTANTS.MAX_ATTACHMENTS).optional(),
    })
    .openapi('UpdateTransactionRequest'),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];

// ============ Bulk Create Schema ============

export const bulkCreateTransactionSchema = z.object({
  body: z
    .object({
      transactions: z
        .array(createTransactionSchema.shape.body)
        .min(1)
        .max(TRACKING_CONSTANTS.MAX_BULK_TRANSACTIONS)
        .openapi({ description: 'Array of transactions to create' }),
    })
    .openapi('BulkCreateTransactionsRequest'),
});

export type BulkCreateTransactionInput = z.infer<typeof bulkCreateTransactionSchema>['body'];

// ============ Bulk Categorize Schema ============

export const bulkCategorizeSchema = z.object({
  body: z
    .object({
      transactionIds: z
        .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID format'))
        .min(1)
        .max(TRACKING_CONSTANTS.MAX_BULK_TRANSACTIONS)
        .openapi({ description: 'Array of transaction IDs to categorize' }),
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .openapi({ description: 'New account ID for categorization' }),
    })
    .openapi('BulkCategorizeRequest'),
});

export type BulkCategorizeInput = z.infer<typeof bulkCategorizeSchema>['body'];

// ============ Query Schema ============

export const transactionQuerySchema = z.object({
  query: z
    .object({
      type: transactionTypeSchema.optional(),
      status: transactionStatusSchema.optional(),
      source: transactionSourceSchema.optional(),
      accountId: z.string().optional(),
      category: z.string().optional(),
      paymentMethod: paymentMethodSchema.optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      minAmount: z.coerce.number().optional(),
      maxAmount: z.coerce.number().optional(),
      search: z.string().optional(),
      tags: z.string().optional(), // Comma-separated
      isArchived: z.coerce.boolean().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['date', 'amount', 'description', 'createdAt']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('TransactionQueryParams'),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>['query'];

// ============ Response Schemas ============

export const transactionResponseSchema = z
  .object({
    id: z.string(),
    organization: z.string(),
    account: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      type: z.string(),
      subtype: z.string(),
    }).optional(),
    type: transactionTypeSchema,
    amount: z.number(),
    date: z.string(),
    description: z.string(),
    reference: z.string().optional(),
    category: z.string(),
    paymentMethod: paymentMethodSchema.optional(),
    status: transactionStatusSchema,
    source: transactionSourceSchema,
    linkedEntities: z.array(linkedEntitySchema).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Transaction');

export const singleTransactionResponseSchema = z.object({
  success: z.literal(true),
  data: transactionResponseSchema,
});

export const transactionListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(transactionResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export const transactionSummaryResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      totalIncome: z.number(),
      totalExpenses: z.number(),
      netAmount: z.number(),
      transactionCount: z.number(),
      byCategory: z.record(z.number()),
      byPaymentMethod: z.record(z.number()),
      byStatus: z.record(z.number()),
    }),
  })
  .openapi('TransactionSummaryResponse');

export const bulkCreateResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    created: z.number(),
    errors: z.array(z.string()),
  }),
});

export const bulkCategorizeResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    updated: z.number(),
  }),
});
