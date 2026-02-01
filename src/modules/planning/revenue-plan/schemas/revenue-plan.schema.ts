import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { RevenuePlanStatus, RevenueModel, StreamType, PricingModel, Confidence, PLANNING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

export const revenuePlanStatusSchema = z.enum(Object.values(RevenuePlanStatus) as [string, ...string[]]);
export const revenueModelSchema = z.enum(Object.values(RevenueModel) as [string, ...string[]]);
export const streamTypeSchema = z.enum(Object.values(StreamType) as [string, ...string[]]);
export const pricingModelSchema = z.enum(Object.values(PricingModel) as [string, ...string[]]);
export const confidenceSchema = z.enum(Object.values(Confidence) as [string, ...string[]]);

export const monthlyRevenueSchema = z.object({
  month: z.number().min(1).max(12),
  projected: z.number().min(0),
  confidence: confidenceSchema.optional(),
  notes: z.string().optional(),
});

export const revenuePlanResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  fiscalYear: z.number(),
  status: revenuePlanStatusSchema,
  revenueModel: revenueModelSchema,
  totalProjectedRevenue: z.number(),
  currency: z.string(),
  createdAt: z.string(),
}).openapi('RevenuePlan');

export const revenueStreamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  streamType: streamTypeSchema,
  annualProjected: z.number(),
  confidence: confidenceSchema,
  createdAt: z.string(),
}).openapi('RevenueStream');

export const createRevenuePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
    fiscalYear: z.number().min(PLANNING_CONSTANTS.MIN_FISCAL_YEAR).max(PLANNING_CONSTANTS.MAX_FISCAL_YEAR),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    revenueModel: revenueModelSchema.optional(),
    growthTargetPercentage: z.number().optional(),
    baselineRevenue: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const updateRevenuePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH).optional(),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional().nullable(),
    revenueModel: revenueModelSchema.optional(),
    growthTargetPercentage: z.number().optional(),
    assumptions: z.string().max(PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH).optional(),
  }),
});

export const createRevenueStreamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
    streamType: streamTypeSchema,
    accountId: z.string().optional(),
    product: z.string().optional(),
    segment: z.string().optional(),
    pricingModel: pricingModelSchema.optional(),
    averagePrice: z.number().min(0).optional(),
    monthlyProjections: z.array(monthlyRevenueSchema).optional(),
    startingMRR: z.number().min(0).optional(),
    projectedMRRGrowth: z.number().optional(),
    churnRate: z.number().min(0).max(100).optional(),
    confidence: confidenceSchema.optional(),
    priority: z.number().optional(),
  }),
});

export const updateRevenueStreamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH).optional(),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional().nullable(),
    monthlyProjections: z.array(monthlyRevenueSchema).optional(),
    confidence: confidenceSchema.optional(),
    priority: z.number().optional(),
  }),
});

export const revenuePlanQuerySchema = z.object({
  query: z.object({
    fiscalYear: z.string().transform(val => parseInt(val, 10)).optional(),
    status: revenuePlanStatusSchema.optional(),
    revenueModel: revenueModelSchema.optional(),
    search: z.string().optional(),
  }),
});

// Response schemas
export const revenuePlanListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(revenuePlanResponseSchema),
}).openapi('RevenuePlanListResponse');

export const singleRevenuePlanResponseSchema = z.object({
  success: z.literal(true),
  data: revenuePlanResponseSchema,
  message: z.string().optional(),
}).openapi('SingleRevenuePlanResponse');

export const revenueStreamListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(revenueStreamResponseSchema),
}).openapi('RevenueStreamListResponse');

export const singleRevenueStreamResponseSchema = z.object({
  success: z.literal(true),
  data: revenueStreamResponseSchema,
  message: z.string().optional(),
}).openapi('SingleRevenueStreamResponse');

export const revenuePlanSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  fiscalYear: z.number(),
  status: revenuePlanStatusSchema,
  revenueModel: revenueModelSchema,
  totalProjectedRevenue: z.number(),
  streamCount: z.number(),
  currency: z.string(),
  byStreamType: z.record(z.string(), z.number()),
  averageConfidence: confidenceSchema,
  growthTargetPercentage: z.number().optional(),
  baselineRevenue: z.number().optional(),
  createdAt: z.string(),
}).openapi('RevenuePlanSummary');

export const revenuePlanSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: revenuePlanSummarySchema,
}).openapi('RevenuePlanSummaryResponse');

export const monthlyRevenueProjectionSchema = z.object({
  month: z.number(),
  monthName: z.string(),
  totalProjected: z.number(),
  byStreamType: z.record(z.string(), z.number()),
  byConfidence: z.record(z.string(), z.number()),
}).openapi('MonthlyRevenueProjection');

export const monthlyProjectionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(monthlyRevenueProjectionSchema),
}).openapi('MonthlyProjectionsResponse');

export const mrrMetricsSchema = z.object({
  currentMRR: z.number(),
  projectedARR: z.number(),
  avgGrowthRate: z.number(),
  avgChurnRate: z.number(),
  netMRRGrowth: z.number(),
}).openapi('MRRMetrics');

export const mrrMetricsResponseSchema = z.object({
  success: z.literal(true),
  data: mrrMetricsSchema,
}).openapi('MRRMetricsResponse');

export const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
}).openapi('MessageResponse');

// Type exports
export type CreateRevenuePlanInput = z.infer<typeof createRevenuePlanSchema>['body'];
export type UpdateRevenuePlanInput = z.infer<typeof updateRevenuePlanSchema>['body'];
export type CreateRevenueStreamInput = z.infer<typeof createRevenueStreamSchema>['body'];
export type UpdateRevenueStreamInput = z.infer<typeof updateRevenueStreamSchema>['body'];
export type RevenuePlanQueryInput = z.infer<typeof revenuePlanQuerySchema>['query'];
