import { Router } from 'express';
import { transactionRoutes } from '../transactions/routes';
import { expenseRoutes, vendorRoutes } from '../expenses/routes';
import { revenueRoutes, customerRoutes } from '../revenue/routes';
import { bankSyncRoutes } from '../bank-sync/routes';

const router = Router();

/**
 * Tracking Module Routes
 *
 * Base path: /api/v1/tracking
 *
 * Sub-modules:
 * - /transactions - Transaction hub for all financial transactions
 * - /expenses - Expense management with approval workflow
 * - /vendors - Vendor management
 * - /revenue - Revenue tracking with MRR/ARR metrics
 * - /customers - Customer management
 * - /bank-accounts - Bank account management
 * - /bank-transactions - Bank transaction reconciliation
 */

// Transactions: /tracking/transactions/*
router.use('/transactions', transactionRoutes);

// Expenses: /tracking/expenses/*
router.use('/expenses', expenseRoutes);

// Vendors: /tracking/vendors/*
router.use('/vendors', vendorRoutes);

// Revenue: /tracking/revenue/*
router.use('/revenue', revenueRoutes);

// Customers: /tracking/customers/*
router.use('/customers', customerRoutes);

// Bank Sync: /tracking/bank-accounts/*, /tracking/bank-transactions/*
router.use('/', bankSyncRoutes);

export default router;
