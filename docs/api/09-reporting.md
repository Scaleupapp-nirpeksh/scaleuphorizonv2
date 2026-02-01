# Reporting Module - Frontend Integration Guide

## Overview

The Reporting module provides customizable dashboards, investor update reports, and financial statement generation (P&L, Balance Sheet, Cash Flow).

## Base URL

```
/api/v1/reporting
```

## Authentication

All endpoints require:
- Bearer token in Authorization header
- Organization context (X-Organization-Id header)

```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## Sub-modules

1. **Dashboards** - Customizable dashboards with widgets
2. **Investor Reports** - Periodic investor update reports
3. **Statements** - Financial statement generation

---

# Dashboards

## Endpoints

### Create Dashboard

```
POST /api/v1/reporting/dashboards
```

**Request Body:**
```typescript
{
  name: string;              // Required, max 100 chars
  description?: string;      // Max 500 chars
  type?: DashboardType;      // 'executive' | 'finance' | 'operations' | 'fundraising' | 'custom'
  isDefault?: boolean;       // Set as default for this type
  isPublic?: boolean;        // Share with org members
  layout?: {
    columns: number;         // Default: 12
    rows: number;            // Default: 12
    gridGap: number;         // Default: 16
  };
  refreshInterval?: RefreshInterval;  // 'real_time' | 'hourly' | 'daily' | 'weekly' | 'manual'
}
```

**Response (201):**
```typescript
{
  success: true,
  message: "Dashboard created successfully",
  data: Dashboard
}
```

### List Dashboards

```
GET /api/v1/reporting/dashboards
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by dashboard type |
| isDefault | boolean | Filter default dashboards |
| search | string | Search in name/description |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| sortBy | string | Sort field (default: createdAt) |
| sortOrder | string | 'asc' or 'desc' (default: desc) |

**Response (200):**
```typescript
{
  success: true,
  data: Dashboard[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    pages: number
  }
}
```

### Get Dashboard by ID

```
GET /api/v1/reporting/dashboards/:id
```

### Update Dashboard

```
PUT /api/v1/reporting/dashboards/:id
```

### Delete Dashboard

```
DELETE /api/v1/reporting/dashboards/:id
```

### Clone Dashboard

```
POST /api/v1/reporting/dashboards/:id/clone
```

**Request Body:**
```typescript
{
  name: string;  // Name for the cloned dashboard
}
```

### Get Executive Dashboard

```
GET /api/v1/reporting/dashboards/executive
```

Returns the default executive dashboard or the first available one.

### Get Finance Dashboard

```
GET /api/v1/reporting/dashboards/finance
```

Returns the default finance dashboard or the first available one.

---

## Widget Management

### Add Widget to Dashboard

```
POST /api/v1/reporting/dashboards/:id/widgets
```

**Request Body:**
```typescript
{
  name: string;                    // Widget name
  type: WidgetType;                // See WidgetType enum below
  dataSource: WidgetDataSource;    // See WidgetDataSource enum below
  position: {
    row: number;                   // Row position (0-based)
    column: number;                // Column position (0-based)
    width: number;                 // Width in grid units (1-12)
    height: number;                // Height in grid units
  };
  config?: {
    title?: string;
    subtitle?: string;
    timeRange?: {
      type: 'relative' | 'absolute';
      relativeValue?: number;
      relativeUnit?: 'days' | 'weeks' | 'months' | 'quarters' | 'years';
      startDate?: string;
      endDate?: string;
    };
    comparison?: {
      enabled: boolean;
      type: 'previous_period' | 'same_period_last_year' | 'budget' | 'target';
      showPercentChange: boolean;
    };
    visualization?: {
      showLegend: boolean;
      showGrid: boolean;
      showLabels: boolean;
      colors?: string[];
      stacked?: boolean;
    };
    aggregation?: {
      groupBy?: string;
      aggregateFunction: 'sum' | 'avg' | 'count' | 'min' | 'max';
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      limit?: number;
    };
    formatting?: {
      numberFormat?: 'currency' | 'percentage' | 'number' | 'compact';
      currency?: string;
      decimals?: number;
      prefix?: string;
      suffix?: string;
    };
  };
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
    value: unknown;
  }[];
  isVisible?: boolean;
}
```

### Update Widget

```
PUT /api/v1/reporting/dashboards/:id/widgets/:widgetId
```

### Delete Widget

```
DELETE /api/v1/reporting/dashboards/:id/widgets/:widgetId
```

### Reorder Widgets

```
PUT /api/v1/reporting/dashboards/:id/widgets/reorder
```

**Request Body:**
```typescript
{
  positions: {
    widgetId: string;
    position: {
      row: number;
      column: number;
      width: number;
      height: number;
    }
  }[]
}
```

---

## Widget Types

```typescript
type WidgetType =
  // Charts
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'donut_chart'
  // Data displays
  | 'metric_card'
  | 'kpi_card'
  | 'table'
  | 'list'
  // Specialized
  | 'runway_gauge'
  | 'burn_rate'
  | 'cash_flow'
  | 'revenue_breakdown'
  | 'expense_breakdown'
  | 'budget_vs_actual'
  | 'headcount_timeline'
  | 'fundraising_progress'
  | 'cap_table_summary';
```

## Widget Data Sources

```typescript
type WidgetDataSource =
  // Tracking
  | 'transactions'
  | 'expenses'
  | 'revenue'
  // Planning
  | 'budgets'
  | 'headcount'
  | 'revenue_plans'
  | 'scenarios'
  // Fundraising
  | 'rounds'
  | 'investors'
  | 'cap_table'
  | 'esop'
  // Analysis
  | 'variance'
  | 'trends'
  | 'unit_economics'
  // Projection
  | 'cash_flow'
  | 'runway'
  // Custom
  | 'custom_query';
```

---

# Investor Reports

## Endpoints

### Create Report

```
POST /api/v1/reporting/investor-reports
```

**Request Body:**
```typescript
{
  title: string;                   // Required, max 200 chars
  type: ReportType;                // Required
  reportingPeriod: {
    type: 'monthly' | 'quarterly' | 'annual' | 'custom';
    year: number;
    month?: number;                // 1-12
    quarter?: number;              // 1-4
    startDate?: string;
    endDate?: string;
  };
  sections?: ReportSection[];      // Optional - auto-generated if not provided
  recipients?: {
    investorId?: string;
    email: string;
    name: string;
  }[];
  metrics?: {
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
  };
  notes?: string;
}
```

### List Reports

```
GET /api/v1/reporting/investor-reports
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by report type |
| status | string | Filter by status |
| year | number | Filter by reporting year |
| search | string | Search in title/notes |
| page | number | Page number |
| limit | number | Items per page |
| sortBy | string | Sort field |
| sortOrder | string | 'asc' or 'desc' |

### Get Report by ID

```
GET /api/v1/reporting/investor-reports/:id
```

### Update Report

```
PUT /api/v1/reporting/investor-reports/:id
```

Only draft and review reports can be updated.

### Delete Report

```
DELETE /api/v1/reporting/investor-reports/:id
```

Only draft reports can be deleted.

---

## Report Workflow

### Submit for Review

```
POST /api/v1/reporting/investor-reports/:id/submit
```

Transitions: draft → review

### Approve Report

```
POST /api/v1/reporting/investor-reports/:id/approve
```

Transitions: review → approved

### Reject Report

```
POST /api/v1/reporting/investor-reports/:id/reject
```

**Request Body:**
```typescript
{
  reason?: string;  // Rejection reason
}
```

Transitions: review → draft

### Send Report

```
POST /api/v1/reporting/investor-reports/:id/send
```

Transitions: approved → sent

Sends email to all recipients.

### Archive Report

```
POST /api/v1/reporting/investor-reports/:id/archive
```

Transitions: sent → archived

---

## Section Management

### Add Section

```
POST /api/v1/reporting/investor-reports/:id/sections
```

**Request Body:**
```typescript
{
  type: ReportSectionType;    // See enum below
  title: string;
  order: number;
  content: string;            // Rich text/markdown content
  metrics?: {
    name: string;
    value: number | string;
    previousValue?: number | string;
    change?: number;
    changeType?: 'increase' | 'decrease' | 'neutral';
    format?: 'currency' | 'percentage' | 'number';
  }[];
  charts?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: { label: string; value: number; category?: string }[];
  }[];
  isVisible?: boolean;
}
```

### Update Section

```
PUT /api/v1/reporting/investor-reports/:id/sections/:sectionId
```

### Delete Section

```
DELETE /api/v1/reporting/investor-reports/:id/sections/:sectionId
```

### Reorder Sections

```
PUT /api/v1/reporting/investor-reports/:id/sections/reorder
```

**Request Body:**
```typescript
{
  orders: {
    sectionId: string;
    order: number;
  }[]
}
```

---

## Report Templates

### Create Template

```
POST /api/v1/reporting/investor-reports/templates
```

**Request Body:**
```typescript
{
  name: string;
  description?: string;
  type: ReportType;
  sections: {
    type: ReportSectionType;
    title: string;
    order: number;
    defaultContent?: string;
    isRequired: boolean;
  }[];
  isDefault?: boolean;
}
```

### List Templates

```
GET /api/v1/reporting/investor-reports/templates
```

### Get Template by ID

```
GET /api/v1/reporting/investor-reports/templates/:templateId
```

### Update Template

```
PUT /api/v1/reporting/investor-reports/templates/:templateId
```

### Delete Template

```
DELETE /api/v1/reporting/investor-reports/templates/:templateId
```

### Create Report from Template

```
POST /api/v1/reporting/investor-reports/from-template/:templateId
```

**Request Body:**
```typescript
{
  title: string;
  reportingPeriod: {
    type: 'monthly' | 'quarterly' | 'annual' | 'custom';
    year: number;
    month?: number;
    quarter?: number;
  }
}
```

---

## Report Types

```typescript
type ReportType =
  | 'monthly_update'
  | 'quarterly_report'
  | 'annual_report'
  | 'board_deck'
  | 'ad_hoc';
```

## Report Status

```typescript
type ReportStatus =
  | 'draft'       // Initial state
  | 'review'      // Under review
  | 'approved'    // Ready to send
  | 'sent'        // Sent to recipients
  | 'archived';   // Archived
```

## Report Section Types

```typescript
type ReportSectionType =
  | 'executive_summary'
  | 'key_metrics'
  | 'financial_highlights'
  | 'runway_update'
  | 'revenue_update'
  | 'expense_update'
  | 'product_update'
  | 'team_update'
  | 'fundraising_update'
  | 'milestones'
  | 'challenges'
  | 'ask'
  | 'custom';
```

---

# Financial Statements

## Endpoints

### Profit & Loss Statement

```
GET /api/v1/reporting/statements/pnl
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| periodType | string | 'monthly', 'quarterly', 'annual', 'ytd', 'custom' |
| year | number | Fiscal year |
| month | number | Month (1-12) for monthly period |
| quarter | number | Quarter (1-4) for quarterly period |
| startDate | string | Start date for custom period |
| endDate | string | End date for custom period |

**Response:**
```typescript
{
  success: true,
  data: {
    period: {
      type: string;
      startDate: Date;
      endDate: Date;
    };
    revenue: {
      items: StatementLineItem[];
      total: number;
    };
    costOfGoodsSold: {
      items: StatementLineItem[];
      total: number;
    };
    grossProfit: number;
    grossMargin: number;
    operatingExpenses: {
      items: StatementLineItem[];
      total: number;
    };
    operatingIncome: number;
    operatingMargin: number;
    otherIncome: {
      items: StatementLineItem[];
      total: number;
    };
    otherExpenses: {
      items: StatementLineItem[];
      total: number;
    };
    netIncome: number;
    netMargin: number;
    generatedAt: Date;
  }
}
```

### Balance Sheet

```
GET /api/v1/reporting/statements/balance
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| asOfDate | string | As-of date (default: now) |

**Response:**
```typescript
{
  success: true,
  data: {
    period: {
      asOfDate: Date;
    };
    assets: {
      current: { items: StatementLineItem[]; total: number };
      nonCurrent: { items: StatementLineItem[]; total: number };
      total: number;
    };
    liabilities: {
      current: { items: StatementLineItem[]; total: number };
      nonCurrent: { items: StatementLineItem[]; total: number };
      total: number;
    };
    equity: {
      items: StatementLineItem[];
      total: number;
    };
    totalLiabilitiesAndEquity: number;
    generatedAt: Date;
  }
}
```

### Cash Flow Statement

```
GET /api/v1/reporting/statements/cashflow
```

**Query Parameters:**
Same as P&L statement.

**Response:**
```typescript
{
  success: true,
  data: {
    period: {
      type: string;
      startDate: Date;
      endDate: Date;
    };
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
    generatedAt: Date;
  }
}
```

### Compare Statements

```
GET /api/v1/reporting/statements/compare
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | 'profit_loss', 'balance_sheet', 'cash_flow' |
| currentPeriod | object | Current period options |
| previousPeriod | object | Previous period options (auto-calculated if not provided) |

**Response:**
```typescript
{
  success: true,
  data: {
    current: Statement;
    previous: Statement;
    variances: {
      [key: string]: {
        amount: number;
        percent: number;
      }
    }
  }
}
```

### Export Statement

```
GET /api/v1/reporting/statements/export
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Statement type |
| format | string | 'pdf', 'excel', 'csv', 'json' |
| ...period params | | Same as individual statements |

---

## Statement Line Item

```typescript
interface StatementLineItem {
  accountId?: string;
  accountCode?: string;
  name: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercent?: number;
  children?: StatementLineItem[];
}
```

---

# TypeScript Types

```typescript
// Dashboard
interface Dashboard {
  id: string;
  organization: string;
  name: string;
  description?: string;
  type: DashboardType;
  isDefault: boolean;
  isPublic: boolean;
  layout: DashboardLayout;
  widgets: Widget[];
  refreshInterval: RefreshInterval;
  lastRefreshedAt?: Date;
  sharedWith?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Widget {
  id: string;
  name: string;
  type: WidgetType;
  dataSource: WidgetDataSource;
  position: WidgetPosition;
  config: WidgetConfig;
  filters?: WidgetFilter[];
  isVisible: boolean;
  createdAt: Date;
}

// Investor Report
interface InvestorReport {
  id: string;
  organization: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  reportingPeriod: ReportingPeriod;
  sections: ReportSection[];
  recipients: ReportRecipient[];
  metrics: ReportMetrics;
  attachments?: ReportAttachment[];
  sentAt?: Date;
  sentBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  viewCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Report Template
interface ReportTemplate {
  id: string;
  organization: string;
  name: string;
  description?: string;
  type: ReportType;
  sections: TemplateSection[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}
```

---

# Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body |
| 400 | MAX_LIMIT_REACHED | Maximum dashboards/widgets/reports exceeded |
| 400 | INVALID_STATUS_TRANSITION | Cannot perform action in current status |
| 400 | WIDGET_POSITION_OVERLAP | Widget position overlaps with existing widget |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Organization context required or insufficient permissions |
| 404 | NOT_FOUND | Dashboard/Report/Widget not found |

---

# UI Components Needed

## Dashboards
1. **DashboardList** - Grid/list of dashboards with type badges
2. **DashboardEditor** - Drag-and-drop widget builder
3. **WidgetPalette** - Available widget types to add
4. **WidgetEditor** - Configure widget settings
5. **WidgetRenderer** - Render different widget types

## Investor Reports
1. **ReportList** - Table of reports with status workflow
2. **ReportEditor** - Section-based rich text editor
3. **ReportPreview** - Preview report as it will appear to recipients
4. **ReportMetrics** - KPI input/display component
5. **RecipientManager** - Manage report recipients

## Statements
1. **StatementViewer** - Display financial statements
2. **PeriodSelector** - Select reporting period
3. **StatementComparison** - Side-by-side comparison view
4. **ExportButton** - Export to different formats

---

# User Flows

## Creating a Dashboard

1. User navigates to Reporting > Dashboards
2. Clicks "Create Dashboard"
3. Selects dashboard type (executive, finance, etc.)
4. Names the dashboard
5. Dashboard opens in edit mode
6. User drags widgets from palette
7. Configures each widget's data source and visualization
8. Saves dashboard
9. Optionally sets as default for the type

## Creating an Investor Report

1. User navigates to Reporting > Investor Reports
2. Clicks "Create Report" or uses template
3. Selects report type and period
4. Edits each section content
5. Adds key metrics
6. Adds recipients (from investor list)
7. Saves as draft
8. Submits for review
9. Gets approved
10. Sends to recipients

## Generating Financial Statements

1. User navigates to Reporting > Statements
2. Selects statement type (P&L, Balance Sheet, Cash Flow)
3. Chooses reporting period
4. Views generated statement
5. Optionally compares with previous period
6. Exports to PDF/Excel

---

# Integration with Other Modules

- **Planning**: Budget data for budget vs actual widgets
- **Tracking**: Transaction data for financial statements
- **Projection**: Runway and cash flow data for widgets
- **Fundraising**: Investor data for report recipients, fundraising widgets
- **Analysis**: Variance and trend data for dashboard widgets
