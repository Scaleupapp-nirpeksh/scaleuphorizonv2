import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { TRACKING_CONSTANTS } from '../../constants';

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
  .openapi('Address');

// ============ Create Vendor Schema ============

export const createVendorSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .openapi({ example: 'Acme Corp' }),
      email: z.string().email().optional().openapi({ example: 'billing@acme.com' }),
      phone: z.string().max(30).optional().openapi({ example: '+1-555-123-4567' }),
      address: addressSchema.optional(),
      taxId: z.string().max(TRACKING_CONSTANTS.TAX_ID_MAX_LENGTH).optional().openapi({ example: '12-3456789' }),
      paymentTerms: z.string().max(TRACKING_CONSTANTS.PAYMENT_TERMS_MAX_LENGTH).optional().openapi({ example: 'Net 30' }),
      defaultAccountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional()
        .openapi({ description: 'Default expense account from Chart of Accounts' }),
      contactName: z.string().max(100).optional().openapi({ example: 'John Smith' }),
      website: z.string().max(200).optional().openapi({ example: 'https://acme.com' }),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
    })
    .openapi('CreateVendorRequest'),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>['body'];

// ============ Update Vendor Schema ============

export const updateVendorSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().max(30).optional().nullable(),
      address: addressSchema.optional().nullable(),
      taxId: z.string().max(TRACKING_CONSTANTS.TAX_ID_MAX_LENGTH).optional().nullable(),
      paymentTerms: z.string().max(TRACKING_CONSTANTS.PAYMENT_TERMS_MAX_LENGTH).optional().nullable(),
      defaultAccountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional()
        .nullable(),
      contactName: z.string().max(100).optional().nullable(),
      website: z.string().max(200).optional().nullable(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
      tags: z
        .array(z.string().max(TRACKING_CONSTANTS.TAG_MAX_LENGTH))
        .max(TRACKING_CONSTANTS.MAX_TAGS)
        .optional(),
      isActive: z.boolean().optional(),
    })
    .openapi('UpdateVendorRequest'),
});

export type UpdateVendorInput = z.infer<typeof updateVendorSchema>['body'];

// ============ Query Schema ============

export const vendorQuerySchema = z.object({
  query: z
    .object({
      isActive: z.coerce.boolean().optional(),
      hasDefaultAccount: z.coerce.boolean().optional(),
      search: z.string().optional(),
      tags: z.string().optional(), // Comma-separated
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['name', 'totalSpent', 'expenseCount', 'createdAt']).default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })
    .openapi('VendorQueryParams'),
});

export type VendorQueryInput = z.infer<typeof vendorQuerySchema>['query'];

// ============ Response Schemas ============

export const vendorResponseSchema = z
  .object({
    id: z.string(),
    organization: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: addressSchema.optional(),
    taxId: z.string().optional(),
    paymentTerms: z.string().optional(),
    defaultAccount: z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
      })
      .optional(),
    totalSpent: z.number(),
    expenseCount: z.number(),
    lastExpenseDate: z.string().optional(),
    contactName: z.string().optional(),
    website: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Vendor');

export const singleVendorResponseSchema = z.object({
  success: z.literal(true),
  data: vendorResponseSchema,
});

export const vendorListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(vendorResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});
