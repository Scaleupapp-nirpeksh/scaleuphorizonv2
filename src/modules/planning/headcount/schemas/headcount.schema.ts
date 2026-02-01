import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  HeadcountPlanStatus,
  EmploymentType,
  JobLevel,
  RoleStatus,
  RemoteStatus,
  Priority,
  PLANNING_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

// Enums
export const headcountPlanStatusSchema = z.enum(
  Object.values(HeadcountPlanStatus) as [string, ...string[]]
);
export const employmentTypeSchema = z.enum(
  Object.values(EmploymentType) as [string, ...string[]]
);
export const jobLevelSchema = z.enum(Object.values(JobLevel) as [string, ...string[]]);
export const roleStatusSchema = z.enum(Object.values(RoleStatus) as [string, ...string[]]);
export const remoteStatusSchema = z.enum(
  Object.values(RemoteStatus) as [string, ...string[]]
);
export const prioritySchema = z.enum(Object.values(Priority) as [string, ...string[]]);

// Response Schemas
export const headcountPlanResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  fiscalYear: z.number(),
  status: headcountPlanStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  currentHeadcount: z.number(),
  targetHeadcount: z.number(),
  totalSalaryCost: z.number(),
  totalBenefitsCost: z.number(),
  totalCost: z.number(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('HeadcountPlan');

export const plannedRoleResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  department: z.string(),
  level: jobLevelSchema,
  employmentType: employmentTypeSchema,
  plannedStartDate: z.string(),
  baseSalary: z.number(),
  benefitsPercentage: z.number(),
  totalAnnualCost: z.number(),
  status: roleStatusSchema,
  priority: prioritySchema,
  createdAt: z.string(),
}).openapi('PlannedRole');

// Create Headcount Plan
export const createHeadcountPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
    fiscalYear: z.number().min(PLANNING_CONSTANTS.MIN_FISCAL_YEAR).max(PLANNING_CONSTANTS.MAX_FISCAL_YEAR),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    currentHeadcount: z.number().min(0).optional(),
    targetHeadcount: z.number().min(0).optional(),
    linkedBudgetId: z.string().optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const updateHeadcountPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH).optional(),
    description: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional().nullable(),
    currentHeadcount: z.number().min(0).optional(),
    targetHeadcount: z.number().min(0).optional(),
    notes: z.string().max(PLANNING_CONSTANTS.NOTES_MAX_LENGTH).optional(),
  }),
});

// Create Planned Role
export const createPlannedRoleSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH),
    department: z.string().min(1),
    level: jobLevelSchema,
    employmentType: employmentTypeSchema.optional(),
    location: z.string().optional(),
    remoteStatus: remoteStatusSchema.optional(),
    plannedStartDate: z.string().datetime(),
    plannedEndDate: z.string().datetime().optional(),
    baseSalary: z.number().min(0),
    currency: z.string().length(3).optional(),
    salaryFrequency: z.enum(['annual', 'monthly', 'hourly']).optional(),
    benefitsPercentage: z.number().min(0).max(100).optional(),
    bonusTarget: z.number().min(0).optional(),
    equipmentCost: z.number().min(0).optional(),
    recruitingCost: z.number().min(0).optional(),
    trainingCost: z.number().min(0).optional(),
    justification: z.string().max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH).optional(),
    priority: prioritySchema.optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updatePlannedRoleSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(PLANNING_CONSTANTS.NAME_MAX_LENGTH).optional(),
    department: z.string().optional(),
    level: jobLevelSchema.optional(),
    employmentType: employmentTypeSchema.optional(),
    location: z.string().optional().nullable(),
    remoteStatus: remoteStatusSchema.optional().nullable(),
    plannedStartDate: z.string().datetime().optional(),
    baseSalary: z.number().min(0).optional(),
    benefitsPercentage: z.number().min(0).max(100).optional(),
    priority: prioritySchema.optional(),
    status: roleStatusSchema.optional(),
  }),
});

export const fillRoleSchema = z.object({
  body: z.object({
    filledById: z.string(),
    filledDate: z.string().datetime(),
  }),
});

export const headcountQuerySchema = z.object({
  query: z.object({
    fiscalYear: z.string().transform(val => parseInt(val, 10)).optional(),
    status: headcountPlanStatusSchema.optional(),
    department: z.string().optional(),
    search: z.string().optional(),
  }),
});

// Response wrappers
export const headcountPlanListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(headcountPlanResponseSchema),
});

export const singleHeadcountPlanResponseSchema = z.object({
  success: z.literal(true),
  data: headcountPlanResponseSchema,
});

export const plannedRoleListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(plannedRoleResponseSchema),
});

// Type exports
export type CreateHeadcountPlanInput = z.infer<typeof createHeadcountPlanSchema>['body'];
export type UpdateHeadcountPlanInput = z.infer<typeof updateHeadcountPlanSchema>['body'];
export type CreatePlannedRoleInput = z.infer<typeof createPlannedRoleSchema>['body'];
export type UpdatePlannedRoleInput = z.infer<typeof updatePlannedRoleSchema>['body'];
export type FillRoleInput = z.infer<typeof fillRoleSchema>['body'];
export type HeadcountQueryInput = z.infer<typeof headcountQuerySchema>['query'];
