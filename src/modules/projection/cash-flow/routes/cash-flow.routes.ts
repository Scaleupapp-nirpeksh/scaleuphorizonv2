import { Router } from 'express';
import { cashFlowController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware';
import {
  createCashFlowForecastSchema,
  updateCashFlowForecastSchema,
  addProjectionItemsSchema,
  cashFlowQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

/**
 * Cash Flow Routes
 *
 * Base path: /api/v1/projection/cash-flow
 */

// ============ CRUD Operations ============

// GET /projection/cash-flow - List forecasts
router.get(
  '/',
  validateQuery(cashFlowQuerySchema.shape.query),
  cashFlowController.getForecasts
);

// POST /projection/cash-flow - Create forecast
router.post(
  '/',
  validateBody(createCashFlowForecastSchema.shape.body),
  cashFlowController.createForecast
);

// GET /projection/cash-flow/:id - Get forecast by ID
router.get('/:id', cashFlowController.getForecastById);

// PUT /projection/cash-flow/:id - Update forecast
router.put(
  '/:id',
  validateBody(updateCashFlowForecastSchema.shape.body),
  cashFlowController.updateForecast
);

// DELETE /projection/cash-flow/:id - Archive forecast
router.delete('/:id', cashFlowController.archiveForecast);

// ============ Projection Management ============

// POST /projection/cash-flow/:id/items - Add projection items
router.post(
  '/:id/items',
  validateBody(addProjectionItemsSchema.shape.body),
  cashFlowController.addProjectionItems
);

// ============ Status Management ============

// POST /projection/cash-flow/:id/activate - Activate forecast
router.post('/:id/activate', cashFlowController.activateForecast);

// ============ Analytics ============

// GET /projection/cash-flow/:id/summary - Get summary
router.get('/:id/summary', cashFlowController.getCashFlowSummary);

// GET /projection/cash-flow/:id/daily - Get daily projections
router.get('/:id/daily', cashFlowController.getDailyProjections);

// GET /projection/cash-flow/:id/weekly - Get weekly projections
router.get('/:id/weekly', cashFlowController.getWeeklyProjections);

// POST /projection/cash-flow/:id/recalculate - Recalculate with actuals
router.post('/:id/recalculate', cashFlowController.recalculateWithActuals);

export default router;
