/**
 * Task Routes
 *
 * Express routes for task management
 */

import { Router } from 'express';
import { taskController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  updateStatusSchema,
  addCommentSchema,
  updateCommentSchema,
  addReminderSchema,
  bulkUpdateSchema,
  taskResponseSchema,
  taskListResponseSchema,
  taskStatsResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List tasks
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/tasks',
  tags: ['Operations - Tasks'],
  summary: 'List all tasks',
  description: 'Get all tasks for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: taskQuerySchema,
  },
  responses: {
    200: {
      description: 'List of tasks',
      content: { 'application/json': { schema: taskListResponseSchema } },
    },
  },
});

// Create task
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/tasks',
  tags: ['Operations - Tasks'],
  summary: 'Create a new task',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createTaskSchema } } },
  },
  responses: {
    201: {
      description: 'Task created',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
  },
});

// Get my tasks
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/tasks/my',
  tags: ['Operations - Tasks'],
  summary: 'Get my tasks',
  description: 'Get tasks assigned to, reported by, or watched by current user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'My tasks',
      content: { 'application/json': { schema: taskListResponseSchema } },
    },
  },
});

// Get task stats
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/tasks/stats',
  tags: ['Operations - Tasks'],
  summary: 'Get task statistics',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Task statistics',
      content: { 'application/json': { schema: taskStatsResponseSchema } },
    },
  },
});

// Bulk update
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/tasks/bulk',
  tags: ['Operations - Tasks'],
  summary: 'Bulk update tasks',
  description: 'Update multiple tasks at once',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: bulkUpdateSchema } } },
  },
  responses: {
    200: { description: 'Tasks updated' },
  },
});

// Get task by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/tasks/{id}',
  tags: ['Operations - Tasks'],
  summary: 'Get task by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Task details',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
    404: { description: 'Task not found' },
  },
});

// Update task
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/tasks/{id}',
  tags: ['Operations - Tasks'],
  summary: 'Update task',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateTaskSchema } } },
  },
  responses: {
    200: {
      description: 'Task updated',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
  },
});

// Delete task
registry.registerPath({
  method: 'delete',
  path: '/api/v1/operations/tasks/{id}',
  tags: ['Operations - Tasks'],
  summary: 'Delete task',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Task deleted' },
  },
});

// Update status
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/tasks/{id}/status',
  tags: ['Operations - Tasks'],
  summary: 'Update task status',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateStatusSchema } } },
  },
  responses: {
    200: {
      description: 'Status updated',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
  },
});

// Archive task
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/tasks/{id}/archive',
  tags: ['Operations - Tasks'],
  summary: 'Archive task',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Task archived',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
  },
});

// Add comment
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/tasks/{id}/comments',
  tags: ['Operations - Tasks'],
  summary: 'Add comment to task',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: addCommentSchema } } },
  },
  responses: {
    201: {
      description: 'Comment added',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
  },
});

// Get comments
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/tasks/{id}/comments',
  tags: ['Operations - Tasks'],
  summary: 'Get task comments',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Task comments' },
  },
});

// Add reminder
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/tasks/{id}/reminders',
  tags: ['Operations - Tasks'],
  summary: 'Add reminder to task',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: addReminderSchema } } },
  },
  responses: {
    201: {
      description: 'Reminder added',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Special routes first (before :id routes)
router.get('/my', taskController.getMyTasks);
router.get('/stats', taskController.getStats);
router.put('/bulk', validateBody(bulkUpdateSchema), taskController.bulkUpdate);

// CRUD routes
router.get('/', validateQuery(taskQuerySchema), taskController.getTasks);
router.post('/', validateBody(createTaskSchema), taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.put('/:id', validateBody(updateTaskSchema), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Status and archive
router.put('/:id/status', validateBody(updateStatusSchema), taskController.updateStatus);
router.post('/:id/archive', taskController.archiveTask);

// Comments
router.get('/:id/comments', taskController.getComments);
router.post('/:id/comments', validateBody(addCommentSchema), taskController.addComment);
router.put('/:id/comments/:commentId', validateBody(updateCommentSchema), taskController.updateComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

// Reminders
router.post('/:id/reminders', validateBody(addReminderSchema), taskController.addReminder);
router.delete('/:id/reminders/:reminderIndex', taskController.removeReminder);

export default router;
