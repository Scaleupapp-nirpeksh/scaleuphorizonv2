import { Router } from 'express';
import { revenuePlanController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createRevenuePlanSchema,
  updateRevenuePlanSchema,
  createRevenueStreamSchema,
  updateRevenueStreamSchema,
  revenuePlanQuerySchema,
  revenuePlanListResponseSchema,
  singleRevenuePlanResponseSchema,
  revenueStreamListResponseSchema,
  singleRevenueStreamResponseSchema,
  revenuePlanSummaryResponseSchema,
  monthlyProjectionsResponseSchema,
  mrrMetricsResponseSchema,
  messageResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List revenue plans
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/revenue',
  tags: ['Planning - Revenue Plan'],
  summary: 'List all revenue plans',
  description: 'Get all revenue plans for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: revenuePlanQuerySchema.shape.query,
  },
  responses: {
    200: {
      description: 'List of revenue plans',
      content: { 'application/json': { schema: revenuePlanListResponseSchema } },
    },
  },
});

// Create revenue plan
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/revenue',
  tags: ['Planning - Revenue Plan'],
  summary: 'Create a new revenue plan',
  description: 'Create a new revenue plan for financial projections',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createRevenuePlanSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Revenue plan created',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    400: { description: 'Validation error' },
    403: { description: 'Forbidden - requires owner/admin role' },
  },
});

// Get revenue plan by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/revenue/{id}',
  tags: ['Planning - Revenue Plan'],
  summary: 'Get revenue plan by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan details',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    404: { description: 'Revenue plan not found' },
  },
});

// Update revenue plan
registry.registerPath({
  method: 'put',
  path: '/api/v1/planning/revenue/{id}',
  tags: ['Planning - Revenue Plan'],
  summary: 'Update revenue plan',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateRevenuePlanSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Revenue plan updated',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    400: { description: 'Cannot update approved/active plans' },
    404: { description: 'Revenue plan not found' },
  },
});

// Delete revenue plan
registry.registerPath({
  method: 'delete',
  path: '/api/v1/planning/revenue/{id}',
  tags: ['Planning - Revenue Plan'],
  summary: 'Archive revenue plan',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan archived',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
    400: { description: 'Cannot archive active plan' },
  },
});

// Submit for approval
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/revenue/{id}/submit',
  tags: ['Planning - Revenue Plan'],
  summary: 'Submit revenue plan for approval',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan submitted',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    400: { description: 'Only draft plans can be submitted' },
  },
});

// Approve revenue plan
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/revenue/{id}/approve',
  tags: ['Planning - Revenue Plan'],
  summary: 'Approve revenue plan',
  description: 'Owner only - approve a pending revenue plan',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan approved',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    400: { description: 'Only pending plans can be approved' },
    403: { description: 'Owner only' },
  },
});

// Reject revenue plan
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/revenue/{id}/reject',
  tags: ['Planning - Revenue Plan'],
  summary: 'Reject revenue plan',
  description: 'Owner only - reject a pending revenue plan',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan rejected',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    400: { description: 'Only pending plans can be rejected' },
    403: { description: 'Owner only' },
  },
});

// Activate revenue plan
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/revenue/{id}/activate',
  tags: ['Planning - Revenue Plan'],
  summary: 'Activate revenue plan',
  description: 'Owner only - activate an approved revenue plan',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan activated',
      content: { 'application/json': { schema: singleRevenuePlanResponseSchema } },
    },
    400: { description: 'Only approved plans can be activated' },
    403: { description: 'Owner only' },
  },
});

// Get revenue plan summary
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/revenue/{id}/summary',
  tags: ['Planning - Revenue Plan'],
  summary: 'Get revenue plan summary',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue plan summary with breakdown by stream type',
      content: { 'application/json': { schema: revenuePlanSummaryResponseSchema } },
    },
  },
});

// Get monthly projections
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/revenue/{id}/projections',
  tags: ['Planning - Revenue Plan'],
  summary: 'Get monthly projections',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Monthly revenue projections',
      content: { 'application/json': { schema: monthlyProjectionsResponseSchema } },
    },
  },
});

// Get MRR metrics
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/revenue/{id}/mrr-metrics',
  tags: ['Planning - Revenue Plan'],
  summary: 'Get MRR/ARR metrics',
  description: 'Get subscription metrics including MRR, ARR, growth rate, and churn',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'MRR/ARR metrics',
      content: { 'application/json': { schema: mrrMetricsResponseSchema } },
    },
  },
});

// Get revenue streams
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/revenue/{id}/streams',
  tags: ['Planning - Revenue Streams'],
  summary: 'List revenue streams',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of revenue streams',
      content: { 'application/json': { schema: revenueStreamListResponseSchema } },
    },
  },
});

// Add revenue stream
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/revenue/{id}/streams',
  tags: ['Planning - Revenue Streams'],
  summary: 'Add revenue stream',
  description: 'Add a revenue stream to the plan, optionally linked to a Chart of Accounts revenue account',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createRevenueStreamSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Revenue stream added',
      content: { 'application/json': { schema: singleRevenueStreamResponseSchema } },
    },
    400: { description: 'Account must be revenue type' },
  },
});

// Update revenue stream
registry.registerPath({
  method: 'put',
  path: '/api/v1/planning/revenue/{id}/streams/{streamId}',
  tags: ['Planning - Revenue Streams'],
  summary: 'Update revenue stream',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateRevenueStreamSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Revenue stream updated',
      content: { 'application/json': { schema: singleRevenueStreamResponseSchema } },
    },
  },
});

// Delete revenue stream
registry.registerPath({
  method: 'delete',
  path: '/api/v1/planning/revenue/{id}/streams/{streamId}',
  tags: ['Planning - Revenue Streams'],
  summary: 'Delete revenue stream',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Revenue stream deleted',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Revenue Plan CRUD
router.get('/', validateQuery(revenuePlanQuerySchema.shape.query), revenuePlanController.getRevenuePlans);
router.post('/', validateBody(createRevenuePlanSchema.shape.body), revenuePlanController.createRevenuePlan);
router.get('/:id', revenuePlanController.getRevenuePlanById);
router.put('/:id', validateBody(updateRevenuePlanSchema.shape.body), revenuePlanController.updateRevenuePlan);
router.delete('/:id', revenuePlanController.archiveRevenuePlan);

// Workflow
router.post('/:id/submit', revenuePlanController.submitForApproval);
router.post('/:id/approve', revenuePlanController.approveRevenuePlan);
router.post('/:id/reject', revenuePlanController.rejectRevenuePlan);
router.post('/:id/activate', revenuePlanController.activateRevenuePlan);

// Analytics
router.get('/:id/summary', revenuePlanController.getRevenuePlanSummary);
router.get('/:id/projections', revenuePlanController.getMonthlyProjections);
router.get('/:id/mrr-metrics', revenuePlanController.getMRRMetrics);

// Revenue Streams
router.get('/:id/streams', revenuePlanController.getRevenueStreams);
router.post('/:id/streams', validateBody(createRevenueStreamSchema.shape.body), revenuePlanController.addRevenueStream);
router.put('/:id/streams/:streamId', validateBody(updateRevenueStreamSchema.shape.body), revenuePlanController.updateRevenueStream);
router.delete('/:id/streams/:streamId', revenuePlanController.deleteRevenueStream);

export default router;
