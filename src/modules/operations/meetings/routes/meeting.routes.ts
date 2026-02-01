/**
 * Meeting Routes
 *
 * Express routes for investor meeting management
 */

import { Router } from 'express';
import { meetingController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  createMeetingSchema,
  updateMeetingSchema,
  meetingQuerySchema,
  completeMeetingSchema,
  addActionItemSchema,
  updateActionItemSchema,
  rescheduleSchema,
  meetingResponseSchema,
  meetingListResponseSchema,
  meetingStatsResponseSchema,
  upcomingMeetingsResponseSchema,
} from '../schemas';

const router = Router();

// Apply middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ OpenAPI Documentation ============

// List meetings
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/meetings',
  tags: ['Operations - Meetings'],
  summary: 'List all meetings',
  description: 'Get all meetings for the organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: meetingQuerySchema,
  },
  responses: {
    200: {
      description: 'List of meetings',
      content: { 'application/json': { schema: meetingListResponseSchema } },
    },
  },
});

// Create meeting
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/meetings',
  tags: ['Operations - Meetings'],
  summary: 'Schedule a new meeting',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createMeetingSchema } } },
  },
  responses: {
    201: {
      description: 'Meeting scheduled',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// Get upcoming meetings
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/meetings/upcoming',
  tags: ['Operations - Meetings'],
  summary: 'Get upcoming meetings',
  description: 'Get meetings organized by today, this week, and later',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Upcoming meetings',
      content: { 'application/json': { schema: upcomingMeetingsResponseSchema } },
    },
  },
});

// Get meeting stats
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/meetings/stats',
  tags: ['Operations - Meetings'],
  summary: 'Get meeting statistics',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Meeting statistics',
      content: { 'application/json': { schema: meetingStatsResponseSchema } },
    },
  },
});

// Get meetings by investor
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/meetings/investor/{investorId}',
  tags: ['Operations - Meetings'],
  summary: 'Get meetings with an investor',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Investor meetings',
      content: { 'application/json': { schema: meetingListResponseSchema } },
    },
  },
});

// Get meeting by ID
registry.registerPath({
  method: 'get',
  path: '/api/v1/operations/meetings/{id}',
  tags: ['Operations - Meetings'],
  summary: 'Get meeting by ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Meeting details',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
    404: { description: 'Meeting not found' },
  },
});

// Update meeting
registry.registerPath({
  method: 'put',
  path: '/api/v1/operations/meetings/{id}',
  tags: ['Operations - Meetings'],
  summary: 'Update meeting',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: updateMeetingSchema } } },
  },
  responses: {
    200: {
      description: 'Meeting updated',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// Delete meeting
registry.registerPath({
  method: 'delete',
  path: '/api/v1/operations/meetings/{id}',
  tags: ['Operations - Meetings'],
  summary: 'Delete meeting',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Meeting deleted' },
  },
});

// Complete meeting
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/meetings/{id}/complete',
  tags: ['Operations - Meetings'],
  summary: 'Complete meeting with outcome',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: completeMeetingSchema } } },
  },
  responses: {
    200: {
      description: 'Meeting completed',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// Cancel meeting
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/meetings/{id}/cancel',
  tags: ['Operations - Meetings'],
  summary: 'Cancel meeting',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Meeting cancelled',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// Reschedule meeting
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/meetings/{id}/reschedule',
  tags: ['Operations - Meetings'],
  summary: 'Reschedule meeting',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: rescheduleSchema } } },
  },
  responses: {
    200: {
      description: 'Meeting rescheduled',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// Archive meeting
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/meetings/{id}/archive',
  tags: ['Operations - Meetings'],
  summary: 'Archive meeting',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Meeting archived',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// Add action item
registry.registerPath({
  method: 'post',
  path: '/api/v1/operations/meetings/{id}/actions',
  tags: ['Operations - Meetings'],
  summary: 'Add action item to meeting',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: addActionItemSchema } } },
  },
  responses: {
    201: {
      description: 'Action item added',
      content: { 'application/json': { schema: meetingResponseSchema } },
    },
  },
});

// ============ Route Definitions ============

// Special routes first (before :id routes)
router.get('/upcoming', meetingController.getUpcoming);
router.get('/stats', meetingController.getStats);
router.get('/investor/:investorId', meetingController.getByInvestor);

// CRUD routes
router.get('/', validateQuery(meetingQuerySchema), meetingController.getMeetings);
router.post('/', validateBody(createMeetingSchema), meetingController.createMeeting);
router.get('/:id', meetingController.getMeetingById);
router.put('/:id', validateBody(updateMeetingSchema), meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting);

// Workflow routes
router.post('/:id/complete', validateBody(completeMeetingSchema), meetingController.completeMeeting);
router.post('/:id/cancel', meetingController.cancelMeeting);
router.post('/:id/reschedule', validateBody(rescheduleSchema), meetingController.rescheduleMeeting);
router.post('/:id/archive', meetingController.archiveMeeting);

// Action items
router.post('/:id/actions', validateBody(addActionItemSchema), meetingController.addActionItem);
router.put('/:id/actions/:actionId', validateBody(updateActionItemSchema), meetingController.updateActionItem);
router.delete('/:id/actions/:actionId', meetingController.deleteActionItem);

export default router;
