/**
 * Standard Error Messages
 */
export const ErrorMessages = {
  // Authentication
  AUTH_REQUIRED: 'Authentication required',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  TOKEN_MISSING: 'No token provided',
  ACCOUNT_DISABLED: 'Account has been disabled',
  ACCOUNT_NOT_VERIFIED: 'Account not verified',

  // Authorization
  ACCESS_DENIED: 'Access denied',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  ROLE_REQUIRED: 'Required role not found',
  ORGANIZATION_REQUIRED: 'Active organization required',
  NOT_ORGANIZATION_MEMBER: 'Not a member of this organization',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PASSWORD: 'Password does not meet requirements',
  PASSWORD_MISMATCH: 'Passwords do not match',
  INVALID_DATE: 'Invalid date format',
  INVALID_ID: 'Invalid ID format',

  // Resources
  RESOURCE_NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  BUDGET_NOT_FOUND: 'Budget not found',
  EXPENSE_NOT_FOUND: 'Expense not found',
  REVENUE_NOT_FOUND: 'Revenue entry not found',
  ROUND_NOT_FOUND: 'Funding round not found',
  INVESTOR_NOT_FOUND: 'Investor not found',

  // Conflicts
  RESOURCE_EXISTS: 'Resource already exists',
  EMAIL_EXISTS: 'Email already registered',
  DUPLICATE_ENTRY: 'Duplicate entry',
  BUDGET_EXISTS_FOR_PERIOD: 'Budget already exists for this period',

  // Operations
  OPERATION_FAILED: 'Operation failed',
  CREATE_FAILED: 'Failed to create resource',
  UPDATE_FAILED: 'Failed to update resource',
  DELETE_FAILED: 'Failed to delete resource',
  ARCHIVE_FAILED: 'Failed to archive resource',

  // Business Logic
  BUDGET_NOT_APPROVED: 'Budget is not approved',
  ROUND_ALREADY_CLOSED: 'Funding round is already closed',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',

  // Server
  INTERNAL_ERROR: 'An unexpected error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_SERVICE_ERROR: 'External service error',
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
export type ErrorMessage = (typeof ErrorMessages)[ErrorMessageKey];

export default ErrorMessages;
