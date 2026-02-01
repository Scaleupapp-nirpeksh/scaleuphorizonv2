import { Router } from 'express';
import { scenarioController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import { z } from 'zod';
import {
  createScenarioSchema,
  updateScenarioSchema,
  createAdjustmentSchema,
  updateAdjustmentSchema,
  scenarioQuerySchema,
  compareScenarioSchema,
  scenarioListResponseSchema,
  singleScenarioResponseSchema,
  adjustmentListResponseSchema,
  singleAdjustmentResponseSchema,
  scenarioComparisonResponseSchema,
  scenarioImpactResponseSchema,
  messageResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// Clone schema
const cloneScenarioSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
  }),
});

// ============ OpenAPI Documentation ============

// List scenarios
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/scenarios',
  tags: ['Planning - Scenarios'],
  summary: 'List all scenarios',
  description: 'Get all scenarios for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: scenarioQuerySchema.shape.query,
  },
  responses: {
    200: {
      description: 'List of scenarios',
      content: { 'application/json': { schema: scenarioListResponseSchema } },
    },
  },
});

// Create scenario
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/scenarios',
  tags: ['Planning - Scenarios'],
  summary: 'Create a new scenario',
  description: 'Create a new scenario for what-if analysis',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createScenarioSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Scenario created',
      content: { 'application/json': { schema: singleScenarioResponseSchema } },
    },
    400: { description: 'Validation error' },
    403: { description: 'Forbidden - requires owner/admin role' },
  },
});

// Compare scenarios
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/scenarios/compare',
  tags: ['Planning - Scenarios'],
  summary: 'Compare multiple scenarios',
  description: 'Compare 2-5 scenarios side by side',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: compareScenarioSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Scenario comparison',
      content: { 'application/json': { schema: scenarioComparisonResponseSchema } },
    },
    400: { description: 'At least 2 valid scenarios required' },
  },
});

// Get scenario by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/scenarios/{id}',
  tags: ['Planning - Scenarios'],
  summary: 'Get scenario by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Scenario details',
      content: { 'application/json': { schema: singleScenarioResponseSchema } },
    },
    404: { description: 'Scenario not found' },
  },
});

// Update scenario
registry.registerPath({
  method: 'put',
  path: '/api/v1/planning/scenarios/{id}',
  tags: ['Planning - Scenarios'],
  summary: 'Update scenario',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateScenarioSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Scenario updated',
      content: { 'application/json': { schema: singleScenarioResponseSchema } },
    },
    404: { description: 'Scenario not found' },
  },
});

// Delete scenario
registry.registerPath({
  method: 'delete',
  path: '/api/v1/planning/scenarios/{id}',
  tags: ['Planning - Scenarios'],
  summary: 'Archive scenario',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Scenario archived',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
  },
});

// Activate scenario
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/scenarios/{id}/activate',
  tags: ['Planning - Scenarios'],
  summary: 'Activate scenario',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Scenario activated',
      content: { 'application/json': { schema: singleScenarioResponseSchema } },
    },
    400: { description: 'Scenario already active' },
  },
});

// Clone scenario
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/scenarios/{id}/clone',
  tags: ['Planning - Scenarios'],
  summary: 'Clone scenario',
  description: 'Create a copy of an existing scenario with all its adjustments',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: cloneScenarioSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Scenario cloned',
      content: { 'application/json': { schema: singleScenarioResponseSchema } },
    },
  },
});

// Get scenario impact
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/scenarios/{id}/impact',
  tags: ['Planning - Scenarios'],
  summary: 'Get scenario impact',
  description: 'Calculate the total impact of all adjustments on baseline figures',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Scenario impact analysis',
      content: { 'application/json': { schema: scenarioImpactResponseSchema } },
    },
  },
});

// Get adjustments
registry.registerPath({
  method: 'get',
  path: '/api/v1/planning/scenarios/{id}/adjustments',
  tags: ['Planning - Scenario Adjustments'],
  summary: 'List adjustments',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of adjustments',
      content: { 'application/json': { schema: adjustmentListResponseSchema } },
    },
  },
});

// Add adjustment
registry.registerPath({
  method: 'post',
  path: '/api/v1/planning/scenarios/{id}/adjustments',
  tags: ['Planning - Scenario Adjustments'],
  summary: 'Add adjustment',
  description: 'Add a what-if adjustment to the scenario',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createAdjustmentSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Adjustment added',
      content: { 'application/json': { schema: singleAdjustmentResponseSchema } },
    },
  },
});

// Update adjustment
registry.registerPath({
  method: 'put',
  path: '/api/v1/planning/scenarios/{id}/adjustments/{adjustmentId}',
  tags: ['Planning - Scenario Adjustments'],
  summary: 'Update adjustment',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateAdjustmentSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Adjustment updated',
      content: { 'application/json': { schema: singleAdjustmentResponseSchema } },
    },
  },
});

// Delete adjustment
registry.registerPath({
  method: 'delete',
  path: '/api/v1/planning/scenarios/{id}/adjustments/{adjustmentId}',
  tags: ['Planning - Scenario Adjustments'],
  summary: 'Delete adjustment',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Adjustment deleted',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Scenario CRUD
router.get('/', validateQuery(scenarioQuerySchema.shape.query), scenarioController.getScenarios);
router.post('/', validateBody(createScenarioSchema.shape.body), scenarioController.createScenario);

// Compare (before :id routes to avoid conflict)
router.post('/compare', validateBody(compareScenarioSchema.shape.body), scenarioController.compareScenarios);

router.get('/:id', scenarioController.getScenarioById);
router.put('/:id', validateBody(updateScenarioSchema.shape.body), scenarioController.updateScenario);
router.delete('/:id', scenarioController.archiveScenario);

// Workflow
router.post('/:id/activate', scenarioController.activateScenario);
router.post('/:id/clone', validateBody(cloneScenarioSchema.shape.body), scenarioController.cloneScenario);

// Analytics
router.get('/:id/impact', scenarioController.getScenarioImpact);

// Adjustments
router.get('/:id/adjustments', scenarioController.getAdjustments);
router.post('/:id/adjustments', validateBody(createAdjustmentSchema.shape.body), scenarioController.addAdjustment);
router.put('/:id/adjustments/:adjustmentId', validateBody(updateAdjustmentSchema.shape.body), scenarioController.updateAdjustment);
router.delete('/:id/adjustments/:adjustmentId', scenarioController.deleteAdjustment);

export default router;
