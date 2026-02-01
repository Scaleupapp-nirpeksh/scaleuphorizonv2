/**
 * Variance Routes
 *
 * API routes for variance analysis
 */

import { Router } from 'express';
import { varianceController } from '../controllers/variance.controller';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateQuery } from '@/core/middleware';
import {
  varianceQuerySchema,
  monthlyVarianceQuerySchema,
  categoryVarianceQuerySchema,
} from '../schemas';

const router = Router();

// All routes require authentication and organization
router.use(protect);
router.use(requireOrganization);

/**
 * @openapi
 * /api/v1/analysis/variance/budget:
 *   get:
 *     summary: Get budget vs actual variance
 *     description: Compare budgeted amounts with actual expenses
 *     tags: [Analysis - Variance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *         description: Fiscal year (defaults to current year)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly, ytd, custom]
 *         description: Analysis period type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom period start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom period end date (YYYY-MM-DD)
 *       - in: query
 *         name: budgetId
 *         schema:
 *           type: string
 *         description: Specific budget ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Budget variance report
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active budget found
 */
router.get(
  '/budget',
  validateQuery(varianceQuerySchema),
  varianceController.getBudgetVariance
);

/**
 * @openapi
 * /api/v1/analysis/variance/revenue:
 *   get:
 *     summary: Get revenue plan vs actual variance
 *     description: Compare planned revenue with actual revenue
 *     tags: [Analysis - Variance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *         description: Fiscal year
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly, ytd, custom]
 *       - in: query
 *         name: revenuePlanId
 *         schema:
 *           type: string
 *         description: Specific revenue plan ID
 *     responses:
 *       200:
 *         description: Revenue variance report
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active revenue plan found
 */
router.get(
  '/revenue',
  validateQuery(varianceQuerySchema),
  varianceController.getRevenueVariance
);

/**
 * @openapi
 * /api/v1/analysis/variance/headcount:
 *   get:
 *     summary: Get headcount plan vs actual variance
 *     description: Compare planned headcount and costs with actuals
 *     tags: [Analysis - Variance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly, ytd, custom]
 *       - in: query
 *         name: headcountPlanId
 *         schema:
 *           type: string
 *         description: Specific headcount plan ID
 *     responses:
 *       200:
 *         description: Headcount variance report
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active headcount plan found
 */
router.get(
  '/headcount',
  validateQuery(varianceQuerySchema),
  varianceController.getHeadcountVariance
);

/**
 * @openapi
 * /api/v1/analysis/variance/by-category:
 *   get:
 *     summary: Get variance grouped by category
 *     description: View variance breakdown by expense or revenue category
 *     tags: [Analysis - Variance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [budget, revenue, headcount, expense]
 *         description: Variance type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Category variance breakdown
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/by-category',
  validateQuery(categoryVarianceQuerySchema),
  varianceController.getCategoryVariance
);

/**
 * @openapi
 * /api/v1/analysis/variance/by-month:
 *   get:
 *     summary: Get monthly variance breakdown
 *     description: View variance for each month with cumulative totals
 *     tags: [Analysis - Variance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fiscalYear
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: budgetId
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monthly variance breakdown
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/by-month',
  validateQuery(monthlyVarianceQuerySchema),
  varianceController.getMonthlyVariance
);

export default router;
