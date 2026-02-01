import { Types } from 'mongoose';
import {
  BudgetStatusType,
  BudgetTypeValue,
  AllocationMethodType,
  PriorityType,
  HeadcountPlanStatusType,
  JobLevelType,
  RoleStatusType,
  RevenuePlanStatusType,
  RevenueModelType,
  StreamTypeValue,
  ConfidenceType,
  ScenarioStatusType,
  ScenarioTypeValue,
} from '../constants';

// ============ Common Types ============

export interface MonthlyAmount {
  month: number;
  amount: number;
  notes?: string;
}

export interface MonthlyCost {
  month: number;
  salary: number;
  benefits: number;
  total: number;
}

export interface MonthlyRevenue {
  month: number;
  projected: number;
  confidence: ConfidenceType;
  notes?: string;
}

export interface MonthlyAdjustment {
  month: number;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentPercentage: number;
  notes?: string;
}

export interface PlanningContext {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
}

// ============ Budget Types ============

export interface BudgetSummary {
  id: string;
  name: string;
  fiscalYear: number;
  type: BudgetTypeValue;
  status: BudgetStatusType;
  totalAmount: number;
  itemCount: number;
  currency: string;
  byCategory: Record<string, number>;
  createdAt: string;
}

export interface MonthlyBreakdown {
  month: number;
  monthName: string;
  totalAmount: number;
  byCategory: Record<string, number>;
}

export interface CategoryBreakdown {
  category: string;
  accountCode: string;
  accountName: string;
  annualAmount: number;
  monthlyAmounts: number[];
  itemCount: number;
  priority: PriorityType;
}

// ============ Headcount Types ============

export interface HeadcountSummary {
  id: string;
  name: string;
  fiscalYear: number;
  status: HeadcountPlanStatusType;
  currentHeadcount: number;
  targetHeadcount: number;
  plannedHires: number;
  totalSalaryCost: number;
  totalBenefitsCost: number;
  totalCost: number;
  byDepartment: Record<string, number>;
  byLevel: Record<string, number>;
  createdAt: string;
}

export interface TimelineEntry {
  roleId: string;
  title: string;
  department: string;
  level: JobLevelType;
  plannedStartDate: Date;
  plannedStartMonth: number;
  baseSalary: number;
  totalCost: number;
  status: RoleStatusType;
}

export interface DepartmentBreakdown {
  department: string;
  roleCount: number;
  totalSalary: number;
  totalBenefits: number;
  totalCost: number;
  roles: {
    title: string;
    level: JobLevelType;
    salary: number;
    startDate: Date;
  }[];
}

export interface MonthlyCostProjection {
  month: number;
  monthName: string;
  salaryTotal: number;
  benefitsTotal: number;
  total: number;
  newHires: number;
  cumulativeHeadcount: number;
}

// ============ Revenue Plan Types ============

export interface RevenueSummary {
  id: string;
  name: string;
  fiscalYear: number;
  status: RevenuePlanStatusType;
  revenueModel: RevenueModelType;
  totalProjectedRevenue: number;
  streamCount: number;
  byStreamType: Record<string, number>;
  byConfidence: Record<string, number>;
  createdAt: string;
}

export interface RevenuePlanSummary {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  revenueModel: string;
  totalProjectedRevenue: number;
  streamCount: number;
  currency: string;
  byStreamType: Record<string, number>;
  averageConfidence: string;
  growthTargetPercentage?: number;
  baselineRevenue?: number;
  createdAt: string;
}

export interface MonthlyRevenueSummary {
  month: number;
  monthName: string;
  totalProjected: number;
  byStreamType: Record<string, number>;
  byConfidence: Record<string, number>;
}

export interface MonthlyRevenueProjection {
  month: number;
  monthName: string;
  totalProjected: number;
  byStream: Record<string, number>;
  confidence: ConfidenceType;
}

export interface MRRAnalysis {
  startingMRR: number;
  endingMRR: number;
  mrrGrowth: number;
  mrrGrowthPercentage: number;
  projectedARR: number;
  averageChurnRate: number;
  averageExpansionRate: number;
  netRevenueRetention: number;
}

export interface GrowthMetrics {
  monthOverMonthGrowth: number[];
  averageMonthlyGrowth: number;
  projectedYearEndRevenue: number;
  growthRate: number;
}

export interface SegmentBreakdown {
  segment: string;
  streamCount: number;
  totalRevenue: number;
  percentageOfTotal: number;
  avgConfidence: ConfidenceType;
}

// ============ Scenario Types ============

export interface ScenarioSummary {
  id: string;
  name: string;
  type: ScenarioTypeValue;
  fiscalYear: number;
  status: ScenarioStatusType;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetIncome: number;
  projectedRunway?: number;
  adjustmentCount: number;
  linkedPlans: {
    budget?: string;
    headcount?: string;
    revenue?: string;
  };
  createdAt: string;
}

export interface ScenarioComparison {
  scenarios: ScenarioSummary[];
  metrics: {
    metric: string;
    values: Record<string, number>;
    percentageDifference: Record<string, number>;
  }[];
  insights: string[];
}

export interface ImpactCalculation {
  revenueImpact: number;
  expenseImpact: number;
  netImpact: number;
  runwayImpactMonths: number;
  byCategory: Record<string, number>;
  byAdjustmentType: Record<string, number>;
}

export interface SensitivityResult {
  variable: string;
  variableValue: number;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetIncome: number;
  projectedRunway: number;
}

// ============ Populated Types ============

export interface BudgetItemWithAccount {
  id: string;
  budget: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    subtype: string;
  };
  category: string;
  name: string;
  annualAmount: number;
  monthlyBreakdown: MonthlyAmount[];
  allocationMethod: AllocationMethodType;
  priority: PriorityType;
}

export interface RevenueStreamWithAccount {
  id: string;
  revenuePlan: string;
  account?: {
    id: string;
    code: string;
    name: string;
  };
  name: string;
  streamType: StreamTypeValue;
  monthlyProjections: MonthlyRevenue[];
  annualProjected: number;
  confidence: ConfidenceType;
}

// ============ Filter Types ============

export interface BudgetFilters {
  fiscalYear?: number;
  type?: BudgetTypeValue;
  status?: BudgetStatusType;
  search?: string;
}

export interface HeadcountFilters {
  fiscalYear?: number;
  status?: HeadcountPlanStatusType;
  department?: string;
  search?: string;
}

export interface RevenuePlanFilters {
  fiscalYear?: number;
  status?: RevenuePlanStatusType;
  revenueModel?: RevenueModelType;
  search?: string;
}

export interface ScenarioFilters {
  fiscalYear?: number;
  type?: ScenarioTypeValue;
  status?: ScenarioStatusType;
  search?: string;
}
