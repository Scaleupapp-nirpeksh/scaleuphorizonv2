import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================
// Enums
// ============================================

export const industrySchemaz = z.enum([
  'technology',
  'healthcare',
  'finance',
  'education',
  'retail',
  'manufacturing',
  'services',
  'media',
  'real_estate',
  'other',
]);

export const sizeSchemaz = z.enum(['startup', 'small', 'medium', 'large', 'enterprise']);

export const currencySchemaz = z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY']);

export const dateFormatSchemaz = z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY']);

// ============================================
// Organization Settings Schema
// ============================================

export const organizationSettingsSchema = z
  .object({
    fiscalYearStart: z
      .number()
      .min(1)
      .max(12)
      .optional()
      .openapi({ example: 1, description: 'Fiscal year start month (1-12)' }),
    currency: currencySchemaz.optional().openapi({ example: 'USD' }),
    timezone: z.string().optional().openapi({ example: 'America/New_York' }),
    dateFormat: dateFormatSchemaz.optional().openapi({ example: 'YYYY-MM-DD' }),
  })
  .openapi('OrganizationSettings');

// ============================================
// Organization Response Schema
// ============================================

export const organizationResponseSchema = z
  .object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    name: z.string().openapi({ example: 'Acme Corp' }),
    slug: z.string().openapi({ example: 'acme-corp-abc123' }),
    description: z.string().optional().openapi({ example: 'Leading tech company' }),
    logo: z.string().optional().openapi({ example: 'https://example.com/logo.png' }),
    website: z.string().optional().openapi({ example: 'https://acme.com' }),
    industry: industrySchemaz.optional().openapi({ example: 'technology' }),
    size: sizeSchemaz.optional().openapi({ example: 'startup' }),
    foundedYear: z.number().optional().openapi({ example: 2020 }),
    settings: organizationSettingsSchema,
    owner: z.string().openapi({ example: '507f1f77bcf86cd799439012' }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('Organization');

// ============================================
// Request Schemas
// ============================================

/**
 * Create organization request
 */
export const createOrganizationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1, 'Organization name is required')
        .max(100, 'Name cannot exceed 100 characters')
        .openapi({ example: 'Acme Corp' }),
      description: z
        .string()
        .max(500, 'Description cannot exceed 500 characters')
        .optional()
        .openapi({ example: 'Leading tech company' }),
      logo: z.string().url().optional().openapi({ example: 'https://example.com/logo.png' }),
      website: z.string().url().optional().openapi({ example: 'https://acme.com' }),
      industry: industrySchemaz.optional().openapi({ example: 'technology' }),
      size: sizeSchemaz.optional().openapi({ example: 'startup' }),
      foundedYear: z
        .number()
        .min(1900)
        .max(new Date().getFullYear())
        .optional()
        .openapi({ example: 2020 }),
      settings: organizationSettingsSchema.optional(),
    })
    .openapi('CreateOrganizationRequest'),
});

/**
 * Update organization request
 */
export const updateOrganizationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .openapi({ example: 'Acme Corporation' }),
      description: z.string().max(500).optional().openapi({ example: 'Updated description' }),
      logo: z.string().url().optional().openapi({ example: 'https://example.com/new-logo.png' }),
      website: z.string().url().optional().openapi({ example: 'https://acme-corp.com' }),
      industry: industrySchemaz.optional(),
      size: sizeSchemaz.optional(),
      foundedYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
      settings: organizationSettingsSchema.optional(),
    })
    .openapi('UpdateOrganizationRequest'),
});

/**
 * Organization ID parameter
 */
export const organizationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Organization ID is required'),
  }),
});

// ============================================
// Response Schemas
// ============================================

export const organizationListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.array(organizationResponseSchema),
  })
  .openapi('OrganizationListResponse');

export const singleOrganizationResponseSchema = z
  .object({
    success: z.literal(true),
    data: organizationResponseSchema,
  })
  .openapi('SingleOrganizationResponse');

// ============================================
// Type Exports
// ============================================

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>['body'];
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>['body'];
export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
