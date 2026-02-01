/**
 * Reporting Module Routes
 *
 * Aggregates all reporting sub-module routes
 */

import { Router } from 'express';
import dashboardRoutes from '../dashboards/routes';
import investorReportRoutes from '../investor-reports/routes';
import statementRoutes from '../statements/routes';

const router = Router();

// Mount sub-module routes
router.use('/dashboards', dashboardRoutes);
router.use('/investor-reports', investorReportRoutes);
router.use('/statements', statementRoutes);

export default router;
