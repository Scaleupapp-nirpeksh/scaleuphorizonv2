/**
 * Round Routes
 *
 * Express routes for funding round management
 */

import { Router } from 'express';
import { roundController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createRoundSchema,
  updateRoundSchema,
  roundQuerySchema,
  openRoundSchema,
  closeRoundSchema,
  addDocumentSchema,
  roundResponseSchema,
  roundListResponseSchema,
  roundSummaryResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List rounds
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/rounds',
  tags: ['Fundraising - Rounds'],
  summary: 'List all funding rounds',
  description: 'Get all funding rounds for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: roundQuerySchema,
  },
  responses: {
    200: {
      description: 'List of funding rounds',
      content: { 'application/json': { schema: roundListResponseSchema } },
    },
  },
});

// Create round
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/rounds',
  tags: ['Fundraising - Rounds'],
  summary: 'Create a new funding round',
  description: 'Create a new funding round (Pre-seed, Seed, Series A, etc.)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createRoundSchema } } },
  },
  responses: {
    201: {
      description: 'Funding round created',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    400: { description: 'Validation error or duplicate active round' },
    403: { description: 'Forbidden - requires owner/admin role' },
  },
});

// Get round by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/rounds/{id}',
  tags: ['Fundraising - Rounds'],
  summary: 'Get funding round by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Funding round details',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    404: { description: 'Round not found' },
  },
});

// Update round
registry.registerPath({
  method: 'put',
  path: '/api/v1/fundraising/rounds/{id}',
  tags: ['Fundraising - Rounds'],
  summary: 'Update funding round',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateRoundSchema } } },
  },
  responses: {
    200: {
      description: 'Funding round updated',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    400: { description: 'Cannot update closed round' },
    404: { description: 'Round not found' },
  },
});

// Delete round
registry.registerPath({
  method: 'delete',
  path: '/api/v1/fundraising/rounds/{id}',
  tags: ['Fundraising - Rounds'],
  summary: 'Delete funding round',
  description: 'Delete a planning round with no investments',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Funding round deleted' },
    400: { description: 'Cannot delete non-planning round or round with investments' },
    404: { description: 'Round not found' },
  },
});

// Open round
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/rounds/{id}/open',
  tags: ['Fundraising - Rounds'],
  summary: 'Open funding round',
  description: 'Start accepting investments for this round',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: openRoundSchema } } },
  },
  responses: {
    200: {
      description: 'Funding round opened',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    400: { description: 'Round is not in planning status' },
  },
});

// Close round
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/rounds/{id}/close',
  tags: ['Fundraising - Rounds'],
  summary: 'Close funding round',
  description: 'Close the funding round (owner only)',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: closeRoundSchema } } },
  },
  responses: {
    200: {
      description: 'Funding round closed',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    400: { description: 'Round is not active' },
    403: { description: 'Only owner can close rounds' },
  },
});

// Cancel round
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/rounds/{id}/cancel',
  tags: ['Fundraising - Rounds'],
  summary: 'Cancel funding round',
  description: 'Cancel a funding round (owner only)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Funding round cancelled',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    400: { description: 'Cannot cancel closed round' },
    403: { description: 'Only owner can cancel rounds' },
  },
});

// Get round summary
registry.registerPath({
  method: 'get',
  path: '/api/v1/fundraising/rounds/{id}/summary',
  tags: ['Fundraising - Rounds'],
  summary: 'Get round summary',
  description: 'Get detailed summary with investor breakdown',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Round summary with investors',
      content: { 'application/json': { schema: roundSummaryResponseSchema } },
    },
    404: { description: 'Round not found' },
  },
});

// Add document
registry.registerPath({
  method: 'post',
  path: '/api/v1/fundraising/rounds/{id}/documents',
  tags: ['Fundraising - Rounds'],
  summary: 'Add document to round',
  description: 'Upload term sheet, SHA, or other documents',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: addDocumentSchema } } },
  },
  responses: {
    201: {
      description: 'Document added',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
  },
});

// Remove document
registry.registerPath({
  method: 'delete',
  path: '/api/v1/fundraising/rounds/{id}/documents/{docIndex}',
  tags: ['Fundraising - Rounds'],
  summary: 'Remove document from round',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Document removed',
      content: { 'application/json': { schema: roundResponseSchema } },
    },
    404: { description: 'Document not found' },
  },
});

// ============ Route Definitions ============

// CRUD routes
router.get('/', validateQuery(roundQuerySchema), roundController.getRounds);
router.post('/', validateBody(createRoundSchema), roundController.createRound);
router.get('/:id', roundController.getRoundById);
router.put('/:id', validateBody(updateRoundSchema), roundController.updateRound);
router.delete('/:id', roundController.deleteRound);

// Workflow routes
router.post('/:id/open', validateBody(openRoundSchema), roundController.openRound);
router.post('/:id/close', validateBody(closeRoundSchema), roundController.closeRound);
router.post('/:id/cancel', roundController.cancelRound);

// Document routes
router.post('/:id/documents', validateBody(addDocumentSchema), roundController.addDocument);
router.delete('/:id/documents/:docIndex', roundController.removeDocument);

// Analytics
router.get('/:id/summary', roundController.getRoundSummary);

export default router;
