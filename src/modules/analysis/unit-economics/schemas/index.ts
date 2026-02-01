/**
 * Unit Economics Schemas
 *
 * Zod validation schemas for unit economics endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { MetricType, CohortPeriod, TrendDirection, ANALYSIS_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Query Schemas ============

export const unitEconomicsQuerySchema = z.object({
  startDate: z.string().optional().openapi({ description: 'Start date (YYYY-MM-DD)' }),
  endDate: z.string().optional().openapi({ description: 'End date (YYYY-MM-DD)' }),
  includeBenchmarks: z.coerce
    .boolean()
    .optional()
    .default(true)
    .openapi({ description: 'Include industry benchmarks' }),
});

export type UnitEconomicsQueryInput = z.infer<typeof unitEconomicsQuerySchema>;

export const cacQuerySchema = z.object({
  months: z.coerce
    .number()
    .min(1)
    .max(24)
    .optional()
    .default(3)
    .openapi({ description: 'Number of months to average', example: 3 }),
  includeBreakdown: z.coerce
    .boolean()
    .optional()
    .default(true)
    .openapi({ description: 'Include cost breakdown by channel' }),
});

export type CACQueryInput = z.infer<typeof cacQuerySchema>;

export const ltvQuerySchema = z.object({
  cohortMonths: z.coerce
    .number()
    .min(3)
    .max(24)
    .optional()
    .default(12)
    .openapi({ description: 'Number of cohort months to analyze', example: 12 }),
  includeChurnAnalysis: z.coerce
    .boolean()
    .optional()
    .default(true)
    .openapi({ description: 'Include churn rate analysis' }),
});

export type LTVQueryInput = z.infer<typeof ltvQuerySchema>;

export const cohortQuerySchema = z.object({
  periodType: z
    .enum([CohortPeriod.WEEKLY, CohortPeriod.MONTHLY, CohortPeriod.QUARTERLY])
    .optional()
    .default(CohortPeriod.MONTHLY)
    .openapi({ description: 'Cohort period type' }),
  cohortMonths: z.coerce
    .number()
    .min(1)
    .max(ANALYSIS_CONSTANTS.MAX_COHORT_MONTHS)
    .optional()
    .default(12)
    .openapi({ description: 'Number of cohorts to analyze' }),
  retentionMonths: z.coerce
    .number()
    .min(1)
    .max(24)
    .optional()
    .default(12)
    .openapi({ description: 'Number of retention periods to show' }),
});

export type CohortQueryInput = z.infer<typeof cohortQuerySchema>;

export const paybackQuerySchema = z.object({
  months: z.coerce.number().min(1).max(24).optional().default(12),
});

export type PaybackQueryInput = z.infer<typeof paybackQuerySchema>;

// ============ Response Schemas ============

export const metricSchema = z.object({
  metric: z
    .enum([
      MetricType.CAC,
      MetricType.LTV,
      MetricType.LTV_CAC_RATIO,
      MetricType.PAYBACK_PERIOD,
      MetricType.ARPU,
      MetricType.CHURN_RATE,
      MetricType.RETENTION_RATE,
      MetricType.MRR,
      MetricType.ARR,
      MetricType.NET_REVENUE_RETENTION,
      MetricType.GROSS_MARGIN,
      MetricType.BURN_MULTIPLE,
    ])
    .openapi({ description: 'Metric type' }),
  value: z.number().openapi({ description: 'Current value' }),
  previousValue: z.number().optional().openapi({ description: 'Previous period value' }),
  changePercent: z.number().optional().openapi({ description: 'Change percentage' }),
  benchmark: z.number().optional().openapi({ description: 'Industry benchmark' }),
  benchmarkComparison: z
    .enum(['above', 'below', 'at'])
    .optional()
    .openapi({ description: 'Comparison to benchmark' }),
  trend: z
    .enum([TrendDirection.INCREASING, TrendDirection.DECREASING, TrendDirection.STABLE, TrendDirection.VOLATILE])
    .openapi({ description: 'Trend direction' }),
});

export const unitEconomicsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    calculatedAt: z.string().or(z.date()),
    period: z.object({
      startDate: z.string().or(z.date()),
      endDate: z.string().or(z.date()),
    }),
    metrics: z.array(metricSchema),
    overallHealth: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
  }),
});

export const cacResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalCAC: z.number().openapi({ description: 'Total customer acquisition cost' }),
    components: z.object({
      marketing: z.number(),
      sales: z.number(),
      other: z.number(),
    }),
    customerCount: z.number().openapi({ description: 'New customers acquired' }),
    cacPerCustomer: z.number().openapi({ description: 'CAC per customer' }),
    trend: z.enum([TrendDirection.INCREASING, TrendDirection.DECREASING, TrendDirection.STABLE, TrendDirection.VOLATILE]),
    historicalCAC: z
      .array(
        z.object({
          period: z.string().or(z.date()),
          cac: z.number(),
        })
      )
      .optional(),
  }),
});

export const ltvResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    averageLTV: z.number().openapi({ description: 'Average lifetime value' }),
    averageLifespanMonths: z.number().openapi({ description: 'Average customer lifespan in months' }),
    averageMonthlyRevenue: z.number().openapi({ description: 'Average monthly revenue per customer' }),
    churnRate: z.number().openapi({ description: 'Monthly churn rate (%)' }),
    grossMargin: z.number().openapi({ description: 'Gross margin (%)' }),
    ltvByCohort: z
      .array(
        z.object({
          cohortPeriod: z.string().or(z.date()),
          ltv: z.number(),
          customerCount: z.number(),
        })
      )
      .optional(),
  }),
});

export const cohortRetentionSchema = z.object({
  periodNumber: z.number(),
  activeCustomers: z.number(),
  retentionRate: z.number(),
  revenue: z.number(),
  averageRevenuePerCustomer: z.number(),
});

export const cohortDataSchema = z.object({
  cohortId: z.string(),
  cohortPeriod: z.string().or(z.date()),
  periodType: z.enum([CohortPeriod.WEEKLY, CohortPeriod.MONTHLY, CohortPeriod.QUARTERLY]),
  customerCount: z.number(),
  initialRevenue: z.number(),
  retention: z.array(cohortRetentionSchema),
  cumulativeRevenue: z.number(),
  averageLTV: z.number(),
});

export const cohortAnalysisResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    periodType: z.enum([CohortPeriod.WEEKLY, CohortPeriod.MONTHLY, CohortPeriod.QUARTERLY]),
    cohorts: z.array(cohortDataSchema),
    averageRetentionByPeriod: z.array(
      z.object({
        period: z.number(),
        rate: z.number(),
      })
    ),
    averageLTV: z.number(),
    medianLTV: z.number(),
    bestCohort: z
      .object({
        period: z.string().or(z.date()),
        ltv: z.number(),
      })
      .optional(),
    worstCohort: z
      .object({
        period: z.string().or(z.date()),
        ltv: z.number(),
      })
      .optional(),
  }),
});

export const paybackResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    paybackMonths: z.number().openapi({ description: 'Months to recover CAC' }),
    cac: z.number(),
    monthlyRevenuePerCustomer: z.number(),
    grossMargin: z.number(),
    isHealthy: z.boolean().openapi({ description: 'Payback < 12 months' }),
    trend: z.enum([TrendDirection.INCREASING, TrendDirection.DECREASING, TrendDirection.STABLE, TrendDirection.VOLATILE]),
  }),
});
