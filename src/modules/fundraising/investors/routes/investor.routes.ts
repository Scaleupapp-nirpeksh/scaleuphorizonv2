/**
 * Investor Routes
 *
 * Express routes for investor management
 */

import { Router } from 'express';
import { investorController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createInvestorSchema,
  updateInvestorSchema,
  investorQuerySchema,
  createTrancheSchema,
  updateTrancheSchema,
  receiveTrancheSchema,
  investorResponseSchema,
  investorListResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List investors
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/investors',
  tags: ['Fundraising - Investors'],
  summary: 'List all investors',
  description: 'Get all investors for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: investorQuerySchema,
  },
  responses: {
    200: {
      description: 'List of investors',
      content: { 'application/json': { schema: investorListResponseSchema } },
    },
  },
});

// Create investor
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/investors',
  tags: ['Fundraising - Investors'],
  summary: 'Create a new investor',
  description: 'Add a new investor to track in the system',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createInvestorSchema } } },
  },
  responses: {
    201: {
      description: 'Investor created',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    400: { description: 'Validation error' },
    403: { description: 'Forbidden - requires owner/admin role' },
  },
});

// Get investor by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/investors/{id}',
  tags: ['Fundraising - Investors'],
  summary: 'Get investor by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Investor details',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    404: { description: 'Investor not found' },
  },
});

// Update investor
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/investors/{id}',
  tags: ['Fundraising - Investors'],
  summary: 'Update investor',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateInvestorSchema } } },
  },
  responses: {
    200: {
      description: 'Investor updated',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    404: { description: 'Investor not found' },
  },
});

// Delete investor
registry.registerPath({
  method: 'delete',
  path: '/api/v1/fundraising/investors/{id}',
  tags: ['Fundraising - Investors'],
  summary: 'Delete investor',
  description: 'Delete an investor (only if no received investments)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Investor deleted' },
    400: { description: 'Cannot delete investor with received investments' },
    404: { description: 'Investor not found' },
  },
});

// Top investors
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/investors/top',
  tags: ['Fundraising - Investors'],
  summary: 'Get top investors',
  description: 'Get top investors by total investment amount',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Top investors',
      content: { 'application/json': { schema: investorListResponseSchema } },
    },
  },
});

// Add tranche
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/investors/{id}/tranches',
  tags: ['Fundraising - Investors'],
  summary: 'Add investment tranche',
  description: 'Schedule a new investment tranche for an investor',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createTrancheSchema } } },
  },
  responses: {
    201: {
      description: 'Tranche added',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
  },
});

// Update tranche
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/investors/{id}/tranches/{trancheId}',
  tags: ['Fundraising - Investors'],
  summary: 'Update investment tranche',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateTrancheSchema } } },
  },
  responses: {
    200: {
      description: 'Tranche updated',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    400: { description: 'Cannot update received tranche' },
  },
});

// Receive tranche
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/investors/{id}/tranches/{trancheId}/receive',
  tags: ['Fundraising - Investors'],
  summary: 'Receive investment tranche',
  description: 'Mark a tranche as received (payment completed)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: receiveTrancheSchema } } },
  },
  responses: {
    200: {
      description: 'Tranche received',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    400: { description: 'Tranche already received or cancelled' },
  },
});

// Cancel tranche
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/investors/{id}/tranches/{trancheId}/cancel',
  tags: ['Fundraising - Investors'],
  summary: 'Cancel investment tranche',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Tranche cancelled',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    400: { description: 'Cannot cancel received tranche' },
  },
});

// Delete tranche
registry.registerPath({
  method: 'delete',
  path: '/api/v1/fundraising/investors/{id}/tranches/{trancheId}',
  tags: ['Fundraising - Investors'],
  summary: 'Delete investment tranche',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Tranche deleted',
      content: { 'application/json': { schema: investorResponseSchema } },
    },
    400: { description: 'Cannot delete received tranche' },
  },
});

// ============ Route Definitions ============

// Analytics routes (must be before :id routes)
router.get('/top', investorController.getTopInvestors);

// CRUD routes
router.get('/', validateQuery(investorQuerySchema), investorController.getInvestors);
router.post('/', validateBody(createInvestorSchema), investorController.createInvestor);
router.get('/:id', investorController.getInvestorById);
router.put('/:id', validateBody(updateInvestorSchema), investorController.updateInvestor);
router.delete('/:id', investorController.deleteInvestor);

// Tranche routes
router.post('/:id/tranches', validateBody(createTrancheSchema), investorController.addTranche);
router.put('/:id/tranches/:trancheId', validateBody(updateTrancheSchema), investorController.updateTranche);
router.post('/:id/tranches/:trancheId/receive', validateBody(receiveTrancheSchema), investorController.receiveTranche);
router.post('/:id/tranches/:trancheId/cancel', investorController.cancelTranche);
router.delete('/:id/tranches/:trancheId', investorController.deleteTranche);

export default router;
