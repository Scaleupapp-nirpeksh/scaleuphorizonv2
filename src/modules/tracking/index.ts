/**
 * Tracking Module
 *
 * Handles all financial data capture and tracking:
 * - Transactions: Core transaction hub
 * - Expenses: Expense management with approval workflow
 * - Revenue: Revenue tracking with MRR/ARR metrics
 * - Bank Sync: CSV import and reconciliation
 */

// Constants
export * from './constants';

// Types
export * from './types';

// Utils
export * from './utils';

// Sub-module exports
export * from './transactions';
export * from './expenses';
export * from './revenue';
export * from './bank-sync';

// Main route aggregation
import trackingRoutes from './routes';
export { trackingRoutes };
export default trackingRoutes;
