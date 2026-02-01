import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  FinancialModelStatus,
  ModelPeriod,
  PROJECTION_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

const {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MIN_FISCAL_YEAR,
  MAX_FISCAL_YEAR,
} = PROJECTION_CONSTANTS;

// ============ Enum Schemas ============

export const financialModelStatusSchema = z
  .enum(Object.values(FinancialModelStatus) as [string, ...string[]])
  .openapi({ description: 'Financial model status', example: 'draft' });

export const modelPeriodSchema = z
  .enum(Object.values(ModelPeriod) as [string, ...string[]])
  .openapi({ description: 'Model period type', example: 'monthly' });

export const incomeStatementCategorySchema = z
  .enum(['revenue', 'cogs', 'operating_expense', 'other_income', 'other_expense', 'tax'])
  .openapi({ description: 'Income statement line category', example: 'revenue' });

export const balanceSheetCategorySchema = z
  .enum(['asset', 'liability', 'equity'])
  .openapi({ description: 'Balance sheet line category', example: 'asset' });

export const cashFlowCategorySchema = z
  .enum(['operating', 'investing', 'financing'])
  .openapi({ description: 'Cash flow statement category', example: 'operating' });

// ============ Line Item Schemas ============

export const monthlyAmountSchema = z
  .object({
    month: z.string().datetime().or(z.date()),
    amount: z.number(),
    isActual: z.boolean().default(false),
    notes: z.string().max(500).optional(),
  })
  .openapi('MonthlyAmount');

export const incomeStatementLineSchema = z
  .object({
    category: incomeStatementCategorySchema,
    subcategory: z.string().max(100).optional(),
    accountId: z.string().optional(),
    name: z.string().min(1).max(100),
    amounts: z.array(monthlyAmountSchema).optional(),
  })
  .openapi('IncomeStatementLine');

export const balanceSheetLineSchema = z
  .object({
    category: balanceSheetCategorySchema,
    subcategory: z
      .enum(['current_asset', 'fixed_asset', 'current_liability', 'long_term_liability', 'equity'])
      .optional(),
    accountId: z.string().optional(),
    name: z.string().min(1).max(100),
    amounts: z.array(monthlyAmountSchema).optional(),
  })
  .openapi('BalanceSheetLine');

export const cashFlowLineSchema = z
  .object({
    category: cashFlowCategorySchema,
    subcategory: z.string().max(100).optional(),
    name: z.string().min(1).max(100),
    amounts: z.array(monthlyAmountSchema).optional(),
  })
  .openapi('CashFlowLine');

// ============ Create Financial Model Schema ============

export const createFinancialModelSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      fiscalYear: z.number().int().min(MIN_FISCAL_YEAR).max(MAX_FISCAL_YEAR),
      period: modelPeriodSchema.default('monthly'),
      linkedBudgetId: z.string().optional(),
      linkedRevenuePlanId: z.string().optional(),
      linkedHeadcountPlanId: z.string().optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('CreateFinancialModelRequest'),
});

export type CreateFinancialModelInput = z.infer<typeof createFinancialModelSchema>['body'];

// ============ Update Financial Model Schema ============

export const updateFinancialModelSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).optional(),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      linkedBudgetId: z.string().nullable().optional(),
      linkedRevenuePlanId: z.string().nullable().optional(),
      linkedHeadcountPlanId: z.string().nullable().optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('UpdateFinancialModelRequest'),
});

export type UpdateFinancialModelInput = z.infer<typeof updateFinancialModelSchema>['body'];

// ============ Add Line Item Schema ============

export const addLineItemSchema = z.object({
  body: z
    .object({
      statementType: z.enum(['income', 'balance', 'cashflow']),
      line: z.union([incomeStatementLineSchema, balanceSheetLineSchema, cashFlowLineSchema]),
    })
    .openapi('AddLineItemRequest'),
});

export type AddLineItemInput = z.infer<typeof addLineItemSchema>['body'];

// ============ Update Line Item Schema ============

export const updateLineItemSchema = z.object({
  body: z
    .object({
      amounts: z.array(monthlyAmountSchema),
    })
    .openapi('UpdateLineItemRequest'),
});

export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>['body'];

// ============ Query Schema ============

export const financialModelQuerySchema = z.object({
  query: z
    .object({
      fiscalYear: z
        .string()
        .transform((v) => parseInt(v, 10))
        .optional(),
      status: financialModelStatusSchema.optional(),
      period: modelPeriodSchema.optional(),
      page: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('1'),
      limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('20'),
      sortBy: z.enum(['createdAt', 'fiscalYear', 'name']).default('fiscalYear'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('FinancialModelQueryParams'),
});

export type FinancialModelQueryInput = z.infer<typeof financialModelQuerySchema>['query'];

// ============ Response Schemas ============

export const keyMetricsResponseSchema = z
  .object({
    grossMargin: z.number(),
    operatingMargin: z.number(),
    netMargin: z.number(),
    ebitdaMargin: z.number(),
    currentRatio: z.number(),
    quickRatio: z.number(),
    debtToEquity: z.number(),
    revenueGrowth: z.number(),
    expenseGrowth: z.number(),
    mrr: z.number().optional(),
    arr: z.number().optional(),
    burnRate: z.number().optional(),
    runway: z.number().optional(),
  })
  .openapi('KeyMetrics');

export const financialModelResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    fiscalYear: z.number(),
    period: modelPeriodSchema,
    status: financialModelStatusSchema,
    totalRevenue: z.number(),
    totalExpenses: z.number(),
    grossProfit: z.number(),
    operatingIncome: z.number(),
    netIncome: z.number(),
    totalAssets: z.number(),
    totalLiabilities: z.number(),
    totalEquity: z.number(),
    netCashFlow: z.number(),
    keyMetrics: keyMetricsResponseSchema,
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('FinancialModel');

export const incomeStatementResponseSchema = z
  .object({
    revenue: z.array(z.object({ name: z.string(), amounts: z.array(monthlyAmountSchema), total: z.number() })),
    totalRevenue: z.number(),
    cogs: z.array(z.object({ name: z.string(), amounts: z.array(monthlyAmountSchema), total: z.number() })),
    totalCogs: z.number(),
    grossProfit: z.number(),
    grossMargin: z.number(),
    operatingExpenses: z.array(z.object({ name: z.string(), amounts: z.array(monthlyAmountSchema), total: z.number() })),
    totalOperatingExpenses: z.number(),
    operatingIncome: z.number(),
    netIncome: z.number(),
  })
  .openapi('IncomeStatement');

export const balanceSheetResponseSchema = z
  .object({
    assets: z.object({
      current: z.array(z.object({ name: z.string(), total: z.number() })),
      totalCurrent: z.number(),
      fixed: z.array(z.object({ name: z.string(), total: z.number() })),
      totalFixed: z.number(),
      total: z.number(),
    }),
    liabilities: z.object({
      current: z.array(z.object({ name: z.string(), total: z.number() })),
      totalCurrent: z.number(),
      longTerm: z.array(z.object({ name: z.string(), total: z.number() })),
      totalLongTerm: z.number(),
      total: z.number(),
    }),
    equity: z.object({
      items: z.array(z.object({ name: z.string(), total: z.number() })),
      total: z.number(),
    }),
    isBalanced: z.boolean(),
  })
  .openapi('BalanceSheet');

export const financialModelListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(financialModelResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});
