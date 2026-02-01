import { Router } from 'express';
import { financialModelController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware';
import {
  createFinancialModelSchema,
  updateFinancialModelSchema,
  financialModelQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

/**
 * Financial Model Routes
 *
 * Base path: /api/v1/projection/financial-model
 */

// ============ CRUD Operations ============

// GET /projection/financial-model - List models
router.get(
  '/',
  validateQuery(financialModelQuerySchema.shape.query),
  financialModelController.getModels
);

// POST /projection/financial-model - Create model
router.post(
  '/',
  validateBody(createFinancialModelSchema.shape.body),
  financialModelController.createModel
);

// GET /projection/financial-model/:id - Get model by ID
router.get('/:id', financialModelController.getModelById);

// PUT /projection/financial-model/:id - Update model
router.put(
  '/:id',
  validateBody(updateFinancialModelSchema.shape.body),
  financialModelController.updateModel
);

// DELETE /projection/financial-model/:id - Archive model
router.delete('/:id', financialModelController.archiveModel);

// ============ Status & Recalculation ============

// POST /projection/financial-model/:id/activate - Activate model
router.post('/:id/activate', financialModelController.activateModel);

// POST /projection/financial-model/:id/recalculate - Recalculate model
router.post('/:id/recalculate', financialModelController.recalculateModel);

// ============ Statement Access ============

// GET /projection/financial-model/:id/income-statement - Get income statement
router.get('/:id/income-statement', financialModelController.getIncomeStatement);

// GET /projection/financial-model/:id/balance-sheet - Get balance sheet
router.get('/:id/balance-sheet', financialModelController.getBalanceSheet);

// GET /projection/financial-model/:id/cash-flow-statement - Get cash flow statement
router.get('/:id/cash-flow-statement', financialModelController.getCashFlowStatement);

// GET /projection/financial-model/:id/metrics - Get key metrics
router.get('/:id/metrics', financialModelController.getKeyMetrics);

export default router;
