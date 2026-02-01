export { HttpStatus, type HttpStatusCode } from './http-status';
export { ErrorMessages, type ErrorMessageKey, type ErrorMessage } from './error-messages';

/**
 * Pagination defaults
 */
export const Pagination = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Common regex patterns
 */
export const Patterns = {
  OBJECT_ID: /^[a-f\d]{24}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  PHONE: /^\+?[\d\s-]{10,}$/,
} as const;

/**
 * User roles
 */
export const UserRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

/**
 * Organization membership status
 */
export const MembershipStatus = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;

export type MembershipStatusType = (typeof MembershipStatus)[keyof typeof MembershipStatus];

/**
 * Common status values
 */
export const Status = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export type StatusType = (typeof Status)[keyof typeof Status];

/**
 * Budget status
 */
export const BudgetStatus = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type BudgetStatusType = (typeof BudgetStatus)[keyof typeof BudgetStatus];

/**
 * Funding round status
 */
export const RoundStatus = {
  PLANNING: 'planning',
  OPEN: 'open',
  CLOSING: 'closing',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export type RoundStatusType = (typeof RoundStatus)[keyof typeof RoundStatus];

/**
 * Transaction types
 */
export const TransactionType = {
  EXPENSE: 'expense',
  REVENUE: 'revenue',
  TRANSFER: 'transfer',
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];
