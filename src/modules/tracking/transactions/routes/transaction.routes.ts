import { Router } from 'express';
import { transactionController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import {
  createTransactionSchema,
  updateTransactionSchema,
  bulkCreateTransactionSchema,
  bulkCategorizeSchema,
  transactionQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

// Summary and analytics routes (before :id routes)
router.get('/summary', transactionController.getTransactionSummary);
router.get('/by-category', transactionController.getTransactionsByCategory);

// Bulk operations
router.post(
  '/bulk',
  validateBody(bulkCreateTransactionSchema.shape.body),
  transactionController.bulkCreateTransactions
);
router.post(
  '/categorize',
  validateBody(bulkCategorizeSchema.shape.body),
  transactionController.bulkCategorize
);

// CRUD operations
router.get('/', validateQuery(transactionQuerySchema.shape.query), transactionController.getTransactions);
router.post('/', validateBody(createTransactionSchema.shape.body), transactionController.createTransaction);
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', validateBody(updateTransactionSchema.shape.body), transactionController.updateTransaction);
router.delete('/:id', transactionController.archiveTransaction);

// Status operations
router.post('/:id/clear', transactionController.clearTransaction);
router.post('/:id/reconcile', transactionController.reconcileTransaction);

export default router;
