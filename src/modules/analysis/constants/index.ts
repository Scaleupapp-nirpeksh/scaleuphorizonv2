/**
 * Analysis Module Constants
 *
 * Centralized constants for all analysis sub-modules:
 * - Variance
 * - Trends
 * - Unit Economics
 * - Health Score
 */

// ============ Variance Constants ============

export const VarianceType = {
  BUDGET: 'budget',
  REVENUE: 'revenue',
  HEADCOUNT: 'headcount',
  EXPENSE: 'expense',
} as const;

export type VarianceTypeType = (typeof VarianceType)[keyof typeof VarianceType];

export const VarianceStatus = {
  FAVORABLE: 'favorable',
  UNFAVORABLE: 'unfavorable',
  ON_TARGET: 'on_target',
} as const;

export type VarianceStatusType = (typeof VarianceStatus)[keyof typeof VarianceStatus];

export const VariancePeriod = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  YTD: 'ytd', // Year to date
  CUSTOM: 'custom',
} as const;

export type VariancePeriodType = (typeof VariancePeriod)[keyof typeof VariancePeriod];

// ============ Trend Constants ============

export const TrendType = {
  EXPENSE: 'expense',
  REVENUE: 'revenue',
  BURN_RATE: 'burn_rate',
  HEADCOUNT: 'headcount',
  CASH_BALANCE: 'cash_balance',
  NET_INCOME: 'net_income',
  GROSS_MARGIN: 'gross_margin',
  CUSTOM: 'custom',
} as const;

export type TrendTypeType = (typeof TrendType)[keyof typeof TrendType];

export const TrendDirection = {
  INCREASING: 'increasing',
  DECREASING: 'decreasing',
  STABLE: 'stable',
  VOLATILE: 'volatile',
} as const;

export type TrendDirectionType = (typeof TrendDirection)[keyof typeof TrendDirection];

export const TrendPeriod = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
} as const;

export type TrendPeriodType = (typeof TrendPeriod)[keyof typeof TrendPeriod];

// ============ Unit Economics Constants ============

export const MetricType = {
  CAC: 'cac', // Customer Acquisition Cost
  LTV: 'ltv', // Lifetime Value
  LTV_CAC_RATIO: 'ltv_cac_ratio',
  PAYBACK_PERIOD: 'payback_period',
  ARPU: 'arpu', // Average Revenue Per User
  CHURN_RATE: 'churn_rate',
  RETENTION_RATE: 'retention_rate',
  MRR: 'mrr', // Monthly Recurring Revenue
  ARR: 'arr', // Annual Recurring Revenue
  NET_REVENUE_RETENTION: 'net_revenue_retention',
  GROSS_MARGIN: 'gross_margin',
  BURN_MULTIPLE: 'burn_multiple',
} as const;

export type MetricTypeType = (typeof MetricType)[keyof typeof MetricType];

export const CohortPeriod = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
} as const;

export type CohortPeriodType = (typeof CohortPeriod)[keyof typeof CohortPeriod];

// ============ Health Score Constants ============

export const HealthCategory = {
  RUNWAY: 'runway',
  BURN_RATE: 'burn_rate',
  REVENUE_GROWTH: 'revenue_growth',
  GROSS_MARGIN: 'gross_margin',
  LIQUIDITY: 'liquidity',
  EFFICIENCY: 'efficiency',
  UNIT_ECONOMICS: 'unit_economics',
} as const;

export type HealthCategoryType = (typeof HealthCategory)[keyof typeof HealthCategory];

export const HealthStatus = {
  EXCELLENT: 'excellent', // 90-100
  GOOD: 'good', // 70-89
  FAIR: 'fair', // 50-69
  POOR: 'poor', // 30-49
  CRITICAL: 'critical', // 0-29
} as const;

export type HealthStatusType = (typeof HealthStatus)[keyof typeof HealthStatus];

export const RecommendationPriority = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type RecommendationPriorityType =
  (typeof RecommendationPriority)[keyof typeof RecommendationPriority];

export const RecommendationCategory = {
  COST_REDUCTION: 'cost_reduction',
  REVENUE_GROWTH: 'revenue_growth',
  CASH_MANAGEMENT: 'cash_management',
  OPERATIONAL_EFFICIENCY: 'operational_efficiency',
  FUNDRAISING: 'fundraising',
} as const;

export type RecommendationCategoryType =
  (typeof RecommendationCategory)[keyof typeof RecommendationCategory];

// ============ Validation Constants ============

export const ANALYSIS_CONSTANTS = {
  // Score constraints
  MIN_SCORE: 0,
  MAX_SCORE: 100,

  // Variance thresholds
  ON_TARGET_THRESHOLD: 0.05, // 5% variance is considered on target
  SIGNIFICANT_VARIANCE_THRESHOLD: 0.20, // 20% is significant

  // Trend analysis
  MIN_DATA_POINTS_FOR_TREND: 3,
  DEFAULT_TREND_MONTHS: 12,
  MAX_TREND_MONTHS: 36,

  // Cohort analysis
  MIN_COHORT_SIZE: 1,
  MAX_COHORT_MONTHS: 24,

  // Health score weights (must sum to 100)
  HEALTH_WEIGHTS: {
    runway: 25,
    burn_rate: 15,
    revenue_growth: 20,
    gross_margin: 15,
    liquidity: 10,
    efficiency: 10,
    unit_economics: 5,
  },

  // Health thresholds
  HEALTH_THRESHOLDS: {
    excellent: 90,
    good: 70,
    fair: 50,
    poor: 30,
    critical: 0,
  },

  // Benchmark defaults (SaaS industry)
  BENCHMARKS: {
    grossMargin: 0.70, // 70%
    ltv_cac_ratio: 3.0, // 3:1
    payback_months: 12,
    churn_rate: 0.05, // 5% monthly
    burn_multiple: 1.5,
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============ Helper Functions ============

/**
 * Determine variance status based on percentage
 * For revenue/income: positive variance is favorable
 * For expenses: negative variance is favorable
 */
export function getVarianceStatus(
  variancePercent: number,
  isExpense: boolean
): VarianceStatusType {
  const threshold = ANALYSIS_CONSTANTS.ON_TARGET_THRESHOLD;

  if (Math.abs(variancePercent) <= threshold) {
    return VarianceStatus.ON_TARGET;
  }

  if (isExpense) {
    // For expenses, spending less than budgeted is favorable
    return variancePercent < 0 ? VarianceStatus.FAVORABLE : VarianceStatus.UNFAVORABLE;
  } else {
    // For revenue, earning more than planned is favorable
    return variancePercent > 0 ? VarianceStatus.FAVORABLE : VarianceStatus.UNFAVORABLE;
  }
}

/**
 * Determine trend direction based on data points
 */
export function getTrendDirection(values: number[]): TrendDirectionType {
  if (values.length < 2) return TrendDirection.STABLE;

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  // Calculate volatility (coefficient of variation)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  // High volatility if CV > 30%
  if (cv > 30) return TrendDirection.VOLATILE;

  // Determine direction based on change
  if (changePercent > 5) return TrendDirection.INCREASING;
  if (changePercent < -5) return TrendDirection.DECREASING;
  return TrendDirection.STABLE;
}

/**
 * Get health status from score
 */
export function getHealthStatus(score: number): HealthStatusType {
  if (score >= ANALYSIS_CONSTANTS.HEALTH_THRESHOLDS.excellent) return HealthStatus.EXCELLENT;
  if (score >= ANALYSIS_CONSTANTS.HEALTH_THRESHOLDS.good) return HealthStatus.GOOD;
  if (score >= ANALYSIS_CONSTANTS.HEALTH_THRESHOLDS.fair) return HealthStatus.FAIR;
  if (score >= ANALYSIS_CONSTANTS.HEALTH_THRESHOLDS.poor) return HealthStatus.POOR;
  return HealthStatus.CRITICAL;
}

/**
 * Calculate growth rate between two values
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate compound monthly growth rate (CMGR)
 */
export function calculateCMGR(startValue: number, endValue: number, months: number): number {
  if (startValue <= 0 || endValue <= 0 || months <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / months) - 1) * 100;
}

/**
 * Get months between two dates
 */
export function getMonthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
}
