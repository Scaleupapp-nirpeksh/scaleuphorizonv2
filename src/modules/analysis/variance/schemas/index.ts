/**
 * Variance Schemas
 *
 * Zod validation schemas for variance analysis endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { VarianceType, VariancePeriod, VarianceStatus } from '../../constants';

extendZodWithOpenApi(z);

// ============ Query Schemas ============

export const varianceQuerySchema = z.object({
  fiscalYear: z.coerce
    .number()
    .min(2020)
    .max(2050)
    .optional()
    .openapi({ description: 'Fiscal year for variance analysis', example: 2024 }),
  period: z
    .enum([
      VariancePeriod.MONTHLY,
      VariancePeriod.QUARTERLY,
      VariancePeriod.YEARLY,
      VariancePeriod.YTD,
      VariancePeriod.CUSTOM,
    ])
    .optional()
    .default(VariancePeriod.MONTHLY)
    .openapi({ description: 'Period type for analysis' }),
  startDate: z.string().optional().openapi({ description: 'Start date (YYYY-MM-DD)', example: '2024-01-01' }),
  endDate: z.string().optional().openapi({ description: 'End date (YYYY-MM-DD)', example: '2024-12-31' }),
  category: z.string().optional().openapi({ description: 'Filter by category' }),
  budgetId: z.string().optional().openapi({ description: 'Specific budget ID for comparison' }),
  revenuePlanId: z.string().optional().openapi({ description: 'Specific revenue plan ID for comparison' }),
  headcountPlanId: z.string().optional().openapi({ description: 'Specific headcount plan ID for comparison' }),
});

export type VarianceQueryInput = z.infer<typeof varianceQuerySchema>;

export const monthlyVarianceQuerySchema = z.object({
  fiscalYear: z.coerce
    .number()
    .min(2020)
    .max(2050)
    .openapi({ description: 'Fiscal year', example: 2024 }),
  budgetId: z.string().optional().openapi({ description: 'Specific budget ID' }),
  category: z.string().optional().openapi({ description: 'Filter by category' }),
});

export type MonthlyVarianceQueryInput = z.infer<typeof monthlyVarianceQuerySchema>;

export const categoryVarianceQuerySchema = z.object({
  fiscalYear: z.coerce
    .number()
    .min(2020)
    .max(2050)
    .optional()
    .openapi({ description: 'Fiscal year', example: 2024 }),
  startDate: z.string().optional().openapi({ description: 'Start date (YYYY-MM-DD)' }),
  endDate: z.string().optional().openapi({ description: 'End date (YYYY-MM-DD)' }),
  type: z
    .enum([VarianceType.BUDGET, VarianceType.REVENUE, VarianceType.HEADCOUNT, VarianceType.EXPENSE])
    .optional()
    .default(VarianceType.BUDGET)
    .openapi({ description: 'Variance type' }),
});

export type CategoryVarianceQueryInput = z.infer<typeof categoryVarianceQuerySchema>;

// ============ Response Schemas ============

export const varianceItemSchema = z.object({
  category: z.string().openapi({ description: 'Category name' }),
  subcategory: z.string().optional().openapi({ description: 'Subcategory name' }),
  accountId: z.string().optional().openapi({ description: 'Chart of accounts reference' }),
  name: z.string().openapi({ description: 'Item name' }),
  planned: z.number().openapi({ description: 'Planned/budgeted amount' }),
  actual: z.number().openapi({ description: 'Actual amount' }),
  variance: z.number().openapi({ description: 'Variance (actual - planned)' }),
  variancePercent: z.number().openapi({ description: 'Variance percentage' }),
  status: z
    .enum([VarianceStatus.FAVORABLE, VarianceStatus.UNFAVORABLE, VarianceStatus.ON_TARGET])
    .openapi({ description: 'Variance status' }),
});

export const categoryVarianceSchema = z.object({
  category: z.string().openapi({ description: 'Category name' }),
  planned: z.number().openapi({ description: 'Total planned amount' }),
  actual: z.number().openapi({ description: 'Total actual amount' }),
  variance: z.number().openapi({ description: 'Total variance' }),
  variancePercent: z.number().openapi({ description: 'Variance percentage' }),
  status: z
    .enum([VarianceStatus.FAVORABLE, VarianceStatus.UNFAVORABLE, VarianceStatus.ON_TARGET])
    .openapi({ description: 'Variance status' }),
  itemCount: z.number().openapi({ description: 'Number of items in category' }),
});

export const varianceReportSchema = z.object({
  type: z
    .enum([VarianceType.BUDGET, VarianceType.REVENUE, VarianceType.HEADCOUNT, VarianceType.EXPENSE])
    .openapi({ description: 'Variance type' }),
  period: z
    .enum([
      VariancePeriod.MONTHLY,
      VariancePeriod.QUARTERLY,
      VariancePeriod.YEARLY,
      VariancePeriod.YTD,
      VariancePeriod.CUSTOM,
    ])
    .openapi({ description: 'Period type' }),
  startDate: z.string().or(z.date()).openapi({ description: 'Start date' }),
  endDate: z.string().or(z.date()).openapi({ description: 'End date' }),
  fiscalYear: z.number().openapi({ description: 'Fiscal year' }),
  totalPlanned: z.number().openapi({ description: 'Total planned amount' }),
  totalActual: z.number().openapi({ description: 'Total actual amount' }),
  totalVariance: z.number().openapi({ description: 'Total variance' }),
  totalVariancePercent: z.number().openapi({ description: 'Total variance percentage' }),
  overallStatus: z
    .enum([VarianceStatus.FAVORABLE, VarianceStatus.UNFAVORABLE, VarianceStatus.ON_TARGET])
    .openapi({ description: 'Overall variance status' }),
  items: z.array(varianceItemSchema).openapi({ description: 'Line item variances' }),
  byCategory: z.array(categoryVarianceSchema).openapi({ description: 'Variances by category' }),
});

export const monthlyVarianceSchema = z.object({
  month: z.string().or(z.date()).openapi({ description: 'Month date' }),
  planned: z.number().openapi({ description: 'Planned amount' }),
  actual: z.number().openapi({ description: 'Actual amount' }),
  variance: z.number().openapi({ description: 'Variance' }),
  variancePercent: z.number().openapi({ description: 'Variance percentage' }),
  status: z
    .enum([VarianceStatus.FAVORABLE, VarianceStatus.UNFAVORABLE, VarianceStatus.ON_TARGET])
    .openapi({ description: 'Variance status' }),
  cumulativePlanned: z.number().openapi({ description: 'Year-to-date planned' }),
  cumulativeActual: z.number().openapi({ description: 'Year-to-date actual' }),
  cumulativeVariance: z.number().openapi({ description: 'Year-to-date variance' }),
});

// ============ API Response Schemas ============

export const budgetVarianceResponseSchema = z.object({
  success: z.boolean(),
  data: varianceReportSchema,
});

export const revenueVarianceResponseSchema = z.object({
  success: z.boolean(),
  data: varianceReportSchema,
});

export const headcountVarianceResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    type: z.literal(VarianceType.HEADCOUNT),
    period: z.string(),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    fiscalYear: z.number(),
    plannedHeadcount: z.number(),
    actualHeadcount: z.number(),
    headcountVariance: z.number(),
    plannedCost: z.number(),
    actualCost: z.number(),
    costVariance: z.number(),
    costVariancePercent: z.number(),
    overallStatus: z.enum([VarianceStatus.FAVORABLE, VarianceStatus.UNFAVORABLE, VarianceStatus.ON_TARGET]),
    byDepartment: z.array(
      z.object({
        department: z.string(),
        plannedHeadcount: z.number(),
        actualHeadcount: z.number(),
        headcountVariance: z.number(),
        plannedCost: z.number(),
        actualCost: z.number(),
        costVariance: z.number(),
        costVariancePercent: z.number(),
        status: z.enum([VarianceStatus.FAVORABLE, VarianceStatus.UNFAVORABLE, VarianceStatus.ON_TARGET]),
      })
    ),
    byLevel: z.array(
      z.object({
        level: z.string(),
        plannedHeadcount: z.number(),
        actualHeadcount: z.number(),
        headcountVariance: z.number(),
      })
    ),
  }),
});

export const categoryVarianceResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(categoryVarianceSchema),
});

export const monthlyVarianceResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(monthlyVarianceSchema),
});
