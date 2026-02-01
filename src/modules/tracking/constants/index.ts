/**
 * Tracking Module Constants
 * Enums, statuses, and configuration values for all tracking sub-modules
 */

// ============ Transaction Constants ============

export const TransactionType = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  PENDING: 'pending',
  CLEARED: 'cleared',
  RECONCILED: 'reconciled',
} as const;

export type TransactionStatusType = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const TransactionSource = {
  MANUAL: 'manual',
  IMPORTED: 'imported',
  RECURRING: 'recurring',
  EXPENSE: 'expense',
  REVENUE: 'revenue',
} as const;

export type TransactionSourceType = (typeof TransactionSource)[keyof typeof TransactionSource];

export const PaymentMethod = {
  CASH: 'cash',
  CHECK: 'check',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  ACH: 'ach',
  WIRE: 'wire',
  OTHER: 'other',
} as const;

export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ============ Expense Constants ============

export const ExpenseStatus = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
} as const;

export type ExpenseStatusType = (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

export const RecurringFrequency = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
} as const;

export type RecurringFrequencyType = (typeof RecurringFrequency)[keyof typeof RecurringFrequency];

// ============ Revenue Entry Constants ============

export const RevenueEntryStatus = {
  PENDING: 'pending',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type RevenueEntryStatusType = (typeof RevenueEntryStatus)[keyof typeof RevenueEntryStatus];

export const RevenueType = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  SERVICES: 'services',
} as const;

export type RevenueTypeValue = (typeof RevenueType)[keyof typeof RevenueType];

// ============ Customer Constants ============

export const SubscriptionStatus = {
  ACTIVE: 'active',
  CHURNED: 'churned',
  PAUSED: 'paused',
  TRIAL: 'trial',
} as const;

export type SubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// ============ Bank Sync Constants ============

export const BankAccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
  MONEY_MARKET: 'money_market',
} as const;

export type BankAccountTypeValue = (typeof BankAccountType)[keyof typeof BankAccountType];

export const BankTransactionStatus = {
  UNMATCHED: 'unmatched',
  MATCHED: 'matched',
  RECONCILED: 'reconciled',
  IGNORED: 'ignored',
} as const;

export type BankTransactionStatusType = (typeof BankTransactionStatus)[keyof typeof BankTransactionStatus];

// ============ Linked Entity Types ============

export const LinkedEntityType = {
  EXPENSE: 'expense',
  REVENUE: 'revenue',
  BANK_TRANSACTION: 'bank_transaction',
} as const;

export type LinkedEntityTypeValue = (typeof LinkedEntityType)[keyof typeof LinkedEntityType];

// ============ Validation Constants ============

export const TRACKING_CONSTANTS = {
  // Name/Description limits
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 1000,
  REFERENCE_MAX_LENGTH: 100,
  INVOICE_NUMBER_MAX_LENGTH: 50,
  NOTES_MAX_LENGTH: 500,

  // Address limits
  ADDRESS_MAX_LENGTH: 500,
  TAX_ID_MAX_LENGTH: 50,
  PAYMENT_TERMS_MAX_LENGTH: 100,

  // Bulk operation limits
  MAX_BULK_TRANSACTIONS: 500,
  MAX_CSV_ROWS: 5000,

  // Currency
  DEFAULT_CURRENCY: 'USD',

  // Bank account
  ACCOUNT_NUMBER_DISPLAY_DIGITS: 4,

  // Tag limits
  MAX_TAGS: 20,
  TAG_MAX_LENGTH: 50,

  // Attachment limits
  MAX_ATTACHMENTS: 10,

  // Reconciliation
  MATCH_DATE_RANGE_DAYS: 7,
  AUTO_MATCH_MIN_CONFIDENCE: 80,
} as const;

// ============ Month Names Helper ============

export const MonthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  return MonthNames[month - 1];
}
