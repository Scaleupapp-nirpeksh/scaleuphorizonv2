/**
 * Reporting Module Types
 *
 * Shared TypeScript interfaces for dashboards, investor reports, and statements
 */

import { Types } from 'mongoose';
import {
  DashboardTypeType,
  WidgetTypeType,
  WidgetDataSourceType,
  RefreshIntervalType,
  ReportTypeType,
  ReportStatusType,
  ReportSectionType,
  StatementTypeType,
  StatementPeriodType,
} from '../constants';

// ============ Dashboard Types ============

export interface Dashboard {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  type: DashboardTypeType;
  isDefault: boolean;
  isPublic: boolean;
  layout: DashboardLayout;
  widgets: Widget[];
  refreshInterval: RefreshIntervalType;
  lastRefreshedAt?: Date;
  sharedWith?: Types.ObjectId[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gridGap: number;
}

export interface Widget {
  _id: Types.ObjectId;
  name: string;
  type: WidgetTypeType;
  dataSource: WidgetDataSourceType;
  position: WidgetPosition;
  config: WidgetConfig;
  filters?: WidgetFilter[];
  isVisible: boolean;
  createdAt: Date;
}

export interface WidgetPosition {
  row: number;
  column: number;
  width: number;
  height: number;
}

export interface WidgetConfig {
  title?: string;
  subtitle?: string;
  timeRange?: TimeRange;
  comparison?: ComparisonConfig;
  visualization?: VisualizationConfig;
  customQuery?: string;
  aggregation?: AggregationConfig;
  formatting?: FormattingConfig;
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  relativeValue?: number;
  relativeUnit?: 'days' | 'weeks' | 'months' | 'quarters' | 'years';
  startDate?: Date;
  endDate?: Date;
}

export interface ComparisonConfig {
  enabled: boolean;
  type: 'previous_period' | 'same_period_last_year' | 'budget' | 'target';
  showPercentChange: boolean;
}

export interface VisualizationConfig {
  showLegend: boolean;
  showGrid: boolean;
  showLabels: boolean;
  colors?: string[];
  stacked?: boolean;
}

export interface AggregationConfig {
  groupBy?: string;
  aggregateFunction: 'sum' | 'avg' | 'count' | 'min' | 'max';
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface FormattingConfig {
  numberFormat?: 'currency' | 'percentage' | 'number' | 'compact';
  currency?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export interface WidgetFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
}

export interface DashboardSummary {
  id: Types.ObjectId;
  name: string;
  type: DashboardTypeType;
  widgetCount: number;
  lastRefreshedAt?: Date;
  isDefault: boolean;
}

// ============ Investor Report Types ============

export interface InvestorReport {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  title: string;
  type: ReportTypeType;
  status: ReportStatusType;
  reportingPeriod: ReportingPeriod;
  sections: ReportSectionData[];
  recipients: ReportRecipient[];
  metrics: ReportMetrics;
  attachments?: ReportAttachment[];
  sentAt?: Date;
  sentBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportingPeriod {
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  year: number;
  month?: number;
  quarter?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ReportSectionData {
  _id: Types.ObjectId;
  type: ReportSectionType;
  title: string;
  order: number;
  content: string;
  metrics?: SectionMetric[];
  charts?: SectionChart[];
  isVisible: boolean;
}

export interface SectionMetric {
  name: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'currency' | 'percentage' | 'number';
}

export interface SectionChart {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: ChartDataPoint[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

export interface ReportRecipient {
  investorId?: Types.ObjectId;
  email: string;
  name: string;
  sentAt?: Date;
  viewedAt?: Date;
  viewCount: number;
}

export interface ReportMetrics {
  mrr?: number;
  arr?: number;
  runway?: number;
  burnRate?: number;
  cashBalance?: number;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  headcount?: number;
  customers?: number;
  churnRate?: number;
  customMetrics?: Record<string, number | string>;
}

export interface ReportAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface ReportTemplate {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  type: ReportTypeType;
  sections: ReportSectionData[];
  isDefault: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

// ============ Statement Types ============

export interface FinancialStatement {
  organization: Types.ObjectId;
  type: StatementTypeType;
  period: StatementPeriodType;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  data: StatementData;
}

export interface StatementData {
  profitLoss?: ProfitLossData;
  balanceSheet?: BalanceSheetData;
  cashFlow?: CashFlowData;
}

export interface ProfitLossData {
  revenue: StatementLineItem[];
  totalRevenue: number;
  costOfGoodsSold: StatementLineItem[];
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: StatementLineItem[];
  totalOperatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: StatementLineItem[];
  otherExpenses: StatementLineItem[];
  netIncome: number;
  netMargin: number;
}

export interface BalanceSheetData {
  assets: {
    current: StatementLineItem[];
    totalCurrent: number;
    nonCurrent: StatementLineItem[];
    totalNonCurrent: number;
    total: number;
  };
  liabilities: {
    current: StatementLineItem[];
    totalCurrent: number;
    nonCurrent: StatementLineItem[];
    totalNonCurrent: number;
    total: number;
  };
  equity: {
    items: StatementLineItem[];
    total: number;
  };
  totalLiabilitiesAndEquity: number;
}

export interface CashFlowData {
  operating: {
    items: StatementLineItem[];
    total: number;
  };
  investing: {
    items: StatementLineItem[];
    total: number;
  };
  financing: {
    items: StatementLineItem[];
    total: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export interface StatementLineItem {
  accountId?: Types.ObjectId;
  accountCode?: string;
  name: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercent?: number;
  children?: StatementLineItem[];
}

export interface StatementComparison {
  currentPeriod: FinancialStatement;
  previousPeriod: FinancialStatement;
  variances: VarianceData;
}

export interface VarianceData {
  revenue: number;
  revenuePercent: number;
  expenses: number;
  expensesPercent: number;
  netIncome: number;
  netIncomePercent: number;
  lineItems: LineItemVariance[];
}

export interface LineItemVariance {
  name: string;
  currentAmount: number;
  previousAmount: number;
  variance: number;
  variancePercent: number;
}

// ============ Common Types ============

export interface ReportingQueryParams {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts?: boolean;
  includeRawData?: boolean;
  dateFormat?: string;
  timezone?: string;
}
