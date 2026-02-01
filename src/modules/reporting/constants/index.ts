/**
 * Reporting Module Constants
 *
 * Enums and constants for dashboards, investor reports, and statements
 */

// ============ Dashboard Constants ============

export const DashboardType = {
  EXECUTIVE: 'executive',
  FINANCE: 'finance',
  OPERATIONS: 'operations',
  FUNDRAISING: 'fundraising',
  CUSTOM: 'custom',
} as const;

export type DashboardTypeType = (typeof DashboardType)[keyof typeof DashboardType];

export const WidgetType = {
  // Charts
  LINE_CHART: 'line_chart',
  BAR_CHART: 'bar_chart',
  PIE_CHART: 'pie_chart',
  AREA_CHART: 'area_chart',
  DONUT_CHART: 'donut_chart',

  // Data displays
  METRIC_CARD: 'metric_card',
  KPI_CARD: 'kpi_card',
  TABLE: 'table',
  LIST: 'list',

  // Specialized
  RUNWAY_GAUGE: 'runway_gauge',
  BURN_RATE: 'burn_rate',
  CASH_FLOW: 'cash_flow',
  REVENUE_BREAKDOWN: 'revenue_breakdown',
  EXPENSE_BREAKDOWN: 'expense_breakdown',
  BUDGET_VS_ACTUAL: 'budget_vs_actual',
  HEADCOUNT_TIMELINE: 'headcount_timeline',
  FUNDRAISING_PROGRESS: 'fundraising_progress',
  CAP_TABLE_SUMMARY: 'cap_table_summary',
} as const;

export type WidgetTypeType = (typeof WidgetType)[keyof typeof WidgetType];

export const WidgetDataSource = {
  // Tracking
  TRANSACTIONS: 'transactions',
  EXPENSES: 'expenses',
  REVENUE: 'revenue',

  // Planning
  BUDGETS: 'budgets',
  HEADCOUNT: 'headcount',
  REVENUE_PLANS: 'revenue_plans',
  SCENARIOS: 'scenarios',

  // Fundraising
  ROUNDS: 'rounds',
  INVESTORS: 'investors',
  CAP_TABLE: 'cap_table',
  ESOP: 'esop',

  // Analysis
  VARIANCE: 'variance',
  TRENDS: 'trends',
  UNIT_ECONOMICS: 'unit_economics',

  // Projection
  CASH_FLOW: 'cash_flow',
  RUNWAY: 'runway',

  // Custom
  CUSTOM_QUERY: 'custom_query',
} as const;

export type WidgetDataSourceType = (typeof WidgetDataSource)[keyof typeof WidgetDataSource];

export const RefreshInterval = {
  REAL_TIME: 'real_time',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MANUAL: 'manual',
} as const;

export type RefreshIntervalType = (typeof RefreshInterval)[keyof typeof RefreshInterval];

// ============ Investor Report Constants ============

export const ReportType = {
  MONTHLY_UPDATE: 'monthly_update',
  QUARTERLY_REPORT: 'quarterly_report',
  ANNUAL_REPORT: 'annual_report',
  BOARD_DECK: 'board_deck',
  AD_HOC: 'ad_hoc',
} as const;

export type ReportTypeType = (typeof ReportType)[keyof typeof ReportType];

export const ReportStatus = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  SENT: 'sent',
  ARCHIVED: 'archived',
} as const;

export type ReportStatusType = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ReportSection = {
  EXECUTIVE_SUMMARY: 'executive_summary',
  KEY_METRICS: 'key_metrics',
  FINANCIAL_HIGHLIGHTS: 'financial_highlights',
  RUNWAY_UPDATE: 'runway_update',
  REVENUE_UPDATE: 'revenue_update',
  EXPENSE_UPDATE: 'expense_update',
  PRODUCT_UPDATE: 'product_update',
  TEAM_UPDATE: 'team_update',
  FUNDRAISING_UPDATE: 'fundraising_update',
  MILESTONES: 'milestones',
  CHALLENGES: 'challenges',
  ASK: 'ask',
  CUSTOM: 'custom',
} as const;

export type ReportSectionType = (typeof ReportSection)[keyof typeof ReportSection];

// ============ Statement Constants ============

export const StatementType = {
  PROFIT_LOSS: 'profit_loss',
  BALANCE_SHEET: 'balance_sheet',
  CASH_FLOW: 'cash_flow',
} as const;

export type StatementTypeType = (typeof StatementType)[keyof typeof StatementType];

export const StatementPeriod = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
  YTD: 'ytd',
  CUSTOM: 'custom',
} as const;

export type StatementPeriodType = (typeof StatementPeriod)[keyof typeof StatementPeriod];

export const ExportFormat = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json',
} as const;

export type ExportFormatType = (typeof ExportFormat)[keyof typeof ExportFormat];

// ============ Validation Constants ============

export const REPORTING_CONSTANTS = {
  MAX_DASHBOARDS_PER_ORG: 50,
  MAX_WIDGETS_PER_DASHBOARD: 20,
  MAX_REPORTS_PER_ORG: 500,
  MAX_SECTIONS_PER_REPORT: 20,
  MAX_RECIPIENTS_PER_REPORT: 100,
  DEFAULT_WIDGETS_PER_ROW: 3,
  DEFAULT_WIDGET_HEIGHT: 300,
  MAX_CUSTOM_QUERY_LENGTH: 5000,
  MAX_REPORT_TITLE_LENGTH: 200,
  MAX_SECTION_CONTENT_LENGTH: 50000,
} as const;

// ============ Helper Functions ============

/**
 * Get all dashboard types
 */
export function getDashboardTypes(): DashboardTypeType[] {
  return Object.values(DashboardType);
}

/**
 * Get all widget types
 */
export function getWidgetTypes(): WidgetTypeType[] {
  return Object.values(WidgetType);
}

/**
 * Get all report types
 */
export function getReportTypes(): ReportTypeType[] {
  return Object.values(ReportType);
}

/**
 * Get all statement types
 */
export function getStatementTypes(): StatementTypeType[] {
  return Object.values(StatementType);
}

/**
 * Check if report status transition is valid
 */
export function isValidReportStatusTransition(
  currentStatus: ReportStatusType,
  newStatus: ReportStatusType
): boolean {
  const transitions: Record<ReportStatusType, ReportStatusType[]> = {
    [ReportStatus.DRAFT]: [ReportStatus.REVIEW, ReportStatus.ARCHIVED],
    [ReportStatus.REVIEW]: [ReportStatus.DRAFT, ReportStatus.APPROVED, ReportStatus.ARCHIVED],
    [ReportStatus.APPROVED]: [ReportStatus.REVIEW, ReportStatus.SENT, ReportStatus.ARCHIVED],
    [ReportStatus.SENT]: [ReportStatus.ARCHIVED],
    [ReportStatus.ARCHIVED]: [],
  };

  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get suggested sections based on report type
 */
export function getSuggestedSections(reportType: ReportTypeType): ReportSectionType[] {
  switch (reportType) {
    case ReportType.MONTHLY_UPDATE:
      return [
        ReportSection.EXECUTIVE_SUMMARY,
        ReportSection.KEY_METRICS,
        ReportSection.FINANCIAL_HIGHLIGHTS,
        ReportSection.PRODUCT_UPDATE,
        ReportSection.MILESTONES,
        ReportSection.ASK,
      ];
    case ReportType.QUARTERLY_REPORT:
      return [
        ReportSection.EXECUTIVE_SUMMARY,
        ReportSection.KEY_METRICS,
        ReportSection.FINANCIAL_HIGHLIGHTS,
        ReportSection.RUNWAY_UPDATE,
        ReportSection.REVENUE_UPDATE,
        ReportSection.EXPENSE_UPDATE,
        ReportSection.PRODUCT_UPDATE,
        ReportSection.TEAM_UPDATE,
        ReportSection.MILESTONES,
        ReportSection.CHALLENGES,
        ReportSection.ASK,
      ];
    case ReportType.ANNUAL_REPORT:
      return [
        ReportSection.EXECUTIVE_SUMMARY,
        ReportSection.KEY_METRICS,
        ReportSection.FINANCIAL_HIGHLIGHTS,
        ReportSection.RUNWAY_UPDATE,
        ReportSection.REVENUE_UPDATE,
        ReportSection.EXPENSE_UPDATE,
        ReportSection.PRODUCT_UPDATE,
        ReportSection.TEAM_UPDATE,
        ReportSection.FUNDRAISING_UPDATE,
        ReportSection.MILESTONES,
        ReportSection.CHALLENGES,
        ReportSection.ASK,
      ];
    case ReportType.BOARD_DECK:
      return [
        ReportSection.EXECUTIVE_SUMMARY,
        ReportSection.KEY_METRICS,
        ReportSection.FINANCIAL_HIGHLIGHTS,
        ReportSection.RUNWAY_UPDATE,
        ReportSection.FUNDRAISING_UPDATE,
        ReportSection.PRODUCT_UPDATE,
        ReportSection.ASK,
      ];
    default:
      return [ReportSection.EXECUTIVE_SUMMARY, ReportSection.CUSTOM];
  }
}
