/**
 * Analysis Module Routes
 *
 * Aggregates all analysis sub-module routes:
 * - /variance - Budget vs Actual variance analysis
 * - /trends - Historical trend analysis
 * - /unit-economics - CAC, LTV, cohort analysis
 * - /health-score - Financial health scoring
 */

import { Router } from 'express';
import { varianceRoutes } from '../variance/routes';
import { trendsRoutes } from '../trends/routes';
import { unitEconomicsRoutes } from '../unit-economics/routes';
import { healthScoreRoutes } from '../health-score/routes';

const router = Router();

// Mount sub-module routes
router.use('/variance', varianceRoutes);
router.use('/trends', trendsRoutes);
router.use('/unit-economics', unitEconomicsRoutes);
router.use('/health-score', healthScoreRoutes);

export default router;
