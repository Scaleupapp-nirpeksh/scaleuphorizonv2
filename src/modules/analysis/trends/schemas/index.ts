/**
 * Trends Schemas
 *
 * Zod validation schemas for trend analysis endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { TrendType, TrendPeriod, TrendDirection, ANALYSIS_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Query Schemas ============

export const trendQuerySchema = z.object({
  type: z
    .enum([
      TrendType.EXPENSE,
      TrendType.REVENUE,
      TrendType.BURN_RATE,
      TrendType.HEADCOUNT,
      TrendType.CASH_BALANCE,
      TrendType.NET_INCOME,
      TrendType.GROSS_MARGIN,
      TrendType.CUSTOM,
    ])
    .openapi({ description: 'Type of trend to analyze' }),
  periodType: z
    .enum([TrendPeriod.DAILY, TrendPeriod.WEEKLY, TrendPeriod.MONTHLY, TrendPeriod.QUARTERLY])
    .optional()
    .default(TrendPeriod.MONTHLY)
    .openapi({ description: 'Granularity of trend data' }),
  months: z.coerce
    .number()
    .min(1)
    .max(ANALYSIS_CONSTANTS.MAX_TREND_MONTHS)
    .optional()
    .default(ANALYSIS_CONSTANTS.DEFAULT_TREND_MONTHS)
    .openapi({ description: 'Number of months to analyze', example: 12 }),
  startDate: z.string().optional().openapi({ description: 'Start date (YYYY-MM-DD)' }),
  endDate: z.string().optional().openapi({ description: 'End date (YYYY-MM-DD)' }),
  includeMovingAverage: z.coerce
    .boolean()
    .optional()
    .default(true)
    .openapi({ description: 'Include moving average in analysis' }),
  movingAveragePeriods: z.coerce
    .number()
    .min(2)
    .max(12)
    .optional()
    .default(3)
    .openapi({ description: 'Number of periods for moving average' }),
  category: z.string().optional().openapi({ description: 'Filter by category' }),
  accountId: z.string().optional().openapi({ description: 'Filter by account ID' }),
});

export type TrendQueryInput = z.infer<typeof trendQuerySchema>;

export const multiTrendQuerySchema = z.object({
  types: z
    .string()
    .transform((val) => val.split(','))
    .openapi({ description: 'Comma-separated list of trend types' }),
  periodType: z
    .enum([TrendPeriod.DAILY, TrendPeriod.WEEKLY, TrendPeriod.MONTHLY, TrendPeriod.QUARTERLY])
    .optional()
    .default(TrendPeriod.MONTHLY),
  months: z.coerce.number().min(1).max(36).optional().default(12),
  includeCorrelations: z.coerce
    .boolean()
    .optional()
    .default(false)
    .openapi({ description: 'Calculate correlations between trends' }),
});

export type MultiTrendQueryInput = z.infer<typeof multiTrendQuerySchema>;

export const comparisonQuerySchema = z.object({
  type: z.enum([
    TrendType.EXPENSE,
    TrendType.REVENUE,
    TrendType.BURN_RATE,
    TrendType.HEADCOUNT,
    TrendType.CASH_BALANCE,
    TrendType.NET_INCOME,
    TrendType.GROSS_MARGIN,
  ]),
  periodType: z
    .enum([TrendPeriod.MONTHLY, TrendPeriod.QUARTERLY])
    .optional()
    .default(TrendPeriod.MONTHLY),
  currentPeriodMonths: z.coerce.number().min(1).max(12).optional().default(6),
});

export type ComparisonQueryInput = z.infer<typeof comparisonQuerySchema>;

// ============ Response Schemas ============

export const trendDataPointSchema = z.object({
  period: z.string().or(z.date()).openapi({ description: 'Period date' }),
  value: z.number().openapi({ description: 'Value for this period' }),
  previousValue: z.number().optional().openapi({ description: 'Value from previous period' }),
  changePercent: z.number().optional().openapi({ description: 'Change from previous period (%)' }),
  movingAverage: z.number().optional().openapi({ description: 'Moving average value' }),
});

export const trendAnalysisSchema = z.object({
  type: z.string().openapi({ description: 'Trend type' }),
  periodType: z.string().openapi({ description: 'Period granularity' }),
  startDate: z.string().or(z.date()).openapi({ description: 'Analysis start date' }),
  endDate: z.string().or(z.date()).openapi({ description: 'Analysis end date' }),
  dataPoints: z.array(trendDataPointSchema).openapi({ description: 'Trend data points' }),
  direction: z
    .enum([TrendDirection.INCREASING, TrendDirection.DECREASING, TrendDirection.STABLE, TrendDirection.VOLATILE])
    .openapi({ description: 'Overall trend direction' }),
  averageValue: z.number().openapi({ description: 'Average value across all periods' }),
  minValue: z.number().openapi({ description: 'Minimum value' }),
  maxValue: z.number().openapi({ description: 'Maximum value' }),
  totalChange: z.number().openapi({ description: 'Total change (last - first)' }),
  totalChangePercent: z.number().openapi({ description: 'Total change percentage' }),
  volatility: z.number().openapi({ description: 'Coefficient of variation (%)' }),
  growthRate: z.number().openapi({ description: 'Compound monthly growth rate (%)' }),
});

export const trendResponseSchema = z.object({
  success: z.boolean(),
  data: trendAnalysisSchema,
});

export const multipleTrendResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    trends: z.array(trendAnalysisSchema),
    correlations: z
      .array(
        z.object({
          type1: z.string(),
          type2: z.string(),
          correlationCoefficient: z.number(),
          interpretation: z.string(),
        })
      )
      .optional(),
  }),
});

export const comparisonResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    currentPeriod: trendAnalysisSchema,
    previousPeriod: trendAnalysisSchema.optional(),
    periodOverPeriodChange: z.number(),
    periodOverPeriodPercent: z.number(),
  }),
});
