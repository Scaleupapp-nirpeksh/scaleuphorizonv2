/**
 * ESOP Routes
 *
 * Express routes for ESOP pool and grant management
 */

import { Router } from 'express';
import { esopController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createPoolSchema,
  updatePoolSchema,
  createGrantSchema,
  updateGrantSchema,
  approveGrantSchema,
  exerciseGrantSchema,
  cancelGrantSchema,
  grantQuerySchema,
  poolResponseSchema,
  grantResponseSchema,
  vestingScheduleResponseSchema,
  esopSummaryResponseSchema,
} from '../schemas';
import { z } from 'zod';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// Get ESOP summary
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/esop/summary',
  tags: ['Fundraising - ESOP'],
  summary: 'Get ESOP summary',
  description: 'Get ESOP pool summary with grant statistics',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'ESOP summary',
      content: { 'application/json': { schema: esopSummaryResponseSchema } },
    },
  },
});

// Get pool
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/esop/pool',
  tags: ['Fundraising - ESOP'],
  summary: 'Get ESOP pool',
  description: 'Get the organization ESOP pool details',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'ESOP pool details',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: poolResponseSchema.nullable() }),
        },
      },
    },
  },
});

// Create pool
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/esop/pool',
  tags: ['Fundraising - ESOP'],
  summary: 'Create ESOP pool',
  description: 'Create the organization ESOP pool (owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createPoolSchema } } },
  },
  responses: {
    201: {
      description: 'ESOP pool created',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: poolResponseSchema }),
        },
      },
    },
    400: { description: 'Pool already exists' },
    403: { description: 'Only owner can create pool' },
  },
});

// Update pool
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/esop/pool',
  tags: ['Fundraising - ESOP'],
  summary: 'Update ESOP pool',
  description: 'Update the ESOP pool (owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updatePoolSchema } } },
  },
  responses: {
    200: {
      description: 'ESOP pool updated',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: poolResponseSchema }),
        },
      },
    },
  },
});

// List grants
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/esop/grants',
  tags: ['Fundraising - ESOP'],
  summary: 'List grants',
  description: 'Get all ESOP grants with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: grantQuerySchema,
  },
  responses: {
    200: {
      description: 'List of grants',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(grantResponseSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              pages: z.number(),
            }),
          }),
        },
      },
    },
  },
});

// Create grant
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/esop/grants',
  tags: ['Fundraising - ESOP'],
  summary: 'Create grant',
  description: 'Create a new ESOP grant',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createGrantSchema } } },
  },
  responses: {
    201: {
      description: 'Grant created',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
    400: { description: 'Not enough shares in pool' },
  },
});

// Get grant by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/esop/grants/{id}',
  tags: ['Fundraising - ESOP'],
  summary: 'Get grant by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Grant details',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
    404: { description: 'Grant not found' },
  },
});

// Update grant
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/esop/grants/{id}',
  tags: ['Fundraising - ESOP'],
  summary: 'Update grant',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateGrantSchema } } },
  },
  responses: {
    200: {
      description: 'Grant updated',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
  },
});

// Delete grant
registry.registerPath({
  method: 'delete',
  path: '/api/v1/fundraising/esop/grants/{id}',
  tags: ['Fundraising - ESOP'],
  summary: 'Delete grant',
  description: 'Delete a draft grant',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Grant deleted' },
    400: { description: 'Only draft grants can be deleted' },
  },
});

// Approve grant
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/esop/grants/{id}/approve',
  tags: ['Fundraising - ESOP'],
  summary: 'Approve grant',
  description: 'Approve a draft grant (owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: approveGrantSchema } } },
  },
  responses: {
    200: {
      description: 'Grant approved',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
  },
});

// Activate grant
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/esop/grants/{id}/activate',
  tags: ['Fundraising - ESOP'],
  summary: 'Activate grant',
  description: 'Activate an approved grant to start vesting',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Grant activated',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
  },
});

// Exercise shares
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/esop/grants/{id}/exercise',
  tags: ['Fundraising - ESOP'],
  summary: 'Exercise shares',
  description: 'Exercise vested shares from a grant',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: exerciseGrantSchema } } },
  },
  responses: {
    200: {
      description: 'Shares exercised',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
    400: { description: 'Not enough exercisable shares' },
  },
});

// Cancel grant
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/esop/grants/{id}/cancel',
  tags: ['Fundraising - ESOP'],
  summary: 'Cancel grant',
  description: 'Cancel a grant (returns unvested shares to pool)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: cancelGrantSchema } } },
  },
  responses: {
    200: {
      description: 'Grant cancelled',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: grantResponseSchema }),
        },
      },
    },
  },
});

// Get vesting schedule
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/esop/grants/{id}/vesting',
  tags: ['Fundraising - ESOP'],
  summary: 'Get vesting schedule',
  description: 'Get detailed vesting schedule for a grant',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Vesting schedule',
      content: { 'application/json': { schema: vestingScheduleResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Summary
router.get('/summary', esopController.getSummary);

// Pool routes
router.get('/pool', esopController.getPool);
router.post('/pool', validateBody(createPoolSchema), esopController.createPool);
router.put('/pool', validateBody(updatePoolSchema), esopController.updatePool);

// Grant routes
router.get('/grants', validateQuery(grantQuerySchema), esopController.getGrants);
router.post('/grants', validateBody(createGrantSchema), esopController.createGrant);
router.get('/grants/:id', esopController.getGrantById);
router.put('/grants/:id', validateBody(updateGrantSchema), esopController.updateGrant);
router.delete('/grants/:id', esopController.deleteGrant);

// Grant workflow
router.post('/grants/:id/approve', validateBody(approveGrantSchema), esopController.approveGrant);
router.post('/grants/:id/activate', esopController.activateGrant);
router.post('/grants/:id/exercise', validateBody(exerciseGrantSchema), esopController.exerciseShares);
router.post('/grants/:id/cancel', validateBody(cancelGrantSchema), esopController.cancelGrant);

// Vesting
router.get('/grants/:id/vesting', esopController.getVestingSchedule);

export default router;
