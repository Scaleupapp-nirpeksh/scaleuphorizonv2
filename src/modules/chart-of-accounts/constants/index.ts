/**
 * Chart of Accounts module constants
 */

/**
 * Account types following standard accounting principles
 */
export const AccountTypes = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  REVENUE: 'revenue',
  EXPENSE: 'expense',
} as const;

export type AccountType = (typeof AccountTypes)[keyof typeof AccountTypes];

/**
 * Account subtypes for more granular categorization
 */
export const AccountSubtypes = {
  // Assets
  CASH: 'cash',
  BANK: 'bank',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  INVENTORY: 'inventory',
  PREPAID_EXPENSES: 'prepaid_expenses',
  FIXED_ASSETS: 'fixed_assets',
  INTANGIBLE_ASSETS: 'intangible_assets',
  OTHER_ASSETS: 'other_assets',

  // Liabilities
  ACCOUNTS_PAYABLE: 'accounts_payable',
  CREDIT_CARD: 'credit_card',
  SHORT_TERM_DEBT: 'short_term_debt',
  LONG_TERM_DEBT: 'long_term_debt',
  ACCRUED_LIABILITIES: 'accrued_liabilities',
  DEFERRED_REVENUE: 'deferred_revenue',
  OTHER_LIABILITIES: 'other_liabilities',

  // Equity
  OWNERS_EQUITY: 'owners_equity',
  RETAINED_EARNINGS: 'retained_earnings',
  COMMON_STOCK: 'common_stock',
  PREFERRED_STOCK: 'preferred_stock',
  ADDITIONAL_PAID_IN_CAPITAL: 'additional_paid_in_capital',

  // Revenue
  OPERATING_REVENUE: 'operating_revenue',
  SERVICE_REVENUE: 'service_revenue',
  PRODUCT_REVENUE: 'product_revenue',
  SUBSCRIPTION_REVENUE: 'subscription_revenue',
  OTHER_INCOME: 'other_income',

  // Expenses
  COST_OF_GOODS_SOLD: 'cost_of_goods_sold',
  PAYROLL: 'payroll',
  MARKETING: 'marketing',
  SALES: 'sales',
  GENERAL_ADMIN: 'general_admin',
  RENT: 'rent',
  UTILITIES: 'utilities',
  SOFTWARE: 'software',
  PROFESSIONAL_SERVICES: 'professional_services',
  TRAVEL: 'travel',
  DEPRECIATION: 'depreciation',
  INTEREST_EXPENSE: 'interest_expense',
  TAXES: 'taxes',
  OTHER_EXPENSES: 'other_expenses',
} as const;

export type AccountSubtype = (typeof AccountSubtypes)[keyof typeof AccountSubtypes];

/**
 * Map subtypes to their parent account types
 */
export const SubtypeToType: Record<AccountSubtype, AccountType> = {
  // Assets
  cash: AccountTypes.ASSET,
  bank: AccountTypes.ASSET,
  accounts_receivable: AccountTypes.ASSET,
  inventory: AccountTypes.ASSET,
  prepaid_expenses: AccountTypes.ASSET,
  fixed_assets: AccountTypes.ASSET,
  intangible_assets: AccountTypes.ASSET,
  other_assets: AccountTypes.ASSET,

  // Liabilities
  accounts_payable: AccountTypes.LIABILITY,
  credit_card: AccountTypes.LIABILITY,
  short_term_debt: AccountTypes.LIABILITY,
  long_term_debt: AccountTypes.LIABILITY,
  accrued_liabilities: AccountTypes.LIABILITY,
  deferred_revenue: AccountTypes.LIABILITY,
  other_liabilities: AccountTypes.LIABILITY,

  // Equity
  owners_equity: AccountTypes.EQUITY,
  retained_earnings: AccountTypes.EQUITY,
  common_stock: AccountTypes.EQUITY,
  preferred_stock: AccountTypes.EQUITY,
  additional_paid_in_capital: AccountTypes.EQUITY,

  // Revenue
  operating_revenue: AccountTypes.REVENUE,
  service_revenue: AccountTypes.REVENUE,
  product_revenue: AccountTypes.REVENUE,
  subscription_revenue: AccountTypes.REVENUE,
  other_income: AccountTypes.REVENUE,

  // Expenses
  cost_of_goods_sold: AccountTypes.EXPENSE,
  payroll: AccountTypes.EXPENSE,
  marketing: AccountTypes.EXPENSE,
  sales: AccountTypes.EXPENSE,
  general_admin: AccountTypes.EXPENSE,
  rent: AccountTypes.EXPENSE,
  utilities: AccountTypes.EXPENSE,
  software: AccountTypes.EXPENSE,
  professional_services: AccountTypes.EXPENSE,
  travel: AccountTypes.EXPENSE,
  depreciation: AccountTypes.EXPENSE,
  interest_expense: AccountTypes.EXPENSE,
  taxes: AccountTypes.EXPENSE,
  other_expenses: AccountTypes.EXPENSE,
};

/**
 * Account code ranges by type (for auto-generating codes)
 */
export const AccountCodeRanges = {
  asset: { start: 1000, end: 1999 },
  liability: { start: 2000, end: 2999 },
  equity: { start: 3000, end: 3999 },
  revenue: { start: 4000, end: 4999 },
  expense: { start: 5000, end: 9999 },
} as const;

/**
 * Default chart of accounts for startups
 * Used for seeding new organizations
 */
export interface DefaultAccountDefinition {
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  description?: string;
  children?: Omit<DefaultAccountDefinition, 'type'>[];
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountDefinition[] = [
  // Assets
  {
    code: '1000',
    name: 'Assets',
    type: 'asset',
    subtype: 'other_assets',
    description: 'All company assets',
    children: [
      {
        code: '1100',
        name: 'Cash and Cash Equivalents',
        subtype: 'cash',
        children: [
          { code: '1110', name: 'Petty Cash', subtype: 'cash' },
          { code: '1120', name: 'Operating Bank Account', subtype: 'bank' },
          { code: '1130', name: 'Savings Account', subtype: 'bank' },
        ],
      },
      {
        code: '1200',
        name: 'Accounts Receivable',
        subtype: 'accounts_receivable',
        children: [
          { code: '1210', name: 'Trade Receivables', subtype: 'accounts_receivable' },
          { code: '1290', name: 'Allowance for Doubtful Accounts', subtype: 'accounts_receivable' },
        ],
      },
      {
        code: '1300',
        name: 'Prepaid Expenses',
        subtype: 'prepaid_expenses',
        children: [
          { code: '1310', name: 'Prepaid Insurance', subtype: 'prepaid_expenses' },
          { code: '1320', name: 'Prepaid Rent', subtype: 'prepaid_expenses' },
          { code: '1330', name: 'Prepaid Software Subscriptions', subtype: 'prepaid_expenses' },
        ],
      },
      {
        code: '1500',
        name: 'Fixed Assets',
        subtype: 'fixed_assets',
        children: [
          { code: '1510', name: 'Computer Equipment', subtype: 'fixed_assets' },
          { code: '1520', name: 'Furniture and Fixtures', subtype: 'fixed_assets' },
          { code: '1590', name: 'Accumulated Depreciation', subtype: 'fixed_assets' },
        ],
      },
    ],
  },

  // Liabilities
  {
    code: '2000',
    name: 'Liabilities',
    type: 'liability',
    subtype: 'other_liabilities',
    description: 'All company liabilities',
    children: [
      {
        code: '2100',
        name: 'Accounts Payable',
        subtype: 'accounts_payable',
        children: [
          { code: '2110', name: 'Trade Payables', subtype: 'accounts_payable' },
          { code: '2120', name: 'Vendor Payables', subtype: 'accounts_payable' },
        ],
      },
      {
        code: '2200',
        name: 'Credit Cards',
        subtype: 'credit_card',
        children: [{ code: '2210', name: 'Company Credit Card', subtype: 'credit_card' }],
      },
      {
        code: '2300',
        name: 'Accrued Liabilities',
        subtype: 'accrued_liabilities',
        children: [
          { code: '2310', name: 'Accrued Payroll', subtype: 'accrued_liabilities' },
          { code: '2320', name: 'Accrued Taxes', subtype: 'accrued_liabilities' },
          { code: '2330', name: 'Accrued Interest', subtype: 'accrued_liabilities' },
        ],
      },
      {
        code: '2400',
        name: 'Deferred Revenue',
        subtype: 'deferred_revenue',
        children: [{ code: '2410', name: 'Unearned Revenue', subtype: 'deferred_revenue' }],
      },
      {
        code: '2500',
        name: 'Loans Payable',
        subtype: 'long_term_debt',
        children: [
          { code: '2510', name: 'Short-term Loans', subtype: 'short_term_debt' },
          { code: '2520', name: 'Long-term Loans', subtype: 'long_term_debt' },
          { code: '2530', name: 'Convertible Notes', subtype: 'long_term_debt' },
        ],
      },
    ],
  },

  // Equity
  {
    code: '3000',
    name: 'Equity',
    type: 'equity',
    subtype: 'owners_equity',
    description: 'Shareholders equity',
    children: [
      { code: '3100', name: 'Common Stock', subtype: 'common_stock' },
      { code: '3200', name: 'Preferred Stock', subtype: 'preferred_stock' },
      { code: '3300', name: 'Additional Paid-in Capital', subtype: 'additional_paid_in_capital' },
      { code: '3400', name: 'Retained Earnings', subtype: 'retained_earnings' },
    ],
  },

  // Revenue
  {
    code: '4000',
    name: 'Revenue',
    type: 'revenue',
    subtype: 'operating_revenue',
    description: 'All income sources',
    children: [
      {
        code: '4100',
        name: 'Operating Revenue',
        subtype: 'operating_revenue',
        children: [
          { code: '4110', name: 'Product Sales', subtype: 'product_revenue' },
          { code: '4120', name: 'Service Revenue', subtype: 'service_revenue' },
          { code: '4130', name: 'Subscription Revenue', subtype: 'subscription_revenue' },
        ],
      },
      {
        code: '4500',
        name: 'Other Income',
        subtype: 'other_income',
        children: [
          { code: '4510', name: 'Interest Income', subtype: 'other_income' },
          { code: '4520', name: 'Refunds and Rebates', subtype: 'other_income' },
        ],
      },
    ],
  },

  // Expenses
  {
    code: '5000',
    name: 'Expenses',
    type: 'expense',
    subtype: 'other_expenses',
    description: 'All expenses',
    children: [
      {
        code: '5100',
        name: 'Cost of Goods Sold',
        subtype: 'cost_of_goods_sold',
        children: [
          { code: '5110', name: 'Direct Materials', subtype: 'cost_of_goods_sold' },
          { code: '5120', name: 'Direct Labor', subtype: 'cost_of_goods_sold' },
          { code: '5130', name: 'Hosting and Infrastructure', subtype: 'cost_of_goods_sold' },
        ],
      },
      {
        code: '6000',
        name: 'Payroll Expenses',
        subtype: 'payroll',
        children: [
          { code: '6100', name: 'Salaries and Wages', subtype: 'payroll' },
          { code: '6200', name: 'Employee Benefits', subtype: 'payroll' },
          { code: '6300', name: 'Payroll Taxes', subtype: 'payroll' },
          { code: '6400', name: 'Contractor Payments', subtype: 'payroll' },
        ],
      },
      {
        code: '7000',
        name: 'Operating Expenses',
        subtype: 'general_admin',
        children: [
          {
            code: '7100',
            name: 'Marketing and Advertising',
            subtype: 'marketing',
            children: [
              { code: '7110', name: 'Digital Advertising', subtype: 'marketing' },
              { code: '7120', name: 'Content Marketing', subtype: 'marketing' },
              { code: '7130', name: 'Events and Conferences', subtype: 'marketing' },
            ],
          },
          {
            code: '7200',
            name: 'Sales Expenses',
            subtype: 'sales',
            children: [
              { code: '7210', name: 'Sales Commissions', subtype: 'sales' },
              { code: '7220', name: 'Sales Tools', subtype: 'sales' },
            ],
          },
          {
            code: '7300',
            name: 'Software and Tools',
            subtype: 'software',
            children: [
              { code: '7310', name: 'SaaS Subscriptions', subtype: 'software' },
              { code: '7320', name: 'Development Tools', subtype: 'software' },
            ],
          },
          {
            code: '7400',
            name: 'Office and Facilities',
            subtype: 'rent',
            children: [
              { code: '7410', name: 'Rent', subtype: 'rent' },
              { code: '7420', name: 'Utilities', subtype: 'utilities' },
              { code: '7430', name: 'Office Supplies', subtype: 'general_admin' },
            ],
          },
          {
            code: '7500',
            name: 'Professional Services',
            subtype: 'professional_services',
            children: [
              { code: '7510', name: 'Legal Fees', subtype: 'professional_services' },
              { code: '7520', name: 'Accounting Fees', subtype: 'professional_services' },
              { code: '7530', name: 'Consulting Fees', subtype: 'professional_services' },
            ],
          },
          {
            code: '7600',
            name: 'Travel and Entertainment',
            subtype: 'travel',
            children: [
              { code: '7610', name: 'Travel', subtype: 'travel' },
              { code: '7620', name: 'Meals and Entertainment', subtype: 'travel' },
            ],
          },
        ],
      },
      {
        code: '8000',
        name: 'Other Expenses',
        subtype: 'other_expenses',
        children: [
          { code: '8100', name: 'Depreciation Expense', subtype: 'depreciation' },
          { code: '8200', name: 'Interest Expense', subtype: 'interest_expense' },
          { code: '8300', name: 'Bank Fees', subtype: 'other_expenses' },
          { code: '8400', name: 'Insurance', subtype: 'other_expenses' },
          { code: '8500', name: 'Taxes and Licenses', subtype: 'taxes' },
        ],
      },
    ],
  },
];

export const CHART_OF_ACCOUNTS_CONSTANTS = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  CODE_MIN_LENGTH: 1,
  CODE_MAX_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 500,
  MAX_DEPTH: 5, // Maximum nesting level for accounts
} as const;

export default {
  AccountTypes,
  AccountSubtypes,
  SubtypeToType,
  AccountCodeRanges,
  DEFAULT_CHART_OF_ACCOUNTS,
  CHART_OF_ACCOUNTS_CONSTANTS,
};
