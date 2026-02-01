/**
 * Projection Module Constants
 *
 * Centralized constants for all projection sub-modules:
 * - Cash Flow
 * - Runway
 * - Forecasting
 * - Financial Model
 */

// ============ Cash Flow Constants ============

export const CashFlowPeriod = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
} as const;

export type CashFlowPeriodType = (typeof CashFlowPeriod)[keyof typeof CashFlowPeriod];

export const CashFlowStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type CashFlowStatusType = (typeof CashFlowStatus)[keyof typeof CashFlowStatus];

export const CashFlowCategory = {
  OPERATING: 'operating',
  INVESTING: 'investing',
  FINANCING: 'financing',
} as const;

export type CashFlowCategoryType = (typeof CashFlowCategory)[keyof typeof CashFlowCategory];

// ============ Runway Constants ============

export const RunwayScenario = {
  CURRENT: 'current',
  BEST_CASE: 'best_case',
  WORST_CASE: 'worst_case',
  NO_GROWTH: 'no_growth',
} as const;

export type RunwayScenarioType = (typeof RunwayScenario)[keyof typeof RunwayScenario];

export const RunwayStatus = {
  CRITICAL: 'critical', // < 3 months
  WARNING: 'warning', // 3-6 months
  HEALTHY: 'healthy', // 6-12 months
  STRONG: 'strong', // 12+ months
} as const;

export type RunwayStatusType = (typeof RunwayStatus)[keyof typeof RunwayStatus];

// ============ Forecast Constants ============

export const ForecastType = {
  REVENUE: 'revenue',
  EXPENSE: 'expense',
  BURN_RATE: 'burn_rate',
  HEADCOUNT: 'headcount',
  CASH: 'cash',
} as const;

export type ForecastTypeType = (typeof ForecastType)[keyof typeof ForecastType];

export const ForecastMethod = {
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
  SEASONAL: 'seasonal',
  WEIGHTED_AVERAGE: 'weighted_average',
  MANUAL: 'manual',
} as const;

export type ForecastMethodType = (typeof ForecastMethod)[keyof typeof ForecastMethod];

export const ForecastConfidence = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type ForecastConfidenceType = (typeof ForecastConfidence)[keyof typeof ForecastConfidence];

export const ForecastStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type ForecastStatusType = (typeof ForecastStatus)[keyof typeof ForecastStatus];

// ============ Financial Model Constants ============

export const StatementType = {
  INCOME_STATEMENT: 'income_statement',
  BALANCE_SHEET: 'balance_sheet',
  CASH_FLOW_STATEMENT: 'cash_flow_statement',
} as const;

export type StatementTypeType = (typeof StatementType)[keyof typeof StatementType];

export const FinancialModelStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type FinancialModelStatusType =
  (typeof FinancialModelStatus)[keyof typeof FinancialModelStatus];

export const ModelPeriod = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
} as const;

export type ModelPeriodType = (typeof ModelPeriod)[keyof typeof ModelPeriod];

// ============ Validation Constants ============

export const PROJECTION_CONSTANTS = {
  // Name constraints
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,

  // Fiscal year constraints
  MIN_FISCAL_YEAR: 2020,
  MAX_FISCAL_YEAR: 2050,

  // Projection period constraints
  MIN_PROJECTION_MONTHS: 1,
  MAX_PROJECTION_MONTHS: 60, // 5 years

  // Cash flow constraints
  MAX_CASH_FLOW_ITEMS: 500,
  MIN_STARTING_BALANCE: 0,

  // Runway constraints
  MIN_RUNWAY_MONTHS: 0,
  MAX_RUNWAY_MONTHS: 120, // 10 years

  // Forecast constraints
  MIN_HISTORICAL_MONTHS: 3,
  MAX_FORECAST_MONTHS: 36,
  MIN_CONFIDENCE_SCORE: 0,
  MAX_CONFIDENCE_SCORE: 100,

  // Financial model constraints
  MAX_LINE_ITEMS: 200,
  MAX_SCENARIOS: 10,

  // Amount constraints
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 999999999999, // ~1 trillion

  // Growth rate constraints (as percentage)
  MIN_GROWTH_RATE: -100,
  MAX_GROWTH_RATE: 1000, // 1000% max growth

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============ Helper Functions ============

/**
 * Get runway status based on months of runway
 */
export function getRunwayStatus(months: number): RunwayStatusType {
  if (months < 3) return RunwayStatus.CRITICAL;
  if (months < 6) return RunwayStatus.WARNING;
  if (months < 12) return RunwayStatus.HEALTHY;
  return RunwayStatus.STRONG;
}

/**
 * Get forecast confidence based on score
 */
export function getForecastConfidence(score: number): ForecastConfidenceType {
  if (score >= 80) return ForecastConfidence.HIGH;
  if (score >= 50) return ForecastConfidence.MEDIUM;
  return ForecastConfidence.LOW;
}

/**
 * Get months array for a fiscal year
 */
export function getFiscalYearMonths(fiscalYear: number): Date[] {
  const months: Date[] = [];
  for (let month = 0; month < 12; month++) {
    months.push(new Date(fiscalYear, month, 1));
  }
  return months;
}

/**
 * Get quarter number from month (1-12)
 */
export function getQuarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

/**
 * Get months in a quarter
 */
export function getQuarterMonths(quarter: 1 | 2 | 3 | 4, fiscalYear: number): Date[] {
  const startMonth = (quarter - 1) * 3;
  return [
    new Date(fiscalYear, startMonth, 1),
    new Date(fiscalYear, startMonth + 1, 1),
    new Date(fiscalYear, startMonth + 2, 1),
  ];
}
