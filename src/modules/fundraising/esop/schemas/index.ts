/**
 * ESOP Schemas
 *
 * Zod validation schemas for ESOP management endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { GrantStatus, GrantType, VestingScheduleType, ShareClass } from '../../constants';

extendZodWithOpenApi(z);

// ============ Pool Schemas ============

export const createPoolSchema = z.object({
  name: z.string().min(1).max(100).optional().default('ESOP Pool'),
  totalShares: z.number().min(0).openapi({ description: 'Total shares in the pool', example: 1000000 }),
  shareClass: z.enum([
    ShareClass.COMMON,
    ShareClass.PREFERRED,
    ShareClass.SERIES_SEED,
    ShareClass.SERIES_A,
    ShareClass.SERIES_B,
    ShareClass.SERIES_C,
    ShareClass.SERIES_D,
    ShareClass.OPTIONS,
    ShareClass.WARRANTS,
    ShareClass.CONVERTIBLE,
  ]).optional().default(ShareClass.OPTIONS),
  percentOfCompany: z.number().min(0).max(100).optional().openapi({ description: 'Percentage of total company shares' }),
  createdFromRound: z.string().optional().openapi({ description: 'Round ID if created as part of a funding round' }),
});

export type CreatePoolInput = z.infer<typeof createPoolSchema>;

export const updatePoolSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  totalShares: z.number().min(0).optional(),
  percentOfCompany: z.number().min(0).max(100).optional(),
});

export type UpdatePoolInput = z.infer<typeof updatePoolSchema>;

// ============ Grant Schemas ============

export const accelerationClauseSchema = z.object({
  singleTrigger: z.boolean().optional(),
  doubleTrigger: z.boolean().optional(),
  accelerationPercent: z.number().min(0).max(100).optional().default(100),
});

export const createGrantSchema = z.object({
  pool: z.string().openapi({ description: 'ESOP Pool ID' }),
  grantee: z.string().openapi({ description: 'User ID of the grantee' }),
  granteeName: z.string().min(1).openapi({ description: 'Name of the grantee', example: 'John Doe' }),
  granteeEmail: z.string().email().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  grantType: z.enum([
    GrantType.ISO,
    GrantType.NSO,
    GrantType.RSU,
    GrantType.RSA,
    GrantType.SAR,
    GrantType.PHANTOM,
  ]).openapi({ description: 'Type of grant' }),
  totalShares: z.number().min(1).openapi({ description: 'Total shares granted', example: 10000 }),
  exercisePrice: z.number().min(0).openapi({ description: 'Exercise price per share', example: 0.10 }),
  fairMarketValue: z.number().min(0).optional().openapi({ description: 'FMV at grant date' }),
  grantDate: z.string().datetime().openapi({ description: 'Date of grant' }),
  vestingSchedule: z.enum([
    VestingScheduleType.STANDARD_4Y_1Y_CLIFF,
    VestingScheduleType.STANDARD_4Y_NO_CLIFF,
    VestingScheduleType.IMMEDIATE,
    VestingScheduleType.MONTHLY,
    VestingScheduleType.QUARTERLY,
    VestingScheduleType.ANNUAL,
    VestingScheduleType.MILESTONE_BASED,
    VestingScheduleType.CUSTOM,
  ]).optional().default(VestingScheduleType.STANDARD_4Y_1Y_CLIFF),
  vestingStartDate: z.string().datetime().openapi({ description: 'Vesting start date' }),
  vestingMonths: z.number().min(1).max(120).optional().default(48),
  cliffMonths: z.number().min(0).max(48).optional().default(12),
  expirationDate: z.string().datetime().optional(),
  accelerationClause: accelerationClauseSchema.optional(),
  boardApprovalDate: z.string().datetime().optional(),
  grantAgreementUrl: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateGrantInput = z.infer<typeof createGrantSchema>;

export const updateGrantSchema = z.object({
  granteeName: z.string().min(1).optional(),
  granteeEmail: z.string().email().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  fairMarketValue: z.number().min(0).optional(),
  expirationDate: z.string().datetime().optional(),
  accelerationClause: accelerationClauseSchema.optional(),
  boardApprovalDate: z.string().datetime().optional(),
  grantAgreementUrl: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
});

export type UpdateGrantInput = z.infer<typeof updateGrantSchema>;

// ============ Action Schemas ============

export const approveGrantSchema = z.object({
  boardApprovalDate: z.string().datetime().optional(),
});

export type ApproveGrantInput = z.infer<typeof approveGrantSchema>;

export const exerciseGrantSchema = z.object({
  sharesExercised: z.number().min(1).openapi({ description: 'Number of shares to exercise' }),
  exerciseDate: z.string().datetime().optional().openapi({ description: 'Exercise date (defaults to now)' }),
  paymentMethod: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type ExerciseGrantInput = z.infer<typeof exerciseGrantSchema>;

export const cancelGrantSchema = z.object({
  reason: z.string().min(1).max(500).optional().openapi({ description: 'Reason for cancellation' }),
});

export type CancelGrantInput = z.infer<typeof cancelGrantSchema>;

// ============ Query Schemas ============

export const grantQuerySchema = z.object({
  status: z.enum([
    GrantStatus.DRAFT,
    GrantStatus.APPROVED,
    GrantStatus.ACTIVE,
    GrantStatus.PARTIALLY_VESTED,
    GrantStatus.FULLY_VESTED,
    GrantStatus.EXERCISED,
    GrantStatus.EXPIRED,
    GrantStatus.CANCELLED,
    GrantStatus.FORFEITED,
  ]).optional(),
  grantType: z.enum([
    GrantType.ISO,
    GrantType.NSO,
    GrantType.RSU,
    GrantType.RSA,
    GrantType.SAR,
    GrantType.PHANTOM,
  ]).optional(),
  department: z.string().optional(),
  granteeId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type GrantQueryInput = z.infer<typeof grantQuerySchema>;

// ============ Response Schemas ============

export const poolResponseSchema = z.object({
  _id: z.string(),
  organization: z.string(),
  name: z.string(),
  totalShares: z.number(),
  allocatedShares: z.number(),
  availableShares: z.number(),
  utilizationPercent: z.number().optional(),
  shareClass: z.string(),
  percentOfCompany: z.number(),
  createdFromRound: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const vestingEventSchema = z.object({
  date: z.string(),
  sharesVested: z.number(),
  cumulativeVested: z.number(),
  percentVested: z.number(),
  isMilestone: z.boolean().optional(),
  milestoneDescription: z.string().optional(),
});

export const exerciseEventSchema = z.object({
  _id: z.string(),
  date: z.string(),
  sharesExercised: z.number(),
  pricePerShare: z.number(),
  totalCost: z.number(),
  paymentMethod: z.string().optional(),
  capTableEntryId: z.string().optional(),
  notes: z.string().optional(),
});

export const grantResponseSchema = z.object({
  _id: z.string(),
  organization: z.string(),
  pool: z.string(),
  grantee: z.string(),
  granteeName: z.string(),
  granteeEmail: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  grantType: z.string(),
  status: z.string(),
  totalShares: z.number(),
  vestedShares: z.number(),
  unvestedShares: z.number(),
  exercisedShares: z.number(),
  exercisableShares: z.number().optional(),
  vestingProgress: z.number().optional(),
  exercisePrice: z.number(),
  fairMarketValue: z.number().optional(),
  grantDate: z.string(),
  vestingSchedule: z.string(),
  vestingStartDate: z.string(),
  vestingMonths: z.number(),
  cliffMonths: z.number(),
  vestingEvents: z.array(vestingEventSchema).optional(),
  exerciseEvents: z.array(exerciseEventSchema).optional(),
  expirationDate: z.string().optional(),
  accelerationClause: accelerationClauseSchema.optional(),
  boardApprovalDate: z.string().optional(),
  grantAgreementUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const vestingScheduleResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    grant: grantResponseSchema,
    projectedVesting: z.array(z.object({
      date: z.string(),
      sharesVesting: z.number(),
      cumulativeVested: z.number(),
      percentVested: z.number(),
    })),
    totalVested: z.number(),
    totalUnvested: z.number(),
    totalExercised: z.number(),
    totalExercisable: z.number(),
    nextVestingDate: z.string().optional(),
    nextVestingAmount: z.number().optional(),
  }),
});

export const esopSummaryResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    pool: poolResponseSchema,
    totalGrants: z.number(),
    activeGrants: z.number(),
    totalAllocated: z.number(),
    totalVested: z.number(),
    totalExercised: z.number(),
    totalAvailable: z.number(),
    utilizationPercent: z.number(),
    byDepartment: z.array(z.object({
      department: z.string(),
      grantCount: z.number(),
      totalShares: z.number(),
      vestedShares: z.number(),
      exercisedShares: z.number(),
    })),
    recentGrants: z.array(grantResponseSchema),
  }),
});
