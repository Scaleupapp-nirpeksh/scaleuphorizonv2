import { Types } from 'mongoose';
import {
  TransactionTypeValue,
  TransactionStatusType,
  TransactionSourceType,
  PaymentMethodType,
  ExpenseStatusType,
  RevenueEntryStatusType,
  RevenueTypeValue,
  SubscriptionStatusType,
  BankAccountTypeValue,
  BankTransactionStatusType,
  LinkedEntityTypeValue,
} from '../constants';

// ============ Common Types ============

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface LinkedEntity {
  entityType: LinkedEntityTypeValue;
  entityId: Types.ObjectId;
}

export interface TrackingContext {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
}

// ============ Transaction Types ============

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface TransactionFilters {
  type?: TransactionTypeValue;
  status?: TransactionStatusType;
  source?: TransactionSourceType;
  accountId?: string;
  category?: string;
  paymentMethod?: PaymentMethodType;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  tags?: string[];
  isArchived?: boolean;
}

export interface BulkCategorizeInput {
  transactionIds: string[];
  accountId: string;
}

// ============ Expense Types ============

export interface ExpenseSummary {
  totalAmount: number;
  expenseCount: number;
  byCategory: Record<string, number>;
  byVendor: Record<string, number>;
  byStatus: Record<string, number>;
  pendingApprovals: number;
  recurringTotal: number;
}

export interface VendorExpenseSummary {
  vendorId: string;
  vendorName: string;
  totalSpent: number;
  expenseCount: number;
  lastExpenseDate?: Date;
}

export interface CategoryExpenseSummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
  trend?: number; // Percentage change from previous period
}

export interface ExpenseFilters {
  status?: ExpenseStatusType;
  vendorId?: string;
  accountId?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  isRecurring?: boolean;
  department?: string;
  costCenter?: string;
  search?: string;
  tags?: string[];
  isArchived?: boolean;
}

export interface PaymentDetails {
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  paidAt?: Date;
}

// ============ Vendor Types ============

export interface VendorFilters {
  isActive?: boolean;
  hasDefaultAccount?: boolean;
  search?: string;
  tags?: string[];
}

export interface VendorSummary {
  id: string;
  name: string;
  totalSpent: number;
  expenseCount: number;
  lastExpenseDate?: Date;
  isActive: boolean;
}

// ============ Revenue Entry Types ============

export interface RevenueSummary {
  totalRevenue: number;
  entryCount: number;
  byType: Record<string, number>;
  byCustomer: Record<string, number>;
  byStatus: Record<string, number>;
  pendingAmount: number;
  receivedAmount: number;
}

export interface CustomerRevenueSummary {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  entryCount: number;
  monthlyValue: number;
  subscriptionStatus?: SubscriptionStatusType;
}

export interface RevenueTypeSummary {
  revenueType: RevenueTypeValue;
  total: number;
  count: number;
  percentage: number;
}

export interface MRRMetrics {
  currentMRR: number;
  previousMRR: number;
  mrrChange: number;
  mrrChangePercentage: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  netNewMRR: number;
  activeSubscribers: number;
  avgRevenuePerAccount: number;
}

export interface ARRMetrics {
  currentARR: number;
  projectedARR: number;
  annualGrowthRate: number;
}

export interface RevenueEntryFilters {
  status?: RevenueEntryStatusType;
  customerId?: string;
  accountId?: string;
  category?: string;
  revenueType?: RevenueTypeValue;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  tags?: string[];
  isArchived?: boolean;
}

export interface ReceivedDetails {
  receivedAt?: Date;
  paymentMethod?: PaymentMethodType;
  paymentReference?: string;
}

// ============ Customer Types ============

export interface CustomerFilters {
  isActive?: boolean;
  subscriptionStatus?: SubscriptionStatusType;
  minMonthlyValue?: number;
  maxMonthlyValue?: number;
  search?: string;
  tags?: string[];
}

export interface CustomerSummary {
  id: string;
  name: string;
  email?: string;
  company?: string;
  subscriptionStatus?: SubscriptionStatusType;
  monthlyValue: number;
  totalRevenue: number;
  isActive: boolean;
}

// ============ Bank Account Types ============

export interface BankAccountFilters {
  isActive?: boolean;
  accountType?: BankAccountTypeValue;
  search?: string;
}

export interface BankAccountSummary {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountTypeValue;
  currentBalance: number;
  lastImportDate?: Date;
  unmatchedTransactions: number;
  isActive: boolean;
}

// ============ Bank Transaction Types ============

export interface BankTransactionFilters {
  bankAccountId?: string;
  status?: BankTransactionStatusType;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  search?: string;
  importBatchId?: string;
}

export interface MatchSuggestion {
  transactionId: string;
  description: string;
  amount: number;
  date: Date;
  confidence: number;
  matchReasons: string[];
}

export interface ReconciliationSummary {
  bankAccountId: string;
  bankAccountName: string;
  totalTransactions: number;
  unmatchedCount: number;
  matchedCount: number;
  reconciledCount: number;
  ignoredCount: number;
  unmatchedAmount: number;
  lastReconciliationDate?: Date;
}

export interface AutoMatchResult {
  matched: number;
  unmatched: number;
  matches: Array<{
    bankTransactionId: string;
    transactionId: string;
    confidence: number;
  }>;
}

// ============ CSV Import Types ============

export interface CSVMappingConfig {
  dateColumn: string;
  dateFormat: string;
  descriptionColumn: string;
  amountColumn: string;
  amountFormat: 'single' | 'debit_credit';
  debitColumn?: string;
  creditColumn?: string;
  skipRows?: number;
  negativeExpenses?: boolean;
}

export interface CSVValidationResult {
  isValid: boolean;
  rowCount: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    column: string;
    message: string;
  }>;
}

export interface CSVPreviewRow {
  rowNumber: number;
  date: string;
  description: string;
  amount: number;
  isDuplicate: boolean;
  parseError?: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedDuplicates: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
  importBatchId: string;
}

// ============ Pagination Types ============

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
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
