# Tracking Module - Frontend Integration Guide

## Overview

The Tracking module handles financial data capture and management with four sub-modules:
- **Transactions** - Core transaction hub for all financial records
- **Expenses** - Expense management with approval workflow
- **Revenue** - Revenue tracking with customer management
- **Bank Sync** - CSV import and bank reconciliation

All tracking entities integrate with Chart of Accounts for categorization.

## Base URL

```
/api/v1/tracking
```

## Authentication

All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## Sub-module: Transactions

Base path: `/api/v1/tracking/transactions`

### Endpoints

#### Create Transaction
- **Method:** `POST`
- **Path:** `/`
- **Description:** Create a new transaction

**Request Body:**
```typescript
interface CreateTransactionRequest {
  accountId: string;           // Chart of Accounts ID (leaf account only)
  type: 'income' | 'expense';
  amount: number;              // Must be positive
  date: string;                // ISO 8601 datetime
  description: string;
  reference?: string;          // Check #, invoice #, etc.
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'ach' | 'wire' | 'other';
  tags?: string[];
  notes?: string;
  attachments?: string[];
}
```

**Response (201):**
```typescript
{
  success: true,
  data: Transaction
}
```

#### List Transactions
- **Method:** `GET`
- **Path:** `/`
- **Description:** Get transactions with filtering and pagination

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by 'income' or 'expense' |
| status | string | Filter by 'pending', 'cleared', 'reconciled' |
| accountId | string | Filter by Chart of Accounts ID |
| category | string | Filter by category |
| paymentMethod | string | Filter by payment method |
| startDate | string | ISO date - filter from this date |
| endDate | string | ISO date - filter to this date |
| minAmount | number | Minimum amount filter |
| maxAmount | number | Maximum amount filter |
| search | string | Search in description and notes |
| tags | string | Comma-separated tags |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| sortBy | string | Sort field (default: 'date') |
| sortOrder | string | 'asc' or 'desc' (default: 'desc') |

**Response (200):**
```typescript
{
  success: true,
  data: Transaction[],
  pagination: {
    page: number,
    limit: number,
    totalPages: number,
    totalCount: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  }
}
```

#### Get Transaction by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Transaction
- **Method:** `PUT`
- **Path:** `/:id`
- **Note:** Reconciled transactions cannot be modified

#### Archive Transaction
- **Method:** `DELETE`
- **Path:** `/:id`

#### Bulk Create Transactions
- **Method:** `POST`
- **Path:** `/bulk`

**Request Body:**
```typescript
{
  transactions: CreateTransactionRequest[]
}
```

#### Bulk Categorize Transactions
- **Method:** `POST`
- **Path:** `/categorize`

**Request Body:**
```typescript
{
  transactionIds: string[],
  accountId: string
}
```

#### Get Transaction Summary
- **Method:** `GET`
- **Path:** `/summary`

**Query Parameters:**
- `startDate`, `endDate` (optional)

**Response:**
```typescript
{
  success: true,
  data: {
    totalIncome: number,
    totalExpenses: number,
    netAmount: number,
    transactionCount: number,
    byCategory: Record<string, number>,
    byPaymentMethod: Record<string, number>,
    byStatus: Record<string, number>
  }
}
```

#### Get Transactions by Category
- **Method:** `GET`
- **Path:** `/by-category`

---

## Sub-module: Expenses

Base path: `/api/v1/tracking/expenses`

### Expense Status Workflow

```
draft -> pending_approval -> approved -> paid
                          -> rejected (back to draft)
```

### Endpoints

#### Create Expense
- **Method:** `POST`
- **Path:** `/`

**Request Body:**
```typescript
interface CreateExpenseRequest {
  accountId: string;           // Expense-type Chart of Accounts ID
  vendorId?: string;           // Vendor ID
  amount: number;
  date: string;                // ISO 8601 datetime
  dueDate?: string;
  description: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  recurringEndDate?: string;
  receipt?: string;            // URL to receipt image
  attachments?: string[];
  department?: string;
  costCenter?: string;
  tags?: string[];
  notes?: string;
}
```

**Validation:**
- If `isRecurring` is true, `recurringFrequency` is required
- `accountId` must reference an expense-type account

#### List Expenses
- **Method:** `GET`
- **Path:** `/`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by expense status |
| vendorId | string | Filter by vendor |
| accountId | string | Filter by account |
| category | string | Filter by category |
| startDate | string | ISO date filter |
| endDate | string | ISO date filter |
| minAmount | number | Minimum amount |
| maxAmount | number | Maximum amount |
| isRecurring | boolean | Filter recurring expenses |
| department | string | Filter by department |
| costCenter | string | Filter by cost center |
| search | string | Search description |
| page, limit, sortBy, sortOrder | | Pagination options |

#### Get Expense by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Expense
- **Method:** `PUT`
- **Path:** `/:id`
- **Note:** Only draft expenses can be fully modified

#### Archive Expense
- **Method:** `DELETE`
- **Path:** `/:id`

#### Submit for Approval
- **Method:** `POST`
- **Path:** `/:id/submit`
- **Description:** Changes status from 'draft' to 'pending_approval'

#### Approve Expense
- **Method:** `POST`
- **Path:** `/:id/approve`

**Request Body:**
```typescript
{
  notes?: string    // Approval notes
}
```

#### Reject Expense
- **Method:** `POST`
- **Path:** `/:id/reject`

**Request Body:**
```typescript
{
  reason: string    // Rejection reason (required)
}
```

#### Mark as Paid
- **Method:** `POST`
- **Path:** `/:id/pay`
- **Description:** Creates a linked transaction when paid

**Request Body:**
```typescript
{
  paymentMethod: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'ach' | 'wire' | 'other',
  paymentReference?: string,
  paidAt?: string    // Defaults to current time
}
```

#### Get Pending Approvals
- **Method:** `GET`
- **Path:** `/pending-approvals`

#### Get Recurring Expenses
- **Method:** `GET`
- **Path:** `/recurring`

#### Get Expense Summary
- **Method:** `GET`
- **Path:** `/summary`

**Response:**
```typescript
{
  success: true,
  data: {
    totalAmount: number,
    expenseCount: number,
    byCategory: Record<string, number>,
    byVendor: Record<string, number>,
    byStatus: Record<string, number>,
    pendingApprovals: number,
    recurringTotal: number
  }
}
```

#### Get Expenses by Category
- **Method:** `GET`
- **Path:** `/by-category`

#### Get Expenses by Vendor
- **Method:** `GET`
- **Path:** `/by-vendor`

---

## Sub-module: Vendors

Base path: `/api/v1/tracking/vendors`

### Endpoints

#### Create Vendor
- **Method:** `POST`
- **Path:** `/`

**Request Body:**
```typescript
interface CreateVendorRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  taxId?: string;
  paymentTerms?: string;        // e.g., "Net 30"
  defaultAccountId?: string;    // Default expense account
  contactName?: string;
  website?: string;
  notes?: string;
  tags?: string[];
}
```

#### List Vendors
- **Method:** `GET`
- **Path:** `/`

#### Get Vendor by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Vendor
- **Method:** `PUT`
- **Path:** `/:id`

#### Archive Vendor
- **Method:** `DELETE`
- **Path:** `/:id`

#### Get Top Vendors
- **Method:** `GET`
- **Path:** `/top`
- **Query:** `limit` (default: 10)

---

## Sub-module: Revenue

Base path: `/api/v1/tracking/revenue`

### Revenue Entry Status Workflow

```
pending -> received
        -> cancelled
```

### Endpoints

#### Create Revenue Entry
- **Method:** `POST`
- **Path:** `/`

**Request Body:**
```typescript
interface CreateRevenueEntryRequest {
  accountId: string;           // Revenue-type Chart of Accounts ID
  customerId?: string;
  amount: number;
  date: string;
  description: string;
  invoiceNumber?: string;
  revenueType: 'subscription' | 'one_time' | 'recurring' | 'services';
  subscriptionPeriodStart?: string;
  subscriptionPeriodEnd?: string;
  tags?: string[];
  notes?: string;
  attachments?: string[];
}
```

#### List Revenue Entries
- **Method:** `GET`
- **Path:** `/`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | 'pending', 'received', 'cancelled' |
| customerId | string | Filter by customer |
| accountId | string | Filter by account |
| revenueType | string | Filter by revenue type |
| startDate | string | ISO date filter |
| endDate | string | ISO date filter |
| minAmount | number | Minimum amount |
| maxAmount | number | Maximum amount |
| search | string | Search description |
| page, limit, sortBy, sortOrder | | Pagination options |

#### Get Revenue Entry by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Revenue Entry
- **Method:** `PUT`
- **Path:** `/:id`

#### Archive Revenue Entry
- **Method:** `DELETE`
- **Path:** `/:id`

#### Mark as Received
- **Method:** `POST`
- **Path:** `/:id/receive`
- **Description:** Creates a linked transaction when received

**Request Body:**
```typescript
{
  receivedAt?: string,           // Defaults to current time
  paymentMethod?: string,
  paymentReference?: string
}
```

#### Cancel Revenue Entry
- **Method:** `POST`
- **Path:** `/:id/cancel`

**Request Body:**
```typescript
{
  reason?: string
}
```

#### Get MRR Metrics
- **Method:** `GET`
- **Path:** `/mrr`

**Response:**
```typescript
{
  success: true,
  data: {
    currentMRR: number,
    previousMRR: number,
    mrrChange: number,
    mrrChangePercentage: number,
    newMRR: number,
    expansionMRR: number,
    churnedMRR: number,
    netNewMRR: number,
    activeSubscribers: number,
    avgRevenuePerAccount: number
  }
}
```

#### Get Revenue by Category
- **Method:** `GET`
- **Path:** `/by-category`

#### Get Revenue by Customer
- **Method:** `GET`
- **Path:** `/by-customer`

#### Get Revenue by Type
- **Method:** `GET`
- **Path:** `/by-type`

#### Get Revenue Summary
- **Method:** `GET`
- **Path:** `/summary`

---

## Sub-module: Customers

Base path: `/api/v1/tracking/customers`

### Endpoints

#### Create Customer
- **Method:** `POST`
- **Path:** `/`

**Request Body:**
```typescript
interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  subscriptionStatus?: 'active' | 'churned' | 'paused' | 'trial';
  monthlyValue?: number;        // MRR contribution
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactName?: string;
  notes?: string;
  tags?: string[];
}
```

#### List Customers
- **Method:** `GET`
- **Path:** `/`

#### Get Customer by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Customer
- **Method:** `PUT`
- **Path:** `/:id`

#### Archive Customer
- **Method:** `DELETE`
- **Path:** `/:id`

#### Get Active Subscribers
- **Method:** `GET`
- **Path:** `/active-subscribers`
- **Query:** `limit` (default: 100)

#### Get Churned Customers
- **Method:** `GET`
- **Path:** `/churned`
- **Query:** `limit` (default: 100)

#### Get Top Customers
- **Method:** `GET`
- **Path:** `/top`
- **Query:** `limit` (default: 10)

---

## Sub-module: Bank Sync

### Bank Accounts

Base path: `/api/v1/tracking/bank-accounts`

#### Create Bank Account
- **Method:** `POST`
- **Path:** `/`

**Request Body:**
```typescript
interface CreateBankAccountRequest {
  name: string;                 // Display name
  bankName: string;
  accountNumber: string;        // Last 4 digits recommended
  accountType: 'checking' | 'savings' | 'credit_card' | 'money_market';
  currency?: string;            // Default: 'USD'
  currentBalance?: number;      // Initial balance
  linkedAccountId?: string;     // Link to CoA asset account
  description?: string;
  notes?: string;
}
```

#### List Bank Accounts
- **Method:** `GET`
- **Path:** `/`

#### Get Bank Account by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Bank Account
- **Method:** `PUT`
- **Path:** `/:id`

#### Archive Bank Account
- **Method:** `DELETE`
- **Path:** `/:id`

#### Import CSV
- **Method:** `POST`
- **Path:** `/:id/import`
- **Description:** Import transactions from CSV file

**Request Body:**
```typescript
interface CSVImportRequest {
  csvData: string;              // Base64 encoded CSV content
  dateFormat: string;           // e.g., 'MM/DD/YYYY', 'YYYY-MM-DD'
  hasHeader?: boolean;          // Default: true
  skipRows?: number;            // Default: 0
  columnMapping: {
    date: string;               // Column name for date
    description: string;        // Column name for description
    amount?: string;            // For single amount column
    debit?: string;             // For separate debit/credit columns
    credit?: string;
    balance?: string;           // Optional balance column
    reference?: string;         // Optional reference column
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    success: boolean,
    totalRows: number,
    importedCount: number,
    skippedDuplicates: number,
    errors: Array<{ row: number, message: string }>,
    importBatchId: string
  }
}
```

### Bank Transactions

Base path: `/api/v1/tracking/bank-transactions`

#### List Bank Transactions
- **Method:** `GET`
- **Path:** `/`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| bankAccountId | string | Filter by bank account |
| status | string | 'unmatched', 'matched', 'reconciled', 'ignored' |
| startDate | string | ISO date filter |
| endDate | string | ISO date filter |
| minAmount | number | Minimum amount |
| maxAmount | number | Maximum amount |
| category | string | Filter by category |
| search | string | Search description |
| importBatchId | string | Filter by import batch |
| page, limit, sortBy, sortOrder | | Pagination options |

#### Get Bank Transaction by ID
- **Method:** `GET`
- **Path:** `/:id`

#### Update Bank Transaction
- **Method:** `PUT`
- **Path:** `/:id`

**Request Body:**
```typescript
{
  category?: string
}
```

#### Match Transaction
- **Method:** `POST`
- **Path:** `/:id/match`
- **Description:** Manually match to an existing transaction

**Request Body:**
```typescript
{
  transactionId: string
}
```

#### Unmatch Transaction
- **Method:** `POST`
- **Path:** `/:id/unmatch`

#### Reconcile Transaction
- **Method:** `POST`
- **Path:** `/:id/reconcile`
- **Note:** Transaction must be matched first

#### Ignore Transaction
- **Method:** `POST`
- **Path:** `/:id/ignore`

#### Get Unmatched Transactions
- **Method:** `GET`
- **Path:** `/unmatched`
- **Query:** `bankAccountId` (optional)

#### Auto-Match Transactions
- **Method:** `POST`
- **Path:** `/auto-match`
- **Description:** Automatically match bank transactions to existing transactions

**Query Parameters:**
- `bankAccountId` (optional) - Limit to specific bank account

**Response:**
```typescript
{
  success: true,
  data: {
    processed: number,
    matched: number,
    unmatched: number,
    matches: Array<{
      bankTransactionId: string,
      transactionId: string,
      confidence: number        // 0-100
    }>
  }
}
```

---

## TypeScript Types

```typescript
// Transaction
interface Transaction {
  id: string;
  organization: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    subtype: string;
  };
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  reference?: string;
  category: string;
  paymentMethod?: string;
  status: 'pending' | 'cleared' | 'reconciled';
  source: 'manual' | 'imported' | 'recurring';
  linkedEntities: Array<{
    entityType: 'expense' | 'revenue' | 'bank_transaction';
    entityId: string;
  }>;
  tags?: string[];
  notes?: string;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Expense
interface Expense {
  id: string;
  organization: string;
  account: AccountRef;
  vendor?: VendorRef;
  amount: number;
  date: string;
  dueDate?: string;
  description: string;
  category: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  recurringEndDate?: string;
  receipt?: string;
  attachments?: string[];
  transaction?: string;
  department?: string;
  costCenter?: string;
  tags?: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Vendor
interface Vendor {
  id: string;
  organization: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  taxId?: string;
  paymentTerms?: string;
  defaultAccount?: string;
  totalSpent: number;
  expenseCount: number;
  lastExpenseDate?: string;
  contactName?: string;
  website?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Revenue Entry
interface RevenueEntry {
  id: string;
  organization: string;
  account: AccountRef;
  customer?: CustomerRef;
  amount: number;
  date: string;
  description: string;
  category: string;
  invoiceNumber?: string;
  revenueType: 'subscription' | 'one_time' | 'recurring' | 'services';
  status: 'pending' | 'received' | 'cancelled';
  receivedAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  revenueStream?: string;
  transaction?: string;
  subscriptionPeriodStart?: string;
  subscriptionPeriodEnd?: string;
  tags?: string[];
  notes?: string;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Customer
interface Customer {
  id: string;
  organization: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  subscriptionStatus?: 'active' | 'churned' | 'paused' | 'trial';
  monthlyValue: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  totalRevenue: number;
  revenueEntryCount: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  address?: Address;
  contactName?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Bank Account
interface BankAccount {
  id: string;
  organization: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'money_market';
  currency: string;
  currentBalance: number;
  lastImportDate?: string;
  lastImportedBalance?: number;
  linkedAccount?: string;
  description?: string;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Bank Transaction
interface BankTransaction {
  id: string;
  organization: string;
  bankAccount: BankAccountRef;
  amount: number;
  date: string;
  description: string;
  category?: string;
  suggestedCategory?: string;
  status: 'unmatched' | 'matched' | 'reconciled' | 'ignored';
  matchedTransaction?: string;
  matchConfidence?: number;
  importedAt: string;
  importBatchId: string;
  externalId?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body or parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | User lacks permission for this action |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate entry or invalid state transition |

### Common Validation Errors

- "Transactions can only use leaf accounts" - Account has children, use a more specific account
- "Account must be of type 'expense'" - Wrong account type for expense
- "Account must be of type 'revenue'" - Wrong account type for revenue
- "Recurring frequency is required for recurring expenses" - Missing frequency when isRecurring is true
- "Bank transaction must be matched before reconciliation" - Must match first
- "Cannot modify reconciled transaction" - Transaction is locked

---

## Integration with Other Modules

### Chart of Accounts
- All transactions, expenses, and revenue entries reference CoA accounts
- Transactions must use **leaf accounts only** (accounts without children)
- Expenses must reference **expense-type** accounts
- Revenue entries must reference **revenue-type** accounts
- Category is auto-derived from account.subtype

### Planning Module
- Revenue entries can be linked to Revenue Streams from Revenue Plans
- Expense categories map to Budget Items for variance analysis

### Analysis Module (Future)
- Transaction data feeds variance analysis (Plan vs Actual)
- MRR metrics feed trend analysis
- Expense patterns feed forecasting models

---

## User Flows

### Recording an Expense

1. Create expense with draft status
2. Attach receipt (optional)
3. Submit for approval (if workflow enabled)
4. Approver reviews and approves/rejects
5. Mark as paid when payment is made
6. System automatically creates linked transaction

### Bank Reconciliation

1. Add bank account with initial balance
2. Import CSV from bank statement
3. System deduplicates based on date/amount/description checksum
4. Run auto-match to find matching transactions
5. Review and confirm matches
6. Mark matched transactions as reconciled
7. Ignore bank fees or non-business transactions

### Tracking Subscription Revenue

1. Create customer with subscription status and monthly value
2. Create revenue entries for each billing period
3. Mark as received when payment arrives
4. View MRR metrics for subscription health
5. Update customer status on churn

---

## State Management Suggestions

```typescript
// Redux/Zustand slice structure
interface TrackingState {
  // Transactions
  transactions: Transaction[];
  transactionSummary: TransactionSummary | null;

  // Expenses
  expenses: Expense[];
  pendingApprovals: Expense[];
  expenseSummary: ExpenseSummary | null;
  vendors: Vendor[];

  // Revenue
  revenueEntries: RevenueEntry[];
  customers: Customer[];
  mrrMetrics: MRRMetrics | null;

  // Bank Sync
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  unmatchedTransactions: BankTransaction[];

  // UI State
  isLoading: boolean;
  error: string | null;
}
```

---

## Best Practices

1. **Always specify account IDs** - Use Chart of Accounts for proper categorization
2. **Use pagination** - Large organizations may have thousands of transactions
3. **Filter by date range** - Default queries should limit to recent data
4. **Handle workflow states** - Check expense status before allowing modifications
5. **Verify bank imports** - Review import results for errors before proceeding
6. **Track linked entities** - Use linkedEntities array to trace relationships
