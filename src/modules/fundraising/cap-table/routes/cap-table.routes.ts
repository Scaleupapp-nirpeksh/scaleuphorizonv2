/**
 * Cap Table Routes
 *
 * Express routes for cap table management
 */

import { Router } from 'express';
import { capTableController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createShareClassSchema,
  updateShareClassSchema,
  createCapTableEntrySchema,
  updateCapTableEntrySchema,
  capTableQuerySchema,
  simulateRoundSchema,
  waterfallSchema,
  shareClassResponseSchema,
  capTableEntryResponseSchema,
  capTableSummaryResponseSchema,
  waterfallResponseSchema,
  simulationResponseSchema,
} from '../schemas';
import { z } from 'zod';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// Get cap table summary
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/cap-table',
  tags: ['Fundraising - Cap Table'],
  summary: 'Get cap table summary',
  description: 'Get ownership summary with breakdown by shareholder and share class',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      asOfDate: z.string().datetime().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cap table summary',
      content: { 'application/json': { schema: capTableSummaryResponseSchema } },
    },
  },
});

// Waterfall analysis
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/cap-table/waterfall',
  tags: ['Fundraising - Cap Table'],
  summary: 'Waterfall analysis',
  description: 'Calculate exit proceeds distribution for a given valuation',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: waterfallSchema } } },
  },
  responses: {
    200: {
      description: 'Waterfall distribution',
      content: { 'application/json': { schema: waterfallResponseSchema } },
    },
  },
});

// Simulate round
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/cap-table/simulate',
  tags: ['Fundraising - Cap Table'],
  summary: 'Simulate funding round',
  description: 'Simulate a new funding round and see dilution impact',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: simulateRoundSchema } } },
  },
  responses: {
    200: {
      description: 'Round simulation results',
      content: { 'application/json': { schema: simulationResponseSchema } },
    },
  },
});

// List share classes
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/cap-table/share-classes',
  tags: ['Fundraising - Cap Table'],
  summary: 'List share classes',
  description: 'Get all share classes for the organization',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of share classes',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(shareClassResponseSchema),
          }),
        },
      },
    },
  },
});

// Create share class
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/cap-table/share-classes',
  tags: ['Fundraising - Cap Table'],
  summary: 'Create share class',
  description: 'Create a new share class (Common, Preferred, etc.)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createShareClassSchema } } },
  },
  responses: {
    201: {
      description: 'Share class created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: shareClassResponseSchema,
          }),
        },
      },
    },
    400: { description: 'Share class already exists' },
  },
});

// Update share class
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/cap-table/share-classes/{id}',
  tags: ['Fundraising - Cap Table'],
  summary: 'Update share class',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateShareClassSchema } } },
  },
  responses: {
    200: {
      description: 'Share class updated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: shareClassResponseSchema,
          }),
        },
      },
    },
  },
});

// List cap table entries
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/cap-table/entries',
  tags: ['Fundraising - Cap Table'],
  summary: 'List cap table entries',
  description: 'Get all cap table entries with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: capTableQuerySchema,
  },
  responses: {
    200: {
      description: 'List of cap table entries',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(capTableEntryResponseSchema),
          }),
        },
      },
    },
  },
});

// Create cap table entry
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/cap-table/entries',
  tags: ['Fundraising - Cap Table'],
  summary: 'Create cap table entry',
  description: 'Record a new share issuance, transfer, or other transaction',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createCapTableEntrySchema } } },
  },
  responses: {
    201: {
      description: 'Entry created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: capTableEntryResponseSchema,
          }),
        },
      },
    },
  },
});

// Update cap table entry
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/cap-table/entries/{id}',
  tags: ['Fundraising - Cap Table'],
  summary: 'Update cap table entry',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateCapTableEntrySchema } } },
  },
  responses: {
    200: {
      description: 'Entry updated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: capTableEntryResponseSchema,
          }),
        },
      },
    },
  },
});

// Delete cap table entry
registry.registerPath({
  method: 'delete',
  path: '/api/v1/fundraising/cap-table/entries/{id}',
  tags: ['Fundraising - Cap Table'],
  summary: 'Delete cap table entry',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Entry deleted' },
  },
});

// ============ Route Definitions ============

// Summary and analytics
router.get('/', capTableController.getSummary);
router.post('/waterfall', validateBody(waterfallSchema), capTableController.getWaterfall);
router.post('/simulate', validateBody(simulateRoundSchema), capTableController.simulateRound);

// Share class routes
router.get('/share-classes', capTableController.getShareClasses);
router.post('/share-classes', validateBody(createShareClassSchema), capTableController.createShareClass);
router.get('/share-classes/:id', capTableController.getShareClassById);
router.put('/share-classes/:id', validateBody(updateShareClassSchema), capTableController.updateShareClass);

// Entry routes
router.get('/entries', validateQuery(capTableQuerySchema), capTableController.getEntries);
router.post('/entries', validateBody(createCapTableEntrySchema), capTableController.createEntry);
router.get('/entries/:id', capTableController.getEntryById);
router.put('/entries/:id', validateBody(updateCapTableEntrySchema), capTableController.updateEntry);
router.delete('/entries/:id', capTableController.deleteEntry);

export default router;
