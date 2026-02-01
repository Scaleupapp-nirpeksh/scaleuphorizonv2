# ScaleUp Horizon - Business Workflows & Logic

This document provides detailed business logic, approval workflows, and state management for frontend implementation.

---

## Table of Contents

1. [Authentication Flows](#1-authentication-flows)
2. [Organization Management](#2-organization-management)
3. [Budget Approval Workflow](#3-budget-approval-workflow)
4. [Expense Approval Workflow](#4-expense-approval-workflow)
5. [Fundraising Pipeline](#5-fundraising-pipeline)
6. [Bank Reconciliation Flow](#6-bank-reconciliation-flow)
7. [Revenue Recognition](#7-revenue-recognition)
8. [Runway Calculation Logic](#8-runway-calculation-logic)
9. [Health Score Calculation](#9-health-score-calculation)
10. [AI Feature Workflows](#10-ai-feature-workflows)
11. [ESOP Vesting Logic](#11-esop-vesting-logic)
12. [Reporting Workflows](#12-reporting-workflows)

---

## 1. Authentication Flows

### 1.1 Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      REGISTRATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

User enters:                        Backend validates:
├── email                           ├── Email format
├── password                        ├── Password strength (min 8 chars)
├── firstName                       ├── Email uniqueness
└── lastName                        └── Required fields

                    │
                    ▼
            ┌──────────────┐
            │ Create User  │
            │ (unverified) │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ Send Email   │
            │ Verification │
            └──────────────┘
                    │
                    ▼
    User clicks link → POST /auth/verify-email
                    │
                    ▼
            ┌──────────────┐
            │  User Now    │
            │  Verified    │
            └──────────────┘
```

**Frontend Implementation:**
```typescript
// 1. Registration form submission
const register = async (data: RegisterData) => {
  const response = await api.post('/auth/register', data);
  // Show "Check your email" message
  navigate('/check-email');
};

// 2. Email verification page
// Route: /verify-email?token=xxx
useEffect(() => {
  const verifyEmail = async () => {
    await api.post('/auth/verify-email', { token });
    navigate('/login?verified=true');
  };
  verifyEmail();
}, [token]);
```

### 1.2 Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
└─────────────────────────────────────────────────────────────────┘

POST /auth/login
├── email
└── password
        │
        ▼
    ┌────────────────────────────────────────┐
    │           Validation                    │
    │ ├── Email exists?                       │
    │ ├── Password correct?                   │
    │ ├── Email verified?                     │
    │ └── Account active?                     │
    └────────────────────────────────────────┘
        │ Success                    │ Failure
        ▼                            ▼
    ┌──────────────┐         ┌──────────────┐
    │ Return:      │         │ Return Error │
    │ - user       │         │ - code       │
    │ - accessToken│         │ - message    │
    │ - refreshTok │         └──────────────┘
    └──────────────┘
        │
        ▼
    ┌──────────────────────────────────────────┐
    │ Get user's organizations                  │
    │ If 0: Redirect to create org             │
    │ If 1: Auto-select that org               │
    │ If >1: Show org selector                 │
    └──────────────────────────────────────────┘
```

**Token Lifecycle:**
```
Access Token: 15 minutes
Refresh Token: 7 days

┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. API call returns 401
        │
        ▼
2. Check if refresh token exists
        │ Yes                        │ No
        ▼                            ▼
3. POST /auth/refresh-token    Redirect to login
        │
        ▼
4. Receive new access token
        │
        ▼
5. Retry original request
```

### 1.3 Password Reset Flow

```
1. POST /auth/forgot-password { email }
   └── Backend sends reset email with token

2. User clicks link → /reset-password?token=xxx

3. POST /auth/reset-password { token, newPassword }
   └── Password updated, all sessions invalidated

4. Redirect to login
```

---

## 2. Organization Management

### 2.1 Organization Creation

```
┌─────────────────────────────────────────────────────────────────┐
│                 ORGANIZATION CREATION                            │
└─────────────────────────────────────────────────────────────────┘

Required Fields:
├── name (unique, becomes slug)
└── (creator automatically becomes owner)

Optional Fields:
├── industry (enum: Technology, Healthcare, Finance, etc.)
├── size (enum: 1-10, 11-50, 51-200, 201-500, 500+)
├── foundedYear
├── website
├── logo (URL)
└── settings
    ├── fiscalYearStart (1-12, default: 1)
    ├── currency (default: USD)
    ├── timezone (default: UTC)
    └── dateFormat (default: MM/DD/YYYY)
```

**Post-Creation Flow:**
```
Organization Created
        │
        ▼
Auto-create Membership (role: owner)
        │
        ▼
Prompt: "Seed Chart of Accounts?"
        │
    ┌───┴───┐
   Yes     No
    │       │
    ▼       ▼
 Seed CoA  Skip
    │       │
    └───┬───┘
        ▼
Redirect to Dashboard
```

### 2.2 Member Invitation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVITATION FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. Owner/Admin invites member
   POST /organizations/:id/members
   { email, role }
        │
        ▼
2. Check if user exists
        │
    ┌───┴───┐
  Exists  New User
    │         │
    ▼         ▼
Create    Send invite
Membership  email
(pending)     │
    │         ▼
    │    User registers
    │         │
    └────┬────┘
         ▼
3. User accepts invitation
   POST /organizations/accept-invitation
   { token }
         │
         ▼
4. Membership status → active
         │
         ▼
5. User can access organization
```

### 2.3 Role Hierarchy & Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                                │
└─────────────────────────────────────────────────────────────────┘

        ┌───────────┐
        │   OWNER   │ (Full control, can delete org)
        └─────┬─────┘
              │ can manage
        ┌─────▼─────┐
        │   ADMIN   │ (Can manage members, approve budgets)
        └─────┬─────┘
              │ can manage
        ┌─────▼─────┐
        │  MEMBER   │ (Can create/edit data)
        └─────┬─────┘
              │ can manage
        ┌─────▼─────┐
        │  VIEWER   │ (Read-only access)
        └───────────┘
```

**Permission Matrix for UI:**

| Feature | Owner | Admin | Member | Viewer |
|---------|-------|-------|--------|--------|
| View dashboards | ✓ | ✓ | ✓ | ✓ |
| Create transactions | ✓ | ✓ | ✓ | ✗ |
| Create budgets | ✓ | ✓ | ✓ | ✗ |
| Approve budgets | ✓ | ✓ | ✗ | ✗ |
| Manage team | ✓ | ✓ | ✗ | ✗ |
| Organization settings | ✓ | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ |

---

## 3. Budget Approval Workflow

### 3.1 Budget States

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUDGET STATUS MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  DRAFT   │ ◄──────────────────────────┐
    └────┬─────┘                            │
         │ submit()                    reject()
         ▼                                  │
    ┌──────────┐                            │
    │ PENDING  │ ───────────────────────────┤
    └────┬─────┘                            │
         │ approve()                        │
         ▼                                  │
    ┌──────────┐                            │
    │ APPROVED │                            │
    └────┬─────┘                            │
         │ activate()                       │
         ▼                                  │
    ┌──────────┐                            │
    │  ACTIVE  │                            │
    └────┬─────┘                            │
         │ archive()                        │
         ▼                                  │
    ┌──────────┐                            │
    │ ARCHIVED │                            │
    └──────────┘
```

### 3.2 Budget Operations

```typescript
// Allowed operations by status
const budgetOperations = {
  draft: {
    allowedActions: ['edit', 'delete', 'submit', 'clone'],
    canEditItems: true,
  },
  pending: {
    allowedActions: ['approve', 'reject'],
    canEditItems: false, // Locked during approval
  },
  approved: {
    allowedActions: ['activate', 'clone'],
    canEditItems: false,
  },
  active: {
    allowedActions: ['archive', 'clone'],
    canEditItems: false,
  },
  archived: {
    allowedActions: ['clone'], // Can only clone
    canEditItems: false,
  },
};
```

### 3.3 Budget Approval UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Budget: Q1 2024 Operating Budget               Status: PENDING │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Submitted by: John Doe                                         │
│  Submitted on: Jan 15, 2024 at 2:30 PM                         │
│                                                                 │
│  Total Amount: $250,000                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Budget Items                                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Payroll            │ $150,000 │ ████████████████░░░ 60% │   │
│  │ Software           │  $30,000 │ ████░░░░░░░░░░░░░░░ 12% │   │
│  │ Marketing          │  $40,000 │ █████░░░░░░░░░░░░░░ 16% │   │
│  │ Office             │  $20,000 │ ███░░░░░░░░░░░░░░░░  8% │   │
│  │ Other              │  $10,000 │ █░░░░░░░░░░░░░░░░░░  4% │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │  APPROVE ✓  │  │  REJECT ✗   │                              │
│  └─────────────┘  └─────────────┘                              │
│                                                                 │
│  Comments: _________________________________________________   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Rejection Handling

```typescript
// When rejecting a budget
POST /planning/budgets/:id/reject
{
  reason: "Marketing budget too high. Please reduce by 20%."
}

// Budget returns to DRAFT status
// Frontend shows:
// - Rejection reason
// - Who rejected it
// - When it was rejected
// - "Edit & Resubmit" button
```

---

## 4. Expense Approval Workflow

### 4.1 Expense States

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXPENSE STATUS MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  DRAFT   │ ◄──────────────────────────┐
    └────┬─────┘                            │
         │ submit()                    reject()
         ▼                                  │
    ┌───────────────┐                       │
    │    PENDING    │ ──────────────────────┤
    │   APPROVAL    │                       │
    └───────┬───────┘                       │
            │ approve()
            ▼
    ┌──────────┐
    │ APPROVED │
    └────┬─────┘
         │ markPaid()
         ▼
    ┌──────────┐
    │   PAID   │ ──► Creates Transaction automatically
    └──────────┘
```

### 4.2 Expense Submission Flow

```
1. Employee creates expense
   └── Status: DRAFT
   └── Attaches receipt (optional)
   └── Selects category (Chart of Accounts)
   └── Enters amount, date, description

2. Employee submits for approval
   POST /tracking/expenses/:id/submit
   └── Status: PENDING_APPROVAL
   └── Records submittedBy, submittedAt

3. Approver sees in approval queue
   GET /tracking/expenses/pending-approvals

4. Approver reviews and decides:

   APPROVE:
   POST /tracking/expenses/:id/approve
   └── Status: APPROVED
   └── Records approvedBy, approvedAt

   REJECT:
   POST /tracking/expenses/:id/reject
   { reason: "Receipt unclear, please resubmit" }
   └── Status: DRAFT
   └── Records rejectedBy, rejectionReason

5. Finance marks as paid
   POST /tracking/expenses/:id/pay
   {
     paymentMethod: "bank_transfer",
     paymentReference: "CHK-123456"
   }
   └── Status: PAID
   └── Auto-creates Transaction linked to expense
```

### 4.3 Approval Queue UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Pending Approvals (5)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▢ AWS Cloud Services     │ $2,450.00 │ Software       │   │
│  │   Submitted by Jane on Jan 15                           │   │
│  │   [📎 Receipt]                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▢ Team Dinner            │   $350.00 │ Meals & Ent    │   │
│  │   Submitted by Mike on Jan 14                           │   │
│  │   [📎 Receipt]                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Selected: 2                                                    │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │  Approve Selected │  │  Reject Selected  │                  │
│  └───────────────────┘  └───────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Fundraising Pipeline

### 5.1 Investor Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVESTOR PIPELINE                             │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ PROSPECT │ (Initial contact, cold lead)
    └────┬─────┘
         │ beginDiscussion()
         ▼
    ┌─────────────┐
    │    IN       │ (Actively talking, term sheet negotiation)
    │ DISCUSSION  │
    └──────┬──────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐ ┌──────────┐
│COMMITTED │ │  PASSED  │ (Declined to invest)
└────┬─────┘ └──────────┘
     │ receiveInvestment()
     ▼
┌──────────┐
│ INVESTED │ (Money received, shares issued)
└──────────┘
```

### 5.2 Funding Round Lifecycle

```
1. CREATE ROUND
   POST /fundraising/rounds
   {
     name: "Seed Round",
     type: "seed",
     targetAmount: 1500000,
     pricePerShare: 1.00,
     preMoneyValuation: 5000000
   }
   └── Status: PLANNING

2. OPEN ROUND
   POST /fundraising/rounds/:id/open
   └── Status: ACTIVE
   └── Set openDate

3. ADD INVESTORS
   POST /fundraising/investors
   {
     name: "Acme Ventures",
     roundId: "xxx",
     type: "vc"
   }

4. INVESTOR COMMITS
   PUT /fundraising/investors/:id
   {
     status: "committed",
     totalCommitted: 500000
   }

5. CREATE TRANCHES (payment schedule)
   POST /fundraising/investors/:id/tranches
   {
     amount: 250000,
     scheduledDate: "2024-02-01"
   }

6. RECEIVE TRANCHE
   PUT /fundraising/investors/:id/tranches/:tid
   {
     status: "received",
     receivedDate: "2024-02-01"
   }
   └── Updates Cap Table automatically
   └── Updates Round raisedAmount

7. CLOSE ROUND
   POST /fundraising/rounds/:id/close
   └── Status: CLOSED
   └── Set closeDate
```

### 5.3 Cap Table Update Flow

```
When investment is received:

┌──────────────────────────────────────────────────────────────────┐
│  Investment Received                                              │
│  ├── Investor: Acme Ventures                                     │
│  ├── Amount: $500,000                                            │
│  ├── Price per share: $1.00                                      │
│  └── Shares issued: 500,000                                      │
└──────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  Cap Table Entry Created                                          │
│  ├── Shareholder: Acme Ventures                                   │
│  ├── ShareholderType: investor                                    │
│  ├── ShareClass: preferred_a                                      │
│  ├── TransactionType: issuance                                    │
│  ├── Shares: 500,000                                              │
│  └── Round: Seed Round                                            │
└──────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  Ownership Recalculated                                           │
│                                                                   │
│  Before:                      After:                              │
│  ├── Founders: 100%           ├── Founders: 75%                   │
│                               ├── Investors: 25%                  │
│                               │   └── Acme: 10%                   │
│                               │   └── Others: 15%                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Bank Reconciliation Flow

### 6.1 CSV Import Process

```
┌─────────────────────────────────────────────────────────────────┐
│                     CSV IMPORT FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. Upload CSV
   POST /tracking/bank-accounts/:id/import
   FormData: { file: csv_file }

2. Column Mapping (if needed)
   ┌─────────────────────────────────────────────────────────┐
   │  Map CSV Columns                                        │
   │                                                         │
   │  CSV Column          →   System Field                   │
   │  ─────────────────────────────────────────────────      │
   │  "Trans Date"        →   date                          │
   │  "Description"       →   description                   │
   │  "Amount"           →   amount                         │
   │  "Running Balance"   →   balance (optional)            │
   │                                                         │
   │  [Preview: 5 rows shown]                               │
   │                                                         │
   │  ┌─────────────────┐                                   │
   │  │  Import (245)   │                                   │
   │  └─────────────────┘                                   │
   └─────────────────────────────────────────────────────────┘

3. Deduplication Check
   └── Compare checksum (date + description + amount)
   └── Skip duplicates, report count

4. Bank Transactions Created
   └── Status: UNMATCHED
   └── Ready for reconciliation
```

### 6.2 Transaction Matching

```
┌─────────────────────────────────────────────────────────────────┐
│                   RECONCILIATION STATES                          │
└─────────────────────────────────────────────────────────────────┘

    ┌───────────┐
    │ UNMATCHED │ (Newly imported, no match found)
    └─────┬─────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
┌─────────┐  ┌─────────┐
│ MATCHED │  │ IGNORED │ (User marked as not relevant)
└────┬────┘  └─────────┘
     │
     ▼
┌───────────┐
│RECONCILED │ (Confirmed match, books closed)
└───────────┘
```

### 6.3 Auto-Match Logic

```javascript
// Auto-matching algorithm
function findMatches(bankTransaction) {
  const matches = [];

  // 1. Exact amount match
  const sameAmount = transactions.filter(
    t => Math.abs(t.amount) === Math.abs(bankTransaction.amount)
  );

  // 2. Date within range (±7 days)
  const dateRange = sameAmount.filter(
    t => Math.abs(daysBetween(t.date, bankTransaction.date)) <= 7
  );

  // 3. Description similarity (fuzzy match)
  dateRange.forEach(t => {
    const similarity = calculateSimilarity(
      t.description,
      bankTransaction.description
    );
    if (similarity > 0.6) {
      matches.push({ transaction: t, confidence: similarity * 100 });
    }
  });

  return matches.sort((a, b) => b.confidence - a.confidence);
}
```

### 6.4 Reconciliation UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Bank Reconciliation - Checking Account ****4521                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Unmatched Transactions (23)                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Jan 15 | AWS CLOUD SERVICES    | -$2,450.00            │   │
│  │                                                         │   │
│  │ Suggested Match (92% confidence):                       │   │
│  │ ┌─────────────────────────────────────────────────┐    │   │
│  │ │ Jan 14 | AWS - Cloud Services | $2,450.00       │    │   │
│  │ │ Category: Software | Created by Jane            │    │   │
│  │ └─────────────────────────────────────────────────┘    │   │
│  │                                                         │   │
│  │ [✓ Match] [✗ Ignore] [Create New Transaction]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Revenue Recognition

### 7.1 Revenue Entry Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   REVENUE ENTRY STATES                           │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ PENDING │ (Invoice sent, awaiting payment)
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐ ┌───────────┐
│ RECEIVED │ │ CANCELLED │
└────┬─────┘ └───────────┘
     │
     ▼
Creates Transaction (type: income)
```

### 7.2 Subscription Revenue Tracking

```typescript
// MRR Calculation Logic
interface MRRCalculation {
  // Current active subscriptions
  totalMRR: number;

  // Breakdown
  newMRR: number;        // New customers this month
  expansionMRR: number;  // Upgrades from existing
  contractionMRR: number;// Downgrades
  churnedMRR: number;    // Cancelled subscriptions

  // Net change
  netNewMRR: number;     // new + expansion - contraction - churned

  // Growth rate
  mrrGrowthRate: number; // (current - previous) / previous * 100
}

// Customer subscription status affects MRR
const subscriptionStatuses = {
  active: 'Counts toward MRR',
  trial: 'Does not count (until converted)',
  paused: 'Does not count (temporarily)',
  churned: 'Does not count (lost)'
};
```

### 7.3 Revenue Recognition UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue Dashboard                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MRR: $52,450        ARR: $629,400                             │
│  ▲ 8.2% vs last month                                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │        MRR Breakdown                                       │ │
│  │                                                            │ │
│  │  New MRR:        +$5,200  ████████████                    │ │
│  │  Expansion:      +$2,100  █████                           │ │
│  │  Contraction:    -$800    ██                              │ │
│  │  Churned:        -$2,100  █████                           │ │
│  │  ─────────────────────────────────                        │ │
│  │  Net New MRR:    +$4,400                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Active Customers: 127 (↑ 12)                                   │
│  Churned This Month: 5 (3.9% churn rate)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Runway Calculation Logic

### 8.1 Core Calculation

```typescript
interface RunwayCalculation {
  // Inputs
  currentCash: number;      // Total cash in bank accounts
  monthlyBurnRate: number;  // Average monthly expenses
  monthlyRevenue: number;   // Average monthly revenue

  // Calculations
  netBurnRate: number;      // burnRate - revenue
  runwayMonths: number;     // currentCash / netBurnRate
  runwayEndDate: Date;      // today + runwayMonths

  // Status
  status: 'critical' | 'warning' | 'healthy';
}

// Status thresholds
function getRunwayStatus(months: number): string {
  if (months < 3) return 'critical';   // Urgent action needed
  if (months < 6) return 'warning';    // Plan fundraise
  return 'healthy';                     // Comfortable
}
```

### 8.2 What-If Scenarios

```typescript
// User can adjust assumptions
interface RunwayWhatIf {
  // Adjustments (as percentages)
  revenueGrowthRate: number;     // e.g., 10% monthly growth
  expenseReductionRate: number;  // e.g., -20% reduction
  oneTimeInfusion: number;       // e.g., $500,000 investment

  // Specific adjustments
  delayHiring: {
    months: number;              // Delay all planned hires
    savingsPerMonth: number;     // Calculated savings
  };

  reducedMarketing: {
    percentage: number;          // Cut marketing by X%
    savingsPerMonth: number;
  };
}

// Calculate new runway with adjustments
function calculateAdjustedRunway(
  current: RunwayCalculation,
  whatIf: RunwayWhatIf
): RunwayCalculation {
  // Apply adjustments and recalculate
}
```

### 8.3 Runway Dashboard UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Runway Calculator                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Cash: $1,250,000                                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    RUNWAY                                  │ │
│  │                                                            │ │
│  │                    8.5 months                              │ │
│  │            ━━━━━━━━━━━━━━━●━━━━━━━━━━                     │ │
│  │            3           6           12                      │ │
│  │         Critical    Warning     Healthy                    │ │
│  │                                                            │ │
│  │  Status: WARNING - Plan your next fundraise               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Monthly Burn: $180,000                                         │
│  Monthly Revenue: $50,000                                       │
│  Net Burn: $130,000                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  What-If Analysis                                        │   │
│  │                                                          │   │
│  │  Reduce expenses by:  [-20%]  ───●────────────          │   │
│  │  Revenue growth:      [+10%]  ────────●───────          │   │
│  │  Delay hiring:        [3 mo]  ────●───────────          │   │
│  │                                                          │   │
│  │  Adjusted Runway: 14.2 months (+5.7 mo)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Health Score Calculation

### 9.1 Score Components

```typescript
interface HealthScore {
  overall: number;  // 0-100

  components: {
    runway: {
      score: number;       // 0-100
      weight: 0.30;        // 30%
      factors: {
        monthsRemaining: number;
        burnTrend: 'improving' | 'stable' | 'worsening';
      };
    };

    revenue: {
      score: number;       // 0-100
      weight: 0.25;        // 25%
      factors: {
        growthRate: number;
        consistency: number;  // Low variance = high score
      };
    };

    burnRate: {
      score: number;       // 0-100
      weight: 0.20;        // 20%
      factors: {
        efficiency: number;   // Revenue / Burn ratio
        budgetAdherence: number;
      };
    };

    growth: {
      score: number;       // 0-100
      weight: 0.15;        // 15%
      factors: {
        revenueGrowth: number;
        customerGrowth: number;
      };
    };

    market: {
      score: number;       // 0-100
      weight: 0.10;        // 10%
      factors: {
        fundingEnvironment: number;  // External data
        competitivePosition: number;
      };
    };
  };

  status: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}
```

### 9.2 Score Thresholds

```typescript
const healthScoreThresholds = {
  excellent: { min: 80, color: 'green' },
  good: { min: 60, max: 79, color: 'blue' },
  fair: { min: 40, max: 59, color: 'yellow' },
  poor: { min: 0, max: 39, color: 'red' },
};
```

### 9.3 Health Score UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Financial Health Score                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         ┌────────────────────────────────────────┐              │
│         │              72                         │              │
│         │             GOOD                        │              │
│         │                                         │              │
│         │    ━━━━━━━━━━━━━━━━●━━━━━━             │              │
│         │    0     40     60     80    100       │              │
│         │   Poor  Fair   Good  Excellent         │              │
│         └────────────────────────────────────────┘              │
│                                                                 │
│  Components:                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Runway (30%)      │ ████████░░ │ 78  │ 8.5 mo remaining │   │
│  │ Revenue (25%)     │ ███████░░░ │ 65  │ +12% growth      │   │
│  │ Burn Rate (20%)   │ ████████░░ │ 80  │ On budget        │   │
│  │ Growth (15%)      │ ██████░░░░ │ 55  │ Moderate         │   │
│  │ Market (10%)      │ ███████░░░ │ 70  │ Favorable        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recommendations:                                                │
│  • Increase runway - consider fundraising in next 3 months      │
│  • Revenue growth is solid - maintain current strategies        │
│  • Consider accelerating customer acquisition                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. AI Feature Workflows

### 10.1 Copilot Query Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COPILOT QUERY FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. User asks question
   "What's our burn rate compared to last month?"
           │
           ▼
2. Query Classification
   └── Type: comparison
           │
           ▼
3. Context Gathering
   ├── Current month expenses
   ├── Last month expenses
   ├── Category breakdown
   └── Any relevant plans/budgets
           │
           ▼
4. AI Processing (GPT-4)
   └── Prompt includes org context + query
           │
           ▼
5. Response Generated
   "Your burn rate this month is $145,000, which is 12% higher
    than last month ($129,000). The increase is primarily due to:
    - Marketing: +$8,000 (new ad campaign)
    - Payroll: +$5,000 (new hire started)
    - Software: +$3,000 (annual renewal)"
           │
           ▼
6. Store in AI Query History
   └── For analytics and conversation continuity
           │
           ▼
7. User can rate response (thumbs up/down)
   └── Feedback stored for improvement
```

### 10.2 Transaction Categorization

```
┌─────────────────────────────────────────────────────────────────┐
│                 AUTO-CATEGORIZATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Input: "AMZN WEB SERVICES AWS.AMAZON.CO"
Amount: -$2,450.00
           │
           ▼
AI Analysis:
├── Vendor pattern: "AWS" → Amazon Web Services
├── Common category: Cloud Infrastructure
├── Amount pattern: Monthly recurring
└── Historical: 5 previous similar transactions → Software
           │
           ▼
Output:
{
  category: "software",
  subcategory: "cloud_infrastructure",
  confidence: 0.95,
  accountSuggestion: "6100 - Software & Subscriptions"
}
           │
           ▼
UI Shows:
┌─────────────────────────────────────────────────────────┐
│  Suggested Category: Software (95% confident)           │
│  Account: 6100 - Software & Subscriptions               │
│                                                         │
│  [✓ Accept]  [✎ Change]                                 │
└─────────────────────────────────────────────────────────┘
```

### 10.3 Meeting Prep Brief

```
┌─────────────────────────────────────────────────────────────────┐
│                 MEETING PREP FLOW                                │
└─────────────────────────────────────────────────────────────────┘

Input:
├── Meeting with: Acme Ventures (investor)
├── Meeting type: Investor sync
└── Meeting date: Tomorrow
           │
           ▼
AI Gathers:
├── Investor info from database
├── Previous meeting notes
├── Recent company metrics
├── Fundraising status
└── Recent milestones
           │
           ▼
AI Generates Prep Brief:
┌─────────────────────────────────────────────────────────┐
│  MEETING PREP: Acme Ventures                            │
│                                                         │
│  INVESTOR OVERVIEW                                      │
│  • Sarah Chen, Partner                                  │
│  • Focus: B2B SaaS, Series A-B                         │
│  • Notable investments: Stripe, Notion                  │
│                                                         │
│  PREVIOUS INTERACTIONS                                  │
│  • Oct 15: Initial intro call - interested in market   │
│  • Nov 2: Product demo - asked about CAC               │
│                                                         │
│  KEY METRICS TO HIGHLIGHT                               │
│  • MRR: $52K (↑15% since last meeting)                 │
│  • Customer growth: +18 customers                       │
│  • CAC improved: $1,200 → $980                         │
│                                                         │
│  SUGGESTED TALKING POINTS                               │
│  1. Recent enterprise customer wins                     │
│  2. Improved unit economics                             │
│  3. Product roadmap for Q2                              │
│                                                         │
│  ANTICIPATED QUESTIONS                                  │
│  Q: What's your path to profitability?                 │
│  A: With current growth, break-even in 18 months...    │
│                                                         │
│  WATCH OUT FOR                                          │
│  • Don't mention competitor lawsuit (sensitive)         │
│  • They may ask about co-founder departure              │
└─────────────────────────────────────────────────────────┘
```

---

## 11. ESOP Vesting Logic

### 11.1 Vesting Calculation

```typescript
interface VestingSchedule {
  // Standard: 4-year with 1-year cliff
  totalShares: number;
  vestingMonths: number;      // 48 months
  cliffMonths: number;        // 12 months
  grantDate: Date;

  // Calculated
  vestedShares: number;
  unvestedShares: number;
  vestingPercent: number;
  nextVestingDate: Date;
  fullyVestedDate: Date;
}

function calculateVesting(grant: ESOPGrant): VestingSchedule {
  const monthsEmployed = getMonthsBetween(grant.grantDate, today);

  // Before cliff: nothing vested
  if (monthsEmployed < grant.cliffMonths) {
    return {
      vestedShares: 0,
      unvestedShares: grant.totalShares,
      vestingPercent: 0,
      nextVestingDate: addMonths(grant.grantDate, grant.cliffMonths),
    };
  }

  // After cliff: linear vesting
  const vestedMonths = Math.min(monthsEmployed, grant.vestingMonths);
  const vestingPercent = (vestedMonths / grant.vestingMonths) * 100;
  const vestedShares = Math.floor(grant.totalShares * (vestedMonths / grant.vestingMonths));

  return {
    vestedShares,
    unvestedShares: grant.totalShares - vestedShares,
    vestingPercent,
    nextVestingDate: /* next month if not fully vested */,
    fullyVestedDate: addMonths(grant.grantDate, grant.vestingMonths),
  };
}
```

### 11.2 Vesting Timeline UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Employee Option Statement - John Doe                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Grant: 10,000 shares at $1.00                                  │
│  Grant Date: Jan 1, 2023                                        │
│  Vesting: 4-year with 1-year cliff                              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   VESTING TIMELINE                         │ │
│  │                                                            │ │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ │
│  │  ├────────────────┼────────────────────────────────────┤  │ │
│  │  Grant          Cliff                              Vest   │ │
│  │  Jan 2023       Jan 2024                           2027   │ │
│  │                                                            │ │
│  │  Currently: 37.5% vested (18 months)                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Vested:     3,750 shares  │ Value: $3,750                     │
│  Unvested:   6,250 shares  │ Value: $6,250 (if fully vested)   │
│                                                                 │
│  Next Vesting: Aug 1, 2024 (+208 shares)                        │
│  Fully Vested: Jan 1, 2027                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Reporting Workflows

### 12.1 Investor Report Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                 INVESTOR REPORT FLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. Start Report
   └── Select template (Monthly Update, Quarterly Review)
   └── Select period (January 2024)
           │
           ▼
2. AI Generates Draft
   ├── Executive summary
   ├── Key metrics with highlights
   ├── Milestone updates
   └── Challenges and asks
           │
           ▼
3. Human Review & Edit
   └── Add commentary
   └── Adjust tone
   └── Add/remove sections
           │
           ▼
4. Preview & Finalize
   └── PDF preview
   └── Mark as ready
           │
           ▼
5. Send to Investors
   ├── Select recipients
   ├── Schedule or send now
   └── Track opens/clicks
```

### 12.2 Dashboard Widget Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│  Configure Widget                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Widget Type: Line Chart ▼                                      │
│                                                                 │
│  Data Source: Revenue ▼                                         │
│                                                                 │
│  Time Range:                                                    │
│  ○ Last 7 days                                                  │
│  ○ Last 30 days                                                 │
│  ● Last 12 months                                               │
│  ○ Custom range                                                 │
│                                                                 │
│  Comparison:                                                    │
│  ☑ Compare to previous period                                   │
│  ☐ Compare to budget                                            │
│                                                                 │
│  Visualization:                                                 │
│  ☑ Show data labels                                             │
│  ☑ Show legend                                                  │
│  ☐ Stacked                                                      │
│                                                                 │
│  Refresh: Every 30 seconds ▼                                    │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │     Preview     │  │      Save       │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary: Key Business Rules

1. **Multi-tenancy is fundamental** - All data filtered by organization
2. **Approval workflows are status-based** - Clear state machines
3. **Chart of Accounts is central** - All financial data links here
4. **Soft deletes preserve history** - isArchived flag, never hard delete
5. **Calculations are derived** - MRR, runway, health score recalculated
6. **AI enhances, doesn't replace** - Human review always possible
7. **Real-time data is expensive** - Use appropriate cache times
8. **Permissions cascade** - Owner > Admin > Member > Viewer

---

*For API endpoint details, see the individual module documentation (01-auth.md through 11-intelligence.md).*
