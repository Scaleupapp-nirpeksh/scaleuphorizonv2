/**
 * Planning Module Constants
 * Enums, statuses, and configuration values for all planning sub-modules
 */

// ============ Budget Constants ============

export const BudgetStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type BudgetStatusType = (typeof BudgetStatus)[keyof typeof BudgetStatus];

export const BudgetType = {
  ANNUAL: 'annual',
  QUARTERLY: 'quarterly',
  MONTHLY: 'monthly',
} as const;

export type BudgetTypeValue = (typeof BudgetType)[keyof typeof BudgetType];

export const AllocationMethod = {
  EVEN: 'even',
  CUSTOM: 'custom',
  WEIGHTED: 'weighted',
} as const;

export type AllocationMethodType = (typeof AllocationMethod)[keyof typeof AllocationMethod];

export const Priority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type PriorityType = (typeof Priority)[keyof typeof Priority];

// ============ Headcount Constants ============

export const HeadcountPlanStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type HeadcountPlanStatusType = (typeof HeadcountPlanStatus)[keyof typeof HeadcountPlanStatus];

export const EmploymentType = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACTOR: 'contractor',
  TEMPORARY: 'temporary',
} as const;

export type EmploymentTypeValue = (typeof EmploymentType)[keyof typeof EmploymentType];

export const JobLevel = {
  INTERN: 'intern',
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
  MANAGER: 'manager',
  DIRECTOR: 'director',
  VP: 'vp',
  C_LEVEL: 'c-level',
} as const;

export type JobLevelType = (typeof JobLevel)[keyof typeof JobLevel];

export const RoleStatus = {
  PLANNED: 'planned',
  APPROVED: 'approved',
  RECRUITING: 'recruiting',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
} as const;

export type RoleStatusType = (typeof RoleStatus)[keyof typeof RoleStatus];

export const RemoteStatus = {
  ONSITE: 'onsite',
  HYBRID: 'hybrid',
  REMOTE: 'remote',
} as const;

export type RemoteStatusType = (typeof RemoteStatus)[keyof typeof RemoteStatus];

// ============ Revenue Plan Constants ============

export const RevenuePlanStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type RevenuePlanStatusType = (typeof RevenuePlanStatus)[keyof typeof RevenuePlanStatus];

export const RevenueModel = {
  SUBSCRIPTION: 'subscription',
  TRANSACTIONAL: 'transactional',
  HYBRID: 'hybrid',
  OTHER: 'other',
} as const;

export type RevenueModelType = (typeof RevenueModel)[keyof typeof RevenueModel];

export const StreamType = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one-time',
  RECURRING: 'recurring',
  USAGE_BASED: 'usage-based',
  LICENSING: 'licensing',
  SERVICES: 'services',
  OTHER: 'other',
} as const;

export type StreamTypeValue = (typeof StreamType)[keyof typeof StreamType];

export const PricingModel = {
  FIXED: 'fixed',
  TIERED: 'tiered',
  USAGE: 'usage',
  FREEMIUM: 'freemium',
} as const;

export type PricingModelType = (typeof PricingModel)[keyof typeof PricingModel];

export const Confidence = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type ConfidenceType = (typeof Confidence)[keyof typeof Confidence];

// ============ Scenario Constants ============

export const ScenarioStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type ScenarioStatusType = (typeof ScenarioStatus)[keyof typeof ScenarioStatus];

export const ScenarioType = {
  BASE: 'base',
  OPTIMISTIC: 'optimistic',
  PESSIMISTIC: 'pessimistic',
  CUSTOM: 'custom',
} as const;

export type ScenarioTypeValue = (typeof ScenarioType)[keyof typeof ScenarioType];

export const AdjustmentType = {
  BUDGET_ITEM: 'budget_item',
  REVENUE_STREAM: 'revenue_stream',
  PLANNED_ROLE: 'planned_role',
  CUSTOM: 'custom',
} as const;

export type AdjustmentTypeValue = (typeof AdjustmentType)[keyof typeof AdjustmentType];

export const AdjustmentMethod = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  FORMULA: 'formula',
} as const;

export type AdjustmentMethodType = (typeof AdjustmentMethod)[keyof typeof AdjustmentMethod];

export const ImpactType = {
  INCREASE: 'increase',
  DECREASE: 'decrease',
  NEUTRAL: 'neutral',
} as const;

export type ImpactTypeValue = (typeof ImpactType)[keyof typeof ImpactType];

export const ImpactCategory = {
  REVENUE: 'revenue',
  EXPENSE: 'expense',
  HEADCOUNT: 'headcount',
} as const;

export type ImpactCategoryType = (typeof ImpactCategory)[keyof typeof ImpactCategory];

// ============ Validation Constants ============

export const PLANNING_CONSTANTS = {
  // Name/Description limits
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  ASSUMPTIONS_MAX_LENGTH: 2000,
  NOTES_MAX_LENGTH: 500,

  // Item limits
  MAX_BUDGET_ITEMS: 500,
  MAX_PLANNED_ROLES: 200,
  MAX_REVENUE_STREAMS: 50,
  MAX_ADJUSTMENTS: 1000,
  MAX_SCENARIOS: 10,

  // Hierarchy depth
  MAX_NESTING_DEPTH: 5,

  // Default values
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_BENEFITS_PERCENTAGE: 25,

  // Fiscal year range
  MIN_FISCAL_YEAR: 2020,
  MAX_FISCAL_YEAR: 2050,
} as const;

// ============ Quarter/Month Helpers ============

export const Quarters = [1, 2, 3, 4] as const;
export type QuarterType = (typeof Quarters)[number];

export const Months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type MonthType = (typeof Months)[number];

/**
 * Get quarter from month
 */
export function getQuarterFromMonth(month: number): QuarterType {
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

/**
 * Get months in quarter
 */
export function getMonthsInQuarter(quarter: QuarterType): number[] {
  switch (quarter) {
    case 1:
      return [1, 2, 3];
    case 2:
      return [4, 5, 6];
    case 3:
      return [7, 8, 9];
    case 4:
      return [10, 11, 12];
  }
}
