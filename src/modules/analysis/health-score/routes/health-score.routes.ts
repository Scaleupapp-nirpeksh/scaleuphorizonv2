/**
 * Health Score Routes
 *
 * API routes for health score analysis
 */

import { Router } from 'express';
import { healthScoreController } from '../controllers/health-score.controller';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateQuery } from '@/core/middleware';
import { healthScoreQuerySchema, historyQuerySchema, breakdownQuerySchema } from '../schemas';

const router = Router();

// All routes require authentication and organization
router.use(protect);
router.use(requireOrganization);

/**
 * @openapi
 * /api/v1/analysis/health-score:
 *   get:
 *     summary: Get financial health score
 *     tags: [Analysis - Health Score]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  validateQuery(healthScoreQuerySchema),
  healthScoreController.getHealthScore
);

/**
 * @openapi
 * /api/v1/analysis/health-score/history:
 *   get:
 *     summary: Get health score history
 *     tags: [Analysis - Health Score]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/history',
  validateQuery(historyQuerySchema),
  healthScoreController.getHistory
);

/**
 * @openapi
 * /api/v1/analysis/health-score/breakdown:
 *   get:
 *     summary: Get health score category breakdown
 *     tags: [Analysis - Health Score]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/breakdown',
  validateQuery(breakdownQuerySchema),
  healthScoreController.getBreakdown
);

export default router;
