# Chart of Accounts Module - Frontend Integration Guide

## Overview

The Chart of Accounts module defines the financial taxonomy for the organization. It provides a hierarchical structure of accounts for categorizing all financial transactions, following standard accounting principles.

## Base URL

```
/api/v1/chart-of-accounts
```

## Authentication

All endpoints require:
1. Bearer token in the Authorization header
2. Organization context via `X-Organization-Id` header

```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## Account Types

The module supports five standard account types:

| Type | Code Range | Description |
|------|------------|-------------|
| **Asset** | 1000-1999 | Cash, receivables, equipment, etc. |
| **Liability** | 2000-2999 | Payables, loans, deferred revenue |
| **Equity** | 3000-3999 | Owner's equity, retained earnings |
| **Revenue** | 4000-4999 | Sales, service income, subscriptions |
| **Expense** | 5000-9999 | Operating costs, payroll, marketing |

---

## Account Subtypes

Each account type has specific subtypes for granular categorization:

### Asset Subtypes
- `cash`, `bank`, `accounts_receivable`, `inventory`
- `prepaid_expenses`, `fixed_assets`, `intangible_assets`, `other_assets`

### Liability Subtypes
- `accounts_payable`, `credit_card`, `short_term_debt`, `long_term_debt`
- `accrued_liabilities`, `deferred_revenue`, `other_liabilities`

### Equity Subtypes
- `owners_equity`, `retained_earnings`, `common_stock`
- `preferred_stock`, `additional_paid_in_capital`

### Revenue Subtypes
- `operating_revenue`, `service_revenue`, `product_revenue`
- `subscription_revenue`, `other_income`

### Expense Subtypes
- `cost_of_goods_sold`, `payroll`, `marketing`, `sales`
- `general_admin`, `rent`, `utilities`, `software`
- `professional_services`, `travel`, `depreciation`
- `interest_expense`, `taxes`, `other_expenses`

---

## Endpoints

### POST /chart-of-accounts/seed

Seed the default chart of accounts for a new organization. **Owner only.**

**Request Body:**

```typescript
interface SeedChartRequest {
  overwrite?: boolean;  // Replace existing accounts (default: false)
}
```

**Response (201 Created):**

```typescript
interface SeedResponse {
  success: true;
  data: {
    created: number;      // Number of accounts created
    message: string;
  };
}
```

**Example:**

```typescript
const response = await api.post('/chart-of-accounts/seed', {
  overwrite: false
}, {
  headers: { 'X-Organization-Id': orgId }
});
// Response: { success: true, data: { created: 85, message: "Chart of accounts seeded successfully" } }
```

---

### GET /chart-of-accounts

Get all accounts with optional filters.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by account type |
| subtype | string | Filter by subtype |
| isActive | boolean | Filter active/inactive |
| parentId | string | Filter by parent account |
| search | string | Search in name, code, description |

**Response (200 OK):**

```typescript
interface AccountListResponse {
  success: true;
  data: Account[];
}
```

**Example:**

```typescript
// Get all expense accounts
const expenses = await api.get('/chart-of-accounts?type=expense');

// Search for marketing accounts
const marketing = await api.get('/chart-of-accounts?search=marketing');
```

---

### GET /chart-of-accounts/tree

Get hierarchical tree structure of all accounts.

**Response (200 OK):**

```typescript
interface AccountTreeResponse {
  success: true;
  data: AccountTreeNode[];
}

interface AccountTreeNode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  subtype: AccountSubtype;
  isSystem: boolean;
  isActive: boolean;
  depth: number;
  children: AccountTreeNode[];
}
```

**Example:**

```typescript
const tree = await api.get('/chart-of-accounts/tree');
// Returns nested structure like:
// [
//   {
//     id: "...",
//     code: "5000",
//     name: "Expenses",
//     children: [
//       { code: "6000", name: "Payroll Expenses", children: [...] },
//       { code: "7000", name: "Operating Expenses", children: [...] }
//     ]
//   }
// ]
```

---

### GET /chart-of-accounts/stats

Get statistics about the chart of accounts.

**Response (200 OK):**

```typescript
interface StatsResponse {
  success: true;
  data: {
    hasChartOfAccounts: boolean;
    totalAccounts: number;
    byType: {
      asset?: number;
      liability?: number;
      equity?: number;
      revenue?: number;
      expense?: number;
    };
  };
}
```

---

### GET /chart-of-accounts/leaf

Get leaf accounts (accounts with no children that can have transactions).

**Response (200 OK):**

```typescript
interface AccountListResponse {
  success: true;
  data: Account[];
}
```

**Usage:** Use this for transaction categorization dropdowns.

---

### GET /chart-of-accounts/by-type/:type

Get all accounts of a specific type.

**Response (200 OK):**

```typescript
interface AccountListResponse {
  success: true;
  data: Account[];
}
```

**Example:**

```typescript
// Get all revenue accounts for a revenue entry form
const revenueAccounts = await api.get('/chart-of-accounts/by-type/revenue');
```

---

### POST /chart-of-accounts

Create a new account. **Requires owner or admin role.**

**Request Body:**

```typescript
interface CreateAccountRequest {
  code?: string;           // Optional - auto-generated if not provided
  name: string;            // Required, 1-100 chars
  description?: string;    // Optional, max 500 chars
  type: AccountType;       // Required
  subtype: AccountSubtype; // Required - must match type
  parentId?: string;       // Optional parent account ID
}
```

**Response (201 Created):**

```typescript
interface CreateAccountResponse {
  success: true;
  data: Account;
  message: "Account created successfully";
}
```

**Example:**

```typescript
const account = await api.post('/chart-of-accounts', {
  name: 'TikTok Advertising',
  type: 'expense',
  subtype: 'marketing',
  parentId: '507f1f77bcf86cd799439010', // Parent: Digital Advertising
  description: 'TikTok ad spend'
});
```

**Validation Rules:**
- Subtype must be valid for the account type
- Parent account must be of the same type
- Maximum nesting depth is 5 levels
- Account code must be unique within organization

---

### GET /chart-of-accounts/:id

Get account details.

**Response (200 OK):**

```typescript
interface SingleAccountResponse {
  success: true;
  data: Account;
}
```

---

### PUT /chart-of-accounts/:id

Update an account. **Requires owner or admin role.**

**Request Body:**

```typescript
interface UpdateAccountRequest {
  name?: string;
  description?: string | null;
  subtype?: AccountSubtype;
  parentId?: string | null;  // null to remove parent
  isActive?: boolean;
}
```

**Response (200 OK):**

```typescript
interface UpdateAccountResponse {
  success: true;
  data: Account;
  message: "Account updated successfully";
}
```

**Notes:**
- Cannot modify system accounts (only deactivate)
- Cannot change account type
- Parent must be of the same type

---

### DELETE /chart-of-accounts/:id

Archive (soft delete) an account. **Requires owner or admin role.**

**Response (200 OK):**

```typescript
interface DeleteAccountResponse {
  success: true;
  message: "Account archived successfully";
}
```

**Validation Rules:**
- Cannot archive accounts with active children
- In future: Cannot archive accounts with transactions

---

## TypeScript Types

```typescript
// Account Types
type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

type AccountSubtype =
  // Assets
  | 'cash' | 'bank' | 'accounts_receivable' | 'inventory'
  | 'prepaid_expenses' | 'fixed_assets' | 'intangible_assets' | 'other_assets'
  // Liabilities
  | 'accounts_payable' | 'credit_card' | 'short_term_debt' | 'long_term_debt'
  | 'accrued_liabilities' | 'deferred_revenue' | 'other_liabilities'
  // Equity
  | 'owners_equity' | 'retained_earnings' | 'common_stock'
  | 'preferred_stock' | 'additional_paid_in_capital'
  // Revenue
  | 'operating_revenue' | 'service_revenue' | 'product_revenue'
  | 'subscription_revenue' | 'other_income'
  // Expenses
  | 'cost_of_goods_sold' | 'payroll' | 'marketing' | 'sales'
  | 'general_admin' | 'rent' | 'utilities' | 'software'
  | 'professional_services' | 'travel' | 'depreciation'
  | 'interest_expense' | 'taxes' | 'other_expenses';

interface Account {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  subtype: AccountSubtype;
  parent?: string | null;
  isSystem: boolean;       // True for default/seeded accounts
  isActive: boolean;
  depth: number;           // Nesting level (0 = root)
  createdAt: string;
  updatedAt: string;
}

interface AccountTreeNode extends Omit<Account, 'parent'> {
  children: AccountTreeNode[];
}
```

---

## UI Components Needed

1. **ChartOfAccountsTree** - Expandable tree view of all accounts
2. **AccountList** - Flat table view with search and filters
3. **CreateAccountModal** - Form to create new accounts
4. **EditAccountModal** - Form to edit existing accounts
5. **AccountSelector** - Dropdown/combobox for selecting accounts
6. **AccountTypeFilter** - Filter tabs for account types
7. **SeedChartButton** - Button to seed default chart (new orgs)
8. **AccountBreadcrumb** - Show account hierarchy path

---

## User Flows

### First-Time Setup

```
1. User creates new organization
2. System shows "Set up Chart of Accounts" prompt
3. User clicks "Use Default Chart" button
4. Call POST /chart-of-accounts/seed
5. Redirect to chart of accounts view
6. User can customize accounts as needed
```

### Adding Custom Account

```
1. User navigates to Chart of Accounts
2. Clicks "Add Account" button
3. Selects account type (shows only valid subtypes)
4. Optionally selects parent account (filtered by type)
5. Enters name and description
6. System auto-generates code if not provided
7. Submit to POST /chart-of-accounts
8. Account appears in tree
```

### Categorizing Transaction

```
1. User creating expense/revenue entry
2. Account selector shows leaf accounts
3. User can search or browse tree
4. Selector filters by transaction type:
   - Expense entries → expense accounts
   - Revenue entries → revenue accounts
5. Selected account ID saved with transaction
```

---

## State Management

### React Query Example

```typescript
// Hooks
export const useAccounts = (filters?: AccountFilters) => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['accounts', organizationId, filters],
    queryFn: () => fetchAccounts(organizationId, filters),
  });
};

export const useAccountTree = () => {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['accountTree', organizationId],
    queryFn: () => fetchAccountTree(organizationId),
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountTree'] });
    },
  });
};
```

### Redux Slice Example

```typescript
interface ChartOfAccountsState {
  accounts: Account[];
  tree: AccountTreeNode[];
  selectedAccount: Account | null;
  filters: AccountFilters;
  isLoading: boolean;
  hasSeededChart: boolean;
}
```

---

## Integration with Other Modules

### Tracking Module
- Expenses reference account IDs for categorization
- Revenue entries reference revenue account IDs
- Account balances calculated from transactions

### Planning Module
- Budget line items map to accounts
- Headcount expenses map to payroll accounts
- Revenue plans map to revenue accounts

### Analysis Module
- Variance reports group by account
- Financial statements pull from account balances
- Trends calculated per account or category

### Reporting Module
- P&L organized by account hierarchy
- Balance sheet groups by type
- Custom reports filter by accounts

---

## Error Handling

### Common Errors

| Status | Code | Description | UI Action |
|--------|------|-------------|-----------|
| 400 | VALIDATION_ERROR | Invalid input | Show field errors |
| 400 | INVALID_SUBTYPE | Subtype doesn't match type | Show error message |
| 400 | MAX_DEPTH_EXCEEDED | Too many nesting levels | Show error, suggest different parent |
| 400 | HAS_CHILDREN | Cannot archive with children | Show error, link to children |
| 403 | FORBIDDEN | Insufficient permissions | Show permission denied |
| 404 | NOT_FOUND | Account not found | Show 404, redirect |
| 409 | DUPLICATE_CODE | Code already exists | Suggest different code |
| 409 | CONFLICT | Chart already exists | Ask about overwrite |

### Permission Checks

```typescript
// Check permissions before showing actions
const canCreateAccount = ['owner', 'admin'].includes(membership.role);
const canEditAccount = ['owner', 'admin'].includes(membership.role);
const canSeedChart = membership.role === 'owner';
const canViewAccounts = true; // All members can view
```

---

## Best Practices

1. **Always seed before use** - New organizations should seed the default chart before any financial data entry

2. **Use leaf accounts for transactions** - Parent accounts are for grouping only; transactions should be assigned to leaf accounts

3. **Maintain hierarchy** - Keep the tree organized with logical groupings; don't exceed 5 levels deep

4. **Don't modify system accounts** - Default accounts are marked as `isSystem: true`; prefer creating child accounts

5. **Cache the tree** - The account tree changes rarely; cache it aggressively

6. **Validate subtype/type pairing** - Frontend should only show valid subtypes for the selected type
