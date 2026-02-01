/**
 * Trends Routes
 *
 * API routes for trend analysis
 */

import { Router } from 'express';
import { trendsController } from '../controllers/trends.controller';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateQuery } from '@/core/middleware';
import { trendQuerySchema, multiTrendQuerySchema, comparisonQuerySchema } from '../schemas';

const router = Router();

// All routes require authentication and organization
router.use(protect);
router.use(requireOrganization);

/**
 * @openapi
 * /api/v1/analysis/trends/expenses:
 *   get:
 *     summary: Get expense trends
 *     description: Analyze expense trends over time
 *     tags: [Analysis - Trends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/expenses', trendsController.getExpenseTrends);

/**
 * @openapi
 * /api/v1/analysis/trends/revenue:
 *   get:
 *     summary: Get revenue trends
 *     description: Analyze revenue trends over time
 *     tags: [Analysis - Trends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/revenue', trendsController.getRevenueTrends);

/**
 * @openapi
 * /api/v1/analysis/trends/burn-rate:
 *   get:
 *     summary: Get burn rate trends
 *     description: Analyze burn rate (expenses - revenue) trends
 *     tags: [Analysis - Trends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/burn-rate', trendsController.getBurnRateTrends);

/**
 * @openapi
 * /api/v1/analysis/trends/custom:
 *   get:
 *     summary: Get custom trend analysis
 *     description: Analyze trends for any supported metric type
 *     tags: [Analysis - Trends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/custom', validateQuery(trendQuerySchema), trendsController.getCustomTrend);

/**
 * @openapi
 * /api/v1/analysis/trends/multiple:
 *   get:
 *     summary: Get multiple trends at once
 *     description: Analyze multiple metrics together with optional correlation analysis
 *     tags: [Analysis - Trends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/multiple', validateQuery(multiTrendQuerySchema), trendsController.getMultipleTrends);

/**
 * @openapi
 * /api/v1/analysis/trends/comparison:
 *   get:
 *     summary: Get trend comparison
 *     description: Compare current period with previous period
 *     tags: [Analysis - Trends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/comparison', validateQuery(comparisonQuerySchema), trendsController.getTrendComparison);

export default router;
