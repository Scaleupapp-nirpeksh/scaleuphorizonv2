# Analysis Module - Frontend Integration Guide

## Overview

The Analysis Module provides comprehensive financial analytics for startups and growing businesses. It includes four sub-modules:

1. **Variance Analysis** - Compare planned vs actual performance
2. **Trend Analysis** - Track historical patterns and changes
3. **Unit Economics** - SaaS metrics (CAC, LTV, churn, MRR)
4. **Health Score** - Overall financial health assessment

## Base URL

```
/api/v1/analysis
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

Additionally, an organization context is required. The user must be a member of the organization.

---

## Sub-module 1: Variance Analysis

Analyze budget vs actual performance across expenses, revenue, and headcount.

### Endpoints

#### GET /api/v1/analysis/variance/budget

Get budget variance analysis comparing planned budget vs actual expenses.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fiscalYear | number | No | Fiscal year (defaults to current year) |
| period | string | No | Period type: `monthly`, `quarterly`, `yearly`, `ytd`, `custom` |
| startDate | string | No | Start date (YYYY-MM-DD) for custom period |
| endDate | string | No | End date (YYYY-MM-DD) for custom period |
| budgetId | string | No | Specific budget ID to compare against |

**Response (200 OK):**

```typescript
interface BudgetVarianceResponse {
  success: true;
  data: {
    type: 'budget';
    period: 'monthly' | 'quarterly' | 'yearly' | 'ytd' | 'custom';
    startDate: string;
    endDate: string;
    fiscalYear: number;
    totalPlanned: number;
    totalActual: number;
    totalVariance: number;        // actual - planned
    totalVariancePercent: number; // percentage
    overallStatus: 'favorable' | 'unfavorable' | 'on_target';
    items: VarianceItem[];
    byCategory: CategoryVariance[];
  };
}

interface VarianceItem {
  category: string;
  subcategory?: string;
  accountId?: string;
  name: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'favorable' | 'unfavorable' | 'on_target';
}

interface CategoryVariance {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'favorable' | 'unfavorable' | 'on_target';
  itemCount: number;
}
```

---

#### GET /api/v1/analysis/variance/revenue

Get revenue plan vs actual revenue variance.

**Query Parameters:** Same as budget variance

**Response:** Same structure as budget variance with `type: 'revenue'`

---

#### GET /api/v1/analysis/variance/headcount

Get headcount plan vs actual headcount variance.

**Query Parameters:** Same as budget variance

**Response:** Same structure with headcount-specific metrics

---

#### GET /api/v1/analysis/variance/by-category

Get variance breakdown by expense/revenue category.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fiscalYear | number | No | Fiscal year |
| period | string | No | Period type |
| startDate | string | No | Start date |
| endDate | string | No | End date |
| type | string | No | Variance type: `budget`, `revenue`, `expense` |
| category | string | No | Filter by specific category |

**Response (200 OK):**

```typescript
interface CategoryVarianceResponse {
  success: true;
  data: {
    categories: {
      category: string;
      planned: number;
      actual: number;
      variance: number;
      variancePercent: number;
      status: 'favorable' | 'unfavorable' | 'on_target';
      subcategories?: {
        name: string;
        planned: number;
        actual: number;
        variance: number;
        variancePercent: number;
      }[];
    }[];
    totalPlanned: number;
    totalActual: number;
    totalVariance: number;
  };
}
```

---

#### GET /api/v1/analysis/variance/by-month

Get monthly variance breakdown for the fiscal year.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fiscalYear | number | No | Fiscal year |
| budgetId | string | No | Specific budget ID |
| includeYTD | boolean | No | Include year-to-date totals |

**Response (200 OK):**

```typescript
interface MonthlyVarianceResponse {
  success: true;
  data: {
    months: {
      month: string;           // ISO date
      planned: number;
      actual: number;
      variance: number;
      variancePercent: number;
      status: 'favorable' | 'unfavorable' | 'on_target';
      cumulativePlanned: number;
      cumulativeActual: number;
      cumulativeVariance: number;
    }[];
    fiscalYear: number;
  };
}
```

---

## Sub-module 2: Trend Analysis

Analyze historical patterns and changes over time.

### Endpoints

#### GET /api/v1/analysis/trends/expenses

Get expense trends over time.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| periodType | string | No | `daily`, `weekly`, `monthly`, `quarterly` (default: monthly) |
| months | number | No | Number of months to analyze (default: 12, max: 36) |
| startDate | string | No | Start date (YYYY-MM-DD) |
| endDate | string | No | End date (YYYY-MM-DD) |
| includeMovingAverage | boolean | No | Include moving average calculation |
| movingAveragePeriods | number | No | Periods for moving average (default: 3) |

**Response (200 OK):**

```typescript
interface TrendResponse {
  success: true;
  data: {
    type: 'expense' | 'revenue' | 'burn_rate' | 'headcount' | 'cash_balance' | 'net_income' | 'gross_margin' | 'custom';
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    startDate: string;
    endDate: string;
    dataPoints: TrendDataPoint[];
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    averageValue: number;
    minValue: number;
    maxValue: number;
    totalChange: number;
    totalChangePercent: number;
    volatility: number;        // Coefficient of variation
    growthRate: number;        // CAGR/CMGR
  };
}

interface TrendDataPoint {
  period: string;              // ISO date
  value: number;
  previousValue?: number;
  changePercent?: number;
  movingAverage?: number;
}
```

---

#### GET /api/v1/analysis/trends/revenue

Get revenue trends over time.

**Query Parameters:** Same as expense trends

**Response:** Same structure with `type: 'revenue'`

---

#### GET /api/v1/analysis/trends/burn-rate

Get burn rate (expenses - revenue) trends.

**Query Parameters:** Same as expense trends

**Response:** Same structure with `type: 'burn_rate'`

---

#### GET /api/v1/analysis/trends/custom

Get custom trend analysis for any metric type.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | **Yes** | Metric type: `expense`, `revenue`, `burn_rate`, `headcount`, `cash_balance`, `net_income`, `gross_margin`, `custom` |
| periodType | string | No | Period type |
| months | number | No | Number of months |
| startDate | string | No | Start date |
| endDate | string | No | End date |
| includeMovingAverage | boolean | No | Include moving average |
| movingAveragePeriods | number | No | Moving average periods |

---

#### GET /api/v1/analysis/trends/multiple

Get multiple trends at once with optional correlation analysis.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| types | string[] | **Yes** | Array of metric types |
| periodType | string | No | Period type |
| months | number | No | Number of months |
| startDate | string | No | Start date |
| endDate | string | No | End date |
| includeCorrelation | boolean | No | Calculate correlations between trends |

**Response (200 OK):**

```typescript
interface MultipleTrendResponse {
  success: true;
  data: {
    trends: TrendAnalysis[];
    correlations?: {
      type1: string;
      type2: string;
      correlationCoefficient: number;  // -1 to 1
      interpretation: string;
    }[];
  };
}
```

---

#### GET /api/v1/analysis/trends/comparison

Compare current period with previous period.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | **Yes** | Metric type |
| periodType | string | No | Period type |
| currentPeriodMonths | number | No | Current period length in months |
| includeBreakdown | boolean | No | Include detailed breakdown |

**Response (200 OK):**

```typescript
interface TrendComparisonResponse {
  success: true;
  data: {
    currentPeriod: TrendAnalysis;
    previousPeriod: TrendAnalysis;
    periodOverPeriodChange: number;
    periodOverPeriodPercent: number;
  };
}
```

---

## Sub-module 3: Unit Economics

Calculate SaaS metrics for customer acquisition and retention.

### Endpoints

#### GET /api/v1/analysis/unit-economics

Get all unit economics metrics summary.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date |
| endDate | string | No | End date |
| includeBenchmarks | boolean | No | Include industry benchmarks (default: true) |

**Response (200 OK):**

```typescript
interface UnitEconomicsResponse {
  success: true;
  data: {
    calculatedAt: string;
    period: {
      startDate: string;
      endDate: string;
    };
    metrics: UnitEconomicsMetric[];
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

interface UnitEconomicsMetric {
  metric: 'cac' | 'ltv' | 'ltv_cac_ratio' | 'payback_period' | 'arpu' | 'churn_rate' | 'retention_rate' | 'mrr' | 'arr' | 'net_revenue_retention' | 'gross_margin' | 'burn_multiple';
  value: number;
  previousValue?: number;
  changePercent?: number;
  benchmark?: number;
  benchmarkComparison?: 'above' | 'below' | 'at';
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
}
```

---

#### GET /api/v1/analysis/unit-economics/cac

Get Customer Acquisition Cost breakdown.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| months | number | No | Number of months to average (default: 3, max: 24) |
| includeBreakdown | boolean | No | Include cost breakdown by channel (default: true) |

**Response (200 OK):**

```typescript
interface CACResponse {
  success: true;
  data: {
    totalCAC: number;           // Total acquisition spend
    components: {
      marketing: number;        // Marketing expenses
      sales: number;            // Sales expenses
      other: number;            // Other acquisition costs
    };
    customerCount: number;      // New customers acquired
    cacPerCustomer: number;     // CAC per customer
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    historicalCAC?: {
      period: string;
      cac: number;
    }[];
  };
}
```

---

#### GET /api/v1/analysis/unit-economics/ltv

Get Lifetime Value analysis.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| cohortMonths | number | No | Number of cohort months to analyze (default: 12, max: 24) |
| includeChurnAnalysis | boolean | No | Include churn rate analysis (default: true) |

**Response (200 OK):**

```typescript
interface LTVResponse {
  success: true;
  data: {
    averageLTV: number;              // Average lifetime value
    averageLifespanMonths: number;   // Average customer lifespan
    averageMonthlyRevenue: number;   // Average revenue per customer per month
    churnRate: number;               // Monthly churn rate (%)
    grossMargin: number;             // Gross margin (%)
    ltvByCohort?: {
      cohortPeriod: string;
      ltv: number;
      customerCount: number;
    }[];
  };
}
```

---

#### GET /api/v1/analysis/unit-economics/payback

Get CAC payback period analysis.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| months | number | No | Number of months for CAC calculation (default: 12) |

**Response (200 OK):**

```typescript
interface PaybackResponse {
  success: true;
  data: {
    paybackMonths: number;                // Months to recover CAC
    cac: number;                          // Customer acquisition cost
    monthlyRevenuePerCustomer: number;    // Monthly revenue per customer
    grossMargin: number;                  // Gross margin (%)
    isHealthy: boolean;                   // Payback < 12 months
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  };
}
```

---

#### GET /api/v1/analysis/unit-economics/cohorts

Get cohort analysis for customer retention and LTV.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| periodType | string | No | Cohort period: `weekly`, `monthly`, `quarterly` (default: monthly) |
| cohortMonths | number | No | Number of cohorts to analyze (default: 12, max: 24) |
| retentionMonths | number | No | Number of retention periods to show (default: 12) |

**Response (200 OK):**

```typescript
interface CohortAnalysisResponse {
  success: true;
  data: {
    periodType: 'weekly' | 'monthly' | 'quarterly';
    cohorts: {
      cohortId: string;              // e.g., "2024-01"
      cohortPeriod: string;          // ISO date
      periodType: string;
      customerCount: number;         // Customers acquired in cohort
      initialRevenue: number;        // First period revenue
      retention: {
        periodNumber: number;        // 0 = cohort period, 1 = month 1, etc.
        activeCustomers: number;
        retentionRate: number;       // Percentage
        revenue: number;
        averageRevenuePerCustomer: number;
      }[];
      cumulativeRevenue: number;
      averageLTV: number;
    }[];
    averageRetentionByPeriod: {
      period: number;
      rate: number;
    }[];
    averageLTV: number;
    medianLTV: number;
    bestCohort?: {
      period: string;
      ltv: number;
    };
    worstCohort?: {
      period: string;
      ltv: number;
    };
  };
}
```

---

## Sub-module 4: Health Score

Get comprehensive financial health assessment.

### Endpoints

#### GET /api/v1/analysis/health-score

Get overall financial health score.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| includeRecommendations | boolean | No | Include improvement recommendations (default: true) |

**Response (200 OK):**

```typescript
interface HealthScoreResponse {
  success: true;
  data: {
    calculatedAt: string;
    overallScore: number;      // 0-100
    overallStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    previousScore?: number;
    scoreChange?: number;
    categories: HealthScoreCategory[];
    topRecommendations: HealthRecommendation[];
    historicalScores?: HealthScoreHistory[];
  };
}

interface HealthScoreCategory {
  category: 'runway' | 'burn_rate' | 'revenue_growth' | 'gross_margin' | 'liquidity' | 'efficiency' | 'unit_economics';
  score: number;               // 0-100
  weight: number;              // Percentage weight
  weightedScore: number;       // score * weight / 100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  metrics: {
    name: string;
    value: number;
    unit: string;
    benchmark?: number;
    score: number;
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    description?: string;
  }[];
  recommendations?: HealthRecommendation[];
}

interface HealthRecommendation {
  category: 'cost_reduction' | 'revenue_growth' | 'cash_management' | 'operational_efficiency' | 'fundraising';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialImpact?: string;
  actionItems?: string[];
}
```

---

#### GET /api/v1/analysis/health-score/breakdown

Get detailed breakdown of health score components.

**Query Parameters:** None

**Response (200 OK):**

```typescript
interface HealthBreakdownResponse {
  success: true;
  data: {
    category: string;
    currentScore: number;
    previousScore?: number;
    change?: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    factors: {
      positive: string[];
      negative: string[];
    };
  }[];
}
```

---

#### GET /api/v1/analysis/health-score/history

Get historical health scores.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| months | number | No | Number of months of history (default: 12, max: 24) |

**Response (200 OK):**

```typescript
interface HealthHistoryResponse {
  success: true;
  data: {
    date: string;
    overallScore: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    categoryScores: {
      category: string;
      score: number;
    }[];
  }[];
}
```

---

#### GET /api/v1/analysis/health-score/recommendations

Get actionable recommendations based on health score.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| priority | string | No | Filter by priority: `high`, `medium`, `low` |
| category | string | No | Filter by category |
| limit | number | No | Maximum number of recommendations (default: 10) |

**Response (200 OK):**

```typescript
interface RecommendationsResponse {
  success: true;
  data: HealthRecommendation[];
}
```

---

## Error Responses

All endpoints may return the following errors:

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid query parameters |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | User lacks organization access |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

**Error Response Format:**

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

## Health Score Weights

The overall health score is calculated using these weighted categories:

| Category | Weight | Description |
|----------|--------|-------------|
| Runway | 25% | Months of cash remaining |
| Revenue Growth | 20% | MoM/YoY growth rate |
| Burn Rate | 15% | Cash consumption rate |
| Gross Margin | 15% | Revenue profitability |
| Liquidity | 10% | Cash reserves vs expenses |
| Efficiency | 10% | Operational efficiency |
| Unit Economics | 5% | CAC, LTV, payback metrics |

---

## Health Status Thresholds

| Status | Score Range |
|--------|-------------|
| Excellent | 90-100 |
| Good | 70-89 |
| Fair | 50-69 |
| Poor | 30-49 |
| Critical | 0-29 |

---

## Industry Benchmarks

The module uses these SaaS industry benchmarks:

| Metric | Benchmark |
|--------|-----------|
| Gross Margin | ≥ 70% |
| LTV:CAC Ratio | ≥ 3:1 |
| Payback Period | ≤ 12 months |
| Monthly Churn | ≤ 5% |
| Burn Multiple | ≤ 1.5 |

---

## UI Components Needed

1. **VarianceChart** - Bar chart comparing planned vs actual
2. **TrendLineChart** - Time series line chart with moving averages
3. **CohortHeatmap** - Retention heatmap visualization
4. **HealthScoreGauge** - Circular gauge for overall score
5. **MetricCard** - Individual metric display with trend indicator
6. **RecommendationList** - Prioritized recommendation cards
7. **CategoryBreakdown** - Expandable category details

---

## User Flows

### Viewing Financial Health

1. User navigates to Analysis > Health Score
2. System displays overall health score gauge
3. User sees category breakdown with color-coded status
4. Top recommendations displayed below score
5. User can click categories to see detailed metrics
6. User can view historical score trends

### Analyzing Budget Variance

1. User navigates to Analysis > Variance
2. Selects fiscal year and period type
3. System shows planned vs actual comparison
4. User views by-category breakdown
5. User drills into specific categories
6. User identifies over/under-budget areas

### Reviewing Unit Economics

1. User navigates to Analysis > Unit Economics
2. System calculates all SaaS metrics
3. User sees CAC, LTV, payback period
4. Benchmarks shown for comparison
5. User can view cohort analysis
6. User identifies retention patterns

---

## Integration with Other Modules

- **Planning Module:** Variance analysis compares against budgets, headcount plans, revenue plans
- **Tracking Module:** Trends and unit economics use expense and revenue data
- **Projection Module:** Health score incorporates runway and cash flow forecasts
- **Fundraising Module:** Unit economics inform investor presentations

---

## State Management Suggestions

```typescript
// Redux slice example
interface AnalysisState {
  variance: {
    report: VarianceReport | null;
    loading: boolean;
    error: string | null;
  };
  trends: {
    data: TrendAnalysis[];
    loading: boolean;
    error: string | null;
  };
  unitEconomics: {
    summary: UnitEconomicsSummary | null;
    loading: boolean;
    error: string | null;
  };
  healthScore: {
    result: HealthScoreResult | null;
    loading: boolean;
    error: string | null;
  };
}

// React Query example
const useVariance = (params) => useQuery(['variance', params], () => fetchVariance(params));
const useHealthScore = () => useQuery(['healthScore'], fetchHealthScore);
const useTrends = (params) => useQuery(['trends', params], () => fetchTrends(params));
```
