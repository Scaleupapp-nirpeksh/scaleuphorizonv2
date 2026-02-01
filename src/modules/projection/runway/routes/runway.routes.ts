import { Router } from 'express';
import { runwayController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware';
import {
  createRunwaySnapshotSchema,
  updateRunwaySnapshotSchema,
  whatIfAnalysisSchema,
  runwayQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

/**
 * Runway Routes
 *
 * Base path: /api/v1/projection/runway
 */

// ============ Special Routes (before :id) ============

// GET /projection/runway/current - Get current runway calculation
router.get('/current', runwayController.getCurrentRunway);

// GET /projection/runway/history - Get runway history
router.get('/history', runwayController.getRunwayHistory);

// GET /projection/runway/scenarios - Get scenario comparison
router.get('/scenarios', runwayController.getScenarioComparison);

// POST /projection/runway/what-if - What-if analysis
router.post('/what-if', validateBody(whatIfAnalysisSchema.shape.body), runwayController.whatIfAnalysis);

// ============ CRUD Operations ============

// GET /projection/runway - List snapshots
router.get('/', validateQuery(runwayQuerySchema.shape.query), runwayController.getSnapshots);

// POST /projection/runway - Create snapshot
router.post(
  '/',
  validateBody(createRunwaySnapshotSchema.shape.body),
  runwayController.createSnapshot
);

// GET /projection/runway/:id - Get snapshot by ID
router.get('/:id', runwayController.getSnapshotById);

// PUT /projection/runway/:id - Update snapshot
router.put(
  '/:id',
  validateBody(updateRunwaySnapshotSchema.shape.body),
  runwayController.updateSnapshot
);

// DELETE /projection/runway/:id - Archive snapshot
router.delete('/:id', runwayController.archiveSnapshot);

export default router;
