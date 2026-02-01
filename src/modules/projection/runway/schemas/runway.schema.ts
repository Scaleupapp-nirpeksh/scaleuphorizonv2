import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { RunwayScenario, RunwayStatus, PROJECTION_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

const {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MIN_AMOUNT,
  MAX_AMOUNT,
  MIN_GROWTH_RATE,
  MAX_GROWTH_RATE,
} = PROJECTION_CONSTANTS;

// ============ Enum Schemas ============

export const runwayScenarioSchema = z
  .enum(Object.values(RunwayScenario) as [string, ...string[]])
  .openapi({ description: 'Runway scenario type', example: 'current' });

export const runwayStatusSchema = z
  .enum(Object.values(RunwayStatus) as [string, ...string[]])
  .openapi({ description: 'Runway status', example: 'healthy' });

// ============ Assumptions Schema ============

export const runwayAssumptionsSchema = z
  .object({
    revenueGrowthRate: z.number().min(MIN_GROWTH_RATE).max(MAX_GROWTH_RATE).default(0),
    expenseGrowthRate: z.number().min(MIN_GROWTH_RATE).max(MAX_GROWTH_RATE).default(0),
    oneTimeInflows: z.number().min(0).max(MAX_AMOUNT).optional(),
    oneTimeOutflows: z.number().min(0).max(MAX_AMOUNT).optional(),
    newHiringCost: z.number().min(0).max(MAX_AMOUNT).optional(),
  })
  .openapi('RunwayAssumptions');

// ============ Create Runway Snapshot Schema ============

export const createRunwaySnapshotSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      scenario: runwayScenarioSchema.default('current'),
      currentCash: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT),
      monthlyBurnRate: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT),
      monthlyRevenue: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT).default(0),
      assumptions: runwayAssumptionsSchema.optional(),
      linkedBankAccountIds: z.array(z.string()).optional(),
      linkedBudgetId: z.string().optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('CreateRunwaySnapshotRequest'),
});

export type CreateRunwaySnapshotInput = z.infer<typeof createRunwaySnapshotSchema>['body'];

// ============ Update Runway Snapshot Schema ============

export const updateRunwaySnapshotSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).optional(),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
      assumptions: runwayAssumptionsSchema.optional(),
      notes: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    })
    .openapi('UpdateRunwaySnapshotRequest'),
});

export type UpdateRunwaySnapshotInput = z.infer<typeof updateRunwaySnapshotSchema>['body'];

// ============ What-If Analysis Schema ============

export const whatIfAnalysisSchema = z.object({
  body: z
    .object({
      currentCash: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT).optional(),
      monthlyBurnRate: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT).optional(),
      monthlyRevenue: z.number().min(MIN_AMOUNT).max(MAX_AMOUNT).optional(),
      revenueGrowthRate: z.number().min(MIN_GROWTH_RATE).max(MAX_GROWTH_RATE).optional(),
      expenseGrowthRate: z.number().min(MIN_GROWTH_RATE).max(MAX_GROWTH_RATE).optional(),
      oneTimeInflows: z.number().min(0).max(MAX_AMOUNT).optional(),
      oneTimeOutflows: z.number().min(0).max(MAX_AMOUNT).optional(),
      newHiringCost: z.number().min(0).max(MAX_AMOUNT).optional(),
    })
    .openapi('WhatIfAnalysisRequest'),
});

export type WhatIfAnalysisInput = z.infer<typeof whatIfAnalysisSchema>['body'];

// ============ Query Schema ============

export const runwayQuerySchema = z.object({
  query: z
    .object({
      scenario: runwayScenarioSchema.optional(),
      status: runwayStatusSchema.optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('1'),
      limit: z
        .string()
        .transform((v) => parseInt(v, 10))
        .default('20'),
      sortBy: z.enum(['createdAt', 'snapshotDate', 'runwayMonths']).default('snapshotDate'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    })
    .openapi('RunwayQueryParams'),
});

export type RunwayQueryInput = z.infer<typeof runwayQuerySchema>['query'];

// ============ Response Schemas ============

export const runwayProjectionResponseSchema = z
  .object({
    month: z.string(),
    startingCash: z.number(),
    projectedRevenue: z.number(),
    projectedExpenses: z.number(),
    netCashFlow: z.number(),
    endingCash: z.number(),
    cumulativeMonths: z.number(),
  })
  .openapi('RunwayProjection');

export const runwaySnapshotResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    snapshotDate: z.string(),
    scenario: runwayScenarioSchema,
    currentCash: z.number(),
    monthlyBurnRate: z.number(),
    monthlyRevenue: z.number(),
    netBurnRate: z.number(),
    runwayMonths: z.number(),
    runwayEndDate: z.string(),
    status: runwayStatusSchema,
    assumptions: runwayAssumptionsSchema,
    projections: z.array(runwayProjectionResponseSchema),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('RunwaySnapshot');

export const runwayCalculationResponseSchema = z
  .object({
    currentCash: z.number(),
    monthlyBurnRate: z.number(),
    monthlyRevenue: z.number(),
    netBurnRate: z.number(),
    runwayMonths: z.number(),
    runwayEndDate: z.string(),
    status: runwayStatusSchema,
  })
  .openapi('RunwayCalculation');

export const whatIfAnalysisResponseSchema = z
  .object({
    baseRunway: runwayCalculationResponseSchema,
    adjustedRunway: runwayCalculationResponseSchema,
    impactMonths: z.number(),
    recommendation: z.string().optional(),
  })
  .openapi('WhatIfAnalysis');

export const runwayListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(runwaySnapshotResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});
