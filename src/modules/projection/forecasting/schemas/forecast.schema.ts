import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  ForecastType,
  ForecastMethod,
  ForecastConfidence,
  ForecastStatus,
  PROJECTION_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

const {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MIN_HISTORICAL_MONTHS,
  MAX_FORECAST_MONTHS,
} = PROJECTION_CONSTANTS;

// ============ Enum Schemas ============

export const forecastTypeSchema = z
  .enum(Object.values(ForecastType) as [string, ...string[]])
  .openapi({ description: 'Forecast type', example: 'revenue' });

export const forecastMethodSchema = z
  .enum(Object.values(ForecastMethod) as [string, ...string[]])
  .openapi({ description: 'Forecast method', example: 'linear' });

export const forecastConfidenceSchema = z
  .enum(Object.values(ForecastConfidence) as [string, ...string[]])
  .openapi({ description: 'Forecast confidence level', example: 'medium' });

export const forecastStatusSchema = z
  .enum(Object.values(ForecastStatus) as [string, ...string[]])
  .openapi({ description: 'Forecast status', example: 'active' });

export const trendSchema = z
  .enum(['increasing', 'decreasing', 'stable'])
  .openapi({ description: 'Trend direction', example: 'increasing' });

export const seasonalitySchema = z
  .enum(['detected', 'not_detected'])
  .openapi({ description: 'Seasonality detection', example: 'detected' });

// ============ Create Forecast Schema ============

export const createForecastSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      type: forecastTypeSchema,
      method: forecastMethodSchema.default('linear'),
      historicalMonths: z.number().int().min(MIN_HISTORICAL_MONTHS).max(60).default(12),
      forecastMonths: z.number().int().min(1).max(MAX_FORECAST_MONTHS).default(12),
      accountId: z.string().optional(),
      customAssumptions: z.record(z.number()).optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('CreateForecastRequest'),
});

export type CreateForecastInput = z.infer<typeof createForecastSchema>['body'];

// ============ Update Forecast Schema ============

export const updateForecastSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).optional(),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      method: forecastMethodSchema.optional(),
      customAssumptions: z.record(z.number()).optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('UpdateForecastRequest'),
});

export type UpdateForecastInput = z.infer<typeof updateForecastSchema>['body'];

// ============ Retrain Forecast Schema ============

export const retrainForecastSchema = z.object({
  body: z
    .object({
      historicalMonths: z.number().int().min(MIN_HISTORICAL_MONTHS).max(60).optional(),
      forecastMonths: z.number().int().min(1).max(MAX_FORECAST_MONTHS).optional(),
      method: forecastMethodSchema.optional(),
    })
    .openapi('RetrainForecastRequest'),
});

export type RetrainForecastInput = z.infer<typeof retrainForecastSchema>['body'];

// ============ Query Schema ============

export const forecastQuerySchema = z.object({
  query: z
    .object({
      type: forecastTypeSchema.optional(),
      status: forecastStatusSchema.optional(),
      method: forecastMethodSchema.optional(),
      page: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('1'),
      limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('20'),
      sortBy: z.enum(['createdAt', 'type', 'accuracy']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('ForecastQueryParams'),
});

export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>['query'];

// ============ Response Schemas ============

export const forecastDataPointResponseSchema = z
  .object({
    period: z.string(),
    actual: z.number().optional(),
    predicted: z.number(),
    lowerBound: z.number(),
    upperBound: z.number(),
    confidence: forecastConfidenceSchema,
  })
  .openapi('ForecastDataPoint');

export const forecastResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: forecastTypeSchema,
    method: forecastMethodSchema,
    status: forecastStatusSchema,
    historicalMonths: z.number(),
    forecastMonths: z.number(),
    startDate: z.string(),
    endDate: z.string(),
    accountId: z.string().optional(),
    accountName: z.string().optional(),
    dataPoints: z.array(forecastDataPointResponseSchema),
    accuracy: z.number().optional(),
    mape: z.number().optional(),
    trend: trendSchema,
    seasonality: seasonalitySchema.optional(),
    totalHistorical: z.number(),
    totalForecast: z.number(),
    averageGrowthRate: z.number(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Forecast');

export const forecastSummaryResponseSchema = z
  .object({
    revenue: z.object({
      current: z.number(),
      forecast: z.number(),
      growthRate: z.number(),
      trend: trendSchema,
    }),
    expenses: z.object({
      current: z.number(),
      forecast: z.number(),
      growthRate: z.number(),
      trend: trendSchema,
    }),
    burnRate: z.object({
      current: z.number(),
      forecast: z.number(),
      trend: trendSchema,
    }),
  })
  .openapi('ForecastSummary');

export const forecastListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(forecastResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});
