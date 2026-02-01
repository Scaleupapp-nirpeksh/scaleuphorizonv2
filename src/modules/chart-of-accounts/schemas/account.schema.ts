import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { AccountTypes, AccountSubtypes, CHART_OF_ACCOUNTS_CONSTANTS } from '../constants';

extendZodWithOpenApi(z);

const { NAME_MIN_LENGTH, NAME_MAX_LENGTH, CODE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } =
  CHART_OF_ACCOUNTS_CONSTANTS;

// Account type enum
export const accountTypeSchema = z.enum(
  Object.values(AccountTypes) as [string, ...string[]]
).openapi({
  description: 'Account type',
  example: 'expense',
});

// Account subtype enum
export const accountSubtypeSchema = z.enum(
  Object.values(AccountSubtypes) as [string, ...string[]]
).openapi({
  description: 'Account subtype for categorization',
  example: 'marketing',
});

// Base account schema (shared fields)
const baseAccountSchema = z.object({
  id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
  code: z.string().openapi({ example: '7110' }),
  name: z.string().openapi({ example: 'Digital Advertising' }),
  description: z.string().optional().openapi({ example: 'All digital marketing spend' }),
  type: accountTypeSchema,
  subtype: accountSubtypeSchema,
  parent: z.string().nullable().optional().openapi({ example: '507f1f77bcf86cd799439010' }),
  isSystem: z.boolean().openapi({ example: false }),
  isActive: z.boolean().openapi({ example: true }),
  depth: z.number().openapi({ example: 2 }),
  createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  updatedAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
});

// Account response schema
export const accountSchema = baseAccountSchema.openapi('Account');

// Account tree node schema (for OpenAPI docs - simplified without recursion)
// The actual runtime allows nested children, but OpenAPI can't represent infinite recursion
export const accountTreeNodeSchema = z.object({
  id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
  code: z.string().openapi({ example: '7100' }),
  name: z.string().openapi({ example: 'Marketing and Advertising' }),
  description: z.string().optional().openapi({ example: 'All marketing expenses' }),
  type: accountTypeSchema,
  subtype: accountSubtypeSchema,
  isSystem: z.boolean().openapi({ example: true }),
  isActive: z.boolean().openapi({ example: true }),
  depth: z.number().openapi({ example: 1 }),
  children: z.array(z.any()).openapi({
    description: 'Nested child accounts (recursive structure)',
    example: [],
  }),
}).openapi('AccountTreeNode');

// Create account request
export const createAccountSchema = z.object({
  body: z.object({
    code: z
      .string()
      .max(CODE_MAX_LENGTH)
      .optional()
      .openapi({ example: '7115', description: 'Optional - auto-generated if not provided' }),
    name: z
      .string()
      .min(NAME_MIN_LENGTH)
      .max(NAME_MAX_LENGTH)
      .openapi({ example: 'Social Media Advertising' }),
    description: z
      .string()
      .max(DESCRIPTION_MAX_LENGTH)
      .optional()
      .openapi({ example: 'Facebook, Instagram, LinkedIn ads' }),
    type: accountTypeSchema,
    subtype: accountSubtypeSchema,
    parentId: z
      .string()
      .optional()
      .openapi({ example: '507f1f77bcf86cd799439010', description: 'Parent account ID' }),
  }),
});

// Update account request
export const updateAccountSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(NAME_MIN_LENGTH)
      .max(NAME_MAX_LENGTH)
      .optional()
      .openapi({ example: 'Updated Account Name' }),
    description: z
      .string()
      .max(DESCRIPTION_MAX_LENGTH)
      .optional()
      .nullable()
      .openapi({ example: 'Updated description' }),
    subtype: accountSubtypeSchema.optional(),
    parentId: z
      .string()
      .optional()
      .nullable()
      .openapi({ example: '507f1f77bcf86cd799439010' }),
    isActive: z.boolean().optional().openapi({ example: true }),
  }),
});

// Account ID param
export const accountIdParamSchema = z.object({
  params: z.object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
  }),
});

// Query filters
export const accountQuerySchema = z.object({
  query: z.object({
    type: accountTypeSchema.optional(),
    subtype: accountSubtypeSchema.optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    parentId: z.string().optional().nullable(),
    search: z.string().optional().openapi({ example: 'marketing' }),
  }),
});

// Seed request
export const seedChartSchema = z.object({
  body: z.object({
    overwrite: z
      .boolean()
      .optional()
      .default(false)
      .openapi({ example: false, description: 'Replace existing accounts' }),
  }),
});

// Response schemas
export const accountListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(accountSchema),
});

export const singleAccountResponseSchema = z.object({
  success: z.literal(true),
  data: accountSchema,
});

export const accountTreeResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(accountTreeNodeSchema),
});

export const seedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    created: z.number().openapi({ example: 45 }),
    message: z.string().openapi({ example: 'Chart of accounts seeded successfully' }),
  }),
});

export const deleteAccountResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().openapi({ example: 'Account archived successfully' }),
});

// Type exports
export type CreateAccountInput = z.infer<typeof createAccountSchema>['body'];
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>['body'];
export type AccountQueryInput = z.infer<typeof accountQuerySchema>['query'];
export type SeedChartInput = z.infer<typeof seedChartSchema>['body'];
export type AccountResponse = z.infer<typeof accountSchema>;
