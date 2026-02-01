/**
 * Projection Module Types
 *
 * Shared TypeScript interfaces for all projection sub-modules
 */

import { Types } from 'mongoose';
import {
  CashFlowPeriodType,
  CashFlowCategoryType,
  RunwayScenarioType,
  RunwayStatusType,
  ForecastTypeType,
  ForecastMethodType,
  ForecastConfidenceType,
  ModelPeriodType,
} from '../constants';

// ============ Cash Flow Types ============

export interface CashFlowProjection {
  period: Date;
  openingBalance: number;
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
}

export interface CashFlowItem {
  category: CashFlowCategoryType;
  subcategory?: string;
  accountId?: Types.ObjectId;
  description: string;
  amount: number;
  isActual: boolean; // true = historical, false = projected
  confidence?: ForecastConfidenceType;
}

export interface CashFlowSummary {
  periodType: CashFlowPeriodType;
  startDate: Date;
  endDate: Date;
  projections: CashFlowProjection[];
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  endingBalance: number;
  lowestBalance: number;
  lowestBalanceDate: Date;
}

// ============ Runway Types ============

export interface RunwayCalculation {
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  netBurnRate: number; // burn - revenue
  runwayMonths: number;
  runwayEndDate: Date;
  status: RunwayStatusType;
}

export interface RunwayProjection {
  month: Date;
  startingCash: number;
  projectedRevenue: number;
  projectedExpenses: number;
  netCashFlow: number;
  endingCash: number;
  cumulativeRunway: number;
}

export interface RunwayScenarioResult {
  scenario: RunwayScenarioType;
  assumptions: RunwayAssumptions;
  calculation: RunwayCalculation;
  projections: RunwayProjection[];
}

export interface RunwayAssumptions {
  revenueGrowthRate: number; // Monthly percentage
  expenseGrowthRate: number;
  oneTimeInflows?: number;
  oneTimeOutflows?: number;
  newHiringCost?: number;
}

export interface WhatIfAnalysis {
  baseRunway: RunwayCalculation;
  adjustedRunway: RunwayCalculation;
  impactMonths: number;
  recommendation?: string;
}

// ============ Forecast Types ============

export interface ForecastDataPoint {
  period: Date;
  actual?: number; // Historical actual value
  predicted: number;
  lowerBound: number; // Confidence interval lower
  upperBound: number; // Confidence interval upper
  confidence: ForecastConfidenceType;
}

export interface ForecastResult {
  type: ForecastTypeType;
  method: ForecastMethodType;
  dataPoints: ForecastDataPoint[];
  accuracy?: number; // Based on backtesting
  mape?: number; // Mean Absolute Percentage Error
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality?: 'detected' | 'not_detected';
}

export interface ForecastInput {
  type: ForecastTypeType;
  method: ForecastMethodType;
  historicalMonths: number;
  forecastMonths: number;
  accountId?: Types.ObjectId; // For specific account forecasting
  customAssumptions?: Record<string, number>;
}

// ============ Financial Model Types ============

export interface IncomeStatementLine {
  category: 'revenue' | 'cogs' | 'operating_expense' | 'other_income' | 'other_expense' | 'tax';
  subcategory?: string;
  accountId?: Types.ObjectId;
  name: string;
  amounts: MonthlyAmount[];
  total: number;
}

export interface BalanceSheetLine {
  category: 'asset' | 'liability' | 'equity';
  subcategory?:
    | 'current_asset'
    | 'fixed_asset'
    | 'current_liability'
    | 'long_term_liability'
    | 'equity';
  accountId?: Types.ObjectId;
  name: string;
  amounts: MonthlyAmount[];
  total: number;
}

export interface CashFlowStatementLine {
  category: CashFlowCategoryType;
  subcategory?: string;
  name: string;
  amounts: MonthlyAmount[];
  total: number;
}

export interface MonthlyAmount {
  month: Date;
  amount: number;
  isActual: boolean;
  notes?: string;
}

export interface IncomeStatement {
  revenue: IncomeStatementLine[];
  totalRevenue: number;
  cogs: IncomeStatementLine[];
  totalCogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: IncomeStatementLine[];
  totalOperatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: IncomeStatementLine[];
  otherExpenses: IncomeStatementLine[];
  ebit: number;
  taxes: number;
  netIncome: number;
  netMargin: number;
}

export interface BalanceSheet {
  assets: {
    current: BalanceSheetLine[];
    totalCurrent: number;
    fixed: BalanceSheetLine[];
    totalFixed: number;
    total: number;
  };
  liabilities: {
    current: BalanceSheetLine[];
    totalCurrent: number;
    longTerm: BalanceSheetLine[];
    totalLongTerm: number;
    total: number;
  };
  equity: {
    items: BalanceSheetLine[];
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface CashFlowStatement {
  operating: {
    items: CashFlowStatementLine[];
    total: number;
  };
  investing: {
    items: CashFlowStatementLine[];
    total: number;
  };
  financing: {
    items: CashFlowStatementLine[];
    total: number;
  };
  netChange: number;
  beginningCash: number;
  endingCash: number;
}

export interface ThreeStatementModel {
  fiscalYear: number;
  period: ModelPeriodType;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlowStatement: CashFlowStatement;
  keyMetrics: FinancialMetrics;
}

export interface FinancialMetrics {
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitdaMargin: number;

  // Liquidity
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;

  // Efficiency
  assetTurnover: number;
  receivablesDays?: number;
  payablesDays?: number;

  // Leverage
  debtToEquity: number;
  debtToAssets: number;

  // Growth
  revenueGrowth: number;
  expenseGrowth: number;
  netIncomeGrowth: number;

  // SaaS Specific (if applicable)
  mrr?: number;
  arr?: number;
  burnRate?: number;
  runway?: number;
}

// ============ Pagination Types ============

export interface ProjectionPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============ Query Types ============

export interface ProjectionQueryParams {
  fiscalYear?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
