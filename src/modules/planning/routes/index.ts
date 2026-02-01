import { Router } from 'express';
import { budgetRoutes } from '../budget/routes';
import { headcountRoutes } from '../headcount/routes';
import { revenuePlanRoutes } from '../revenue-plan/routes';
import { scenarioRoutes } from '../scenarios/routes';

const router = Router();

/**
 * Planning Module Routes
 *
 * This module handles all financial planning functionality:
 * - /budgets - Budget planning with line items linked to Chart of Accounts
 * - /headcount - Headcount planning with roles and cost projections
 * - /revenue - Revenue planning with streams and MRR metrics
 * - /scenarios - Scenario planning for what-if analysis
 */

// Mount sub-module routes
router.use('/budgets', budgetRoutes);
router.use('/headcount', headcountRoutes);
router.use('/revenue', revenuePlanRoutes);
router.use('/scenarios', scenarioRoutes);

export default router;
