import { Router } from 'express';
import { revenueEntryController, customerController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import {
  createRevenueEntrySchema,
  updateRevenueEntrySchema,
  receiveRevenueEntrySchema,
  cancelRevenueEntrySchema,
  revenueEntryQuerySchema,
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ Customer Routes (/tracking/customers) ============
// Note: These are mounted at /tracking/customers

// Analytics routes (before :id)
router.get('/customers/active-subscribers', customerController.getActiveSubscribers);
router.get('/customers/churned', customerController.getChurnedCustomers);
router.get('/customers/top', customerController.getTopCustomers);

// CRUD
router.get(
  '/customers',
  validateQuery(customerQuerySchema.shape.query),
  customerController.getCustomers
);
router.post(
  '/customers',
  validateBody(createCustomerSchema.shape.body),
  customerController.createCustomer
);
router.get('/customers/:id', customerController.getCustomerById);
router.put(
  '/customers/:id',
  validateBody(updateCustomerSchema.shape.body),
  customerController.updateCustomer
);
router.delete('/customers/:id', customerController.archiveCustomer);

// ============ Revenue Entry Routes (/tracking/revenue) ============

// Analytics and summary routes (before :id)
router.get('/mrr', revenueEntryController.getMRRMetrics);
router.get('/summary', revenueEntryController.getRevenueSummary);
router.get('/by-category', revenueEntryController.getRevenueByCategory);
router.get('/by-customer', revenueEntryController.getRevenueByCustomer);
router.get('/by-type', revenueEntryController.getRevenueByType);

// CRUD
router.get(
  '/',
  validateQuery(revenueEntryQuerySchema.shape.query),
  revenueEntryController.getRevenueEntries
);
router.post(
  '/',
  validateBody(createRevenueEntrySchema.shape.body),
  revenueEntryController.createRevenueEntry
);
router.get('/:id', revenueEntryController.getRevenueEntryById);
router.put(
  '/:id',
  validateBody(updateRevenueEntrySchema.shape.body),
  revenueEntryController.updateRevenueEntry
);
router.delete('/:id', revenueEntryController.archiveRevenueEntry);

// Workflow operations
router.post(
  '/:id/receive',
  validateBody(receiveRevenueEntrySchema.shape.body),
  revenueEntryController.receiveRevenueEntry
);
router.post(
  '/:id/cancel',
  validateBody(cancelRevenueEntrySchema.shape.body),
  revenueEntryController.cancelRevenueEntry
);

export default router;
