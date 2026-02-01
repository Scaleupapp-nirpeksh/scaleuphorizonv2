import { Router } from 'express';
import { expenseController, vendorController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import {
  createExpenseSchema,
  updateExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  payExpenseSchema,
  expenseQuerySchema,
  createVendorSchema,
  updateVendorSchema,
  vendorQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ Vendor Routes (/tracking/vendors) ============
// Note: These are mounted at /tracking/vendors

// Analytics routes (before :id)
router.get('/vendors/top', vendorController.getTopVendors);

// CRUD
router.get(
  '/vendors',
  validateQuery(vendorQuerySchema.shape.query),
  vendorController.getVendors
);
router.post(
  '/vendors',
  validateBody(createVendorSchema.shape.body),
  vendorController.createVendor
);
router.get('/vendors/:id', vendorController.getVendorById);
router.put(
  '/vendors/:id',
  validateBody(updateVendorSchema.shape.body),
  vendorController.updateVendor
);
router.delete('/vendors/:id', vendorController.archiveVendor);

// ============ Expense Routes (/tracking/expenses) ============

// Analytics and summary routes (before :id)
router.get('/summary', expenseController.getExpenseSummary);
router.get('/by-category', expenseController.getExpensesByCategory);
router.get('/by-vendor', expenseController.getExpensesByVendor);
router.get('/pending-approvals', expenseController.getPendingApprovals);
router.get('/recurring', expenseController.getRecurringExpenses);

// CRUD
router.get('/', validateQuery(expenseQuerySchema.shape.query), expenseController.getExpenses);
router.post('/', validateBody(createExpenseSchema.shape.body), expenseController.createExpense);
router.get('/:id', expenseController.getExpenseById);
router.put('/:id', validateBody(updateExpenseSchema.shape.body), expenseController.updateExpense);
router.delete('/:id', expenseController.archiveExpense);

// Workflow operations
router.post('/:id/submit', expenseController.submitForApproval);
router.post(
  '/:id/approve',
  validateBody(approveExpenseSchema.shape.body),
  expenseController.approveExpense
);
router.post(
  '/:id/reject',
  validateBody(rejectExpenseSchema.shape.body),
  expenseController.rejectExpense
);
router.post('/:id/pay', validateBody(payExpenseSchema.shape.body), expenseController.markAsPaid);

export default router;
