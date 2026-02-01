/**
 * Chart of Accounts Module
 *
 * Defines the financial taxonomy for the organization.
 * Provides hierarchical account structure for categorizing
 * all financial transactions.
 *
 * Account Types:
 * - Asset: Cash, receivables, equipment, etc.
 * - Liability: Payables, loans, deferred revenue, etc.
 * - Equity: Owner's equity, retained earnings, stock, etc.
 * - Revenue: Sales, service income, subscriptions, etc.
 * - Expense: Operating costs, payroll, marketing, etc.
 *
 * Endpoints:
 * - GET    /chart-of-accounts              - Get all accounts
 * - POST   /chart-of-accounts              - Create account
 * - GET    /chart-of-accounts/tree         - Get hierarchical tree
 * - GET    /chart-of-accounts/stats        - Get statistics
 * - GET    /chart-of-accounts/leaf         - Get leaf accounts
 * - GET    /chart-of-accounts/by-type/:type - Get by type
 * - POST   /chart-of-accounts/seed         - Seed default chart
 * - GET    /chart-of-accounts/:id          - Get account
 * - PUT    /chart-of-accounts/:id          - Update account
 * - DELETE /chart-of-accounts/:id          - Archive account
 */

// Models
export * from './models';

// Services
export * from './services';

// Controllers
export * from './controllers';

// Routes
export * from './routes';

// Schemas
export * from './schemas';

// Types
export * from './types';

// Constants
export * from './constants';

// Default export is the router
export { chartOfAccountsRoutes as default } from './routes';
