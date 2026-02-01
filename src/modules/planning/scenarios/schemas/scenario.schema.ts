import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  ScenarioStatus,
  ScenarioType,
  AdjustmentType,
  AdjustmentMethod,
  ImpactType,
  ImpactCategory,
  PLANNING_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

export const scenarioStatusSchema = z.enum(Object.values(ScenarioStatus) as [string, ...string[]]);
export const scenarioTypeSchema = z.enum(Object.values(ScenarioType) as [string, ...string[]]);
export const adjustmentTypeSchema = z.enum(Object.values(AdjustmentType) as [string, ...string[]]);
export const adjustmentMethodSchema = z.enum(Object.values(AdjustmentMethod) as [string, ...string[]]);
export const impactTypeSchema = z.enum(Object.values(ImpactType) as [string, ...string[]]);
export const impactCategorySchema = z.enum(Object.values(ImpactCategory) as [string, ...string[]]);

export const scenarioResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: scenarioTypeSchema,
  fiscalYear: z.number(),
  status: scenarioStatusSchema,
  projectedRevenue: z.number(),
  projectedExpenses: z.number(),
  projectedNetIncome: z.number(),
  projectedRunway: z.number().optional(),
  probability: z.number().optional(),
  currency: z.string(),
  createdAt: z.string(),
}).openapi('Scenario');

export const scenarioAdjustmentResponseSchema = z.object({
  id: z.string(),
  adjustmentType: adjustmentTypeSchema,
  referenceName: z.string(),
  adjustmentMethod: adjustmentMethodSchema,
  adjustmentPercentage: z.number().optional(),
  adjustmentAmount: z.number().optional(),
  originalAnnualAmount: z.number(),
  adjustedAnnualAmount: z.number(),
  impactType: impactTypeSchema,
  impactCategory: impactCategorySchema,
  createdAt: z.string(),
}).openapi('ScenarioAdjustment');

export const createScenarioSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
    type: scenarioTypeSchema.optional(),
    fiscalYear: z.number().min(PLANNING_CONSTANTS.MIN_FISCAL_YEAR).max(PLANNING_CONSTANTS.MAX_FISCAL_YEAR),
    linkedBudgetId: z.string().optional(),
    linkedHeadcountPlanId: z.string().optional(),
    linkedRevenuePlanId: z.string().optional(),
    probability: z.number().min(0).max(100).optional(),
    assumptions: z.string().max(PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH).optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const updateScenarioSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH).optional(),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional().nullable(),
    type: scenarioTypeSchema.optional(),
    probability: z.number().min(0).max(100).optional(),
    assumptions: z.string().max(PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH).optional(),
    notes: z.string().max(PLANNING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const createAdjustmentSchema = z.object({
  body: z.object({
    adjustmentType: adjustmentTypeSchema,
    referenceId: z.string().optional(),
    referenceName: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH),
    referenceCategory: z.string().optional(),
    adjustmentMethod: adjustmentMethodSchema,
    adjustmentPercentage: z.number().optional(),
    adjustmentAmount: z.number().optional(),
    originalAnnualAmount: z.number(),
    impactCategory: impactCategorySchema,
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
    assumptions: z.string().max(PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH).optional(),
  }),
});

export const updateAdjustmentSchema = z.object({
  body: z.object({
    adjustmentMethod: adjustmentMethodSchema.optional(),
    adjustmentPercentage: z.number().optional(),
    adjustmentAmount: z.number().optional(),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional().nullable(),
    assumptions: z.string().max(PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH).optional(),
  }),
});

export const scenarioQuerySchema = z.object({
  query: z.object({
    fiscalYear: z.string().transform(val => parseInt(val, 10)).optional(),
    type: scenarioTypeSchema.optional(),
    status: scenarioStatusSchema.optional(),
    search: z.string().optional(),
  }),
});

export const compareScenarioSchema = z.object({
  body: z.object({
    scenarioIds: z.array(z.string()).min(2).max(5),
  }),
});

// Response schemas
export const scenarioListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(scenarioResponseSchema),
}).openapi('ScenarioListResponse');

export const singleScenarioResponseSchema = z.object({
  success: z.literal(true),
  data: scenarioResponseSchema,
  message: z.string().optional(),
}).openapi('SingleScenarioResponse');

export const adjustmentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(scenarioAdjustmentResponseSchema),
}).openapi('AdjustmentListResponse');

export const singleAdjustmentResponseSchema = z.object({
  success: z.literal(true),
  data: scenarioAdjustmentResponseSchema,
  message: z.string().optional(),
}).openapi('SingleAdjustmentResponse');

export const scenarioComparisonSchema = z.object({
  scenarios: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: scenarioTypeSchema,
    projectedRevenue: z.number(),
    projectedExpenses: z.number(),
    projectedNetIncome: z.number(),
    projectedRunway: z.number().optional(),
    probability: z.number().optional(),
  })),
  summary: z.object({
    minRevenue: z.object({ scenarioId: z.string(), value: z.number() }),
    maxRevenue: z.object({ scenarioId: z.string(), value: z.number() }),
    minExpenses: z.object({ scenarioId: z.string(), value: z.number() }),
    maxExpenses: z.object({ scenarioId: z.string(), value: z.number() }),
    minNetIncome: z.object({ scenarioId: z.string(), value: z.number() }),
    maxNetIncome: z.object({ scenarioId: z.string(), value: z.number() }),
    avgRevenue: z.number(),
    avgExpenses: z.number(),
    avgNetIncome: z.number(),
  }),
}).openapi('ScenarioComparison');

export const scenarioComparisonResponseSchema = z.object({
  success: z.literal(true),
  data: scenarioComparisonSchema,
}).openapi('ScenarioComparisonResponse');

export const scenarioImpactSchema = z.object({
  scenarioId: z.string(),
  scenarioName: z.string(),
  baselineRevenue: z.number(),
  baselineExpenses: z.number(),
  baselineNetIncome: z.number(),
  adjustedRevenue: z.number(),
  adjustedExpenses: z.number(),
  adjustedNetIncome: z.number(),
  revenueImpact: z.number(),
  expenseImpact: z.number(),
  netIncomeImpact: z.number(),
  adjustmentCount: z.number(),
  byCategory: z.record(z.string(), z.object({
    original: z.number(),
    adjusted: z.number(),
    impact: z.number(),
  })),
}).openapi('ScenarioImpact');

export const scenarioImpactResponseSchema = z.object({
  success: z.literal(true),
  data: scenarioImpactSchema,
}).openapi('ScenarioImpactResponse');

export const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
}).openapi('MessageResponse');

// Type exports
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>['body'];
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>['body'];
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>['body'];
export type UpdateAdjustmentInput = z.infer<typeof updateAdjustmentSchema>['body'];
export type ScenarioQueryInput = z.infer<typeof scenarioQuerySchema>['query'];
export type CompareScenarioInput = z.infer<typeof compareScenarioSchema>['body'];
