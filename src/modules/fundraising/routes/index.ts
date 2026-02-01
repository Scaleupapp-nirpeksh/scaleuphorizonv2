/**
 * Fundraising Module Routes Aggregator
 *
 * Combines all fundraising sub-module routes
 */

import { Router } from 'express';
import roundRoutes from '../rounds/routes';
import investorRoutes from '../investors/routes';
import capTableRoutes from '../cap-table/routes';
import esopRoutes from '../esop/routes';

const router = Router();

// Mount sub-module routes
router.use('/rounds', roundRoutes);
router.use('/investors', investorRoutes);
router.use('/cap-table', capTableRoutes);
router.use('/esop', esopRoutes);

export default router;
