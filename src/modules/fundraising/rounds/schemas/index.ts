/**
 * Round Schemas
 *
 * Zod validation schemas for funding round endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { RoundType, RoundStatus, ShareClass } from '../../constants';

extendZodWithOpenApi(z);

// ============ Nested Schemas ============

export const roundTermsSchema = z.object({
  liquidationPreference: z.number().min(0).optional(),
  participatingPreferred: z.boolean().optional(),
  antiDilution: z.enum(['full_ratchet', 'weighted_average', 'none']).optional(),
  boardSeats: z.number().int().min(0).optional(),
  proRataRights: z.boolean().optional(),
  informationRights: z.boolean().optional(),
  votingRights: z.string().optional(),
  dividends: z.string().optional(),
  otherTerms: z.string().optional(),
});

export const roundDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['term_sheet', 'sha', 'ssa', 'side_letter', 'other']),
  url: z.string().url(),
});

// ============ Create Schema ============

export const createRoundSchema = z.object({
  name: z.string().min(1).max(100).openapi({ description: 'Round name', example: 'Series A' }),
  type: z.enum([
    RoundType.PRE_SEED,
    RoundType.SEED,
    RoundType.SERIES_A,
    RoundType.SERIES_B,
    RoundType.SERIES_C,
    RoundType.SERIES_D,
    RoundType.BRIDGE,
    RoundType.CONVERTIBLE_NOTE,
    RoundType.SAFE,
    RoundType.OTHER,
  ]).openapi({ description: 'Type of funding round' }),
  targetAmount: z.number().min(0).openapi({ description: 'Target raise amount', example: 5000000 }),
  minimumInvestment: z.number().min(0).optional().openapi({ description: 'Minimum investment amount' }),
  pricePerShare: z.number().min(0).optional().openapi({ description: 'Price per share' }),
  preMoneyValuation: z.number().min(0).optional().openapi({ description: 'Pre-money valuation' }),
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
  ]).optional().openapi({ description: 'Share class for this round' }),
  targetCloseDate: z.string().datetime().optional().openapi({ description: 'Target close date' }),
  terms: roundTermsSchema.optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateRoundInput = z.infer<typeof createRoundSchema>;

// ============ Update Schema ============

export const updateRoundSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().min(0).optional(),
  minimumInvestment: z.number().min(0).optional(),
  pricePerShare: z.number().min(0).optional(),
  preMoneyValuation: z.number().min(0).optional(),
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
  ]).optional(),
  newSharesIssued: z.number().min(0).optional(),
  targetCloseDate: z.string().datetime().optional(),
  leadInvestor: z.string().optional(),
  terms: roundTermsSchema.optional(),
  notes: z.string().max(5000).optional(),
});

export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;

// ============ Query Schema ============

export const roundQuerySchema = z.object({
  status: z.enum([
    RoundStatus.PLANNING,
    RoundStatus.ACTIVE,
    RoundStatus.CLOSED,
    RoundStatus.CANCELLED,
  ]).optional(),
  type: z.enum([
    RoundType.PRE_SEED,
    RoundType.SEED,
    RoundType.SERIES_A,
    RoundType.SERIES_B,
    RoundType.SERIES_C,
    RoundType.SERIES_D,
    RoundType.BRIDGE,
    RoundType.CONVERTIBLE_NOTE,
    RoundType.SAFE,
    RoundType.OTHER,
  ]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'name', 'targetAmount', 'raisedAmount', 'openDate']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type RoundQueryInput = z.infer<typeof roundQuerySchema>;

// ============ Action Schemas ============

export const openRoundSchema = z.object({
  openDate: z.string().datetime().optional().openapi({ description: 'Round open date (defaults to now)' }),
});

export type OpenRoundInput = z.infer<typeof openRoundSchema>;

export const closeRoundSchema = z.object({
  closeDate: z.string().datetime().optional().openapi({ description: 'Round close date (defaults to now)' }),
  finalRaisedAmount: z.number().min(0).optional().openapi({ description: 'Final raised amount' }),
});

export type CloseRoundInput = z.infer<typeof closeRoundSchema>;

export const addDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['term_sheet', 'sha', 'ssa', 'side_letter', 'other']),
  url: z.string().url(),
});

export type AddDocumentInput = z.infer<typeof addDocumentSchema>;

// ============ Response Schemas ============

export const roundResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    organization: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    targetAmount: z.number(),
    raisedAmount: z.number(),
    percentRaised: z.number().optional(),
    minimumInvestment: z.number().optional(),
    pricePerShare: z.number().optional(),
    preMoneyValuation: z.number().optional(),
    postMoneyValuation: z.number().optional(),
    shareClass: z.string().optional(),
    newSharesIssued: z.number().optional(),
    openDate: z.string().optional(),
    closeDate: z.string().optional(),
    targetCloseDate: z.string().optional(),
    leadInvestor: z.string().optional(),
    terms: roundTermsSchema.optional(),
    documents: z.array(roundDocumentSchema).optional(),
    notes: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const roundListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(roundResponseSchema.shape.data),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export const roundSummaryResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    round: roundResponseSchema.shape.data,
    investorCount: z.number(),
    totalCommitted: z.number(),
    totalReceived: z.number(),
    percentRaised: z.number(),
    investors: z.array(z.object({
      investor: z.string(),
      name: z.string(),
      type: z.string(),
      commitmentAmount: z.number(),
      receivedAmount: z.number(),
      isLead: z.boolean(),
    })),
  }),
});
