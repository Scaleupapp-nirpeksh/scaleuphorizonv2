/**
 * Operations Module Routes Aggregator
 *
 * Combines all operations sub-module routes
 */

import { Router } from 'express';
import taskRoutes from '../tasks/routes';
import milestoneRoutes from '../milestones/routes';
import meetingRoutes from '../meetings/routes';

const router = Router();

// Mount sub-module routes
router.use('/tasks', taskRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/meetings', meetingRoutes);

export default router;
