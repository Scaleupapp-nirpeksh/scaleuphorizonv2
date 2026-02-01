# Planning Module - Frontend Integration Guide

## Overview

The Planning module enables comprehensive financial planning with four integrated sub-modules:

1. **Budget** - Annual/quarterly/monthly budget planning with line items linked to Chart of Accounts
2. **Headcount** - Workforce planning with roles, salaries, benefits, and cost projections
3. **Revenue Plan** - Revenue forecasting with streams, MRR/ARR metrics, and growth tracking
4. **Scenarios** - What-if analysis with adjustments and scenario comparison

All sub-modules integrate with the Chart of Accounts for proper financial categorization.

## Base URL

```
/api/v1/planning
```

Sub-module routes:
- `/api/v1/planning/budgets` - Budget management
- `/api/v1/planning/headcount` - Headcount planning
- `/api/v1/planning/revenue` - Revenue planning
- `/api/v1/planning/scenarios` - Scenario analysis

## Authentication

All endpoints require:
1. Bearer token in the Authorization header
2. Organization context via `X-Organization-Id` header

```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## Common Patterns

### Workflow States

All planning documents follow this lifecycle:

```
draft → pending → approved → active → archived
         ↓
      rejected
```

| Status | Description | Who Can Modify |
|--------|-------------|----------------|
| `draft` | Initial creation, being worked on | Owner, Admin |
| `pending` | Submitted for approval | Cannot modify |
| `approved` | Approved, waiting activation | Cannot modify |
| `rejected` | Rejected, needs revision | Owner, Admin |
| `active` | In use for current period | Cannot modify |
| `archived` | Historical record | Cannot modify |

### Role Permissions

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View plans | ✓ | ✓ | ✓ | ✓ |
| Create plans | ✓ | ✓ | ✗ | ✗ |
| Edit plans | ✓ | ✓ | ✗ | ✗ |
| Submit for approval | ✓ | ✓ | ✗ | ✗ |
| Approve/Reject | ✓ | ✗ | ✗ | ✗ |
| Activate | ✓ | ✗ | ✗ | ✗ |
| Archive | ✓ | ✓ | ✗ | ✗ |

---

# Budget Sub-module

## Endpoints

### Budget CRUD

#### POST /planning/budgets

Create a new budget.

**Request Body:**

```typescript
interface CreateBudgetRequest {
  name: string;              // Required, 1-100 chars
  description?: string;      // Optional, max 1000 chars
  fiscalYear: number;        // Required, 2020-2050
  type: 'annual' | 'quarterly' | 'monthly';  // Required
  quarter?: 1 | 2 | 3 | 4;   // Required if type is 'quarterly'
  month?: number;            // Required if type is 'monthly' (1-12)
  startDate: string;         // Required, ISO date
  endDate: string;           // Required, ISO date
  currency?: string;         // Default: 'USD'
  notes?: string;            // Optional, max 500 chars
  tags?: string[];           // Optional
}
```

**Response (201 Created):**

```typescript
interface CreateBudgetResponse {
  success: true;
  data: Budget;
}
```

**Example:**

```typescript
const budget = await api.post('/planning/budgets', {
  name: 'FY2024 Operating Budget',
  description: 'Annual operating budget for fiscal year 2024',
  fiscalYear: 2024,
  type: 'annual',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  currency: 'USD'
});
```

---

#### GET /planning/budgets

List all budgets with optional filters.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fiscalYear | number | Filter by fiscal year |
| type | string | Filter by budget type |
| status | string | Filter by status |
| search | string | Search in name, description |

**Response (200 OK):**

```typescript
interface BudgetListResponse {
  success: true;
  data: Budget[];
}
```

---

#### GET /planning/budgets/:id

Get a single budget by ID.

---

#### PUT /planning/budgets/:id

Update a budget. Only works for `draft` or `rejected` status.

**Request Body:**

```typescript
interface UpdateBudgetRequest {
  name?: string;
  description?: string | null;
  notes?: string | null;
  tags?: string[];
}
```

---

#### DELETE /planning/budgets/:id

Archive a budget. Cannot archive `active` budgets.

---

### Budget Workflow

#### POST /planning/budgets/:id/submit

Submit budget for approval. Changes status from `draft` to `pending`.

---

#### POST /planning/budgets/:id/approve

Approve a pending budget. **Owner only.**

**Request Body:**

```typescript
interface ApproveRequest {
  notes?: string;  // Optional approval notes
}
```

---

#### POST /planning/budgets/:id/reject

Reject a pending budget. **Owner only.**

**Request Body:**

```typescript
interface RejectRequest {
  reason: string;  // Required rejection reason
}
```

---

#### POST /planning/budgets/:id/activate

Activate an approved budget. **Owner only.**

---

#### POST /planning/budgets/:id/clone

Clone a budget with all its items.

**Request Body:**

```typescript
interface CloneBudgetRequest {
  newName: string;       // Name for the cloned budget
  fiscalYear?: number;   // Optional new fiscal year
}
```

---

### Budget Items

#### GET /planning/budgets/:id/items

Get all line items for a budget.

---

#### POST /planning/budgets/:id/items

Add a budget item. **Must link to an expense account from Chart of Accounts.**

**Request Body:**

```typescript
interface CreateBudgetItemRequest {
  accountId: string;         // Required - ChartOfAccounts expense account ID
  name: string;              // Required, max 100 chars
  description?: string;      // Optional, max 1000 chars
  annualAmount: number;      // Required, min 0
  monthlyBreakdown?: {       // Optional - auto-calculated if not provided
    month: number;           // 1-12
    amount: number;
    notes?: string;
  }[];
  allocationMethod?: 'even' | 'custom' | 'weighted';  // Default: 'even'
  priority?: 'critical' | 'high' | 'medium' | 'low';  // Default: 'medium'
  vendor?: string;
  department?: string;
  costCenter?: string;
  isRecurring?: boolean;
  assumptions?: string;      // Max 2000 chars
  tags?: string[];
}
```

**Response (201 Created):**

```typescript
interface CreateBudgetItemResponse {
  success: true;
  data: BudgetItem;
}
```

**Example:**

```typescript
// First, get an expense account from Chart of Accounts
const accounts = await api.get('/chart-of-accounts?type=expense&subtype=marketing');
const marketingAccount = accounts.data[0];

// Create budget item linked to that account
const item = await api.post(`/planning/budgets/${budgetId}/items`, {
  accountId: marketingAccount.id,
  name: 'Digital Advertising Q1',
  annualAmount: 120000,
  allocationMethod: 'even',  // $10,000/month
  priority: 'high',
  department: 'Marketing',
  assumptions: 'Based on 2023 spend with 20% increase for expansion'
});
```

---

#### PUT /planning/budgets/:id/items/:itemId

Update a budget item.

---

#### DELETE /planning/budgets/:id/items/:itemId

Delete a budget item.

---

### Budget Analytics

#### GET /planning/budgets/:id/summary

Get budget summary with totals.

**Response:**

```typescript
interface BudgetSummaryResponse {
  success: true;
  data: {
    id: string;
    name: string;
    fiscalYear: number;
    type: string;
    status: string;
    totalAmount: number;
    itemCount: number;
    currency: string;
    byCategory: Record<string, number>;  // Totals by category
    createdAt: string;
  };
}
```

---

#### GET /planning/budgets/:id/monthly

Get monthly breakdown.

**Response:**

```typescript
interface MonthlyBreakdownResponse {
  success: true;
  data: {
    month: number;
    monthName: string;
    totalAmount: number;
    byCategory: Record<string, number>;
  }[];
}
```

---

#### GET /planning/budgets/:id/by-category

Get breakdown by account category.

**Response:**

```typescript
interface CategoryBreakdownResponse {
  success: true;
  data: {
    category: string;
    accountCode: string;
    accountName: string;
    annualAmount: number;
    monthlyAmounts: number[];  // Array of 12 monthly amounts
    itemCount: number;
    priority: string;
  }[];
}
```

---

# Headcount Sub-module

## Endpoints

### Headcount Plan CRUD

#### POST /planning/headcount

Create a new headcount plan.

**Request Body:**

```typescript
interface CreateHeadcountPlanRequest {
  name: string;              // Required
  description?: string;
  fiscalYear: number;        // Required, 2020-2050
  startDate: string;         // Required, ISO date
  endDate: string;           // Required, ISO date
  currentHeadcount?: number; // Current employee count
  targetHeadcount?: number;  // Target for end of period
  linkedBudgetId?: string;   // Optional link to budget
  currency?: string;         // Default: 'USD'
  notes?: string;
}
```

**Example:**

```typescript
const plan = await api.post('/planning/headcount', {
  name: 'FY2024 Hiring Plan',
  fiscalYear: 2024,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  currentHeadcount: 45,
  targetHeadcount: 65,
  linkedBudgetId: 'existing-budget-id'
});
```

---

#### GET /planning/headcount

List all headcount plans.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fiscalYear | number | Filter by fiscal year |
| status | string | Filter by status |
| department | string | Filter by department |
| search | string | Search in name, description |

---

#### GET /planning/headcount/:id

Get a single headcount plan.

---

#### PUT /planning/headcount/:id

Update a headcount plan.

---

#### DELETE /planning/headcount/:id

Archive a headcount plan.

---

#### POST /planning/headcount/:id/approve

Approve a headcount plan. **Owner only.**

---

### Planned Roles

#### GET /planning/headcount/:id/roles

Get all planned roles for a headcount plan.

---

#### POST /planning/headcount/:id/roles

Add a planned role.

**Request Body:**

```typescript
interface CreatePlannedRoleRequest {
  title: string;             // Required, max 100 chars
  department: string;        // Required
  level: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' |
         'manager' | 'director' | 'vp' | 'c-level';
  employmentType?: 'full-time' | 'part-time' | 'contractor' | 'temporary';
  location?: string;
  remoteStatus?: 'onsite' | 'hybrid' | 'remote';
  plannedStartDate: string;  // Required, ISO date
  plannedEndDate?: string;   // For contractors/temporary
  baseSalary: number;        // Required, min 0
  currency?: string;         // Default: 'USD'
  salaryFrequency?: 'annual' | 'monthly' | 'hourly';  // Default: 'annual'
  benefitsPercentage?: number;  // Default: 25 (25% of salary)
  benefitsAmount?: number;   // Fixed amount instead of percentage
  bonusTarget?: number;      // Target bonus amount
  equipmentCost?: number;    // One-time equipment cost
  recruitingCost?: number;   // Recruiting fees
  trainingCost?: number;     // Training/onboarding cost
  justification?: string;    // Why this role is needed
  priority?: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[];
}
```

**Response:**

The system automatically calculates:
- `monthlyCosts`: Array of 12 months with salary/benefits breakdown
- `totalAnnualCost`: Full annual cost including benefits

**Example:**

```typescript
const role = await api.post(`/planning/headcount/${planId}/roles`, {
  title: 'Senior Software Engineer',
  department: 'Engineering',
  level: 'senior',
  employmentType: 'full-time',
  remoteStatus: 'hybrid',
  plannedStartDate: '2024-03-01',
  baseSalary: 150000,
  benefitsPercentage: 25,    // 25% = $37,500 benefits
  bonusTarget: 15000,        // 10% bonus target
  equipmentCost: 3000,       // Laptop, monitors
  recruitingCost: 22500,     // 15% recruiting fee
  justification: 'Need for new product development team',
  priority: 'high'
});

// Response includes calculated costs:
// role.totalAnnualCost = 187,500 (salary + benefits)
// role.monthlyCosts = [{ month: 3, salary: 12500, benefits: 3125, total: 15625 }, ...]
// (Starting March, so months 1-2 have $0)
```

---

#### PUT /planning/headcount/:id/roles/:roleId

Update a planned role.

---

#### DELETE /planning/headcount/:id/roles/:roleId

Delete/archive a planned role.

---

#### POST /planning/headcount/:id/roles/:roleId/fill

Mark a role as filled when hired.

**Request Body:**

```typescript
interface FillRoleRequest {
  filledById: string;    // User ID of the hired person
  filledDate: string;    // Actual hire date
}
```

---

### Headcount Analytics

#### GET /planning/headcount/:id/summary

Get plan summary.

**Response:**

```typescript
interface HeadcountSummaryResponse {
  success: true;
  data: {
    id: string;
    name: string;
    fiscalYear: number;
    status: string;
    currentHeadcount: number;
    targetHeadcount: number;
    plannedHires: number;
    totalSalaryCost: number;
    totalBenefitsCost: number;
    totalCost: number;
    byDepartment: Record<string, number>;  // Roles per department
    byLevel: Record<string, number>;       // Roles per level
    createdAt: string;
  };
}
```

---

#### GET /planning/headcount/:id/timeline

Get hiring timeline sorted by start date.

**Response:**

```typescript
interface TimelineResponse {
  success: true;
  data: {
    roleId: string;
    title: string;
    department: string;
    level: string;
    plannedStartDate: Date;
    plannedStartMonth: number;  // 1-12
    baseSalary: number;
    totalCost: number;
    status: string;
  }[];
}
```

---

#### GET /planning/headcount/:id/cost-projection

Get monthly cost projections.

**Response:**

```typescript
interface CostProjectionResponse {
  success: true;
  data: {
    month: number;
    monthName: string;
    salaryTotal: number;
    benefitsTotal: number;
    total: number;
    newHires: number;           // Hires starting this month
    cumulativeHeadcount: number; // Running total
  }[];
}
```

**Example Output:**

```json
[
  { "month": 1, "monthName": "January", "salaryTotal": 0, "benefitsTotal": 0, "total": 0, "newHires": 0, "cumulativeHeadcount": 45 },
  { "month": 2, "monthName": "February", "salaryTotal": 0, "benefitsTotal": 0, "total": 0, "newHires": 0, "cumulativeHeadcount": 45 },
  { "month": 3, "monthName": "March", "salaryTotal": 25000, "benefitsTotal": 6250, "total": 31250, "newHires": 2, "cumulativeHeadcount": 47 },
  ...
]
```

---

# Revenue Plan Sub-module

## Endpoints

### Revenue Plan CRUD

#### POST /planning/revenue

Create a new revenue plan.

**Request Body:**

```typescript
interface CreateRevenuePlanRequest {
  name: string;              // Required
  description?: string;
  fiscalYear: number;        // Required, 2020-2050
  startDate: string;         // Required
  endDate: string;           // Required
  revenueModel?: 'subscription' | 'transactional' | 'hybrid' | 'other';
  linkedBudgetId?: string;   // Optional link to budget
  currency?: string;         // Default: 'USD'
  growthTargetPercentage?: number;  // Target growth
  baselineRevenue?: number;  // Last year's revenue
  assumptions?: string;      // Max 2000 chars
  methodology?: string;      // How projections calculated
  notes?: string;
}
```

---

#### GET /planning/revenue

List all revenue plans.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fiscalYear | number | Filter by fiscal year |
| status | string | Filter by status |
| revenueModel | string | Filter by model type |
| search | string | Search in name |

---

#### GET /planning/revenue/:id

Get a single revenue plan.

---

#### PUT /planning/revenue/:id

Update a revenue plan.

---

#### DELETE /planning/revenue/:id

Archive a revenue plan.

---

### Revenue Plan Workflow

#### POST /planning/revenue/:id/submit

Submit for approval.

---

#### POST /planning/revenue/:id/approve

Approve plan. **Owner only.**

---

#### POST /planning/revenue/:id/reject

Reject plan. **Owner only.**

**Request Body:**

```typescript
interface RejectRequest {
  reason: string;
}
```

---

#### POST /planning/revenue/:id/activate

Activate plan. **Owner only.**

---

### Revenue Streams

#### GET /planning/revenue/:id/streams

Get all revenue streams for a plan.

---

#### POST /planning/revenue/:id/streams

Add a revenue stream.

**Request Body:**

```typescript
interface CreateRevenueStreamRequest {
  name: string;              // Required
  description?: string;
  streamType: 'subscription' | 'one-time' | 'recurring' |
              'usage-based' | 'licensing' | 'services' | 'other';
  accountId?: string;        // Optional link to revenue account in CoA
  product?: string;          // Product/service name
  segment?: string;          // Customer segment
  region?: string;           // Geographic region
  channel?: string;          // Sales channel
  pricingModel?: 'fixed' | 'tiered' | 'usage' | 'freemium';
  averagePrice?: number;
  pricePerUnit?: number;
  unitType?: string;
  monthlyProjections: {      // Required - 12 months
    month: number;           // 1-12
    projected: number;       // Projected revenue
    confidence?: 'high' | 'medium' | 'low';
    notes?: string;
  }[];

  // Subscription-specific fields
  startingMRR?: number;      // Monthly recurring revenue at start
  projectedMRRGrowth?: number; // Monthly growth rate (%)
  churnRate?: number;        // Monthly churn rate (%)
  expansionRate?: number;    // Expansion revenue rate

  // Customer metrics
  startingCustomers?: number;
  newCustomersPerMonth?: number;
  averageTransactionValue?: number;

  // Planning fields
  growthDrivers?: string[];  // What drives this revenue
  risks?: string[];          // Known risks
  assumptions?: string;
  confidence?: 'high' | 'medium' | 'low';
  priority?: number;
  tags?: string[];
}
```

**Example - Subscription Revenue:**

```typescript
const stream = await api.post(`/planning/revenue/${planId}/streams`, {
  name: 'Enterprise SaaS',
  streamType: 'subscription',
  pricingModel: 'tiered',
  segment: 'Enterprise',
  startingMRR: 250000,
  projectedMRRGrowth: 5,     // 5% monthly growth
  churnRate: 2,              // 2% monthly churn
  expansionRate: 3,          // 3% expansion revenue
  monthlyProjections: [
    { month: 1, projected: 250000, confidence: 'high' },
    { month: 2, projected: 262500, confidence: 'high' },
    { month: 3, projected: 275625, confidence: 'medium' },
    // ... remaining months
  ],
  growthDrivers: ['New product launch', 'Sales team expansion'],
  risks: ['Competitor pricing', 'Economic downturn'],
  confidence: 'medium'
});
```

---

#### PUT /planning/revenue/:id/streams/:streamId

Update a revenue stream.

---

#### DELETE /planning/revenue/:id/streams/:streamId

Delete a revenue stream.

---

### Revenue Analytics

#### GET /planning/revenue/:id/summary

Get plan summary with breakdown by stream type.

**Response:**

```typescript
interface RevenuePlanSummaryResponse {
  success: true;
  data: {
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
  };
}
```

---

#### GET /planning/revenue/:id/projections

Get monthly revenue projections.

**Response:**

```typescript
interface MonthlyProjectionsResponse {
  success: true;
  data: {
    month: number;
    monthName: string;
    totalProjected: number;
    byStreamType: Record<string, number>;
    byConfidence: Record<string, number>;
  }[];
}
```

---

#### GET /planning/revenue/:id/mrr-metrics

Get MRR/ARR metrics for subscription revenue. **Only meaningful for subscription revenue models.**

**Response:**

```typescript
interface MRRMetricsResponse {
  success: true;
  data: {
    currentMRR: number;      // Sum of starting MRR across streams
    projectedARR: number;    // Annualized recurring revenue
    avgGrowthRate: number;   // Average monthly growth
    avgChurnRate: number;    // Average monthly churn
    netMRRGrowth: number;    // Net growth after churn
  };
}
```

---

# Scenarios Sub-module

## Endpoints

### Scenario CRUD

#### POST /planning/scenarios

Create a new scenario.

**Request Body:**

```typescript
interface CreateScenarioRequest {
  name: string;              // Required
  description?: string;
  type?: 'base' | 'optimistic' | 'pessimistic' | 'custom';
  fiscalYear: number;        // Required
  linkedBudgetId?: string;   // Link to budget for expense data
  linkedHeadcountPlanId?: string;  // Link to headcount for cost data
  linkedRevenuePlanId?: string;    // Link to revenue plan
  probability?: number;      // 0-100 likelihood
  assumptions?: string;
  methodology?: string;
  currency?: string;
  notes?: string;
  tags?: string[];
}
```

When linked plans are provided, the scenario **automatically initializes** with:
- `projectedRevenue` from the linked revenue plan
- `projectedExpenses` from linked budget + headcount costs
- `projectedNetIncome` = revenue - expenses

**Example:**

```typescript
const scenario = await api.post('/planning/scenarios', {
  name: 'Base Case 2024',
  type: 'base',
  fiscalYear: 2024,
  linkedBudgetId: 'budget-id',
  linkedHeadcountPlanId: 'headcount-plan-id',
  linkedRevenuePlanId: 'revenue-plan-id',
  probability: 60,
  assumptions: 'Normal market conditions, no major disruptions'
});

// Response includes calculated projections:
// projectedRevenue: 5000000 (from revenue plan)
// projectedExpenses: 3500000 (from budget + headcount)
// projectedNetIncome: 1500000 (revenue - expenses)
```

---

#### GET /planning/scenarios

List all scenarios.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fiscalYear | number | Filter by year |
| type | string | Filter by type |
| status | string | Filter by status |
| search | string | Search in name |

---

#### GET /planning/scenarios/:id

Get a single scenario with all details.

---

#### PUT /planning/scenarios/:id

Update a scenario.

---

#### DELETE /planning/scenarios/:id

Archive a scenario.

---

#### POST /planning/scenarios/:id/activate

Activate a scenario.

---

#### POST /planning/scenarios/:id/clone

Clone a scenario with all its adjustments.

**Request Body:**

```typescript
interface CloneScenarioRequest {
  newName: string;
}
```

---

### Scenario Adjustments (What-If Analysis)

Adjustments allow you to model changes without modifying the original plans.

#### GET /planning/scenarios/:id/adjustments

Get all adjustments for a scenario.

---

#### POST /planning/scenarios/:id/adjustments

Add a what-if adjustment.

**Request Body:**

```typescript
interface CreateAdjustmentRequest {
  adjustmentType: 'budget_item' | 'revenue_stream' | 'planned_role' | 'custom';
  referenceId?: string;      // ID of the item being adjusted
  referenceName: string;     // Required - name for display
  referenceCategory?: string;
  adjustmentMethod: 'percentage' | 'fixed' | 'formula';
  adjustmentPercentage?: number;  // For percentage method
  adjustmentAmount?: number;      // For fixed method
  originalAnnualAmount: number;   // Required - original value
  impactCategory: 'revenue' | 'expense' | 'headcount';
  description?: string;
  assumptions?: string;
}
```

The system automatically calculates:
- `adjustedAnnualAmount` based on method
- `impactType` ('increase', 'decrease', 'neutral')

**Example - Revenue Adjustment:**

```typescript
// Optimistic scenario: 20% increase in enterprise revenue
const adjustment = await api.post(`/planning/scenarios/${scenarioId}/adjustments`, {
  adjustmentType: 'revenue_stream',
  referenceId: 'enterprise-stream-id',
  referenceName: 'Enterprise SaaS Revenue',
  adjustmentMethod: 'percentage',
  adjustmentPercentage: 20,
  originalAnnualAmount: 3000000,
  impactCategory: 'revenue',
  description: 'Optimistic case - faster enterprise adoption',
  assumptions: 'New product features drive 20% more enterprise deals'
});

// Response:
// adjustedAnnualAmount: 3600000
// impactType: 'increase'
```

**Example - Cost Reduction:**

```typescript
// What if we reduce marketing spend by $100,000?
const adjustment = await api.post(`/planning/scenarios/${scenarioId}/adjustments`, {
  adjustmentType: 'budget_item',
  referenceId: 'marketing-budget-item-id',
  referenceName: 'Digital Marketing Budget',
  adjustmentMethod: 'fixed',
  adjustmentAmount: -100000,
  originalAnnualAmount: 500000,
  impactCategory: 'expense',
  description: 'Reduce paid advertising spend',
  assumptions: 'Focus on organic growth and content marketing'
});

// Response:
// adjustedAnnualAmount: 400000
// impactType: 'decrease'
```

---

#### PUT /planning/scenarios/:id/adjustments/:adjustmentId

Update an adjustment.

---

#### DELETE /planning/scenarios/:id/adjustments/:adjustmentId

Delete an adjustment.

---

### Scenario Comparison

#### POST /planning/scenarios/compare

Compare 2-5 scenarios side by side.

**Request Body:**

```typescript
interface CompareRequest {
  scenarioIds: string[];  // 2-5 scenario IDs
}
```

**Response:**

```typescript
interface CompareResponse {
  success: true;
  data: {
    scenarios: ScenarioSummary[];
    summary: {
      highestRevenue: {
        scenarioId: string;
        scenarioName: string;
        value: number;
      };
      lowestExpenses: {
        scenarioId: string;
        scenarioName: string;
        value: number;
      };
      bestNetIncome: {
        scenarioId: string;
        scenarioName: string;
        value: number;
      };
      longestRunway?: {
        scenarioId: string;
        scenarioName: string;
        value: number;
      };
    };
  };
}
```

**Example:**

```typescript
const comparison = await api.post('/planning/scenarios/compare', {
  scenarioIds: [baseScenarioId, optimisticId, pessimisticId]
});

// Response shows which scenario performs best on each metric
```

---

#### GET /planning/scenarios/:id/impact

Calculate total impact of all adjustments on the scenario.

**Response:**

```typescript
interface ImpactResponse {
  success: true;
  data: {
    baselineRevenue: number;
    baselineExpenses: number;
    baselineNetIncome: number;
    adjustedRevenue: number;
    adjustedExpenses: number;
    adjustedNetIncome: number;
    totalRevenueImpact: number;
    totalExpenseImpact: number;
    netImpact: number;
    adjustmentCount: number;
    byCategory: {
      revenue: { count: number; totalImpact: number };
      expense: { count: number; totalImpact: number };
      headcount: { count: number; totalImpact: number };
    };
  };
}
```

---

## TypeScript Types

```typescript
// ============ Enums ============

type BudgetStatus = 'draft' | 'pending' | 'approved' | 'active' | 'archived';
type BudgetType = 'annual' | 'quarterly' | 'monthly';
type AllocationMethod = 'even' | 'custom' | 'weighted';
type Priority = 'critical' | 'high' | 'medium' | 'low';

type HeadcountPlanStatus = 'draft' | 'pending' | 'approved' | 'active' | 'archived';
type EmploymentType = 'full-time' | 'part-time' | 'contractor' | 'temporary';
type JobLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' |
               'manager' | 'director' | 'vp' | 'c-level';
type RoleStatus = 'planned' | 'approved' | 'recruiting' | 'filled' | 'cancelled';
type RemoteStatus = 'onsite' | 'hybrid' | 'remote';

type RevenuePlanStatus = 'draft' | 'pending' | 'approved' | 'active' | 'archived';
type RevenueModel = 'subscription' | 'transactional' | 'hybrid' | 'other';
type StreamType = 'subscription' | 'one-time' | 'recurring' |
                 'usage-based' | 'licensing' | 'services' | 'other';
type PricingModel = 'fixed' | 'tiered' | 'usage' | 'freemium';
type Confidence = 'high' | 'medium' | 'low';

type ScenarioStatus = 'draft' | 'active' | 'archived';
type ScenarioType = 'base' | 'optimistic' | 'pessimistic' | 'custom';
type AdjustmentType = 'budget_item' | 'revenue_stream' | 'planned_role' | 'custom';
type AdjustmentMethod = 'percentage' | 'fixed' | 'formula';
type ImpactType = 'increase' | 'decrease' | 'neutral';
type ImpactCategory = 'revenue' | 'expense' | 'headcount';

// ============ Models ============

interface Budget {
  id: string;
  organization: string;
  name: string;
  description?: string;
  fiscalYear: number;
  type: BudgetType;
  quarter?: number;
  month?: number;
  status: BudgetStatus;
  startDate: string;
  endDate: string;
  totalAmount: number;
  currency: string;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  tags?: string[];
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface BudgetItem {
  id: string;
  budget: string;
  account: string;           // Chart of Accounts reference
  category: string;
  name: string;
  description?: string;
  annualAmount: number;
  monthlyBreakdown: MonthlyAmount[];
  allocationMethod: AllocationMethod;
  priority: Priority;
  vendor?: string;
  department?: string;
  costCenter?: string;
  isRecurring: boolean;
  assumptions?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface MonthlyAmount {
  month: number;
  amount: number;
  notes?: string;
}

interface HeadcountPlan {
  id: string;
  organization: string;
  name: string;
  description?: string;
  fiscalYear: number;
  status: HeadcountPlanStatus;
  startDate: string;
  endDate: string;
  currentHeadcount: number;
  targetHeadcount: number;
  totalSalaryCost: number;
  totalBenefitsCost: number;
  totalCost: number;
  currency: string;
  linkedBudget?: string;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PlannedRole {
  id: string;
  headcountPlan: string;
  title: string;
  department: string;
  level: JobLevel;
  employmentType: EmploymentType;
  location?: string;
  remoteStatus?: RemoteStatus;
  plannedStartDate: string;
  plannedEndDate?: string;
  baseSalary: number;
  currency: string;
  salaryFrequency: 'annual' | 'monthly' | 'hourly';
  benefitsPercentage: number;
  benefitsAmount?: number;
  bonusTarget?: number;
  equipmentCost?: number;
  recruitingCost?: number;
  trainingCost?: number;
  monthlyCosts: MonthlyCost[];
  totalAnnualCost: number;
  status: RoleStatus;
  priority: Priority;
  justification?: string;
  filledBy?: string;
  filledDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface MonthlyCost {
  month: number;
  salary: number;
  benefits: number;
  total: number;
}

interface RevenuePlan {
  id: string;
  organization: string;
  name: string;
  description?: string;
  fiscalYear: number;
  status: RevenuePlanStatus;
  startDate: string;
  endDate: string;
  totalProjectedRevenue: number;
  currency: string;
  revenueModel: RevenueModel;
  linkedBudget?: string;
  growthTargetPercentage?: number;
  baselineRevenue?: number;
  assumptions?: string;
  methodology?: string;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RevenueStream {
  id: string;
  revenuePlan: string;
  account?: string;           // Chart of Accounts reference
  name: string;
  description?: string;
  streamType: StreamType;
  product?: string;
  segment?: string;
  region?: string;
  channel?: string;
  pricingModel: PricingModel;
  averagePrice?: number;
  monthlyProjections: MonthlyRevenue[];
  annualProjected: number;
  startingMRR?: number;
  projectedMRRGrowth?: number;
  churnRate?: number;
  expansionRate?: number;
  startingCustomers?: number;
  newCustomersPerMonth?: number;
  averageTransactionValue?: number;
  growthDrivers?: string[];
  risks?: string[];
  assumptions?: string;
  confidence: Confidence;
  priority: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface MonthlyRevenue {
  month: number;
  projected: number;
  confidence: Confidence;
  notes?: string;
}

interface Scenario {
  id: string;
  organization: string;
  name: string;
  description?: string;
  type: ScenarioType;
  fiscalYear: number;
  status: ScenarioStatus;
  linkedBudget?: string;
  linkedHeadcountPlan?: string;
  linkedRevenuePlan?: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetIncome: number;
  projectedRunway?: number;
  probability?: number;
  assumptions?: string;
  methodology?: string;
  currency: string;
  notes?: string;
  tags?: string[];
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioAdjustment {
  id: string;
  scenario: string;
  adjustmentType: AdjustmentType;
  referenceId?: string;
  referenceName: string;
  referenceCategory?: string;
  adjustmentMethod: AdjustmentMethod;
  adjustmentPercentage?: number;
  adjustmentAmount?: number;
  originalAnnualAmount: number;
  adjustedAnnualAmount: number;
  impactType: ImpactType;
  impactCategory: ImpactCategory;
  monthlyImpact?: MonthlyImpact[];
  description?: string;
  assumptions?: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyImpact {
  month: number;
  original: number;
  adjusted: number;
  difference: number;
}
```

---

## UI Components Needed

### Budget Module
1. **BudgetList** - Table of budgets with status badges and actions
2. **BudgetForm** - Create/edit budget with line items
3. **BudgetItemTable** - Editable grid for budget items
4. **BudgetSummaryCard** - Overview with totals
5. **BudgetMonthlyChart** - Bar chart of monthly breakdown
6. **BudgetCategoryPie** - Pie chart by category
7. **BudgetApprovalModal** - Approve/reject with notes
8. **BudgetCloneModal** - Clone configuration

### Headcount Module
1. **HeadcountPlanList** - Plans with summary stats
2. **HeadcountPlanForm** - Create/edit plan
3. **PlannedRoleTable** - Grid of roles with inline editing
4. **PlannedRoleForm** - Detailed role creation
5. **HiringTimeline** - Gantt-style timeline view
6. **CostProjectionChart** - Monthly cost line chart
7. **DepartmentBreakdown** - Roles by department
8. **RoleFillModal** - Mark role as filled

### Revenue Module
1. **RevenuePlanList** - Plans with revenue totals
2. **RevenuePlanForm** - Create/edit plan
3. **RevenueStreamTable** - List of streams
4. **RevenueStreamForm** - Detailed stream creation
5. **MonthlyProjectionChart** - Revenue by month
6. **StreamTypeBreakdown** - Revenue by stream type
7. **MRRDashboard** - MRR/ARR metrics cards
8. **ConfidenceIndicator** - Visual confidence levels

### Scenarios Module
1. **ScenarioList** - Cards for each scenario
2. **ScenarioForm** - Create/edit with linked plans
3. **AdjustmentTable** - List of what-if adjustments
4. **AdjustmentForm** - Create/edit adjustment
5. **ScenarioComparisonTable** - Side-by-side metrics
6. **ImpactSummaryCard** - Baseline vs adjusted
7. **ScenarioCloneModal** - Clone configuration
8. **SensitivitySlider** - Interactive what-if sliders

---

## User Flows

### Creating a Complete Financial Plan

```
1. Create Budget (annual operating budget)
   ↓
2. Add Budget Items (linked to Chart of Accounts)
   ↓
3. Create Headcount Plan (hiring needs)
   ↓
4. Add Planned Roles (salaries, benefits, start dates)
   ↓
5. Create Revenue Plan (revenue projections)
   ↓
6. Add Revenue Streams (by product/segment)
   ↓
7. Create Scenarios (base, optimistic, pessimistic)
   ↓
8. Link scenarios to plans
   ↓
9. Add adjustments for what-if analysis
   ↓
10. Compare scenarios
   ↓
11. Submit plans for approval
   ↓
12. Approve and activate
```

### Budget Approval Flow

```
1. Finance team creates budget (status: draft)
2. Team adds/adjusts line items
3. Submit for approval (status: pending)
4. Owner reviews summary and items
5. Owner approves (status: approved) or rejects (status: rejected)
6. If rejected, finance revises and resubmits
7. Once approved, owner activates (status: active)
8. Active budget used for tracking
```

### Scenario Planning Flow

```
1. Create base scenario linked to existing plans
2. Clone to create optimistic variant
3. Add adjustments:
   - Increase revenue by 20%
   - Reduce marketing spend by 10%
4. Clone base for pessimistic variant
5. Add adjustments:
   - Decrease revenue by 15%
   - Delay 2 hires by 3 months
6. Compare all 3 scenarios
7. Activate preferred scenario
8. Use for decision-making
```

---

## State Management

### React Query Example

```typescript
// Budget hooks
export const useBudgets = (filters?: BudgetFilters) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['budgets', organizationId, filters],
    queryFn: () => fetchBudgets(organizationId, filters),
  });
};

export const useBudget = (budgetId: string) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => fetchBudget(organizationId, budgetId),
    enabled: !!budgetId,
  });
};

export const useBudgetItems = (budgetId: string) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['budgetItems', budgetId],
    queryFn: () => fetchBudgetItems(organizationId, budgetId),
    enabled: !!budgetId,
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useApproveBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ budgetId, notes }) => approveBudget(budgetId, notes),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// Scenario hooks
export const useScenarios = (filters?: ScenarioFilters) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['scenarios', organizationId, filters],
    queryFn: () => fetchScenarios(organizationId, filters),
  });
};

export const useCompareScenarios = () => {
  return useMutation({
    mutationFn: (scenarioIds: string[]) => compareScenarios(scenarioIds),
  });
};

export const useScenarioImpact = (scenarioId: string) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['scenarioImpact', scenarioId],
    queryFn: () => getScenarioImpact(organizationId, scenarioId),
    enabled: !!scenarioId,
  });
};
```

---

## Error Handling

### Common Errors

| Status | Code | Description | UI Action |
|--------|------|-------------|-----------|
| 400 | VALIDATION_ERROR | Invalid input | Show field errors |
| 400 | INVALID_STATUS | Wrong status for action | Show status message |
| 400 | CANNOT_MODIFY | Cannot modify approved/active | Disable editing |
| 400 | INVALID_ACCOUNT | Account not found in CoA | Show error, link to CoA |
| 400 | WRONG_ACCOUNT_TYPE | Budget needs expense account | Filter account selector |
| 403 | FORBIDDEN | Insufficient permissions | Show permission denied |
| 403 | OWNER_ONLY | Action requires owner role | Show role requirement |
| 404 | NOT_FOUND | Plan/item not found | Show 404, redirect |
| 409 | DUPLICATE | Plan already exists | Suggest different name |

### Validation Examples

```typescript
// Before submitting budget item
if (!accountId) {
  showError('Please select an account from Chart of Accounts');
  return;
}

// Account must be expense type for budget items
if (account.type !== 'expense') {
  showError('Budget items must use expense accounts');
  return;
}

// Validate monthly breakdown sums to annual
const monthlyTotal = monthlyBreakdown.reduce((sum, m) => sum + m.amount, 0);
if (Math.abs(monthlyTotal - annualAmount) > 0.01) {
  showWarning('Monthly amounts do not sum to annual total');
}
```

---

## Integration with Other Modules

### Chart of Accounts
- Budget items **must** link to expense accounts
- Revenue streams **can** link to revenue accounts
- Account category auto-populated from linked account
- Validate account exists and is active before linking

### Future: Tracking Module
- Compare budget vs actual expenses
- Revenue plan vs actual revenue
- Variance reports by account

### Future: Analysis Module
- Budget variance analysis
- Headcount cost vs budget
- Revenue forecast accuracy

### Future: Reporting Module
- Budget reports with category breakdown
- Headcount cost reports
- Revenue projection reports
- Scenario comparison reports

---

## Best Practices

1. **Always link to Chart of Accounts** - Budget items should reference expense accounts for proper categorization

2. **Use realistic projections** - Revenue streams should have confidence levels reflecting actual certainty

3. **Document assumptions** - Use the assumptions field to explain projection methodology

4. **Create multiple scenarios** - Always have base, optimistic, and pessimistic scenarios

5. **Keep scenarios linked** - Link scenarios to actual plans for accurate baselines

6. **Review before activation** - Active plans are locked; review thoroughly before activating

7. **Version planning** - Use clone functionality to create new versions rather than modifying approved plans

8. **Regular recalculation** - After adding/modifying items, totals are automatically recalculated

9. **Use approval workflow** - Don't skip the approval process; it provides audit trails

10. **Track variances** - Compare planned vs actual regularly (once Tracking module is built)
