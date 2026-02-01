/**
 * Analysis Module Types
 *
 * Shared TypeScript interfaces for all analysis sub-modules
 */

import { Types } from 'mongoose';
import {
  VarianceTypeType,
  VarianceStatusType,
  VariancePeriodType,
  TrendTypeType,
  TrendDirectionType,
  TrendPeriodType,
  MetricTypeType,
  CohortPeriodType,
  HealthCategoryType,
  HealthStatusType,
  RecommendationPriorityType,
  RecommendationCategoryType,
} from '../constants';

// ============ Variance Types ============

export interface VarianceItem {
  category: string;
  subcategory?: string;
  accountId?: Types.ObjectId;
  name: string;
  planned: number;
  actual: number;
  variance: number; // actual - planned
  variancePercent: number; // (variance / planned) * 100
  status: VarianceStatusType;
}

export interface VarianceReport {
  type: VarianceTypeType;
  period: VariancePeriodType;
  startDate: Date;
  endDate: Date;
  fiscalYear: number;
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
  overallStatus: VarianceStatusType;
  items: VarianceItem[];
  byCategory: CategoryVariance[];
}

export interface CategoryVariance {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: VarianceStatusType;
  itemCount: number;
}

export interface MonthlyVariance {
  month: Date;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: VarianceStatusType;
  cumulativePlanned: number;
  cumulativeActual: number;
  cumulativeVariance: number;
}

// ============ Trend Types ============

export interface TrendDataPoint {
  period: Date;
  value: number;
  previousValue?: number;
  changePercent?: number;
  movingAverage?: number;
}

export interface TrendAnalysis {
  type: TrendTypeType;
  periodType: TrendPeriodType;
  startDate: Date;
  endDate: Date;
  dataPoints: TrendDataPoint[];
  direction: TrendDirectionType;
  averageValue: number;
  minValue: number;
  maxValue: number;
  totalChange: number;
  totalChangePercent: number;
  volatility: number; // Coefficient of variation
  growthRate: number; // CAGR/CMGR
}

export interface TrendComparison {
  currentPeriod: TrendAnalysis;
  previousPeriod?: TrendAnalysis;
  periodOverPeriodChange: number;
  periodOverPeriodPercent: number;
}

export interface MultipleTrendAnalysis {
  trends: TrendAnalysis[];
  correlations?: TrendCorrelation[];
}

export interface TrendCorrelation {
  type1: TrendTypeType;
  type2: TrendTypeType;
  correlationCoefficient: number; // -1 to 1
  interpretation: string;
}

// ============ Unit Economics Types ============

export interface UnitEconomicsMetric {
  metric: MetricTypeType;
  value: number;
  previousValue?: number;
  changePercent?: number;
  benchmark?: number;
  benchmarkComparison?: 'above' | 'below' | 'at';
  trend: TrendDirectionType;
}

export interface UnitEconomicsSummary {
  calculatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: UnitEconomicsMetric[];
  overallHealth: HealthStatusType;
}

export interface CohortData {
  cohortId: string;
  cohortPeriod: Date;
  periodType: CohortPeriodType;
  customerCount: number;
  initialRevenue: number;
  retention: CohortRetention[];
  cumulativeRevenue: number;
  averageLTV: number;
}

export interface CohortRetention {
  periodNumber: number; // 0 = cohort month, 1 = month 1, etc.
  activeCustomers: number;
  retentionRate: number; // percentage
  revenue: number;
  averageRevenuePerCustomer: number;
}

export interface CohortAnalysis {
  periodType: CohortPeriodType;
  cohorts: CohortData[];
  averageRetentionByPeriod: { period: number; rate: number }[];
  averageLTV: number;
  medianLTV: number;
  bestCohort?: { period: Date; ltv: number };
  worstCohort?: { period: Date; ltv: number };
}

export interface CACBreakdown {
  totalCAC: number;
  components: {
    marketing: number;
    sales: number;
    other: number;
  };
  customerCount: number;
  cacPerCustomer: number;
  trend: TrendDirectionType;
}

export interface LTVBreakdown {
  averageLTV: number;
  averageLifespanMonths: number;
  averageMonthlyRevenue: number;
  churnRate: number;
  grossMargin: number;
}

// ============ Health Score Types ============

export interface HealthScoreCategory {
  category: HealthCategoryType;
  score: number; // 0-100
  weight: number; // percentage weight in overall score
  weightedScore: number; // score * weight / 100
  status: HealthStatusType;
  metrics: HealthMetricDetail[];
  recommendations?: HealthRecommendation[];
}

export interface HealthMetricDetail {
  name: string;
  value: number;
  unit: string;
  benchmark?: number;
  score: number; // 0-100
  trend: TrendDirectionType;
  description?: string;
}

export interface HealthRecommendation {
  category: RecommendationCategoryType;
  priority: RecommendationPriorityType;
  title: string;
  description: string;
  potentialImpact?: string;
  actionItems?: string[];
}

export interface HealthScoreResult {
  calculatedAt: Date;
  overallScore: number; // 0-100
  overallStatus: HealthStatusType;
  previousScore?: number;
  scoreChange?: number;
  categories: HealthScoreCategory[];
  topRecommendations: HealthRecommendation[];
  historicalScores?: HealthScoreHistory[];
}

export interface HealthScoreHistory {
  date: Date;
  overallScore: number;
  status: HealthStatusType;
  categoryScores: { category: HealthCategoryType; score: number }[];
}

export interface HealthScoreBreakdown {
  category: HealthCategoryType;
  currentScore: number;
  previousScore?: number;
  change?: number;
  status: HealthStatusType;
  factors: {
    positive: string[];
    negative: string[];
  };
}

// ============ Common Query Types ============

export interface AnalysisQueryParams {
  fiscalYear?: number;
  startDate?: string;
  endDate?: string;
  period?: VariancePeriodType | TrendPeriodType | CohortPeriodType;
  category?: string;
  accountId?: string;
}

export interface TrendQueryParams {
  type: TrendTypeType;
  periodType?: TrendPeriodType;
  months?: number;
  startDate?: string;
  endDate?: string;
  includeMovingAverage?: boolean;
  movingAveragePeriods?: number;
}

export interface CohortQueryParams {
  periodType?: CohortPeriodType;
  cohortMonths?: number;
  retentionMonths?: number;
}

// ============ Pagination Types ============

export interface AnalysisPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
