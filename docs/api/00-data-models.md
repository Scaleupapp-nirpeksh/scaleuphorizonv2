# ScaleUp Horizon - Data Models & Relationships

This document provides comprehensive data model documentation for frontend developers, including TypeScript interfaces, relationships, and validation rules.

---

## Table of Contents

1. [Common Patterns](#common-patterns)
2. [Core Models](#core-models)
3. [Planning Models](#planning-models)
4. [Tracking Models](#tracking-models)
5. [Fundraising Models](#fundraising-models)
6. [Projection Models](#projection-models)
7. [Analysis Models](#analysis-models)
8. [Reporting Models](#reporting-models)
9. [Operations Models](#operations-models)
10. [Intelligence Models](#intelligence-models)
11. [Entity Relationship Diagram](#entity-relationship-diagram)

---

## Common Patterns

### Base Entity Fields

All entities in the system include these common fields:

```typescript
interface BaseEntity {
  _id: string;                    // MongoDB ObjectId as string
  organization: string;           // Organization ID (tenant scoping)
  createdBy: string;              // User ID who created
  updatedBy?: string;             // User ID who last updated
  createdAt: string;              // ISO date string
  updatedAt: string;              // ISO date string
  isArchived: boolean;            // Soft delete flag
  archivedAt?: string;            // When archived
  archivedBy?: string;            // Who archived
}
```

### Common Enums

```typescript
// Used across multiple modules
type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'SGD' | 'JPY';

type FiscalPeriod = 'monthly' | 'quarterly' | 'annual';

type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'archived';

type Priority = 'critical' | 'high' | 'medium' | 'low';

type Confidence = 'high' | 'medium' | 'low';
```

### Pagination Response

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

---

## Core Models

### User

```typescript
interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Extended user info (returned from /auth/me)
interface CurrentUser extends User {
  organizations: OrganizationSummary[];
  currentOrganization?: string;  // Active org ID
}

interface OrganizationSummary {
  _id: string;
  name: string;
  role: MembershipRole;
}
```

### Organization

```typescript
interface Organization {
  _id: string;
  name: string;
  slug: string;                    // URL-safe identifier
  owner: string;                   // User ID
  industry?: OrganizationIndustry;
  size?: OrganizationSize;
  foundedYear?: number;
  website?: string;
  logo?: string;                   // URL
  description?: string;
  settings: OrganizationSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type OrganizationIndustry =
  | 'technology'
  | 'healthcare'
  | 'finance'
  | 'retail'
  | 'manufacturing'
  | 'education'
  | 'real_estate'
  | 'media'
  | 'other';

type OrganizationSize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

interface OrganizationSettings {
  fiscalYearStart: number;         // 1-12 (month)
  currency: Currency;
  timezone: string;                // e.g., 'America/New_York'
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}
```

### Membership

```typescript
interface Membership {
  _id: string;
  organization: string;
  user: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}

type MembershipRole = 'owner' | 'admin' | 'member' | 'viewer';
type MembershipStatus = 'active' | 'pending' | 'suspended';

// Populated version for team list
interface MembershipWithUser extends Membership {
  user: User;
}
```

### Account (Chart of Accounts)

```typescript
interface Account {
  _id: string;
  organization: string;
  code: string;                    // e.g., '1000', '6100'
  name: string;
  description?: string;
  type: AccountType;
  subtype: AccountSubtype;
  parentAccount?: string;          // Parent account ID for hierarchy
  isActive: boolean;
  balance: number;                 // Current balance (calculated)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

// Subtypes vary by type
type AccountSubtype =
  // Asset subtypes
  | 'cash' | 'accounts_receivable' | 'inventory' | 'prepaid' | 'fixed_asset' | 'other_asset'
  // Liability subtypes
  | 'accounts_payable' | 'credit_card' | 'accrued' | 'short_term_debt' | 'long_term_debt' | 'other_liability'
  // Equity subtypes
  | 'common_stock' | 'preferred_stock' | 'retained_earnings' | 'other_equity'
  // Revenue subtypes
  | 'subscription' | 'services' | 'product_sales' | 'other_revenue'
  // Expense subtypes
  | 'payroll' | 'benefits' | 'software' | 'cloud' | 'marketing' | 'sales'
  | 'office' | 'legal' | 'professional' | 'travel' | 'meals' | 'equipment'
  | 'recruiting' | 'other_expense';

// For tree view
interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
  level: number;
  isLeaf: boolean;
}
```

---

## Planning Models

### Budget

```typescript
interface Budget extends BaseEntity {
  name: string;
  description?: string;
  fiscalYear: number;
  type: BudgetType;
  quarter?: 1 | 2 | 3 | 4;         // If type is 'quarterly'
  month?: number;                   // If type is 'monthly'
  status: BudgetStatus;
  startDate: string;
  endDate: string;
  totalAmount: number;              // Sum of all items
  currency: Currency;

  // Approval tracking
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Version control
  version: number;
  sourceClone?: string;             // If cloned from another budget
}

type BudgetType = 'annual' | 'quarterly' | 'monthly';
type BudgetStatus = 'draft' | 'pending' | 'approved' | 'active' | 'archived';
```

### Budget Item

```typescript
interface BudgetItem extends BaseEntity {
  budget: string;                   // Budget ID
  account: string;                  // Account ID (Chart of Accounts)
  name: string;
  description?: string;
  category: string;                 // Derived from account.subtype
  plannedAmount: number;            // Total planned for period
  priority: Priority;

  // Monthly allocation
  monthlyBreakdown: MonthlyAllocation[];
  allocationMethod: AllocationMethod;

  // For comparison
  actualAmount?: number;            // Populated when viewing vs actuals
  variance?: number;                // Planned - Actual
  variancePercent?: number;
}

interface MonthlyAllocation {
  month: number;                    // 1-12
  amount: number;
  notes?: string;
}

type AllocationMethod = 'even' | 'custom' | 'weighted';
```

### Headcount Plan

```typescript
interface HeadcountPlan extends BaseEntity {
  name: string;
  description?: string;
  fiscalYear: number;
  status: ApprovalStatus;
  startDate: string;
  endDate: string;
  linkedBudget?: string;            // Budget ID

  // Calculated totals
  currentHeadcount: number;
  targetHeadcount: number;
  totalSalaryCost: number;
  totalBenefitsCost: number;
  totalCost: number;
}
```

### Planned Role

```typescript
interface PlannedRole extends BaseEntity {
  headcountPlan: string;            // HeadcountPlan ID
  title: string;
  department: string;
  level: JobLevel;
  employmentType: EmploymentType;
  remoteStatus: RemoteStatus;
  count: number;                    // How many of this role
  baseSalary: number;               // Per person
  benefitsPercentage: number;       // e.g., 25 for 25%
  targetStartDate: string;
  status: RoleStatus;

  // Calculated
  totalCostPerPerson: number;       // Salary + benefits
  totalCost: number;                // totalCostPerPerson * count
  monthlyBreakdown: RoleMonthlyCost[];
}

type JobLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'vp' | 'c_level';
type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'temporary';
type RemoteStatus = 'onsite' | 'hybrid' | 'remote';
type RoleStatus = 'planned' | 'approved' | 'recruiting' | 'filled' | 'cancelled';

interface RoleMonthlyCost {
  month: number;
  salary: number;
  benefits: number;
  total: number;
  headcount: number;                // Cumulative headcount
}
```

### Revenue Plan

```typescript
interface RevenuePlan extends BaseEntity {
  name: string;
  description?: string;
  fiscalYear: number;
  status: ApprovalStatus;
  startDate: string;
  endDate: string;
  revenueModel: RevenueModel;
  linkedBudget?: string;

  // Calculated totals
  totalProjectedRevenue: number;
  streams: RevenueStream[];         // Embedded or separate
}

type RevenueModel = 'subscription' | 'transactional' | 'hybrid' | 'other';
```

### Revenue Stream

```typescript
interface RevenueStream extends BaseEntity {
  revenuePlan: string;              // RevenuePlan ID
  account?: string;                 // Account ID (optional)
  name: string;
  description?: string;
  streamType: RevenueStreamType;
  pricingModel: PricingModel;

  // Projections
  monthlyProjections: RevenueProjection[];
  annualProjected: number;

  // Subscription-specific
  startingMRR?: number;
  projectedMRRGrowth?: number;      // Percentage
  churnRate?: number;               // Percentage

  // Metrics
  estimatedCustomerCount?: number;
  estimatedARPU?: number;           // Average Revenue Per User
  confidence: Confidence;
}

type RevenueStreamType = 'subscription' | 'one_time' | 'recurring' | 'usage_based' | 'services';
type PricingModel = 'fixed' | 'tiered' | 'usage_based' | 'freemium' | 'custom';

interface RevenueProjection {
  month: number;
  projected: number;
  confidence: Confidence;
  notes?: string;
}
```

### Scenario

```typescript
interface Scenario extends BaseEntity {
  name: string;
  description?: string;
  type: ScenarioType;
  fiscalYear: number;
  status: 'draft' | 'active' | 'archived';

  // Linked sources
  linkedBudget?: string;
  linkedHeadcountPlan?: string;
  linkedRevenuePlan?: string;

  // Calculated projections
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetIncome: number;
  projectedRunway?: number;         // Months

  // Adjustments
  adjustments: ScenarioAdjustment[];
}

type ScenarioType = 'base' | 'optimistic' | 'pessimistic' | 'custom';
```

### Scenario Adjustment

```typescript
interface ScenarioAdjustment extends BaseEntity {
  scenario: string;                 // Scenario ID
  targetType: AdjustmentTargetType;
  targetId?: string;                // Reference to budget item, role, etc.
  targetName: string;               // Display name
  adjustmentMethod: AdjustmentMethod;
  adjustmentValue: number;          // Percentage or fixed amount
  originalAnnualAmount: number;
  adjustedAnnualAmount: number;
  impactType: 'increase' | 'decrease' | 'neutral';
  impactCategory: 'revenue' | 'expense' | 'headcount';
}

type AdjustmentTargetType = 'budget_item' | 'revenue_stream' | 'planned_role' | 'custom';
type AdjustmentMethod = 'percentage' | 'fixed' | 'formula';
```

---

## Tracking Models

### Transaction

```typescript
interface Transaction extends BaseEntity {
  account: string;                  // Account ID (Chart of Accounts)
  type: TransactionType;
  amount: number;                   // Always positive
  date: string;
  description: string;
  reference?: string;               // Check #, invoice #, etc.
  category: string;                 // Derived from account.subtype
  paymentMethod?: PaymentMethod;
  status: TransactionStatus;
  source: TransactionSource;

  // Links
  linkedEntities: LinkedEntity[];

  // Reconciliation
  reconciliationDate?: string;
  reconciledBy?: string;

  // Metadata
  tags?: string[];
  notes?: string;
  attachments?: string[];           // URLs
}

type TransactionType = 'income' | 'expense';
type TransactionStatus = 'pending' | 'cleared' | 'reconciled';
type TransactionSource = 'manual' | 'imported' | 'recurring' | 'expense' | 'revenue';
type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'ach' | 'wire' | 'other';

interface LinkedEntity {
  entityType: 'expense' | 'revenue' | 'bank_transaction';
  entityId: string;
}
```

### Expense

```typescript
interface Expense extends BaseEntity {
  account: string;                  // Account ID (expense type)
  vendor?: string;                  // Vendor ID
  amount: number;
  date: string;
  dueDate?: string;
  description: string;
  category: string;                 // Derived from account.subtype

  // Approval workflow
  status: ExpenseStatus;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paidAt?: string;

  // Payment
  paymentMethod?: PaymentMethod;
  paymentReference?: string;

  // Recurring
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  nextOccurrence?: string;
  parentExpense?: string;           // Template expense

  // Attachments
  receipt?: string;                 // Primary receipt URL
  attachments?: string[];

  // Transaction link (created when paid)
  transaction?: string;             // Transaction ID

  // Organization
  department?: string;
  costCenter?: string;
  tags?: string[];
  notes?: string;
}

type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
```

### Vendor

```typescript
interface Vendor extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
  taxId?: string;
  paymentTerms?: string;            // "Net 30", "Due on receipt"
  defaultAccount?: string;          // Default expense account

  // Contact
  contactName?: string;

  // Calculated stats
  totalSpent: number;
  expenseCount: number;
  lastExpenseDate?: string;

  // Metadata
  notes?: string;
  tags?: string[];
  isActive: boolean;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}
```

### Revenue Entry

```typescript
interface RevenueEntry extends BaseEntity {
  account: string;                  // Account ID (revenue type)
  customer?: string;                // Customer ID
  amount: number;
  date: string;
  description: string;
  category: string;
  invoiceNumber?: string;
  revenueType: RevenueType;
  status: RevenueEntryStatus;

  // Receipt
  receivedAt?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;

  // Links
  revenueStream?: string;           // RevenuePlan stream
  transaction?: string;             // Transaction ID (created on receive)

  // Subscription
  subscriptionPeriodStart?: string;
  subscriptionPeriodEnd?: string;

  // Metadata
  tags?: string[];
  notes?: string;
  attachments?: string[];
}

type RevenueType = 'subscription' | 'one_time' | 'recurring' | 'services';
type RevenueEntryStatus = 'pending' | 'received' | 'cancelled';
```

### Customer

```typescript
interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: Address;
  contactName?: string;

  // Subscription
  subscriptionStatus?: SubscriptionStatus;
  monthlyValue: number;             // MRR contribution
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;

  // Calculated stats
  totalRevenue: number;
  revenueEntryCount: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;

  // Metadata
  notes?: string;
  tags?: string[];
  isActive: boolean;
}

type SubscriptionStatus = 'active' | 'churned' | 'paused' | 'trial';
```

### Bank Account

```typescript
interface BankAccount extends BaseEntity {
  name: string;                     // Display name
  bankName: string;
  accountNumber: string;            // Last 4 digits only
  accountType: BankAccountType;
  currency: Currency;

  // Balances
  currentBalance: number;
  lastImportDate?: string;
  lastImportedBalance?: number;

  // Links
  linkedAccount?: string;           // Chart of Accounts asset account

  // Metadata
  description?: string;
  notes?: string;
  isActive: boolean;
}

type BankAccountType = 'checking' | 'savings' | 'credit_card' | 'money_market';
```

### Bank Transaction

```typescript
interface BankTransaction extends BaseEntity {
  bankAccount: string;              // BankAccount ID
  amount: number;                   // Positive = deposit, negative = withdrawal
  date: string;
  description: string;              // From bank statement

  // Categorization
  category?: string;                // User-assigned
  suggestedCategory?: string;       // AI-suggested

  // Reconciliation
  status: BankTransactionStatus;
  matchedTransaction?: string;      // Transaction ID
  matchConfidence?: number;         // 0-100

  // Import metadata
  importedAt: string;
  importBatchId: string;
  rawData?: Record<string, unknown>;

  // Deduplication
  externalId?: string;              // From bank
  checksum?: string;                // For duplicate detection

  // Reconciliation tracking
  reconciledBy?: string;
  reconciledAt?: string;
}

type BankTransactionStatus = 'unmatched' | 'matched' | 'reconciled' | 'ignored';
```

---

## Fundraising Models

### Round (Funding Round)

```typescript
interface Round extends BaseEntity {
  name: string;
  type: RoundType;
  status: RoundStatus;

  // Targets
  targetAmount: number;
  raisedAmount: number;             // Calculated from investors
  minimumInvestment?: number;

  // Valuation
  pricePerShare?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  newSharesIssued?: number;
  shareClass?: ShareClass;

  // Dates
  openDate?: string;
  closeDate?: string;
  targetCloseDate?: string;

  // Lead investor
  leadInvestor?: string;            // Investor ID

  // Terms
  terms?: RoundTerms;

  // Documents
  documents?: RoundDocument[];

  // Metadata
  notes?: string;
}

type RoundType = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'bridge' | 'convertible_note' | 'safe';
type RoundStatus = 'planning' | 'active' | 'closed' | 'cancelled';

interface RoundTerms {
  liquidationPreference?: string;   // "1x", "2x"
  participatingPreferred?: boolean;
  antiDilution?: 'full_ratchet' | 'weighted_average' | 'none';
  boardSeats?: number;
  proRataRights?: boolean;
  informationRights?: boolean;
  votingRights?: string;
  dividends?: string;
  otherTerms?: string[];
}

interface RoundDocument {
  type: 'term_sheet' | 'sha' | 'ssa' | 'side_letter' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
}
```

### Investor

```typescript
interface Investor extends BaseEntity {
  name: string;
  type: InvestorType;
  status: InvestorStatus;

  // Contact
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: Address;
  contactPerson?: ContactPerson;

  // Investment
  linkedRound?: string;             // Round ID
  totalCommitted: number;
  totalInvested: number;
  sharesOwned: number;
  ownershipPercent: number;         // Calculated

  // Tranches
  tranches: Tranche[];

  // Metadata
  notes?: string;
  tags?: string[];
  documents?: InvestorDocument[];
}

type InvestorType = 'angel' | 'vc' | 'corporate' | 'family_office' | 'accelerator' | 'crowdfunding' | 'founder' | 'employee';
type InvestorStatus = 'prospect' | 'in_discussion' | 'committed' | 'invested' | 'passed';

interface ContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
}

interface Tranche {
  _id: string;
  round?: string;                   // Round ID
  amount: number;
  scheduledDate: string;
  receivedDate?: string;
  status: TrancheStatus;
  shareClass?: ShareClass;
  sharesIssued?: number;
  pricePerShare?: number;
  notes?: string;
}

type TrancheStatus = 'scheduled' | 'received' | 'cancelled';

interface InvestorDocument {
  type: 'kyc' | 'agreement' | 'consent' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
}
```

### Cap Table Entry

```typescript
interface CapTableEntry extends BaseEntity {
  shareholderName: string;
  shareholderType: ShareholderType;
  shareClass: ShareClass;
  transactionType: CapTableTransactionType;
  sharesIssued: number;
  pricePerShare?: number;
  transactionDate: string;

  // For transfers
  fromHolder?: string;
  toHolder?: string;

  // Links
  round?: string;                   // Round ID
  investor?: string;                // Investor ID

  // Metadata
  notes?: string;
  documents?: string[];
}

type ShareholderType = 'founder' | 'investor' | 'employee' | 'advisor' | 'company';
type ShareClass = 'common' | 'preferred_seed' | 'preferred_a' | 'preferred_b' | 'preferred_c' | 'preferred_d' | 'options' | 'warrants' | 'convertible';
type CapTableTransactionType = 'issuance' | 'transfer' | 'exercise' | 'conversion' | 'buyback' | 'cancellation';
```

### ESOP Pool

```typescript
interface ESOPPool extends BaseEntity {
  name: string;
  description?: string;
  totalShares: number;
  grantedShares: number;            // Calculated from grants
  availableShares: number;          // totalShares - grantedShares
  poolPercentage: number;           // % of total company shares
}
```

### ESOP Grant

```typescript
interface ESOPGrant extends BaseEntity {
  esopPool: string;                 // ESOPPool ID
  employee: string;                 // User ID
  grantType: GrantType;
  totalShares: number;
  exercisePrice: number;
  grantDate: string;

  // Vesting
  vestingScheduleType: VestingScheduleType;
  vestingMonths: number;            // Total vesting period
  cliffMonths: number;              // Cliff period

  // Status
  status: GrantStatus;

  // Calculated
  vestedShares: number;
  unvestedShares: number;
  vestingPercent: number;

  // Exercise
  exercisedShares: number;
  exerciseDate?: string;
  expiryDate?: string;

  // Metadata
  notes?: string;
}

type GrantType = 'iso' | 'nso' | 'rsu' | 'rsa' | 'sar' | 'phantom';
type VestingScheduleType = 'standard_4yr_1yr_cliff' | 'no_cliff' | 'immediate' | 'custom';
type GrantStatus = 'draft' | 'approved' | 'active' | 'vested' | 'exercised' | 'expired' | 'cancelled';
```

---

## Projection Models

### Cash Flow Forecast

```typescript
interface CashFlowForecast extends BaseEntity {
  name: string;
  forecastPeriod: {
    start: string;
    end: string;
  };
  assumptions: ForecastAssumptions;
  projections: CashFlowProjection[];
  comparisonBenchmark?: 'budget' | 'prior_year';
}

interface ForecastAssumptions {
  revenueGrowthRate: number;        // Monthly %
  expenseGrowthRate: number;
  seasonalFactors?: SeasonalFactor[];
}

interface SeasonalFactor {
  month: number;
  revenueMultiplier: number;
  expenseMultiplier: number;
}

interface CashFlowProjection {
  month: string;                    // YYYY-MM format
  openingCash: number;
  inflows: {
    revenue: number;
    investments: number;
    other: number;
    total: number;
  };
  outflows: {
    expenses: number;
    payroll: number;
    taxes: number;
    other: number;
    total: number;
  };
  netCashFlow: number;
  closingCash: number;
}
```

### Runway Snapshot

```typescript
interface RunwaySnapshot extends BaseEntity {
  name: string;
  scenarioType: ScenarioType;
  snapshotDate: string;

  // Core metrics
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  netBurnRate: number;              // burnRate - revenue

  // Runway
  runwayMonths: number;
  runwayEndDate: string;
  status: RunwayStatus;

  // Assumptions
  assumptions: RunwayAssumptions;

  // Projections
  projections: RunwayProjection[];

  // Links
  linkedBankAccounts?: string[];
  linkedBudget?: string;
}

type RunwayStatus = 'critical' | 'warning' | 'healthy';

interface RunwayAssumptions {
  revenueGrowthRate: number;
  expenseGrowthRate: number;
  oneTimeInflux?: number;
  plannedHiringDelays?: number;     // Months
  marketingReduction?: number;      // Percentage
}

interface RunwayProjection {
  month: string;
  startingCash: number;
  revenue: number;
  expenses: number;
  netChange: number;
  endingCash: number;
  cumulativeRunway: number;
}
```

### Financial Model

```typescript
interface FinancialModel extends BaseEntity {
  fiscalYear: number;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlowStatement: CashFlowStatement;
  keyMetrics: FinancialMetrics;
}

interface IncomeStatement {
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: {
    sales: number;
    marketing: number;
    general: number;
    research: number;
    total: number;
  };
  operatingIncome: number;
  otherIncomeExpense: number;
  netIncome: number;
  netMarginPercent: number;
}

interface BalanceSheet {
  assets: {
    current: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      total: number;
    };
    nonCurrent: {
      propertyEquipment: number;
      intangibles: number;
      other: number;
      total: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      accountsPayable: number;
      accruedExpenses: number;
      shortTermDebt: number;
      total: number;
    };
    nonCurrent: {
      longTermDebt: number;
      other: number;
      total: number;
    };
    total: number;
  };
  equity: {
    commonStock: number;
    preferredStock: number;
    retainedEarnings: number;
    total: number;
  };
}

interface CashFlowStatement {
  operatingActivities: number;
  investingActivities: number;
  financingActivities: number;
  netChangeInCash: number;
  beginningCash: number;
  endingCash: number;
}

interface FinancialMetrics {
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
}
```

---

## Analysis Models

### Variance Report

```typescript
interface VarianceReport extends BaseEntity {
  type: 'budget' | 'revenue' | 'headcount';
  period: string;                   // YYYY-MM or YYYY-Q1
  variances: VarianceItem[];
  summary: VarianceSummary;
}

interface VarianceItem {
  category: string;
  account?: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'favorable' | 'unfavorable' | 'on_track';
  notes?: string;
}

interface VarianceSummary {
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  overBudgetCount: number;
  underBudgetCount: number;
  onTrackCount: number;
}
```

### Unit Economics

```typescript
interface UnitEconomics extends BaseEntity {
  period: string;                   // YYYY-MM
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  retentionRate: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  paybackPeriodMonths: number;
  cohorts: CohortAnalysis[];
}

interface CohortAnalysis {
  cohortMonth: string;              // YYYY-MM
  customersAdded: number;
  retention: {
    month0: number;                 // 100%
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
  revenueRetention: {
    month0: number;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
}
```

### Health Score

```typescript
interface HealthScore extends BaseEntity {
  scoreDate: string;
  overallScore: number;             // 0-100
  status: HealthStatus;
  componentScores: {
    runway: ComponentScore;
    revenue: ComponentScore;
    burnRate: ComponentScore;
    growth: ComponentScore;
    market: ComponentScore;
  };
  recommendations: Recommendation[];
  previousScore?: number;
  trend: 'improving' | 'stable' | 'declining';
}

type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

interface ComponentScore {
  score: number;                    // 0-100
  weight: number;                   // Decimal (e.g., 0.30)
  weightedScore: number;            // score * weight
  factors: Record<string, string | number>;
}

interface Recommendation {
  priority: Priority;
  category: string;
  title: string;
  description: string;
  impact: string;
}
```

---

## Reporting Models

### Dashboard

```typescript
interface Dashboard extends BaseEntity {
  name: string;
  description?: string;
  type: DashboardType;
  isDefault: boolean;
  isPublic: boolean;
  layout: DashboardLayout;
  widgets: Widget[];
  refreshInterval?: RefreshInterval;
  sharedWith?: string[];            // User IDs
}

type DashboardType = 'executive' | 'financial' | 'operational' | 'custom';

interface DashboardLayout {
  columns: number;
  rows: number;
  gridGap: number;
}
```

### Widget

```typescript
interface Widget {
  _id: string;
  name: string;
  type: WidgetType;
  dataSource: DataSource;
  position: {
    row: number;
    column: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
  filters?: WidgetFilter[];
  isVisible: boolean;
}

type WidgetType =
  | 'kpi_card'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'table'
  | 'gauge'
  | 'trend_indicator'
  | 'progress_bar'
  | 'heat_map';

type DataSource =
  | 'tracking_transactions'
  | 'tracking_expenses'
  | 'tracking_revenue'
  | 'planning_budget'
  | 'planning_headcount'
  | 'planning_revenue'
  | 'projection_runway'
  | 'projection_cashflow'
  | 'analysis_variance'
  | 'analysis_health'
  | 'fundraising_rounds'
  | 'fundraising_cap_table';

interface WidgetConfig {
  title?: string;
  subtitle?: string;
  timeRange?: TimeRange;
  comparison?: ComparisonConfig;
  visualization?: VisualizationConfig;
  aggregation?: AggregationType;
  formatting?: FormattingConfig;
  customQuery?: string;
}

interface TimeRange {
  type: 'relative' | 'absolute';
  relativeValue?: number;
  relativeUnit?: 'days' | 'weeks' | 'months' | 'years';
  absoluteStart?: string;
  absoluteEnd?: string;
}

interface ComparisonConfig {
  enabled: boolean;
  type: 'previous_period' | 'yoy' | 'budget' | 'target';
  showPercentChange: boolean;
}

interface VisualizationConfig {
  showLegend: boolean;
  showGrid: boolean;
  showDataLabels: boolean;
  colors?: string[];
  stacked?: boolean;
}

type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

interface FormattingConfig {
  numberFormat: 'number' | 'currency' | 'percent' | 'compact';
  currency?: Currency;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

interface WidgetFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains';
  value: string | number | string[];
}

type RefreshInterval = 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
```

### Investor Report

```typescript
interface InvestorReport extends BaseEntity {
  investor?: string;                // Investor ID (optional, can be for all)
  reportDate: string;
  fiscalPeriod: string;             // YYYY-MM or YYYY-Q1
  type: InvestorReportType;
  status: 'draft' | 'pending' | 'sent' | 'archived';
  template?: string;                // Template ID
  sections: ReportSections;
  generatedAt?: string;
  generatedBy?: string;
  sentAt?: string;
  sentTo?: string[];
  viewCount?: number;
}

type InvestorReportType = 'monthly' | 'quarterly' | 'annual' | 'on_demand';

interface ReportSections {
  executiveSummary?: string;
  financialSnapshot?: FinancialSnapshot;
  metrics?: ReportMetric[];
  milestones?: ReportMilestone[];
  narrativeCommentary?: string;
  investorSpecifics?: InvestorSpecifics;
  highlights?: string[];
  challenges?: string[];
  askOrCTA?: string;
}

interface FinancialSnapshot {
  revenue: number;
  expenses: number;
  netIncome: number;
  cash: number;
  runway: number;
  mrr?: number;
  arr?: number;
}

interface ReportMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ReportMilestone {
  title: string;
  status: 'completed' | 'in_progress' | 'planned';
  description?: string;
}

interface InvestorSpecifics {
  ownershipPercent: number;
  totalInvested: number;
  sharesOwned: number;
  boardSeat?: boolean;
}
```

---

## Operations Models

### Task

```typescript
interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category: TaskCategory;
  subcategory?: string;

  // Assignment
  assignee?: string;                // User ID
  reporter: string;                 // User ID

  // Dates
  startDate?: string;
  dueDate?: string;
  completedAt?: string;

  // Time tracking
  estimatedHours?: number;
  actualHours?: number;

  // Comments
  comments: TaskComment[];

  // Reminders
  reminders: TaskReminder[];

  // Relationships
  parentTask?: string;              // For subtasks
  subtasks?: string[];
  linkedMilestone?: string;
  linkedMeeting?: string;
  watchers?: string[];

  // Metadata
  tags?: string[];
  attachments?: string[];
}

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'closed';
type TaskCategory = 'feature' | 'bug' | 'research' | 'documentation' | 'design' | 'other';

interface TaskComment {
  _id: string;
  content: string;
  author: string;
  createdAt: string;
  mentions?: string[];
  attachments?: string[];
}

interface TaskReminder {
  _id: string;
  reminderDate: string;
  reminderType: 'email' | 'in_app' | 'both';
  sent: boolean;
  sentAt?: string;
}
```

### Milestone

```typescript
interface Milestone extends BaseEntity {
  name: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  revenue?: number;                 // Impact
  impactMetrics?: Record<string, string | number>;
  keyResults: KeyResult[];
  linkedTasks?: string[];
}

type MilestoneStatus = 'not_started' | 'in_progress' | 'at_risk' | 'completed';

interface KeyResult {
  _id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  status: 'not_started' | 'on_track' | 'at_risk' | 'achieved';
  owner?: string;
}
```

### Meeting

```typescript
interface Meeting extends BaseEntity {
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;

  // Schedule
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  meetingLink?: string;

  // Attendees
  attendees: MeetingAttendee[];
  relatedInvestor?: string;         // Investor ID

  // Content
  agenda?: string;
  notes?: string;
  outcomes?: string;

  // Action items
  actionItems: MeetingActionItem[];

  // Reminders
  reminders: MeetingReminder[];
}

type MeetingType = 'board_meeting' | 'investor_sync' | 'pitch' | 'due_diligence' | 'quarterly_review' | 'other';
type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface MeetingAttendee {
  user?: string;                    // User ID (if internal)
  name: string;
  email?: string;
  role?: string;
  title?: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
}

interface MeetingActionItem {
  _id: string;
  description: string;
  owner?: string;                   // User ID
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  linkedTask?: string;              // Task ID
}

interface MeetingReminder {
  _id: string;
  reminderDate: string;
  reminderType: 'email' | 'in_app' | 'both';
}
```

---

## Intelligence Models

### AI Query

```typescript
interface AIQuery extends BaseEntity {
  user: string;
  feature: AIFeature;
  queryType?: AIQueryType;
  input: string;
  response: string;
  model: string;                    // e.g., 'gpt-4o-mini'
  tokensUsed: number;
  processingTimeMs: number;
  feedback?: AIFeedback;
  conversationId?: string;
}

type AIFeature = 'copilot' | 'categorization' | 'document_parser' | 'report_generator' | 'meeting_intel';

type AIQueryType =
  | 'financial_metric'
  | 'comparison'
  | 'trend_analysis'
  | 'what_if'
  | 'explanation'
  | 'recommendation'
  | 'general'
  | 'summary'
  | 'prep_brief'
  | 'action_items'
  | 'follow_up'
  | 'research'
  | 'parse'
  | 'detect'
  | 'report';

interface AIFeedback {
  rating?: number;                  // 1-5
  comment?: string;
  wasHelpful?: boolean;
}
```

### Categorization Result

```typescript
interface CategorizationResult {
  category: string;
  subcategory?: string;
  confidence: Confidence;
  reasoning: string;
  alternatives?: AlternativeCategory[];
  suggestedAccount?: string;        // Account ID
}

interface AlternativeCategory {
  category: string;
  confidence: Confidence;
}
```

### Document Parse Result

```typescript
interface DocumentParseResult {
  documentType: DocumentType;
  confidence: number;               // 0-1
  extractedData: Record<string, unknown>;
  rawText?: string;
}

type DocumentType = 'bank_statement' | 'invoice' | 'receipt' | 'term_sheet' | 'contract' | 'unknown';
```

### Meeting Intelligence

```typescript
interface MeetingPrepBrief {
  investorOverview: {
    name: string;
    firm: string;
    role: string;
    background: string;
    investmentFocus: string[];
    notableInvestments: string[];
  };
  meetingHistory: MeetingHistoryItem[];
  suggestedAgenda: string[];
  talkingPoints: string[];
  anticipatedQuestions: AnticipatedQuestion[];
  warnings: string[];
}

interface MeetingHistoryItem {
  date: string;
  outcome: string;
  keyPoints: string[];
}

interface AnticipatedQuestion {
  question: string;
  suggestedAnswer: string;
}

interface MeetingSummary {
  title: string;
  date: string;
  duration: string;
  attendees: string[];
  executiveSummary: string;
  keyDiscussions: KeyDiscussion[];
  actionItems: ExtractedActionItem[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface KeyDiscussion {
  topic: string;
  summary: string;
  decisions: string[];
}

interface ExtractedActionItem {
  item: string;
  owner: string;
  dueDate?: string;
  priority: Priority;
  context: string;
}
```

---

## Entity Relationship Diagram

```
                                    ┌──────────────────┐
                                    │       User       │
                                    └────────┬─────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  ▼                  ▼
               ┌─────────────────┐  ┌─────────────┐  ┌────────────────┐
               │   Membership    │  │   AIQuery   │  │   ESOPGrant    │
               └────────┬────────┘  └─────────────┘  │   (employee)   │
                        │                            └────────────────┘
                        ▼
               ┌─────────────────┐
               │  Organization   │─────────────────────────────────────┐
               └────────┬────────┘                                     │
                        │                                              │
    ┌───────────────────┼───────────────────┐                         │
    │                   │                   │                         │
    ▼                   ▼                   ▼                         │
┌─────────┐    ┌─────────────────┐   ┌──────────────┐                │
│ Account │    │     Budget      │   │    Round     │                │
│ (CoA)   │    │                 │   │              │                │
└────┬────┘    └────────┬────────┘   └───────┬──────┘                │
     │                  │                    │                        │
     │                  ▼                    ▼                        │
     │         ┌─────────────────┐   ┌──────────────┐                │
     │         │   BudgetItem    │   │   Investor   │                │
     │         └─────────────────┘   └───────┬──────┘                │
     │                  │                    │                        │
     │                  ▼                    ▼                        │
     │         ┌─────────────────┐   ┌──────────────┐                │
     │         │   Transaction   │   │ CapTableEntry│                │
     │◄────────┤                 │   └──────────────┘                │
     │         └────────┬────────┘                                    │
     │                  │                                             │
     │    ┌─────────────┼─────────────┐                              │
     │    │             │             │                              │
     │    ▼             ▼             ▼                              │
     │ ┌────────┐  ┌──────────┐  ┌───────────────┐                   │
     │ │Expense │  │ Revenue  │  │BankTransaction│                   │
     │ └───┬────┘  │  Entry   │  └───────────────┘                   │
     │     │       └────┬─────┘          │                           │
     │     ▼            ▼                ▼                           │
     │ ┌────────┐  ┌──────────┐   ┌─────────────┐                    │
     │ │ Vendor │  │ Customer │   │ BankAccount │                    │
     │ └────────┘  └──────────┘   └─────────────┘                    │
     │                                                                │
     │    ┌───────────────────────────────────────────────────────┐  │
     │    │                    PLANNING                            │  │
     │    └───────────────────────────────────────────────────────┘  │
     │         │                │                │                    │
     │         ▼                ▼                ▼                    │
     │    ┌─────────────┐ ┌──────────────┐ ┌──────────────┐          │
     │    │HeadcountPlan│ │ RevenuePlan  │ │   Scenario   │          │
     │    └──────┬──────┘ └──────┬───────┘ └──────┬───────┘          │
     │           │               │                │                   │
     │           ▼               ▼                ▼                   │
     │    ┌─────────────┐ ┌──────────────┐ ┌──────────────┐          │
     │    │ PlannedRole │ │RevenueStream │ │ Adjustment   │          │
     │    └─────────────┘ └──────────────┘ └──────────────┘          │
     │                                                                │
     │    ┌───────────────────────────────────────────────────────┐  │
     │    │                    OPERATIONS                          │  │
     │    └───────────────────────────────────────────────────────┘  │
     │         │                │                │                    │
     │         ▼                ▼                ▼                    │
     │    ┌──────────┐    ┌───────────┐    ┌──────────┐              │
     │    │   Task   │◄───│ Milestone │    │ Meeting  │◄─────────────┤
     │    └──────────┘    └───────────┘    └──────────┘              │
     │                                                                │
     │    ┌───────────────────────────────────────────────────────┐  │
     │    │                    REPORTING                           │  │
     │    └───────────────────────────────────────────────────────┘  │
     │         │                           │                         │
     │         ▼                           ▼                         │
     │    ┌──────────┐              ┌──────────────┐                 │
     │    │Dashboard │              │InvestorReport│                 │
     │    └────┬─────┘              └──────────────┘                 │
     │         │                                                      │
     │         ▼                                                      │
     │    ┌──────────┐                                               │
     │    │  Widget  │                                               │
     │    └──────────┘                                               │
     │                                                                │
     │    ┌───────────────────────────────────────────────────────┐  │
     │    │                    PROJECTION                          │  │
     │    └───────────────────────────────────────────────────────┘  │
     │         │                │                │                    │
     │         ▼                ▼                ▼                    │
     │    ┌───────────────┐ ┌──────────────┐ ┌──────────────┐        │
     │    │CashFlowForecast│ │RunwaySnapshot│ │FinancialModel│        │
     │    └───────────────┘ └──────────────┘ └──────────────┘        │
     │                                                                │
     │    ┌───────────────────────────────────────────────────────┐  │
     │    │                    ANALYSIS                            │  │
     │    └───────────────────────────────────────────────────────┘  │
     │         │                │                │                    │
     │         ▼                ▼                ▼                    │
     │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
     │    │HealthScore  │ │UnitEconomics │ │VarianceReport│         │
     │    └──────────────┘ └──────────────┘ └──────────────┘         │
     │                                                                │
     └────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules Summary

| Entity | Field | Rule |
|--------|-------|------|
| User | email | Valid email format, unique |
| User | password | Min 8 characters |
| Organization | name | 1-100 characters, unique |
| Account | code | Unique within organization |
| Budget | fiscalYear | Valid year (2000-2100) |
| Budget | totalAmount | >= 0 |
| BudgetItem | plannedAmount | >= 0 |
| Transaction | amount | > 0 |
| Transaction | account | Must be leaf account |
| Expense | amount | > 0 |
| Expense | account | Must be expense type |
| Revenue | amount | > 0 |
| Revenue | account | Must be revenue type |
| Investor | totalCommitted | >= totalInvested |
| ESOP Grant | totalShares | >= exercisedShares |
| Task | title | 1-200 characters |
| Meeting | scheduledDate | Cannot be in past (for new) |

---

*This document provides the data model foundation for frontend development. For API endpoints and request/response examples, refer to the individual module documentation files (01-auth.md through 11-intelligence.md).*
