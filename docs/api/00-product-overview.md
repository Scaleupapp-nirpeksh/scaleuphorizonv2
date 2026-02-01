# ScaleUp Horizon - Product Overview for Frontend Developers

## Executive Summary

ScaleUp Horizon is a **comprehensive financial management platform for startups and growing businesses**. It's a multi-tenant SaaS application that helps founders manage financial planning, expense tracking, fundraising, investor relations, and financial analysis through an integrated suite of specialized modules.

**Target Users:**
- Startup Founders
- Finance Teams
- CFOs and Controllers
- Investor Relations Managers

**Core Value Proposition:**
- Unified financial management (no more spreadsheet chaos)
- AI-powered insights and automation
- Investor-ready reporting
- Real-time financial health monitoring

---

## Table of Contents

1. [Product Architecture](#product-architecture)
2. [User Personas](#user-personas)
3. [Core Concepts & Terminology](#core-concepts--terminology)
4. [Module Overview](#module-overview)
5. [Key User Journeys](#key-user-journeys)
6. [Data Relationships](#data-relationships)
7. [UI/UX Recommendations](#uiux-recommendations)
8. [State Management Patterns](#state-management-patterns)
9. [Error Handling](#error-handling)
10. [Integration Patterns](#integration-patterns)

---

## Product Architecture

### Multi-Tenant Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACCOUNT                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Organization │  │ Organization │  │ Organization │  ...     │
│  │   (Tenant)   │  │   (Tenant)   │  │   (Tenant)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

- **One user can belong to multiple organizations** (e.g., a founder with multiple startups)
- **All data is organization-scoped** (complete data isolation)
- **Users switch between organizations** using the organization switcher
- **Role-based access** within each organization (Owner, Admin, Member, Viewer)

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        FOUNDATION LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     Auth     │  │ Organization │  │    Chart of  │          │
│  │              │  │              │  │   Accounts   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FINANCIAL LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Planning   │  │   Tracking   │  │  Fundraising │          │
│  │              │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ANALYTICS LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Projection  │  │   Analysis   │  │  Reporting   │          │
│  │              │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OPERATIONS LAYER                           │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  Operations  │  │ Intelligence │                             │
│  │              │  │     (AI)     │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Personas

### 1. Startup Founder (Primary User)

**Goals:**
- Understand company's financial health at a glance
- Make data-driven decisions about hiring, spending, fundraising
- Keep investors informed with professional reports
- Avoid running out of money (runway management)

**Key Screens:**
- Executive Dashboard
- Runway Calculator
- Investor Updates
- Budget vs Actual

**Pain Points Solved:**
- "I don't know how much runway we have"
- "Investor reporting takes me a full day each month"
- "I can't compare what we planned vs what we actually spent"

### 2. Finance Manager/Controller

**Goals:**
- Track all income and expenses accurately
- Reconcile bank statements
- Create budgets and monitor variance
- Generate financial statements

**Key Screens:**
- Transaction Hub
- Bank Reconciliation
- Budget Planning
- Financial Statements (P&L, Balance Sheet, Cash Flow)

**Pain Points Solved:**
- "Categorizing transactions is tedious"
- "I'm always behind on reconciliation"
- "Creating monthly reports takes too long"

### 3. Investor Relations Manager

**Goals:**
- Maintain investor database
- Track fundraising pipeline
- Manage cap table
- Send investor updates

**Key Screens:**
- Investor CRM
- Funding Rounds
- Cap Table
- Investor Reports

**Pain Points Solved:**
- "I can't remember where we are with each investor"
- "The cap table is a mess of spreadsheets"
- "Preparing for board meetings is stressful"

### 4. Team Member (Viewer)

**Goals:**
- View company dashboards
- Submit expense reports
- Track assigned tasks

**Key Screens:**
- View-only dashboards
- Expense submission
- Task management

---

## Core Concepts & Terminology

### Financial Concepts

| Term | Definition | Example |
|------|------------|---------|
| **MRR** | Monthly Recurring Revenue | $50,000/month from subscriptions |
| **ARR** | Annual Recurring Revenue | MRR x 12 = $600,000/year |
| **Burn Rate** | Monthly cash outflow | $80,000/month in expenses |
| **Net Burn** | Burn Rate - Revenue | $80K - $50K = $30K net burn |
| **Runway** | Months of cash remaining | $300K cash / $30K net burn = 10 months |
| **CAC** | Customer Acquisition Cost | Marketing spend / New customers |
| **LTV** | Customer Lifetime Value | Average revenue per customer over lifetime |
| **Churn Rate** | % customers lost per period | 5% monthly churn |

### Platform Concepts

| Term | Definition | UI Implication |
|------|------------|----------------|
| **Organization** | A company/tenant in the system | Organization switcher in header |
| **Membership** | User's role in an organization | Permission-based UI rendering |
| **Chart of Accounts** | Hierarchy of financial categories | Category dropdowns, tree views |
| **Fiscal Year** | Company's accounting year | Date pickers, period selectors |
| **Approval Workflow** | Multi-step approval process | Status badges, action buttons |

### Status Types

#### Budget Status Flow
```
Draft → Pending Approval → Approved → Active → Archived
        ↓ (reject)
        Draft
```

#### Expense Status Flow
```
Draft → Pending Approval → Approved → Paid
        ↓ (reject)
        Draft (with rejection reason)
```

#### Investor Status Flow
```
Prospect → In Discussion → Committed → Invested
           ↓
           Passed
```

---

## Module Overview

### Module 1: Authentication (`/api/v1/auth`)

**Purpose:** User account management and authentication

**Key Features:**
- Email/password registration
- JWT token authentication
- Password reset flow
- Email verification

**UI Components Needed:**
- Login form
- Registration form
- Password reset form
- Email verification screen
- Profile settings

**Important Notes:**
- Store access token in memory (not localStorage for security)
- Store refresh token in httpOnly cookie or secure storage
- Implement token refresh logic (access token expires in 15 minutes)
- Handle 401 responses with automatic token refresh

### Module 2: Organization (`/api/v1/organizations`)

**Purpose:** Multi-tenancy and team management

**Key Features:**
- Organization CRUD
- Team member management
- Role-based access control
- Organization switching

**UI Components Needed:**
- Organization selector (header dropdown)
- Organization settings page
- Team member list with roles
- Invitation dialog
- Role change confirmation

**Role Permissions Matrix:**

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View data | ✓ | ✓ | ✓ | ✓ |
| Create/Edit data | ✓ | ✓ | ✓ | ✗ |
| Approve budgets | ✓ | ✓ | ✗ | ✗ |
| Manage team | ✓ | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ |

### Module 3: Chart of Accounts (`/api/v1/chart-of-accounts`)

**Purpose:** Financial category taxonomy

**Key Features:**
- Hierarchical account structure
- Account types (Asset, Liability, Equity, Revenue, Expense)
- Subtypes for detailed categorization
- Seeding with default accounts

**UI Components Needed:**
- Tree view of accounts
- Account creation/edit modal
- Account type filter
- Account selector dropdown (for transactions)
- Leaf account indicator

**Account Type Color Coding (Suggestion):**
- Asset: Blue
- Liability: Red
- Equity: Purple
- Revenue: Green
- Expense: Orange

**Important Notes:**
- Only "leaf" accounts (no children) can have transactions
- Show account codes for power users (e.g., 1000 = Assets)
- Allow search by name or code

### Module 4: Planning (`/api/v1/planning`)

**Purpose:** Financial planning and budgeting

**Sub-modules:**

#### 4a. Budget Planning

**Key Features:**
- Create annual/quarterly/monthly budgets
- Add line items linked to accounts
- Approval workflow
- Clone existing budgets

**UI Components Needed:**
- Budget list with status badges
- Budget creation wizard
- Line item editor (spreadsheet-like)
- Approval action buttons
- Budget vs Actual comparison view

#### 4b. Headcount Planning

**Key Features:**
- Plan future hires
- Track salary and benefits costs
- Hiring timeline visualization

**UI Components Needed:**
- Role planning table
- Department breakdown chart
- Hiring timeline (Gantt-like)
- Cost projection graph

#### 4c. Revenue Planning

**Key Features:**
- Revenue stream management
- Growth rate projections
- Subscription vs one-time revenue

**UI Components Needed:**
- Revenue stream cards
- Projection charts
- Confidence level indicators

#### 4d. Scenario Planning

**Key Features:**
- Create what-if scenarios
- Compare scenarios side-by-side
- Calculate impact of changes

**UI Components Needed:**
- Scenario comparison table
- Adjustment sliders
- Impact visualization

### Module 5: Tracking (`/api/v1/tracking`)

**Purpose:** Financial data capture and reconciliation

**Sub-modules:**

#### 5a. Transactions

**Key Features:**
- Record income/expense transactions
- Link to Chart of Accounts
- Bulk import
- Categorization

**UI Components Needed:**
- Transaction list (filterable, sortable)
- Transaction form
- Bulk import wizard
- Category selector

#### 5b. Expenses

**Key Features:**
- Expense creation with receipts
- Approval workflow
- Vendor management
- Recurring expenses

**UI Components Needed:**
- Expense submission form
- Receipt upload
- Approval queue
- Vendor dropdown with "add new" option

#### 5c. Revenue

**Key Features:**
- Revenue entry tracking
- Customer management
- MRR/ARR calculations
- Subscription tracking

**UI Components Needed:**
- Revenue entry list
- Customer selector
- MRR dashboard widget
- Subscription status badges

#### 5d. Bank Sync

**Key Features:**
- CSV import from banks
- Transaction matching
- Reconciliation workflow

**UI Components Needed:**
- Bank account list
- CSV upload with column mapping
- Match/reconcile interface
- Reconciliation status

### Module 6: Projection (`/api/v1/projection`)

**Purpose:** Financial forecasting and runway analysis

**Sub-modules:**

#### 6a. Cash Flow Forecast

**UI Components Needed:**
- Monthly cash flow chart
- Inflow/outflow breakdown
- Forecast assumptions editor

#### 6b. Runway Calculator

**Key Features:**
- Current runway calculation
- What-if analysis
- Scenario comparison

**UI Components Needed:**
- Runway gauge (months remaining)
- Status indicator (Critical/Warning/Healthy)
- What-if sliders
- Projection chart

**Status Thresholds:**
- Critical: < 3 months (Red)
- Warning: 3-6 months (Yellow)
- Healthy: > 6 months (Green)

#### 6c. Financial Model

**UI Components Needed:**
- P&L projection table
- Balance sheet projection
- Cash flow projection
- Key metrics cards

### Module 7: Analysis (`/api/v1/analysis`)

**Purpose:** Financial analytics and insights

**Sub-modules:**

#### 7a. Variance Analysis

**UI Components Needed:**
- Budget vs Actual table
- Variance highlights (favorable/unfavorable)
- Drill-down by category
- Trend chart

#### 7b. Trend Analysis

**UI Components Needed:**
- Multi-line trend charts
- Moving average overlays
- Period comparison

#### 7c. Unit Economics

**UI Components Needed:**
- CAC/LTV cards
- Payback period indicator
- Cohort retention chart
- MRR breakdown

#### 7d. Health Score

**UI Components Needed:**
- Overall score gauge (0-100)
- Component scores breakdown
- Recommendations list
- Historical trend

### Module 8: Fundraising (`/api/v1/fundraising`)

**Purpose:** Investor and equity management

**Sub-modules:**

#### 8a. Funding Rounds

**Key Features:**
- Create funding rounds
- Track progress to goal
- Manage terms

**UI Components Needed:**
- Round list with progress bars
- Round creation wizard
- Term sheet form
- Round summary cards

#### 8b. Investor Management

**Key Features:**
- Investor CRM
- Status tracking (pipeline)
- Tranche management

**UI Components Needed:**
- Investor list with status badges
- Investor detail page
- Pipeline/Kanban view
- Tranche schedule table

#### 8c. Cap Table

**Key Features:**
- Shareholder tracking
- Ownership percentages
- Share class management
- Dilution calculations

**UI Components Needed:**
- Cap table (spreadsheet-like)
- Pie chart of ownership
- Share class legend
- Transaction history

#### 8d. ESOP

**Key Features:**
- Option pool management
- Grant tracking
- Vesting schedules

**UI Components Needed:**
- Pool utilization gauge
- Grant list
- Vesting calendar/timeline
- Employee option statement

### Module 9: Reporting (`/api/v1/reporting`)

**Purpose:** Dashboards and investor reports

**Sub-modules:**

#### 9a. Dashboards

**Key Features:**
- Customizable dashboards
- 40+ widget types
- Drag-and-drop layout
- Multiple dashboard types

**UI Components Needed:**
- Dashboard grid layout
- Widget library sidebar
- Widget configuration modal
- Time range picker
- Comparison toggle

**Widget Categories:**
- KPI Cards (single metric display)
- Charts (line, bar, pie, area)
- Tables (sortable data grids)
- Progress indicators
- Trend arrows

#### 9b. Investor Reports

**Key Features:**
- Template-based reports
- Scheduled delivery
- PDF export

**UI Components Needed:**
- Report template selector
- Report preview
- Recipient list
- Schedule configuration

#### 9c. Financial Statements

**Key Features:**
- P&L statement
- Balance sheet
- Cash flow statement
- PDF export

**UI Components Needed:**
- Statement viewer (table format)
- Period selector
- Comparison (prior period, YoY)
- Export button

### Module 10: Operations (`/api/v1/operations`)

**Purpose:** Task and meeting management

**Sub-modules:**

#### 10a. Tasks

**Key Features:**
- Task CRUD
- Status workflow
- Comments and attachments
- Reminders

**UI Components Needed:**
- Task list/board view
- Task detail drawer
- Comment thread
- Reminder configuration

#### 10b. Milestones

**Key Features:**
- Milestone tracking
- Key results (OKRs)
- Progress tracking

**UI Components Needed:**
- Milestone list
- Progress bars
- Key result editor

#### 10c. Meetings

**Key Features:**
- Meeting scheduling
- Attendee management
- Action item tracking

**UI Components Needed:**
- Meeting calendar
- Meeting detail page
- Attendee selector
- Action item list

### Module 11: Intelligence (`/api/v1/intelligence`)

**Purpose:** AI-powered features

**Sub-modules:**

#### 11a. Copilot

**Key Features:**
- Natural language financial queries
- Conversation history
- User feedback

**UI Components Needed:**
- Chat interface
- Suggested questions
- Response rating (thumbs up/down)
- Clear conversation button

#### 11b. Categorization

**Key Features:**
- Auto-categorize transactions
- Bulk categorization
- Accuracy metrics

**UI Components Needed:**
- Categorization suggestions
- Confidence indicator
- Feedback buttons (correct/incorrect)

#### 11c. Document Parser

**Key Features:**
- Upload and parse documents
- Extract financial data

**UI Components Needed:**
- Document upload dropzone
- Parsing progress indicator
- Extracted data preview
- Confirmation/edit form

#### 11d. Meeting Intelligence

**Key Features:**
- Meeting prep briefs
- Summary generation
- Action item extraction

**UI Components Needed:**
- Prep brief panel
- Generated summary card
- Action item checklist

---

## Key User Journeys

### Journey 1: New User Onboarding

```
1. Register Account
   └─ Email verification

2. Create Organization
   └─ Set name, industry, fiscal year start

3. Setup Chart of Accounts
   ├─ Use default template
   └─ Or customize accounts

4. (Optional) Invite Team Members
   └─ Send invitations with roles

5. Ready to Use!
   └─ Redirect to dashboard
```

**UI Flow:**
- Registration → Email Verification → Organization Setup Wizard → Dashboard

### Journey 2: Monthly Financial Tracking

```
1. Import Bank Statement (CSV)
   └─ Map columns → Import

2. Categorize Transactions
   ├─ Auto-categorization suggestions
   └─ Manual categorization

3. Reconcile with Bank
   └─ Match imported transactions

4. Record Additional Expenses
   └─ Submit for approval if needed

5. Record Revenue
   └─ Link to customers

6. View Monthly Summary
   └─ Dashboard with key metrics
```

### Journey 3: Budget Planning & Monitoring

```
1. Create Annual Budget
   ├─ Add line items by category
   ├─ Distribute across months
   └─ Submit for approval

2. Budget Approved
   └─ Status → Active

3. Throughout the Year
   ├─ Record actuals (transactions)
   └─ View Budget vs Actual

4. Analyze Variance
   ├─ Identify over/under budget
   └─ Take corrective action
```

### Journey 4: Fundraising Process

```
1. Create Funding Round
   ├─ Set target amount
   ├─ Define terms
   └─ Set timeline

2. Add Investors
   ├─ Enter contact info
   ├─ Track pipeline status
   └─ Update as they progress

3. Investor Commits
   └─ Create tranches (payment schedule)

4. Receive Investment
   ├─ Mark tranche received
   └─ Update cap table

5. Post-Round
   ├─ Send investor update
   └─ Schedule board meeting
```

### Journey 5: Investor Reporting

```
1. Generate Monthly Update
   ├─ AI generates summary
   ├─ Add custom commentary
   └─ Review metrics

2. Customize Report
   ├─ Select sections to include
   └─ Add highlights/challenges

3. Send to Investors
   ├─ Select recipients
   └─ Schedule or send immediately

4. Track Engagement
   └─ View open/click stats
```

### Journey 6: Runway Management

```
1. View Current Runway
   └─ Dashboard shows months remaining

2. Status is Warning (< 6 months)
   └─ System shows warning banner

3. Run What-If Scenarios
   ├─ "If we cut marketing by 30%..."
   ├─ "If we delay hiring 3 months..."
   └─ View extended runway

4. Make Decision
   └─ Implement cost reduction

5. Monitor Impact
   └─ Track actual vs projected
```

---

## Data Relationships

### Organization-Scoped Data

Everything belongs to an organization:

```typescript
interface BaseEntity {
  _id: string;
  organization: string;  // Always present
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}
```

### Key Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                        CHART OF ACCOUNTS                          │
│  Central taxonomy for all financial categorization                │
└──────────────────────────────────────────────────────────────────┘
         │
         ├──── Budget Items (link to expense accounts)
         ├──── Transactions (link to any leaf account)
         ├──── Expenses (link to expense accounts)
         ├──── Revenue Entries (link to revenue accounts)
         └──── Revenue Streams (optional link)

┌──────────────────────────────────────────────────────────────────┐
│                          TRANSACTIONS                             │
│  Central hub for all financial movements                         │
└──────────────────────────────────────────────────────────────────┘
         │
         ├──── Linked from Expenses (when paid)
         ├──── Linked from Revenue Entries (when received)
         └──── Linked from Bank Transactions (when matched)

┌──────────────────────────────────────────────────────────────────┐
│                          FUNDRAISING                              │
│  Investors → Rounds → Cap Table                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ├──── Investors belong to Rounds
         ├──── Investors have Tranches
         ├──── Cap Table Entries reference Investors/Rounds
         └──── ESOP Grants link to Employees (Users)

┌──────────────────────────────────────────────────────────────────┐
│                          OPERATIONS                               │
│  Tasks ↔ Milestones ↔ Meetings                                   │
└──────────────────────────────────────────────────────────────────┘
         │
         ├──── Tasks can link to Milestones
         ├──── Tasks can link to Meetings
         ├──── Meetings can have Action Items → Tasks
         └──── Meetings can link to Investors
```

---

## UI/UX Recommendations

### Navigation Structure

```
├── Dashboard (Home)
│
├── Planning
│   ├── Budgets
│   ├── Headcount
│   ├── Revenue Plans
│   └── Scenarios
│
├── Tracking
│   ├── Transactions
│   ├── Expenses
│   ├── Revenue
│   └── Bank Accounts
│
├── Analysis
│   ├── Budget vs Actual
│   ├── Trends
│   ├── Unit Economics
│   └── Health Score
│
├── Projections
│   ├── Cash Flow
│   ├── Runway
│   └── Financial Model
│
├── Fundraising
│   ├── Rounds
│   ├── Investors
│   ├── Cap Table
│   └── ESOP
│
├── Reporting
│   ├── Dashboards
│   ├── Investor Updates
│   └── Financial Statements
│
├── Operations
│   ├── Tasks
│   ├── Milestones
│   └── Meetings
│
├── AI Copilot (Floating widget or sidebar)
│
└── Settings
    ├── Organization
    ├── Team
    ├── Chart of Accounts
    └── Profile
```

### Global Components

1. **Header**
   - Organization switcher (dropdown)
   - User menu (profile, logout)
   - Notifications
   - AI Copilot toggle

2. **Sidebar**
   - Navigation menu (collapsible)
   - Active organization indicator

3. **Common Patterns**
   - List views with filters
   - Detail drawers (slide-in panels)
   - Confirmation modals for destructive actions
   - Toast notifications for success/error

### Status Badge Colors

| Status | Color | Usage |
|--------|-------|-------|
| Draft | Gray | Unpublished/in-progress items |
| Pending | Yellow/Amber | Awaiting action |
| Approved | Green | Accepted/active |
| Rejected | Red | Declined items |
| Paid | Blue | Completed payments |
| Active | Green | Currently in use |
| Archived | Gray | Soft-deleted items |

### Form Patterns

1. **Create/Edit Modals**
   - Use for simple entities (vendor, customer, account)
   - Close on successful save
   - Show validation errors inline

2. **Full-Page Forms**
   - Use for complex entities (budget, round, report)
   - Support save as draft
   - Show unsaved changes warning on navigation

3. **Inline Editing**
   - Use for quick updates (status change, amount adjustment)
   - Show save/cancel on hover or click

### Data Tables

1. **Standard Features**
   - Sortable columns
   - Filter bar
   - Pagination (default 20, configurable)
   - Row actions menu
   - Bulk selection for applicable actions

2. **Export Options**
   - CSV export for all table data
   - PDF for formatted reports

### Charts & Visualizations

1. **Recommended Libraries**
   - Recharts or Victory for React
   - Chart.js for simpler needs
   - D3.js for custom visualizations

2. **Common Chart Types**
   - Line charts: Trends over time
   - Bar charts: Comparisons (budget vs actual)
   - Pie charts: Breakdowns (expense by category)
   - Gauge: Single metrics (health score, runway)
   - Area charts: Cumulative values

---

## State Management Patterns

### Recommended Architecture

```typescript
// Global State (Context or Redux)
interface AppState {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    accessToken: string | null;
  };
  organization: {
    current: Organization | null;
    list: Organization[];
  };
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
  };
}

// Per-Module State (React Query or SWR)
// Use server state management for API data
// - Automatic caching
// - Background refetching
// - Optimistic updates
```

### API Data Caching Strategy

```typescript
// React Query Example
const useBudgets = () => {
  return useQuery({
    queryKey: ['budgets', organizationId],
    queryFn: () => fetchBudgets(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

const useCreateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
    },
  });
};
```

### Recommended Caching Times

| Data Type | Stale Time | Notes |
|-----------|------------|-------|
| Chart of Accounts | 10 minutes | Rarely changes |
| Budgets | 5 minutes | Changes during planning |
| Transactions | 1 minute | Active data entry |
| Dashboard widgets | 30 seconds | Real-time feel |
| User profile | 5 minutes | Rarely changes |
| AI responses | 0 (no cache) | Always fresh |

---

## Error Handling

### API Error Response Format

```typescript
interface APIError {
  success: false;
  error: {
    code: string;        // Machine-readable code
    message: string;     // User-friendly message
    details?: any;       // Additional context
  };
}
```

### Common Error Codes

| Code | HTTP Status | Meaning | UI Action |
|------|-------------|---------|-----------|
| `VALIDATION_ERROR` | 400 | Invalid input | Show field-level errors |
| `UNAUTHORIZED` | 401 | Not logged in | Redirect to login |
| `FORBIDDEN` | 403 | No permission | Show permission error |
| `NOT_FOUND` | 404 | Resource missing | Show 404 page |
| `DUPLICATE` | 409 | Already exists | Show conflict message |
| `RATE_LIMIT` | 429 | Too many requests | Show retry message |
| `SERVER_ERROR` | 500 | Server issue | Show generic error + retry |

### Error Handling Patterns

```typescript
// Global error handler (axios interceptor)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh token
      const newToken = await refreshAccessToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      }
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Component-level handling
const { mutate, error } = useCreateBudget();
if (error?.response?.data?.error?.code === 'DUPLICATE') {
  showToast('A budget with this name already exists');
}
```

### Validation Error Display

```typescript
// Backend returns:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "name": "Name is required",
      "amount": "Amount must be positive"
    }
  }
}

// Frontend maps to form errors:
<FormField
  name="name"
  error={errors?.details?.name}
/>
```

---

## Integration Patterns

### API Request Headers

```typescript
// Required headers for all authenticated requests
{
  "Authorization": "Bearer <access_token>",
  "X-Organization-Id": "<current_organization_id>",
  "Content-Type": "application/json",
  "X-Request-Id": "<unique_request_id>"  // Optional, for tracing
}
```

### Pagination Pattern

```typescript
// Request
GET /api/v1/tracking/transactions?page=1&limit=20&sortBy=date&sortOrder=desc

// Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 10,
    "totalCount": 200,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Filtering Pattern

```typescript
// Common filter parameters
GET /api/v1/tracking/expenses?
  status=pending_approval&
  dateFrom=2024-01-01&
  dateTo=2024-01-31&
  category=software&
  minAmount=100&
  maxAmount=1000
```

### Polling for Real-Time Updates

```typescript
// For dashboard widgets
const { data } = useQuery({
  queryKey: ['dashboard-metrics'],
  queryFn: fetchDashboardMetrics,
  refetchInterval: 30000, // 30 seconds
});

// For AI processing status
const { data } = useQuery({
  queryKey: ['document-parse-status', jobId],
  queryFn: () => checkParseStatus(jobId),
  refetchInterval: (data) =>
    data?.status === 'processing' ? 2000 : false,
});
```

### File Upload Pattern

```typescript
// Receipts, documents, bank statements
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'receipt');

await api.post('/api/v1/tracking/expenses/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

### WebSocket (Future Enhancement)

```typescript
// Real-time notifications
const socket = io('/notifications', {
  auth: { token: accessToken },
});

socket.on('expense-approved', (data) => {
  showNotification(`Expense "${data.description}" was approved`);
  queryClient.invalidateQueries(['expenses']);
});
```

---

## Appendix: Quick Reference

### API Base URL
```
Development: http://localhost:5000/api/v1
Production: https://api.scaleup-horizon.com/api/v1
```

### Common Endpoints

| Purpose | Method | Endpoint |
|---------|--------|----------|
| Login | POST | `/auth/login` |
| Get current user | GET | `/auth/me` |
| List organizations | GET | `/organizations` |
| Switch organization | POST | `/organizations/:id/switch` |
| Get chart of accounts | GET | `/chart-of-accounts` |
| List budgets | GET | `/planning/budgets` |
| List transactions | GET | `/tracking/transactions` |
| Get runway | GET | `/projection/runway` |
| Get health score | GET | `/analysis/health-score` |
| Ask AI copilot | POST | `/intelligence/copilot/query` |

### Date Formats

- API uses ISO 8601: `2024-01-15T10:30:00.000Z`
- Display format configurable per organization
- Common formats: `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`

### Currency Handling

- All amounts stored in cents (integer)
- Display formatted based on organization currency
- Default currency: USD

---

## Next Steps for Frontend Team

1. **Setup Project**
   - Initialize React/Next.js project
   - Configure API client with interceptors
   - Setup authentication context

2. **Build Foundation**
   - Login/Register flows
   - Organization context and switcher
   - Global navigation

3. **Core Modules First**
   - Dashboard (key metrics)
   - Chart of Accounts (setup)
   - Transaction tracking

4. **Progressive Enhancement**
   - Add remaining modules
   - Implement AI features
   - Polish and optimize

---

*This document complements the detailed API documentation in the `docs/api/` folder. For endpoint-specific details, request/response schemas, and validation rules, refer to the individual module documentation files.*
