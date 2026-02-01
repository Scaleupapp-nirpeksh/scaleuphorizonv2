import { Types } from 'mongoose';

/**
 * MongoDB ObjectId type alias
 */
export type ObjectId = Types.ObjectId;

/**
 * String or ObjectId (for flexibility in queries)
 */
export type IdType = string | ObjectId;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
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

/**
 * Standard API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Date range filter
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Money amount with currency
 */
export interface MoneyAmount {
  amount: number;
  currency: string;
}

/**
 * Audit fields for documents
 */
export interface AuditFields {
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Soft delete fields
 */
export interface SoftDeleteFields {
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: ObjectId;
}

/**
 * Organization-scoped document base
 */
export interface OrganizationScoped {
  organization: ObjectId;
}

/**
 * Query filters for list endpoints
 */
export interface QueryFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  [key: string]: string | undefined;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * File upload metadata
 */
export interface FileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  key: string;
  uploadedAt: Date;
  uploadedBy: ObjectId;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  recipients: ObjectId[];
}

/**
 * Calculation result with breakdown
 */
export interface CalculationResult {
  value: number;
  breakdown?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

/**
 * Time period options
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Fiscal period
 */
export interface FiscalPeriod {
  year: number;
  quarter?: number;
  month?: number;
}
