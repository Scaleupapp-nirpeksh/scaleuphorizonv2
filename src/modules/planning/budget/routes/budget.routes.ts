import { Router } from 'express';
import { budgetController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createBudgetSchema,
  updateBudgetSchema,
  createBudgetItemSchema,
  updateBudgetItemSchema,
  approveBudgetSchema,
  rejectBudgetSchema,
  cloneBudgetSchema,
  budgetQuerySchema,
  budgetListResponseSchema,
  singleBudgetResponseSchema,
  budgetItemListResponseSchema,
  singleBudgetItemResponseSchema,
  budgetSummaryResponseSchema,
  monthlyBreakdownResponseSchema,
  messageResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List budgets
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/budgets',
  tags: ['Planning - Budget'],
  summary: 'List all budgets',
  description: 'Get all budgets for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: budgetQuerySchema.shape.query,
  },
  responses: {
    200: {
      description: 'List of budgets',
      content: { 'application/json': { schema: budgetListResponseSchema } },
    },
  },
});

// Create budget
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets',
  tags: ['Planning - Budget'],
  summary: 'Create a new budget',
  description: 'Create a new budget for financial planning',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createBudgetSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Budget created',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    400: { description: 'Validation error' },
    403: { description: 'Forbidden - requires owner/admin role' },
  },
});

// Get budget by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/budgets/{id}',
  tags: ['Planning - Budget'],
  summary: 'Get budget by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Budget details',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    404: { description: 'Budget not found' },
  },
});

// Update budget
registry.registerPath({
  method: 'put',
  path: '/api/v1/planning/budgets/{id}',
  tags: ['Planning - Budget'],
  summary: 'Update budget',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateBudgetSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Budget updated',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    400: { description: 'Cannot update approved/active budgets' },
    404: { description: 'Budget not found' },
  },
});

// Delete budget
registry.registerPath({
  method: 'delete',
  path: '/api/v1/planning/budgets/{id}',
  tags: ['Planning - Budget'],
  summary: 'Archive budget',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Budget archived',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
    400: { description: 'Cannot archive active budget' },
  },
});

// Submit for approval
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets/{id}/submit',
  tags: ['Planning - Budget'],
  summary: 'Submit budget for approval',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Budget submitted',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    400: { description: 'Only draft budgets can be submitted' },
  },
});

// Approve budget
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets/{id}/approve',
  tags: ['Planning - Budget'],
  summary: 'Approve budget',
  description: 'Owner only - approve a pending budget',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: approveBudgetSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Budget approved',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    400: { description: 'Only pending budgets can be approved' },
    403: { description: 'Owner only' },
  },
});

// Reject budget
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets/{id}/reject',
  tags: ['Planning - Budget'],
  summary: 'Reject budget',
  description: 'Owner only - reject a pending budget',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: rejectBudgetSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Budget rejected',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    400: { description: 'Only pending budgets can be rejected' },
    403: { description: 'Owner only' },
  },
});

// Activate budget
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets/{id}/activate',
  tags: ['Planning - Budget'],
  summary: 'Activate budget',
  description: 'Owner only - activate an approved budget',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Budget activated',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
    400: { description: 'Only approved budgets can be activated' },
    403: { description: 'Owner only' },
  },
});

// Clone budget
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets/{id}/clone',
  tags: ['Planning - Budget'],
  summary: 'Clone budget',
  description: 'Create a copy of an existing budget with all its items',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: cloneBudgetSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Budget cloned',
      content: { 'application/json': { schema: singleBudgetResponseSchema } },
    },
  },
});

// Get budget summary
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/budgets/{id}/summary',
  tags: ['Planning - Budget'],
  summary: 'Get budget summary',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Budget summary',
      content: { 'application/json': { schema: budgetSummaryResponseSchema } },
    },
  },
});

// Get monthly breakdown
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/budgets/{id}/monthly',
  tags: ['Planning - Budget'],
  summary: 'Get monthly breakdown',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Monthly breakdown',
      content: { 'application/json': { schema: monthlyBreakdownResponseSchema } },
    },
  },
});

// Get budget items
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/budgets/{id}/items',
  tags: ['Planning - Budget Items'],
  summary: 'List budget items',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of budget items',
      content: { 'application/json': { schema: budgetItemListResponseSchema } },
    },
  },
});

// Add budget item
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/budgets/{id}/items',
  tags: ['Planning - Budget Items'],
  summary: 'Add budget item',
  description: 'Add a line item to the budget linked to a Chart of Accounts expense account',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createBudgetItemSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Budget item added',
      content: { 'application/json': { schema: singleBudgetItemResponseSchema } },
    },
    400: { description: 'Account must be expense type' },
  },
});

// Update budget item
registry.registerPath({
  method: 'put',
  path: '/api/v1/planning/budgets/{id}/items/{itemId}',
  tags: ['Planning - Budget Items'],
  summary: 'Update budget item',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateBudgetItemSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Budget item updated',
      content: { 'application/json': { schema: singleBudgetItemResponseSchema } },
    },
  },
});

// Delete budget item
registry.registerPath({
  method: 'delete',
  path: '/api/v1/planning/budgets/{id}/items/{itemId}',
  tags: ['Planning - Budget Items'],
  summary: 'Delete budget item',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Budget item deleted',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Budget CRUD
router.get('/', validateQuery(budgetQuerySchema.shape.query), budgetController.getBudgets);
router.post('/', validateBody(createBudgetSchema.shape.body), budgetController.createBudget);
router.get('/:id', budgetController.getBudgetById);
router.put('/:id', validateBody(updateBudgetSchema.shape.body), budgetController.updateBudget);
router.delete('/:id', budgetController.archiveBudget);

// Workflow
router.post('/:id/submit', budgetController.submitForApproval);
router.post('/:id/approve', validateBody(approveBudgetSchema.shape.body), budgetController.approveBudget);
router.post('/:id/reject', validateBody(rejectBudgetSchema.shape.body), budgetController.rejectBudget);
router.post('/:id/activate', budgetController.activateBudget);
router.post('/:id/clone', validateBody(cloneBudgetSchema.shape.body), budgetController.cloneBudget);

// Analytics
router.get('/:id/summary', budgetController.getBudgetSummary);
router.get('/:id/monthly', budgetController.getMonthlyBreakdown);
router.get('/:id/by-category', budgetController.getCategoryBreakdown);

// Budget Items
router.get('/:id/items', budgetController.getBudgetItems);
router.post('/:id/items', validateBody(createBudgetItemSchema.shape.body), budgetController.addBudgetItem);
router.put('/:id/items/:itemId', validateBody(updateBudgetItemSchema.shape.body), budgetController.updateBudgetItem);
router.delete('/:id/items/:itemId', budgetController.deleteBudgetItem);

export default router;
