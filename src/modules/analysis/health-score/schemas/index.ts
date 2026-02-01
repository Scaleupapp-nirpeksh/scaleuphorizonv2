/**
 * Health Score Schemas
 *
 * Zod validation schemas for health score endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  HealthCategory,
  HealthStatus,
  RecommendationPriority,
  RecommendationCategory,
  TrendDirection,
} from '../../constants';

extendZodWithOpenApi(z);

// ============ Query Schemas ============

export const healthScoreQuerySchema = z.object({
  includeRecommendations: z.coerce
    .boolean()
    .optional()
    .default(true)
    .openapi({ description: 'Include actionable recommendations' }),
  includeHistory: z.coerce
    .boolean()
    .optional()
    .default(false)
    .openapi({ description: 'Include historical scores' }),
  historyMonths: z.coerce
    .number()
    .min(1)
    .max(12)
    .optional()
    .default(6)
    .openapi({ description: 'Number of months of history to include' }),
});

export type HealthScoreQueryInput = z.infer<typeof healthScoreQuerySchema>;

export const historyQuerySchema = z.object({
  months: z.coerce
    .number()
    .min(1)
    .max(24)
    .optional()
    .default(12)
    .openapi({ description: 'Number of months of history' }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(30)
    .openapi({ description: 'Maximum number of records' }),
});

export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;

export const breakdownQuerySchema = z.object({
  category: z
    .enum([
      HealthCategory.RUNWAY,
      HealthCategory.BURN_RATE,
      HealthCategory.REVENUE_GROWTH,
      HealthCategory.GROSS_MARGIN,
      HealthCategory.LIQUIDITY,
      HealthCategory.EFFICIENCY,
      HealthCategory.UNIT_ECONOMICS,
    ])
    .optional()
    .openapi({ description: 'Specific category to analyze' }),
});

export type BreakdownQueryInput = z.infer<typeof breakdownQuerySchema>;

// ============ Response Schemas ============

export const healthMetricDetailSchema = z.object({
  name: z.string().openapi({ description: 'Metric name' }),
  value: z.number().openapi({ description: 'Current value' }),
  unit: z.string().openapi({ description: 'Unit of measurement' }),
  benchmark: z.number().optional().openapi({ description: 'Industry benchmark' }),
  score: z.number().openapi({ description: 'Score 0-100' }),
  trend: z
    .enum([TrendDirection.INCREASING, TrendDirection.DECREASING, TrendDirection.STABLE, TrendDirection.VOLATILE])
    .openapi({ description: 'Trend direction' }),
  description: z.string().optional().openapi({ description: 'Metric description' }),
});

export const healthRecommendationSchema = z.object({
  category: z
    .enum([
      RecommendationCategory.COST_REDUCTION,
      RecommendationCategory.REVENUE_GROWTH,
      RecommendationCategory.CASH_MANAGEMENT,
      RecommendationCategory.OPERATIONAL_EFFICIENCY,
      RecommendationCategory.FUNDRAISING,
    ])
    .openapi({ description: 'Recommendation category' }),
  priority: z
    .enum([RecommendationPriority.HIGH, RecommendationPriority.MEDIUM, RecommendationPriority.LOW])
    .openapi({ description: 'Priority level' }),
  title: z.string().openapi({ description: 'Recommendation title' }),
  description: z.string().openapi({ description: 'Detailed description' }),
  potentialImpact: z.string().optional().openapi({ description: 'Potential impact if implemented' }),
  actionItems: z.array(z.string()).optional().openapi({ description: 'Action items' }),
});

export const healthCategoryScoreSchema = z.object({
  category: z
    .enum([
      HealthCategory.RUNWAY,
      HealthCategory.BURN_RATE,
      HealthCategory.REVENUE_GROWTH,
      HealthCategory.GROSS_MARGIN,
      HealthCategory.LIQUIDITY,
      HealthCategory.EFFICIENCY,
      HealthCategory.UNIT_ECONOMICS,
    ])
    .openapi({ description: 'Health category' }),
  score: z.number().min(0).max(100).openapi({ description: 'Category score' }),
  weight: z.number().openapi({ description: 'Weight in overall score' }),
  weightedScore: z.number().openapi({ description: 'Weighted contribution' }),
  status: z
    .enum([HealthStatus.EXCELLENT, HealthStatus.GOOD, HealthStatus.FAIR, HealthStatus.POOR, HealthStatus.CRITICAL])
    .openapi({ description: 'Category status' }),
  metrics: z.array(healthMetricDetailSchema).optional().openapi({ description: 'Metrics in this category' }),
  recommendations: z.array(healthRecommendationSchema).optional().openapi({ description: 'Category recommendations' }),
});

export const healthScoreHistorySchema = z.object({
  date: z.string().or(z.date()).openapi({ description: 'Score date' }),
  overallScore: z.number().openapi({ description: 'Overall score' }),
  status: z
    .enum([HealthStatus.EXCELLENT, HealthStatus.GOOD, HealthStatus.FAIR, HealthStatus.POOR, HealthStatus.CRITICAL])
    .openapi({ description: 'Status at this time' }),
  categoryScores: z
    .array(
      z.object({
        category: z.string(),
        score: z.number(),
      })
    )
    .openapi({ description: 'Category scores at this time' }),
});

export const healthScoreResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    calculatedAt: z.string().or(z.date()).openapi({ description: 'Calculation timestamp' }),
    overallScore: z.number().min(0).max(100).openapi({ description: 'Overall health score' }),
    overallStatus: z
      .enum([HealthStatus.EXCELLENT, HealthStatus.GOOD, HealthStatus.FAIR, HealthStatus.POOR, HealthStatus.CRITICAL])
      .openapi({ description: 'Overall status' }),
    previousScore: z.number().optional().openapi({ description: 'Previous period score' }),
    scoreChange: z.number().optional().openapi({ description: 'Change from previous' }),
    categories: z.array(healthCategoryScoreSchema).openapi({ description: 'Category breakdown' }),
    topRecommendations: z.array(healthRecommendationSchema).openapi({ description: 'Top recommendations' }),
    historicalScores: z.array(healthScoreHistorySchema).optional().openapi({ description: 'Historical scores' }),
  }),
});

export const healthHistoryResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(healthScoreHistorySchema),
});

export const healthBreakdownResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    category: z.string(),
    currentScore: z.number(),
    previousScore: z.number().optional(),
    change: z.number().optional(),
    status: z.enum([HealthStatus.EXCELLENT, HealthStatus.GOOD, HealthStatus.FAIR, HealthStatus.POOR, HealthStatus.CRITICAL]),
    factors: z.object({
      positive: z.array(z.string()),
      negative: z.array(z.string()),
    }),
    metrics: z.array(healthMetricDetailSchema),
    recommendations: z.array(healthRecommendationSchema),
  }),
});
