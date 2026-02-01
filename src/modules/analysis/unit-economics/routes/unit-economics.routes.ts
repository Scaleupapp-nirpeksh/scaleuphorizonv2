/**
 * Unit Economics Routes
 *
 * API routes for unit economics analysis
 */

import { Router } from 'express';
import { unitEconomicsController } from '../controllers/unit-economics.controller';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateQuery } from '@/core/middleware';
import {
  unitEconomicsQuerySchema,
  cacQuerySchema,
  ltvQuerySchema,
  cohortQuerySchema,
  paybackQuerySchema,
} from '../schemas';

const router = Router();

// All routes require authentication and organization
router.use(protect);
router.use(requireOrganization);

/**
 * @openapi
 * /api/v1/analysis/unit-economics:
 *   get:
 *     summary: Get all unit economics metrics
 *     tags: [Analysis - Unit Economics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  validateQuery(unitEconomicsQuerySchema),
  unitEconomicsController.getAllMetrics
);

/**
 * @openapi
 * /api/v1/analysis/unit-economics/cac:
 *   get:
 *     summary: Get Customer Acquisition Cost
 *     tags: [Analysis - Unit Economics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/cac',
  validateQuery(cacQuerySchema),
  unitEconomicsController.getCAC
);

/**
 * @openapi
 * /api/v1/analysis/unit-economics/ltv:
 *   get:
 *     summary: Get Lifetime Value
 *     tags: [Analysis - Unit Economics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/ltv',
  validateQuery(ltvQuerySchema),
  unitEconomicsController.getLTV
);

/**
 * @openapi
 * /api/v1/analysis/unit-economics/payback:
 *   get:
 *     summary: Get payback period
 *     tags: [Analysis - Unit Economics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/payback',
  validateQuery(paybackQuerySchema),
  unitEconomicsController.getPaybackPeriod
);

/**
 * @openapi
 * /api/v1/analysis/unit-economics/cohorts:
 *   get:
 *     summary: Get cohort analysis
 *     tags: [Analysis - Unit Economics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/cohorts',
  validateQuery(cohortQuerySchema),
  unitEconomicsController.getCohortAnalysis
);

export default router;
