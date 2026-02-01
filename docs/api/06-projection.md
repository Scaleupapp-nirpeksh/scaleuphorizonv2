# Projection Module - Frontend Integration Guide

## Overview

The Projection module handles financial forecasting and modeling with four sub-modules:
- **Cash Flow** - Cash flow forecasting with period-based projections
- **Runway** - Runway calculations and what-if analysis
- **Forecasting** - Revenue/expense forecasting with multiple methods
- **Financial Model** - 3-statement financial models (P&L, Balance Sheet, Cash Flow)

All projection entities integrate with Chart of Accounts and Tracking modules for data.

## Base URL

```
/api/v1/projection
```

## Authentication

All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## Sub-module: Cash Flow

Base path: `/api/v1/projection/cash-flow`

### Endpoints

#### Create Cash Flow Forecast
- **Method:** `POST`
- **Path:** `/`
- **Description:** Create a new cash flow forecast

**Request Body:**
```typescript
interface CreateCashFlowForecastRequest {
  name: string;                    // Forecast name (max 100 chars)
  description?: string;            // Description (max 1000 chars)
  fiscalYear: number;              // Fiscal year (2020-2050)
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: string;               // ISO 8601 date
  endDate: string;                 // ISO 8601 date
  startingBalance: number;         // Opening cash balance
  linkedBudgetId?: string;         // Link to budget
  linkedRevenuePlanId?: string;    // Link to revenue plan
  currency?: string;               // Default: 'USD'
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: CashFlowForecast
}
```

#### List Cash Flow Forecasts
- **Method:** `GET`
- **Path:** `/`
- **Description:** Get forecasts with filtering and pagination

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| fiscalYear | number | Filter by fiscal year |
| status | string | Filter by 'draft', 'active', 'archived' |
| periodType | string | Filter by period type |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| sortBy | string | Sort field (default: 'createdAt') |
| sortOrder | string | 'asc' or 'desc' (default: 'desc') |

**Response (200):**
```typescript
{
  success: true,
  data: CashFlowForecast[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    pages: number
  }
}
```

#### Get Cash Flow Forecast by ID
- **Method:** `GET`
- **Path:** `/:id`
- **Description:** Get a specific cash flow forecast

**Response (200):**
```typescript
{
  success: true,
  data: CashFlowForecast
}
```

#### Update Cash Flow Forecast
- **Method:** `PUT`
- **Path:** `/:id`
- **Description:** Update a cash flow forecast

**Request Body:**
```typescript
interface UpdateCashFlowForecastRequest {
  name?: string;
  description?: string;
  startingBalance?: number;
  linkedBudgetId?: string | null;
  linkedRevenuePlanId?: string | null;
  notes?: string;
}
```

#### Archive Cash Flow Forecast
- **Method:** `DELETE`
- **Path:** `/:id`
- **Description:** Archive (soft delete) a forecast

#### Activate Cash Flow Forecast
- **Method:** `POST`
- **Path:** `/:id/activate`
- **Description:** Activate a draft forecast (deactivates others for same fiscal year)

#### Add Projection Items
- **Method:** `POST`
- **Path:** `/:id/items`
- **Description:** Add inflow/outflow items to a specific period

**Request Body:**
```typescript
interface AddProjectionItemsRequest {
  period: string;                  // ISO date for the period
  inflows?: CashFlowItem[];
  outflows?: CashFlowItem[];
}

interface CashFlowItem {
  category: 'operating' | 'investing' | 'financing';
  subcategory?: string;
  accountId?: string;              // Chart of Accounts reference
  description: string;
  amount: number;
  confidence?: 'high' | 'medium' | 'low';
}
```

#### Get Cash Flow Summary
- **Method:** `GET`
- **Path:** `/:id/summary`
- **Description:** Get aggregated cash flow summary

**Response (200):**
```typescript
{
  success: true,
  data: {
    periodType: string,
    startDate: Date,
    endDate: Date,
    projections: Array<{
      period: Date,
      openingBalance: number,
      totalInflows: number,
      totalOutflows: number,
      netCashFlow: number,
      closingBalance: number
    }>,
    totalInflows: number,
    totalOutflows: number,
    netChange: number,
    endingBalance: number,
    lowestBalance: number,
    lowestBalanceDate: Date
  }
}
```

#### Get Daily Projections
- **Method:** `GET`
- **Path:** `/:id/daily`
- **Description:** Get daily breakdown for a month

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| month | string | ISO date for the month |

#### Get Weekly Projections
- **Method:** `GET`
- **Path:** `/:id/weekly`
- **Description:** Get weekly aggregated projections

#### Recalculate with Actuals
- **Method:** `POST`
- **Path:** `/:id/recalculate`
- **Description:** Update forecast with actual transaction data

---

## Sub-module: Runway

Base path: `/api/v1/projection/runway`

### Endpoints

#### Create Runway Snapshot
- **Method:** `POST`
- **Path:** `/`
- **Description:** Create a new runway snapshot

**Request Body:**
```typescript
interface CreateRunwaySnapshotRequest {
  name: string;
  description?: string;
  currentCash: number;             // Current cash balance
  monthlyBurnRate: number;         // Monthly expenses
  monthlyRevenue: number;          // Monthly revenue
  scenario?: 'current' | 'best_case' | 'worst_case' | 'custom';
  assumptions?: {
    revenueGrowthRate?: number;    // Monthly percentage
    expenseGrowthRate?: number;
    oneTimeInflows?: number;
    oneTimeOutflows?: number;
    newHiringCost?: number;
  };
  linkedBankAccountIds?: string[];
  linkedBudgetId?: string;
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: RunwaySnapshot
}
```

#### List Runway Snapshots
- **Method:** `GET`
- **Path:** `/`
- **Description:** Get snapshots with filtering

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| scenario | string | Filter by scenario type |
| status | string | Filter by 'critical', 'warning', 'healthy', 'profitable' |
| startDate | string | Filter from date |
| endDate | string | Filter to date |
| page | number | Page number |
| limit | number | Items per page |
| sortBy | string | Sort field |
| sortOrder | string | 'asc' or 'desc' |

#### Get Current Runway
- **Method:** `GET`
- **Path:** `/current`
- **Description:** Calculate current runway from actual data

**Response (200):**
```typescript
{
  success: true,
  data: {
    currentCash: number,
    monthlyBurnRate: number,
    monthlyRevenue: number,
    netBurnRate: number,
    runwayMonths: number,
    runwayEndDate: Date,
    status: 'critical' | 'warning' | 'healthy' | 'profitable'
  }
}
```

#### Get Runway History
- **Method:** `GET`
- **Path:** `/history`
- **Description:** Get runway changes over time

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| months | number | Number of months to look back (default: 12) |

#### Get Scenario Comparison
- **Method:** `GET`
- **Path:** `/scenarios`
- **Description:** Compare runway across different scenarios

**Response (200):**
```typescript
{
  success: true,
  data: {
    current: RunwayCalculation,
    best_case: RunwayCalculation,
    worst_case: RunwayCalculation,
    no_growth: RunwayCalculation
  }
}
```

#### What-If Analysis
- **Method:** `POST`
- **Path:** `/what-if`
- **Description:** Perform what-if analysis

**Request Body:**
```typescript
interface WhatIfAnalysisRequest {
  currentCash?: number;            // Override current cash
  monthlyBurnRate?: number;        // Override burn rate
  monthlyRevenue?: number;         // Override revenue
  revenueGrowthRate?: number;      // Monthly growth %
  expenseGrowthRate?: number;      // Monthly growth %
  oneTimeInflows?: number;         // One-time cash injection
  oneTimeOutflows?: number;        // One-time expense
  newHiringCost?: number;          // Additional monthly cost
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    baseRunway: RunwayCalculation,
    adjustedRunway: RunwayCalculation,
    impactMonths: number,
    recommendation?: string
  }
}
```

---

## Sub-module: Forecasting

Base path: `/api/v1/projection/forecast`

### Endpoints

#### Create Forecast
- **Method:** `POST`
- **Path:** `/`
- **Description:** Create a new forecast

**Request Body:**
```typescript
interface CreateForecastRequest {
  name: string;
  description?: string;
  type: 'revenue' | 'expense' | 'burn_rate';
  method: 'linear' | 'exponential' | 'weighted_average' | 'seasonal' | 'manual';
  historicalMonths: number;        // 3-60 months of historical data
  forecastMonths: number;          // 1-36 months to forecast
  accountId?: string;              // Optional: forecast specific account
  customAssumptions?: {
    growthRate?: number;           // For manual method
    [key: string]: number;
  };
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: Forecast
}
```

#### List Forecasts
- **Method:** `GET`
- **Path:** `/`
- **Description:** Get forecasts with filtering

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by 'revenue', 'expense', 'burn_rate' |
| status | string | Filter by 'draft', 'active', 'archived' |
| method | string | Filter by forecasting method |
| page | number | Page number |
| limit | number | Items per page |
| sortBy | string | Sort field |
| sortOrder | string | 'asc' or 'desc' |

#### Get Forecast by ID
- **Method:** `GET`
- **Path:** `/:id`
- **Description:** Get a specific forecast with data points

**Response (200):**
```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    type: string,
    method: string,
    dataPoints: Array<{
      period: Date,
      actual?: number,           // Historical data
      predicted: number,
      lowerBound: number,        // Confidence interval
      upperBound: number,
      confidence: 'high' | 'medium' | 'low'
    }>,
    accuracy?: number,           // R-squared (0-100)
    mape?: number,               // Mean Absolute Percentage Error
    rmse?: number,               // Root Mean Square Error
    trend: 'increasing' | 'decreasing' | 'stable',
    seasonality?: 'detected' | 'not_detected',
    totalHistorical: number,
    totalForecast: number,
    averageGrowthRate: number
  }
}
```

#### Activate Forecast
- **Method:** `POST`
- **Path:** `/:id/activate`
- **Description:** Activate a forecast (deactivates others of same type)

#### Retrain Forecast
- **Method:** `POST`
- **Path:** `/:id/retrain`
- **Description:** Retrain forecast with new parameters or data

**Request Body:**
```typescript
interface RetrainForecastRequest {
  historicalMonths?: number;
  forecastMonths?: number;
  method?: string;
}
```

#### Get Forecast Summary
- **Method:** `GET`
- **Path:** `/summary`
- **Description:** Get summary of all forecast types

**Response (200):**
```typescript
{
  success: true,
  data: {
    revenue: {
      current: number,          // Current monthly average
      forecast: number,         // Forecasted monthly average
      growthRate: number,
      trend: string
    },
    expenses: {
      current: number,
      forecast: number,
      growthRate: number,
      trend: string
    },
    burnRate: {
      current: number,
      forecast: number,
      trend: string
    }
  }
}
```

#### Quick Revenue Forecast
- **Method:** `GET`
- **Path:** `/revenue`
- **Description:** Get quick revenue forecast without saving

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| months | number | Months to forecast (default: 12) |

#### Quick Expense Forecast
- **Method:** `GET`
- **Path:** `/expenses`
- **Description:** Get quick expense forecast without saving

#### Quick Burn Rate Forecast
- **Method:** `GET`
- **Path:** `/burn-rate`
- **Description:** Get quick burn rate forecast

---

## Sub-module: Financial Model

Base path: `/api/v1/projection/financial-model`

### Endpoints

#### Create Financial Model
- **Method:** `POST`
- **Path:** `/`
- **Description:** Create a new 3-statement financial model

**Request Body:**
```typescript
interface CreateFinancialModelRequest {
  name: string;
  description?: string;
  fiscalYear: number;              // 2020-2050
  period?: 'monthly' | 'quarterly' | 'annual';
  linkedBudgetId?: string;
  linkedRevenuePlanId?: string;
  linkedHeadcountPlanId?: string;
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true,
  data: FinancialModel
}
```

#### List Financial Models
- **Method:** `GET`
- **Path:** `/`
- **Description:** Get models with filtering

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| fiscalYear | number | Filter by fiscal year |
| status | string | Filter by 'draft', 'active', 'archived' |
| period | string | Filter by period type |
| page | number | Page number |
| limit | number | Items per page |
| sortBy | string | Sort field |
| sortOrder | string | 'asc' or 'desc' |

#### Get Financial Model by ID
- **Method:** `GET`
- **Path:** `/:id`
- **Description:** Get a financial model with all statements

#### Activate Financial Model
- **Method:** `POST`
- **Path:** `/:id/activate`
- **Description:** Activate a model (deactivates others for same year)

#### Recalculate Financial Model
- **Method:** `POST`
- **Path:** `/:id/recalculate`
- **Description:** Recalculate model with latest transaction data

#### Get Income Statement
- **Method:** `GET`
- **Path:** `/:id/income-statement`
- **Description:** Get the income statement

**Response (200):**
```typescript
{
  success: true,
  data: {
    revenue: IncomeStatementLine[],
    totalRevenue: number,
    cogs: IncomeStatementLine[],
    totalCogs: number,
    grossProfit: number,
    grossMargin: number,           // Percentage
    operatingExpenses: IncomeStatementLine[],
    totalOperatingExpenses: number,
    operatingIncome: number,
    operatingMargin: number,
    otherIncome: IncomeStatementLine[],
    otherExpenses: IncomeStatementLine[],
    netIncome: number,
    netMargin: number
  }
}

interface IncomeStatementLine {
  category: 'revenue' | 'cogs' | 'operating_expense' | 'other_income' | 'other_expense' | 'tax';
  subcategory?: string;
  accountId?: string;
  name: string;
  amounts: MonthlyAmount[];
  total: number;
}

interface MonthlyAmount {
  month: Date;
  amount: number;
  isActual: boolean;
  notes?: string;
}
```

#### Get Balance Sheet
- **Method:** `GET`
- **Path:** `/:id/balance-sheet`
- **Description:** Get the balance sheet

**Response (200):**
```typescript
{
  success: true,
  data: {
    assets: {
      current: BalanceSheetLine[],
      totalCurrent: number,
      fixed: BalanceSheetLine[],
      totalFixed: number,
      total: number
    },
    liabilities: {
      current: BalanceSheetLine[],
      totalCurrent: number,
      longTerm: BalanceSheetLine[],
      totalLongTerm: number,
      total: number
    },
    equity: {
      items: BalanceSheetLine[],
      total: number
    },
    totalLiabilitiesAndEquity: number,
    isBalanced: boolean            // Assets = Liabilities + Equity
  }
}
```

#### Get Cash Flow Statement
- **Method:** `GET`
- **Path:** `/:id/cash-flow-statement`
- **Description:** Get the cash flow statement

**Response (200):**
```typescript
{
  success: true,
  data: {
    operating: {
      items: CashFlowStatementLine[],
      total: number
    },
    investing: {
      items: CashFlowStatementLine[],
      total: number
    },
    financing: {
      items: CashFlowStatementLine[],
      total: number
    },
    netChange: number,
    beginningCash: number,
    endingCash: number
  }
}
```

#### Get Key Metrics
- **Method:** `GET`
- **Path:** `/:id/metrics`
- **Description:** Get calculated key financial metrics

**Response (200):**
```typescript
{
  success: true,
  data: {
    // Profitability
    grossMargin: number,           // Percentage
    operatingMargin: number,
    netMargin: number,
    ebitdaMargin: number,

    // Liquidity
    currentRatio: number,
    quickRatio: number,

    // Leverage
    debtToEquity: number,

    // Growth
    revenueGrowth: number,         // YoY percentage
    expenseGrowth: number,

    // SaaS Specific
    mrr?: number,                  // Monthly Recurring Revenue
    arr?: number,                  // Annual Recurring Revenue
    burnRate?: number,             // Monthly burn
    runway?: number                // Months of runway
  }
}
```

---

## TypeScript Types

### Cash Flow Types

```typescript
interface CashFlowForecast {
  id: string;
  organization: string;
  name: string;
  description?: string;
  fiscalYear: number;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  status: 'draft' | 'active' | 'archived';
  startDate: Date;
  endDate: Date;
  startingBalance: number;
  projections: CashFlowPeriodProjection[];
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  endingBalance: number;
  lowestBalance: number;
  lowestBalanceDate?: Date;
  linkedBudget?: string;
  linkedRevenuePlan?: string;
  currency: string;
  notes?: string;
  lastRecalculatedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CashFlowPeriodProjection {
  period: Date;
  openingBalance: number;
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
}

interface CashFlowItem {
  category: 'operating' | 'investing' | 'financing';
  subcategory?: string;
  account?: string;
  description: string;
  amount: number;
  isActual: boolean;
  confidence?: 'high' | 'medium' | 'low';
}
```

### Runway Types

```typescript
interface RunwaySnapshot {
  id: string;
  organization: string;
  name: string;
  description?: string;
  snapshotDate: Date;
  scenario: 'current' | 'best_case' | 'worst_case' | 'custom';
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  netBurnRate: number;
  runwayMonths: number;
  runwayEndDate: Date;
  status: 'critical' | 'warning' | 'healthy' | 'profitable';
  assumptions: RunwayAssumptions;
  projections: RunwayProjection[];
  linkedBankAccounts?: string[];
  linkedBudget?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RunwayAssumptions {
  revenueGrowthRate: number;       // Monthly percentage
  expenseGrowthRate: number;
  oneTimeInflows?: number;
  oneTimeOutflows?: number;
  newHiringCost?: number;
}

interface RunwayProjection {
  month: Date;
  startingCash: number;
  projectedRevenue: number;
  projectedExpenses: number;
  netCashFlow: number;
  endingCash: number;
  cumulativeMonths: number;
}
```

### Forecast Types

```typescript
interface Forecast {
  id: string;
  organization: string;
  name: string;
  description?: string;
  type: 'revenue' | 'expense' | 'burn_rate';
  method: 'linear' | 'exponential' | 'weighted_average' | 'seasonal' | 'manual';
  status: 'draft' | 'active' | 'archived';
  historicalMonths: number;
  forecastMonths: number;
  startDate: Date;
  endDate: Date;
  account?: string;
  accountName?: string;
  dataPoints: ForecastDataPoint[];
  accuracy?: number;
  mape?: number;
  rmse?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendSlope?: number;
  seasonality?: 'detected' | 'not_detected';
  totalHistorical: number;
  totalForecast: number;
  averageGrowthRate: number;
  customAssumptions?: Record<string, number>;
  lastTrainedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ForecastDataPoint {
  period: Date;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: 'high' | 'medium' | 'low';
}
```

### Financial Model Types

```typescript
interface FinancialModel {
  id: string;
  organization: string;
  name: string;
  description?: string;
  fiscalYear: number;
  period: 'monthly' | 'quarterly' | 'annual';
  status: 'draft' | 'active' | 'archived';
  incomeStatement: IncomeStatementLine[];
  balanceSheet: BalanceSheetLine[];
  cashFlowStatement: CashFlowStatementLine[];
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netCashFlow: number;
  keyMetrics: KeyMetrics;
  linkedBudget?: string;
  linkedRevenuePlan?: string;
  linkedHeadcountPlan?: string;
  lastCalculatedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface KeyMetrics {
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitdaMargin: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  revenueGrowth: number;
  expenseGrowth: number;
  mrr?: number;
  arr?: number;
  burnRate?: number;
  runway?: number;
}
```

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body or parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication token |
| 403 | FORBIDDEN | User lacks permission for this action |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists or state conflict |
| 422 | INSUFFICIENT_DATA | Not enough historical data for forecasting |

---

## UI Components Needed

### Cash Flow
1. **CashFlowForecastList** - Table of forecasts with status badges
2. **CashFlowForecastForm** - Create/edit forecast
3. **CashFlowChart** - Line chart showing projections over time
4. **CashFlowWaterfall** - Waterfall chart showing inflows/outflows
5. **PeriodItemEditor** - Add/edit items for specific periods

### Runway
1. **RunwayDashboard** - Current runway status with gauge
2. **RunwayHistoryChart** - Line chart of runway over time
3. **ScenarioComparison** - Side-by-side scenario comparison
4. **WhatIfCalculator** - Interactive what-if analysis tool
5. **RunwayProjectionTable** - Monthly projection breakdown

### Forecasting
1. **ForecastList** - List of forecasts by type
2. **ForecastChart** - Line chart with confidence intervals
3. **ForecastMethodSelector** - Choose forecasting method
4. **AccuracyMetrics** - Display MAPE, RMSE, accuracy
5. **TrendIndicator** - Visual trend direction indicator

### Financial Model
1. **FinancialModelList** - List of models by year
2. **IncomeStatementView** - Formatted P&L display
3. **BalanceSheetView** - Formatted balance sheet
4. **CashFlowStatementView** - Formatted cash flow statement
5. **KeyMetricsDashboard** - Financial ratios and metrics
6. **ThreeStatementSummary** - Combined view of all statements

---

## User Flows

### Creating a Cash Flow Forecast
1. Navigate to Projection > Cash Flow
2. Click "Create Forecast"
3. Enter name, fiscal year, and period type
4. Set starting balance
5. Optionally link to budget or revenue plan
6. Save as draft
7. Add period-specific items (inflows/outflows)
8. Activate when ready

### Performing What-If Analysis
1. Navigate to Projection > Runway
2. View current runway calculation
3. Click "What-If Analysis"
4. Adjust parameters (cash, burn rate, revenue, etc.)
5. View impact on runway
6. Save scenario as snapshot if desired

### Using Forecasting
1. Navigate to Projection > Forecast
2. Select forecast type (revenue, expense, burn rate)
3. Choose forecasting method
4. Set historical and forecast periods
5. Review accuracy metrics
6. Activate forecast for use in projections

### Building a Financial Model
1. Navigate to Projection > Financial Model
2. Create new model for fiscal year
3. Link to budget and revenue plan
4. System generates 3 statements from transaction data
5. Review income statement, balance sheet, cash flow
6. Analyze key metrics
7. Recalculate as new data becomes available

---

## Integration with Other Modules

- **Chart of Accounts:** Cash flow items and forecast data reference accounts
- **Tracking:** Transactions provide historical data for forecasts and models
- **Planning:** Budgets and revenue plans link to projections
- **Analysis:** Variance analysis compares projections to actuals
