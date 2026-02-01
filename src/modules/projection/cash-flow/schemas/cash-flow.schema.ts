import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  CashFlowPeriod,
  CashFlowStatus,
  CashFlowCategory,
  ForecastConfidence,
  PROJECTION_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

const {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MIN_FISCAL_YEAR,
  MAX_FISCAL_YEAR,
  MIN_AMOUNT,
  MAX_AMOUNT,
} = PROJECTION_CONSTANTS;

// ============ Enum Schemas ============

export const cashFlowPeriodSchema = z
  .enum(Object.values(CashFlowPeriod) as [string, ...string[]])
  .openapi({ description: 'Cash flow period type', example: 'monthly' });

export const cashFlowStatusSchema = z
  .enum(Object.values(CashFlowStatus) as [string, ...string[]])
  .openapi({ description: 'Cash flow forecast status', example: 'draft' });

export const cashFlowCategorySchema = z
  .enum(Object.values(CashFlowCategory) as [string, ...string[]])
  .openapi({ description: 'Cash flow category', example: 'operating' });

export const forecastConfidenceSchema = z
  .enum(Object.values(ForecastConfidence) as [string, ...string[]])
  .openapi({ description: 'Forecast confidence level', example: 'medium' });

// ============ Cash Flow Item Schema ============

export const cashFlowItemSchema = z
  .object({
    category: cashFlowCategorySchema,
    subcategory: z.string().max(100).optional(),
    accountId: z.string().optional(),
    description: z.string().min(1).max(200),
    amount: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT),
    isActual: z.boolean().default(false),
    confidence: forecastConfidenceSchema.optional(),
  })
  .openapi('CashFlowItem');

// ============ Period Projection Schema ============

export const periodProjectionSchema = z
  .object({
    period: z.string().datetime().or(z.date()),
    openingBalance: z.number(),
    inflows: z.array(cashFlowItemSchema).default([]),
    outflows: z.array(cashFlowItemSchema).default([]),
  })
  .openapi('PeriodProjection');

// ============ Create Cash Flow Forecast Schema ============

export const createCashFlowForecastSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      fiscalYear: z.number().int().min(MIN_FISCAL_YEAR).max(MAX_FISCAL_YEAR),
      periodType: cashFlowPeriodSchema.default('monthly'),
      startDate: z.string().datetime().or(z.date()),
      endDate: z.string().datetime().or(z.date()),
      startingBalance: z.number().min(0),
      linkedBudgetId: z.string().optional(),
      linkedRevenuePlanId: z.string().optional(),
      currency: z.string().length(3).default('USD'),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('CreateCashFlowForecastRequest'),
});

export type CreateCashFlowForecastInput = z.infer<typeof createCashFlowForecastSchema>['body'];

// ============ Update Cash Flow Forecast Schema ============

export const updateCashFlowForecastSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).optional(),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      startingBalance: z.number().min(0).optional(),
      linkedBudgetId: z.string().nullable().optional(),
      linkedRevenuePlanId: z.string().nullable().optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('UpdateCashFlowForecastRequest'),
});

export type UpdateCashFlowForecastInput = z.infer<typeof updateCashFlowForecastSchema>['body'];

// ============ Add Projection Items Schema ============

export const addProjectionItemsSchema = z.object({
  body: z
    .object({
      period: z.string().datetime().or(z.date()),
      inflows: z.array(cashFlowItemSchema).optional(),
      outflows: z.array(cashFlowItemSchema).optional(),
    })
    .openapi('AddProjectionItemsRequest'),
});

export type AddProjectionItemsInput = z.infer<typeof addProjectionItemsSchema>['body'];

// ============ Query Schema ============

export const cashFlowQuerySchema = z.object({
  query: z
    .object({
      fiscalYear: z
        .string()
        .transform((v) => parseInt(v, 10))
        .optional(),
      status: cashFlowStatusSchema.optional(),
      periodType: cashFlowPeriodSchema.optional(),
      page: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('1'),
      limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('20'),
      sortBy: z.enum(['createdAt', 'fiscalYear', 'name']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('CashFlowQueryParams'),
});

export type CashFlowQueryInput = z.infer<typeof cashFlowQuerySchema>['query'];

// ============ Response Schemas ============

export const cashFlowForecastResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    fiscalYear: z.number(),
    periodType: cashFlowPeriodSchema,
    status: cashFlowStatusSchema,
    startDate: z.string(),
    endDate: z.string(),
    startingBalance: z.number(),
    totalInflows: z.number(),
    totalOutflows: z.number(),
    netChange: z.number(),
    endingBalance: z.number(),
    lowestBalance: z.number(),
    lowestBalanceDate: z.string().optional(),
    currency: z.string(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('CashFlowForecast');

export const cashFlowSummaryResponseSchema = z
  .object({
    periodType: cashFlowPeriodSchema,
    startDate: z.string(),
    endDate: z.string(),
    projections: z.array(
      z.object({
        period: z.string(),
        openingBalance: z.number(),
        totalInflows: z.number(),
        totalOutflows: z.number(),
        netCashFlow: z.number(),
        closingBalance: z.number(),
      })
    ),
    totalInflows: z.number(),
    totalOutflows: z.number(),
    netChange: z.number(),
    endingBalance: z.number(),
    lowestBalance: z.number(),
    lowestBalanceDate: z.string(),
  })
  .openapi('CashFlowSummary');

export const cashFlowListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(cashFlowForecastResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});
