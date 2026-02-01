/**
 * Milestone Routes
 *
 * Express routes for milestone management
 */

import { Router } from 'express';
import { milestoneController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  milestoneQuerySchema,
  updateStatusSchema,
  updateProgressSchema,
  addKeyResultSchema,
  updateKeyResultSchema,
  linkTasksSchema,
  milestoneResponseSchema,
  milestoneListResponseSchema,
  milestoneStatsResponseSchema,
  roadmapResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List milestones
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/milestones',
  tags: ['Operations - Milestones'],
  summary: 'List all milestones',
  description: 'Get all milestones for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: milestoneQuerySchema,
  },
  responses: {
    200: {
      description: 'List of milestones',
      content: { 'application/json': { schema: milestoneListResponseSchema } },
    },
  },
});

// Create milestone
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/milestones',
  tags: ['Operations - Milestones'],
  summary: 'Create a new milestone',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createMilestoneSchema } } },
  },
  responses: {
    201: {
      description: 'Milestone created',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// Get roadmap
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/milestones/roadmap',
  tags: ['Operations - Milestones'],
  summary: 'Get roadmap view',
  description: 'Get milestones organized by quarter for roadmap view',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Roadmap data',
      content: { 'application/json': { schema: roadmapResponseSchema } },
    },
  },
});

// Get milestone stats
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/milestones/stats',
  tags: ['Operations - Milestones'],
  summary: 'Get milestone statistics',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Milestone statistics',
      content: { 'application/json': { schema: milestoneStatsResponseSchema } },
    },
  },
});

// Get milestone by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/milestones/{id}',
  tags: ['Operations - Milestones'],
  summary: 'Get milestone by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Milestone details',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
    404: { description: 'Milestone not found' },
  },
});

// Update milestone
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/milestones/{id}',
  tags: ['Operations - Milestones'],
  summary: 'Update milestone',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateMilestoneSchema } } },
  },
  responses: {
    200: {
      description: 'Milestone updated',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// Delete milestone
registry.registerPath({
  method: 'delete',
  path: '/api/v1/operations/milestones/{id}',
  tags: ['Operations - Milestones'],
  summary: 'Delete milestone',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Milestone deleted' },
  },
});

// Update status
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/milestones/{id}/status',
  tags: ['Operations - Milestones'],
  summary: 'Update milestone status',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateStatusSchema } } },
  },
  responses: {
    200: {
      description: 'Status updated',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// Update progress
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/milestones/{id}/progress',
  tags: ['Operations - Milestones'],
  summary: 'Update milestone progress',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateProgressSchema } } },
  },
  responses: {
    200: {
      description: 'Progress updated',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// Archive milestone
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/milestones/{id}/archive',
  tags: ['Operations - Milestones'],
  summary: 'Archive milestone',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Milestone archived',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// Add key result
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/milestones/{id}/key-results',
  tags: ['Operations - Milestones'],
  summary: 'Add key result to milestone',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: addKeyResultSchema } } },
  },
  responses: {
    201: {
      description: 'Key result added',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// Link tasks
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/milestones/{id}/tasks',
  tags: ['Operations - Milestones'],
  summary: 'Link tasks to milestone',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: linkTasksSchema } } },
  },
  responses: {
    200: {
      description: 'Tasks linked',
      content: { 'application/json': { schema: milestoneResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Special routes first (before :id routes)
router.get('/roadmap', milestoneController.getRoadmap);
router.get('/stats', milestoneController.getStats);

// CRUD routes
router.get('/', validateQuery(milestoneQuerySchema), milestoneController.getMilestones);
router.post('/', validateBody(createMilestoneSchema), milestoneController.createMilestone);
router.get('/:id', milestoneController.getMilestoneById);
router.put('/:id', validateBody(updateMilestoneSchema), milestoneController.updateMilestone);
router.delete('/:id', milestoneController.deleteMilestone);

// Status, progress, and archive
router.put('/:id/status', validateBody(updateStatusSchema), milestoneController.updateStatus);
router.put('/:id/progress', validateBody(updateProgressSchema), milestoneController.updateProgress);
router.post('/:id/archive', milestoneController.archiveMilestone);

// Key results
router.post('/:id/key-results', validateBody(addKeyResultSchema), milestoneController.addKeyResult);
router.put('/:id/key-results/:krId', validateBody(updateKeyResultSchema), milestoneController.updateKeyResult);
router.delete('/:id/key-results/:krId', milestoneController.deleteKeyResult);

// Task linking
router.post('/:id/tasks', validateBody(linkTasksSchema), milestoneController.linkTasks);
router.delete('/:id/tasks/:taskId', milestoneController.unlinkTask);

export default router;
