import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { BankAccountType, TRACKING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Bank Account Type Schema ============

export const bankAccountTypeSchema = z
  .enum(Object.values(BankAccountType) as [string, ...string[]])
  .openapi({
    description: 'Type of bank account',
    example: 'checking',
  });

// ============ Create Bank Account Schema ============

export const createBankAccountSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .openapi({ example: 'Main Operating Account' }),
      bankName: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .openapi({ example: 'Chase Bank' }),
      accountNumber: z
        .string()
        .max(TRACKING_CONSTANTS.ACCOUNT_NUMBER_DISPLAY_DIGITS)
        .openapi({ example: '1234', description: 'Last 4 digits only' }),
      accountType: bankAccountTypeSchema.openapi({ example: 'checking' }),
      currency: z
        .string()
        .length(3)
        .toUpperCase()
        .optional()
        .default('USD')
        .openapi({ example: 'USD' }),
      currentBalance: z.number().optional().default(0).openapi({ example: 50000.0 }),
      linkedAccountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional()
        .openapi({ description: 'Link to asset account in Chart of Accounts' }),
      description: z.string().max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
    })
    .openapi('CreateBankAccountRequest'),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>['body'];

// ============ Update Bank Account Schema ============

export const updateBankAccountSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .optional(),
      bankName: z
        .string()
        .min(TRACKING_CONSTANTS.NAME_MIN_LENGTH)
        .max(TRACKING_CONSTANTS.NAME_MAX_LENGTH)
        .optional(),
      accountNumber: z
        .string()
        .max(TRACKING_CONSTANTS.ACCOUNT_NUMBER_DISPLAY_DIGITS)
        .optional(),
      accountType: bankAccountTypeSchema.optional(),
      currency: z.string().length(3).toUpperCase().optional(),
      currentBalance: z.number().optional(),
      linkedAccountId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account ID format')
        .optional()
        .nullable(),
      description: z.string().max(TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional().nullable(),
      notes: z.string().max(TRACKING_CONSTANTS.NOTES_MAX_LENGTH).optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .openapi('UpdateBankAccountRequest'),
});

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>['body'];

// ============ Query Schema ============

export const bankAccountQuerySchema = z.object({
  query: z
    .object({
      isActive: z.coerce.boolean().optional(),
      accountType: bankAccountTypeSchema.optional(),
      hasLinkedAccount: z.coerce.boolean().optional(),
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['name', 'bankName', 'currentBalance', 'lastImportDate', 'createdAt']).default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })
    .openapi('BankAccountQueryParams'),
});

export type BankAccountQueryInput = z.infer<typeof bankAccountQuerySchema>['query'];

// ============ Response Schemas ============

export const bankAccountResponseSchema = z
  .object({
    id: z.string(),
    organization: z.string(),
    name: z.string(),
    bankName: z.string(),
    accountNumber: z.string(),
    accountType: bankAccountTypeSchema,
    currency: z.string(),
    currentBalance: z.number(),
    lastImportDate: z.string().optional(),
    lastImportedBalance: z.number().optional(),
    linkedAccount: z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
      })
      .optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('BankAccount');

export const singleBankAccountResponseSchema = z.object({
  success: z.literal(true),
  data: bankAccountResponseSchema,
});

export const bankAccountListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(bankAccountResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});
