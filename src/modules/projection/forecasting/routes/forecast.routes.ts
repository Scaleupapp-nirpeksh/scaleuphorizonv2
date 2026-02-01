import { Router } from 'express';
import { forecastController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware';
import {
  createForecastSchema,
  updateForecastSchema,
  retrainForecastSchema,
  forecastQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

/**
 * Forecast Routes
 *
 * Base path: /api/v1/projection/forecast
 */

// ============ Summary & Quick Forecasts (before :id) ============

// GET /projection/forecast/summary - Get forecast summary
router.get('/summary', forecastController.getForecastSummary);

// GET /projection/forecast/revenue - Get revenue forecast
router.get('/revenue', forecastController.getRevenueForecast);

// GET /projection/forecast/expenses - Get expense forecast
router.get('/expenses', forecastController.getExpenseForecast);

// GET /projection/forecast/burn-rate - Get burn rate forecast
router.get('/burn-rate', forecastController.getBurnRateForecast);

// ============ CRUD Operations ============

// GET /projection/forecast - List forecasts
router.get('/', validateQuery(forecastQuerySchema.shape.query), forecastController.getForecasts);

// POST /projection/forecast - Create forecast
router.post(
  '/',
  validateBody(createForecastSchema.shape.body),
  forecastController.createForecast
);

// GET /projection/forecast/:id - Get forecast by ID
router.get('/:id', forecastController.getForecastById);

// PUT /projection/forecast/:id - Update forecast
router.put(
  '/:id',
  validateBody(updateForecastSchema.shape.body),
  forecastController.updateForecast
);

// DELETE /projection/forecast/:id - Archive forecast
router.delete('/:id', forecastController.archiveForecast);

// ============ Status & Retrain ============

// POST /projection/forecast/:id/activate - Activate forecast
router.post('/:id/activate', forecastController.activateForecast);

// POST /projection/forecast/:id/retrain - Retrain forecast
router.post(
  '/:id/retrain',
  validateBody(retrainForecastSchema.shape.body),
  forecastController.retrainForecast
);

export default router;
