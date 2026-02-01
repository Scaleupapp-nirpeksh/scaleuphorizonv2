import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { SubscriptionStatus, TRACKING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Address Schema ============

export const addressSchema = z
  .object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
  })
  .openapi('CustomerAddress');

// ============ Subscription Status Schema ============

export const subscriptionStatusSchema = z
  .enum(Object.values(SubscriptionStatus) as [string, ...string[]])
  .openapi({
    description: 'Customer subscription status',
    example: 'active',
  });

// ============ Create Customer Schema ============

export const createCustomerSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .openapi({ example: 'Acme Corporation' }),
      email: z.string().email().optional().openapi({ example: 'billing@acme.com' }),
      phone: z.string().max(30).optional().openapi({ example: '+1-555-123-4567' }),
      company: z.string().max(200).optional().openapi({ example: 'Acme Corp' }),
      subscriptionStatus: subscriptionStatusSchema.optional(),
      monthlyValue: z.number().min(0).optional().default(0).openapi({ example: 999.0 }),
      subscriptionStartDate: z.string().datetime({ message: 'Invalid date format' }).optional(),
      subscriptionEndDate: z.string().datetime({ message: 'Invalid date format' }).optional(),
      address: addressSchema.optional(),
      contactName: z.string().max(100).optional().openapi({ example: 'John Smith' }),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
    })
    .openapi('CreateCustomerRequest'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];

// ============ Update Customer Schema ============

export const updateCustomerSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().max(30).optional().nullable(),
      company: z.string().max(200).optional().nullable(),
      subscriptionStatus: subscriptionStatusSchema.optional().nullable(),
      monthlyValue: z.number().min(0).optional(),
      subscriptionStartDate: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
      subscriptionEndDate: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
      address: addressSchema.optional().nullable(),
      contactName: z.string().max(100).optional().nullable(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      isActive: z.boolean().optional(),
    })
    .openapi('UpdateCustomerRequest'),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];

// ============ Query Schema ============

export const customerQuerySchema = z.object({
  query: z
    .object({
      isActive: z.coerce.boolean().optional(),
      subscriptionStatus: subscriptionStatusSchema.optional(),
      hasSubscription: z.coerce.boolean().optional(),
      search: z.string().optional(),
      tags: z.string().optional(), // Comma-separated
      minMonthlyValue: z.coerce.number().optional(),
      maxMonthlyValue: z.coerce.number().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['name', 'totalRevenue', 'monthlyValue', 'revenueEntryCount', 'createdAt']).default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })
    .openapi('CustomerQueryParams'),
});

export type CustomerQueryInput = z.infer<typeof customerQuerySchema>['query'];

// ============ Response Schemas ============

export const customerResponseSchema = z
  .object({
    id: z.string(),
    organization: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    subscriptionStatus: subscriptionStatusSchema.optional(),
    monthlyValue: z.number(),
    subscriptionStartDate: z.string().optional(),
    subscriptionEndDate: z.string().optional(),
    totalRevenue: z.number(),
    revenueEntryCount: z.number(),
    firstPurchaseDate: z.string().optional(),
    lastPurchaseDate: z.string().optional(),
    address: addressSchema.optional(),
    contactName: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Customer');

export const singleCustomerResponseSchema = z.object({
  success: z.literal(true),
  data: customerResponseSchema,
});

export const customerListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(customerResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});
