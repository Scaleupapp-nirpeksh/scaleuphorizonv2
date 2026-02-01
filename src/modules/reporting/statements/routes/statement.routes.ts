/**
 * Statement Routes
 *
 * Express routes for financial statement generation
 */

import { Router } from 'express';
import { statementController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';

const router = Router();

// All routes require authentication and organization
router.use(protect, requireOrganization);

/**
 * @route   GET /api/v1/reporting/statements/pnl
 * @desc    Get Profit & Loss Statement
 * @access  Private
 * @query   periodType, year, month, quarter, startDate, endDate
 */
router.get('/pnl', statementController.getProfitLoss);

/**
 * @route   GET /api/v1/reporting/statements/balance
 * @desc    Get Balance Sheet
 * @access  Private
 * @query   asOfDate
 */
router.get('/balance', statementController.getBalanceSheet);

/**
 * @route   GET /api/v1/reporting/statements/cashflow
 * @desc    Get Cash Flow Statement
 * @access  Private
 * @query   periodType, year, month, quarter, startDate, endDate
 */
router.get('/cashflow', statementController.getCashFlow);

/**
 * @route   GET /api/v1/reporting/statements/compare
 * @desc    Compare statements between periods
 * @access  Private
 * @query   type (pnl/balance/cashflow), currentPeriod, previousPeriod
 */
router.get('/compare', statementController.getComparison);

/**
 * @route   GET /api/v1/reporting/statements/export
 * @desc    Export statement to PDF/Excel/CSV
 * @access  Private
 * @query   type, format, periodType, year, month, quarter
 */
router.get('/export', statementController.exportStatement);

export default router;
