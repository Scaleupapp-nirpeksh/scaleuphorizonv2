/**
 * Fundraising Module Constants
 *
 * Centralized constants for all fundraising sub-modules:
 * - Rounds (Funding Rounds)
 * - Investors (Investor Management)
 * - Cap Table
 * - ESOP (Employee Stock Option Plan)
 */

// ============ Round Constants ============

export const RoundType = {
  PRE_SEED: 'pre_seed',
  SEED: 'seed',
  SERIES_A: 'series_a',
  SERIES_B: 'series_b',
  SERIES_C: 'series_c',
  SERIES_D: 'series_d',
  BRIDGE: 'bridge',
  CONVERTIBLE_NOTE: 'convertible_note',
  SAFE: 'safe',
  OTHER: 'other',
} as const;

export type RoundTypeType = (typeof RoundType)[keyof typeof RoundType];

export const RoundStatus = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export type RoundStatusType = (typeof RoundStatus)[keyof typeof RoundStatus];

// ============ Investor Constants ============

export const InvestorType = {
  ANGEL: 'angel',
  VC: 'vc',
  CORPORATE: 'corporate',
  FAMILY_OFFICE: 'family_office',
  ACCELERATOR: 'accelerator',
  CROWDFUNDING: 'crowdfunding',
  FOUNDER: 'founder',
  EMPLOYEE: 'employee',
  OTHER: 'other',
} as const;

export type InvestorTypeType = (typeof InvestorType)[keyof typeof InvestorType];

export const InvestorStatus = {
  PROSPECT: 'prospect',
  IN_DISCUSSION: 'in_discussion',
  COMMITTED: 'committed',
  INVESTED: 'invested',
  PASSED: 'passed',
} as const;

export type InvestorStatusType = (typeof InvestorStatus)[keyof typeof InvestorStatus];

export const TrancheStatus = {
  SCHEDULED: 'scheduled',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type TrancheStatusType = (typeof TrancheStatus)[keyof typeof TrancheStatus];

// ============ Cap Table Constants ============

export const ShareClass = {
  COMMON: 'common',
  PREFERRED: 'preferred',
  SERIES_SEED: 'series_seed',
  SERIES_A: 'series_a',
  SERIES_B: 'series_b',
  SERIES_C: 'series_c',
  SERIES_D: 'series_d',
  OPTIONS: 'options',
  WARRANTS: 'warrants',
  CONVERTIBLE: 'convertible',
} as const;

export type ShareClassType = (typeof ShareClass)[keyof typeof ShareClass];

export const ShareholderType = {
  FOUNDER: 'founder',
  INVESTOR: 'investor',
  EMPLOYEE: 'employee',
  ADVISOR: 'advisor',
  COMPANY: 'company', // Treasury shares
  OTHER: 'other',
} as const;

export type ShareholderTypeType = (typeof ShareholderType)[keyof typeof ShareholderType];

export const CapTableEntryType = {
  ISSUANCE: 'issuance',
  TRANSFER: 'transfer',
  EXERCISE: 'exercise',
  CONVERSION: 'conversion',
  BUYBACK: 'buyback',
  CANCELLATION: 'cancellation',
} as const;

export type CapTableEntryTypeType = (typeof CapTableEntryType)[keyof typeof CapTableEntryType];

// ============ ESOP Constants ============

export const GrantStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  ACTIVE: 'active',
  PARTIALLY_VESTED: 'partially_vested',
  FULLY_VESTED: 'fully_vested',
  EXERCISED: 'exercised',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  FORFEITED: 'forfeited',
} as const;

export type GrantStatusType = (typeof GrantStatus)[keyof typeof GrantStatus];

export const VestingScheduleType = {
  STANDARD_4Y_1Y_CLIFF: 'standard_4y_1y_cliff', // 4 year, 1 year cliff
  STANDARD_4Y_NO_CLIFF: 'standard_4y_no_cliff',
  IMMEDIATE: 'immediate',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
  MILESTONE_BASED: 'milestone_based',
  CUSTOM: 'custom',
} as const;

export type VestingScheduleTypeType = (typeof VestingScheduleType)[keyof typeof VestingScheduleType];

export const GrantType = {
  ISO: 'iso', // Incentive Stock Option
  NSO: 'nso', // Non-Qualified Stock Option
  RSU: 'rsu', // Restricted Stock Unit
  RSA: 'rsa', // Restricted Stock Award
  SAR: 'sar', // Stock Appreciation Right
  PHANTOM: 'phantom', // Phantom Stock
} as const;

export type GrantTypeType = (typeof GrantType)[keyof typeof GrantType];

// ============ Validation Constants ============

export const FUNDRAISING_CONSTANTS = {
  // Share limits
  MIN_SHARES: 1,
  MAX_SHARES_PER_TRANSACTION: 1_000_000_000,

  // Price limits
  MIN_PRICE_PER_SHARE: 0.0001,
  MAX_PRICE_PER_SHARE: 1_000_000,

  // Percentage limits
  MIN_OWNERSHIP_PERCENT: 0,
  MAX_OWNERSHIP_PERCENT: 100,

  // ESOP limits
  DEFAULT_ESOP_POOL_PERCENT: 10, // 10% of total shares
  MAX_ESOP_POOL_PERCENT: 20,
  MIN_VESTING_MONTHS: 1,
  MAX_VESTING_MONTHS: 120, // 10 years
  DEFAULT_CLIFF_MONTHS: 12,
  DEFAULT_VESTING_MONTHS: 48,

  // Valuation
  MIN_VALUATION: 0,

  // Round defaults
  DEFAULT_ROUND_DURATION_MONTHS: 6,

  // Dilution thresholds
  SIGNIFICANT_DILUTION_THRESHOLD: 0.10, // 10%

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============ Helper Functions ============

/**
 * Calculate ownership percentage
 */
export function calculateOwnershipPercent(shares: number, totalShares: number): number {
  if (totalShares === 0) return 0;
  return (shares / totalShares) * 100;
}

/**
 * Calculate dilution from a new round
 */
export function calculateDilution(
  currentShares: number,
  totalSharesBefore: number,
  totalSharesAfter: number
): { sharesBefore: number; sharesAfter: number; dilutionPercent: number } {
  const ownershipBefore = calculateOwnershipPercent(currentShares, totalSharesBefore);
  const ownershipAfter = calculateOwnershipPercent(currentShares, totalSharesAfter);
  const dilutionPercent = ownershipBefore - ownershipAfter;

  return {
    sharesBefore: currentShares,
    sharesAfter: currentShares, // Shares don't change, only percentage
    dilutionPercent,
  };
}

/**
 * Calculate pre-money and post-money valuation
 */
export function calculateValuations(
  investmentAmount: number,
  pricePerShare: number,
  newShares: number,
  existingShares: number
): { preMoneyValuation: number; postMoneyValuation: number } {
  const postMoneyValuation = pricePerShare * (existingShares + newShares);
  const preMoneyValuation = postMoneyValuation - investmentAmount;

  return { preMoneyValuation, postMoneyValuation };
}

/**
 * Calculate vested shares based on schedule
 */
export function calculateVestedShares(
  totalShares: number,
  grantDate: Date,
  vestingMonths: number,
  cliffMonths: number,
  asOfDate: Date = new Date()
): { vestedShares: number; unvestedShares: number; vestingPercent: number } {
  const monthsElapsed = getMonthsBetween(grantDate, asOfDate);

  // Before cliff, nothing vested
  if (monthsElapsed < cliffMonths) {
    return { vestedShares: 0, unvestedShares: totalShares, vestingPercent: 0 };
  }

  // After full vesting period
  if (monthsElapsed >= vestingMonths) {
    return { vestedShares: totalShares, unvestedShares: 0, vestingPercent: 100 };
  }

  // Linear vesting after cliff
  const vestingPercent = (monthsElapsed / vestingMonths) * 100;
  const vestedShares = Math.floor((monthsElapsed / vestingMonths) * totalShares);

  return {
    vestedShares,
    unvestedShares: totalShares - vestedShares,
    vestingPercent,
  };
}

/**
 * Get months between two dates
 */
export function getMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

/**
 * Get round type display name
 */
export function getRoundTypeDisplayName(type: RoundTypeType): string {
  const displayNames: Record<RoundTypeType, string> = {
    pre_seed: 'Pre-Seed',
    seed: 'Seed',
    series_a: 'Series A',
    series_b: 'Series B',
    series_c: 'Series C',
    series_d: 'Series D',
    bridge: 'Bridge',
    convertible_note: 'Convertible Note',
    safe: 'SAFE',
    other: 'Other',
  };
  return displayNames[type] || type;
}

/**
 * Get share class display name
 */
export function getShareClassDisplayName(shareClass: ShareClassType): string {
  const displayNames: Record<ShareClassType, string> = {
    common: 'Common Stock',
    preferred: 'Preferred Stock',
    series_seed: 'Series Seed Preferred',
    series_a: 'Series A Preferred',
    series_b: 'Series B Preferred',
    series_c: 'Series C Preferred',
    series_d: 'Series D Preferred',
    options: 'Stock Options',
    warrants: 'Warrants',
    convertible: 'Convertible Securities',
  };
  return displayNames[shareClass] || shareClass;
}
