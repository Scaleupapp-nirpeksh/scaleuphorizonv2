/**
 * Cap Table Schemas
 *
 * Zod validation schemas for cap table management endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ShareClass, ShareholderType, CapTableEntryType } from '../../constants';

extendZodWithOpenApi(z);

// ============ Share Class Schemas ============

export const createShareClassSchema = z.object({
  name: z.string().min(1).max(100).openapi({ description: 'Share class name', example: 'Series A Preferred' }),
  class: z.enum([
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
  ]).openapi({ description: 'Share class type' }),
  authorizedShares: z.number().min(0).openapi({ description: 'Total authorized shares', example: 10000000 }),
  parValue: z.number().min(0).optional().openapi({ description: 'Par value per share' }),
  votingRights: z.number().min(0).optional().default(1).openapi({ description: 'Votes per share' }),
  liquidationPreference: z.number().min(0).optional().openapi({ description: 'Liquidation preference multiplier' }),
  participatingPreferred: z.boolean().optional().openapi({ description: 'Participating preferred rights' }),
  conversionRatio: z.number().min(0).optional().openapi({ description: 'Conversion ratio to common' }),
  dividendRate: z.number().min(0).optional().openapi({ description: 'Dividend rate (%)' }),
  seniority: z.number().int().min(0).optional().default(0).openapi({ description: 'Seniority for liquidation' }),
});

export type CreateShareClassInput = z.infer<typeof createShareClassSchema>;

export const updateShareClassSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  authorizedShares: z.number().min(0).optional(),
  parValue: z.number().min(0).optional(),
  votingRights: z.number().min(0).optional(),
  liquidationPreference: z.number().min(0).optional(),
  participatingPreferred: z.boolean().optional(),
  conversionRatio: z.number().min(0).optional(),
  dividendRate: z.number().min(0).optional(),
  seniority: z.number().int().min(0).optional(),
});

export type UpdateShareClassInput = z.infer<typeof updateShareClassSchema>;

// ============ Cap Table Entry Schemas ============

export const createCapTableEntrySchema = z.object({
  shareholder: z.string().openapi({ description: 'Shareholder ID (User, Investor, etc.)' }),
  shareholderType: z.enum([
    ShareholderType.FOUNDER,
    ShareholderType.INVESTOR,
    ShareholderType.EMPLOYEE,
    ShareholderType.ADVISOR,
    ShareholderType.COMPANY,
    ShareholderType.OTHER,
  ]).openapi({ description: 'Type of shareholder' }),
  shareholderName: z.string().min(1).openapi({ description: 'Shareholder name', example: 'John Doe' }),
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
  ]).openapi({ description: 'Share class' }),
  entryType: z.enum([
    CapTableEntryType.ISSUANCE,
    CapTableEntryType.TRANSFER,
    CapTableEntryType.EXERCISE,
    CapTableEntryType.CONVERSION,
    CapTableEntryType.BUYBACK,
    CapTableEntryType.CANCELLATION,
  ]).openapi({ description: 'Type of cap table entry' }),
  shares: z.number().openapi({ description: 'Number of shares (positive for additions, negative for reductions)' }),
  pricePerShare: z.number().min(0).optional().openapi({ description: 'Price per share' }),
  round: z.string().optional().openapi({ description: 'Associated funding round ID' }),
  effectiveDate: z.string().datetime().openapi({ description: 'Effective date of the transaction' }),
  certificateNumber: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateCapTableEntryInput = z.infer<typeof createCapTableEntrySchema>;

export const updateCapTableEntrySchema = z.object({
  shareholderName: z.string().min(1).optional(),
  pricePerShare: z.number().min(0).optional(),
  effectiveDate: z.string().datetime().optional(),
  certificateNumber: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateCapTableEntryInput = z.infer<typeof updateCapTableEntrySchema>;

// ============ Query Schemas ============

export const capTableQuerySchema = z.object({
  shareholderType: z.enum([
    ShareholderType.FOUNDER,
    ShareholderType.INVESTOR,
    ShareholderType.EMPLOYEE,
    ShareholderType.ADVISOR,
    ShareholderType.COMPANY,
    ShareholderType.OTHER,
  ]).optional(),
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
  asOfDate: z.string().datetime().optional(),
});

export type CapTableQueryInput = z.infer<typeof capTableQuerySchema>;

// ============ Simulation Schemas ============

export const simulateRoundSchema = z.object({
  roundName: z.string().min(1).openapi({ description: 'Name for the simulated round', example: 'Series B' }),
  investmentAmount: z.number().min(0).openapi({ description: 'Total investment amount', example: 10000000 }),
  preMoneyValuation: z.number().min(0).openapi({ description: 'Pre-money valuation', example: 40000000 }),
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
  ]).optional().default(ShareClass.PREFERRED),
  optionPoolIncrease: z.number().min(0).max(100).optional().default(0).openapi({ description: 'Option pool increase (%)' }),
});

export type SimulateRoundInput = z.infer<typeof simulateRoundSchema>;

export const waterfallSchema = z.object({
  exitValuation: z.number().min(0).openapi({ description: 'Exit valuation for waterfall analysis', example: 100000000 }),
});

export type WaterfallInput = z.infer<typeof waterfallSchema>;

// ============ Response Schemas ============

export const shareClassResponseSchema = z.object({
  _id: z.string(),
  organization: z.string(),
  name: z.string(),
  class: z.string(),
  authorizedShares: z.number(),
  issuedShares: z.number(),
  outstandingShares: z.number(),
  availableShares: z.number().optional(),
  percentIssued: z.number().optional(),
  parValue: z.number().optional(),
  votingRights: z.number(),
  liquidationPreference: z.number().optional(),
  participatingPreferred: z.boolean().optional(),
  conversionRatio: z.number().optional(),
  dividendRate: z.number().optional(),
  seniority: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const capTableEntryResponseSchema = z.object({
  _id: z.string(),
  organization: z.string(),
  shareholder: z.string(),
  shareholderType: z.string(),
  shareholderName: z.string(),
  shareClass: z.string(),
  entryType: z.string(),
  shares: z.number(),
  pricePerShare: z.number().optional(),
  totalValue: z.number().optional(),
  percentOwnership: z.number(),
  round: z.string().optional(),
  grantId: z.string().optional(),
  effectiveDate: z.string(),
  certificateNumber: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const capTableSummaryResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    asOfDate: z.string(),
    totalAuthorizedShares: z.number(),
    totalIssuedShares: z.number(),
    totalOutstandingShares: z.number(),
    byShareClass: z.array(z.object({
      shareClass: z.string(),
      authorizedShares: z.number(),
      issuedShares: z.number(),
      outstandingShares: z.number(),
      percentOfTotal: z.number(),
    })),
    byShareholder: z.array(z.object({
      shareholderId: z.string(),
      name: z.string(),
      type: z.string(),
      totalShares: z.number(),
      percentOwnership: z.number(),
      byShareClass: z.array(z.object({
        shareClass: z.string(),
        shares: z.number(),
      })),
    })),
    byShareholderType: z.array(z.object({
      type: z.string(),
      holderCount: z.number(),
      totalShares: z.number(),
      percentOwnership: z.number(),
    })),
  }),
});

export const waterfallResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    exitValuation: z.number(),
    distribution: z.array(z.object({
      shareholderId: z.string(),
      shareholderName: z.string(),
      shareholderType: z.string(),
      shares: z.number(),
      percentOwnership: z.number(),
      proceeds: z.number(),
      multiple: z.number().optional(),
    })),
    totalDistributed: z.number(),
  }),
});

export const simulationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    roundName: z.string(),
    investmentAmount: z.number(),
    pricePerShare: z.number(),
    newShares: z.number(),
    preMoneyValuation: z.number(),
    postMoneyValuation: z.number(),
    dilution: z.array(z.object({
      shareholderId: z.string(),
      shareholderName: z.string(),
      sharesBefore: z.number(),
      sharesAfter: z.number(),
      percentBefore: z.number(),
      percentAfter: z.number(),
      dilutionPercent: z.number(),
    })),
    newCapTable: z.array(z.object({
      shareholderId: z.string(),
      name: z.string(),
      type: z.string(),
      totalShares: z.number(),
      percentOwnership: z.number(),
    })),
  }),
});
