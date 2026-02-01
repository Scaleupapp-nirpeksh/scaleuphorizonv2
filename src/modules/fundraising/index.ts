/**
 * Fundraising Module
 *
 * Module 8: Fundraising management including:
 * - Funding Rounds (Pre-seed, Seed, Series A, etc.)
 * - Investor Management with Tranches
 * - Cap Table Management
 * - ESOP (Employee Stock Option Plan)
 */

// Routes
export { default as fundraisingRoutes } from './routes';

// Constants
export * from './constants';

// Types
export * from './types';

// Models
export { Round, IRound } from './rounds/models';
export { Investor, IInvestor, ITranche } from './investors/models';
export { CapTableEntry, ICapTableEntry, ShareClassModel, IShareClass } from './cap-table/models';
export { ESOPPool, IESOPPool, ESOPGrant, IESOPGrant } from './esop/models';

// Services
export { roundService } from './rounds/services';
export { investorService } from './investors/services';
export { capTableService } from './cap-table/services';
export { esopService } from './esop/services';
