import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { RevenueEntryStatus, RevenueType, PaymentMethod, TRACKING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Enums ============

export const revenueEntryStatusSchema = z
  .enum(Object.values(RevenueEntryStatus) as [string, ...string[]])
  .openapi({
    description: 'Revenue entry status',
    example: 'pending',
  });

export const revenueTypeSchema = z
  .enum(Object.values(RevenueType) as [string, ...string[]])
  .openapi({
    description: 'Revenue type',
    example: 'subscription',
  });

export const paymentMethodSchema = z
  .enum(Object.values(PaymentMethod) as [string, ...string[]])
  .openapi({
    description: 'Payment method',
    example: 'bank_transfer',
  });

// ============ Create Revenue Entry Schema ============

export const createRevenueEntrySchema = z.object({
  body: z
    .object({
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .openapi({ description: 'Revenue account from Chart of Accounts (revenue type only)' }),
      customerId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format')
        .optional()
        .openapi({ description: 'Customer ID' }),
      amount: z.number().positive('Amount must be positive').openapi({ example: 999.0 }),
      date: z
        .string()
        .datetime({ message: 'Invalid date format' })
        .openapi({ example: '2024-03-15T00:00:00.000Z' }),
      description: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
        .openapi({ example: 'Monthly subscription - Enterprise plan' }),
      invoiceNumber: z
        .string()
        .max(TRACKING_CONSTANTS.INVOICE_NUMBER_MAX_LENGTH)
        .optional()
        .openapi({ example: 'INV-2024-001' }),
      revenueType: revenueTypeSchema.openapi({ example: 'subscription' }),
      status: revenueEntryStatusSchema.optional().default('pending'),
      revenueStreamId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid revenue stream ID format')
        .optional()
        .openapi({ description: 'Link to revenue stream from Planning module' }),
      subscriptionPeriodStart: z.string().datetime({ message: 'Invalid date format' }).optional(),
      subscriptionPeriodEnd: z.string().datetime({ message: 'Invalid date format' }).optional(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
      attachments: z.array(z.string()).max(TRACKING_CONSTANTS.MAX_ATTACHMENTS).optional(),
    })
    .openapi('CreateRevenueEntryRequest'),
});

export type CreateRevenueEntryInput = z.infer<typeof createRevenueEntrySchema>['body'];

// ============ Update Revenue Entry Schema ============

export const updateRevenueEntrySchema = z.object({
  body: z
    .object({
      accountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional(),
      customerId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format')
        .optional()
        .nullable(),
      amount: z.number().positive('Amount must be positive').optional(),
      date: z.string().datetime({ message: 'Invalid date format' }).optional(),
      description: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
        .optional(),
      invoiceNumber: z
        .string()
        .max(TRACKING_CONSTANTS.INVOICE_NUMBER_MAX_LENGTH)
        .optional()
        .nullable(),
      revenueType: revenueTypeSchema.optional(),
      revenueStreamId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid revenue stream ID format')
        .optional()
        .nullable(),
      subscriptionPeriodStart: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
      subscriptionPeriodEnd: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
      attachments: z.array(z.string()).max(TRACKING_CONSTANTS.MAX_ATTACHMENTS).optional(),
    })
    .openapi('UpdateRevenueEntryRequest'),
});

export type UpdateRevenueEntryInput = z.infer<typeof updateRevenueEntrySchema>['body'];

// ============ Workflow Schemas ============

export const receiveRevenueEntrySchema = z.object({
  body: z
    .object({
      paymentMethod: paymentMethodSchema.openapi({ example: 'bank_transfer' }),
      paymentReference: z.string().max(TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH).optional(),
      receivedAt: z.string().datetime({ message: 'Invalid date format' }).optional(),
    })
    .openapi('ReceiveRevenueEntryRequest'),
});

export type ReceiveRevenueEntryInput = z.infer<typeof receiveRevenueEntrySchema>['body'];

export const cancelRevenueEntrySchema = z.object({
  body: z
    .object({
      reason: z
        .string()
        .max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH)
        .optional()
        .openapi({ example: 'Customer requested cancellation' }),
    })
    .openapi('CancelRevenueEntryRequest'),
});

export type CancelRevenueEntryInput = z.infer<typeof cancelRevenueEntrySchema>['body'];

// ============ Query Schema ============

export const revenueEntryQuerySchema = z.object({
  query: z
    .object({
      status: revenueEntryStatusSchema.optional(),
      revenueType: revenueTypeSchema.optional(),
      customerId: z.string().optional(),
      accountId: z.string().optional(),
      category: z.string().optional(),
      invoiceNumber: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      minAmount: z.coerce.number().optional(),
      maxAmount: z.coerce.number().optional(),
      revenueStreamId: z.string().optional(),
      search: z.string().optional(),
      tags: z.string().optional(), // Comma-separated
      isArchived: z.coerce.boolean().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['date', 'amount', 'createdAt', 'status']).default('date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('RevenueEntryQueryParams'),
});

export type RevenueEntryQueryInput = z.infer<typeof revenueEntryQuerySchema>['query'];

// ============ Response Schemas ============

export const revenueEntryResponseSchema = z
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
    customer: z
      .object({
        id: z.string(),
        name: z.string(),
        company: z.string().optional(),
      })
      .optional(),
    amount: z.number(),
    date: z.string(),
    description: z.string(),
    category: z.string(),
    invoiceNumber: z.string().optional(),
    revenueType: revenueTypeSchema,
    status: revenueEntryStatusSchema,
    receivedAt: z.string().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    paymentReference: z.string().optional(),
    revenueStream: z.string().optional(),
    transaction: z.string().optional(),
    subscriptionPeriodStart: z.string().optional(),
    subscriptionPeriodEnd: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('RevenueEntry');

export const singleRevenueEntryResponseSchema = z.object({
  success: z.literal(true),
  data: revenueEntryResponseSchema,
});

export const revenueEntryListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(revenueEntryResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

// ============ MRR/ARR Response Schema ============

export const mrrMetricsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      mrr: z.number().openapi({ description: 'Monthly Recurring Revenue' }),
      arr: z.number().openapi({ description: 'Annual Recurring Revenue' }),
      activeSubscribers: z.number(),
      averageRevenuePerCustomer: z.number(),
      mrrGrowth: z.number().openapi({ description: 'MRR growth percentage compared to previous month' }),
      churnedMRR: z.number().openapi({ description: 'MRR lost from churned customers' }),
      newMRR: z.number().openapi({ description: 'MRR from new customers this month' }),
      expansionMRR: z.number().openapi({ description: 'MRR from upsells/upgrades' }),
      netNewMRR: z.number().openapi({ description: 'Net change in MRR (new + expansion - churned)' }),
    }),
  })
  .openapi('MRRMetricsResponse');

// ============ Revenue Summary Response Schema ============

export const revenueSummaryResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      totalRevenue: z.number(),
      receivedRevenue: z.number(),
      pendingRevenue: z.number(),
      cancelledRevenue: z.number(),
      revenueEntryCount: z.number(),
      byCategory: z.record(z.number()),
      byCustomer: z.record(z.number()),
      byRevenueType: z.record(z.number()),
      byMonth: z.array(
        z.object({
          month: z.string(),
          total: z.number(),
          received: z.number(),
          pending: z.number(),
        })
      ),
    }),
  })
  .openapi('RevenueSummaryResponse');
