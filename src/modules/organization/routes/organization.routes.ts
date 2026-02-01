import { Router } from 'express';
import { organizationController } from '../controllers';
import { protect } from '@/core/middleware/auth.middleware';
import { validateBody, validateParams } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import { z } from 'zod';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationListResponseSchema,
  singleOrganizationResponseSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
  memberListResponseSchema,
  singleMemberResponseSchema,
  invitationResponseSchema,
} from '../schemas';

const router = Router();

// All routes require authentication
router.use(protect);

// ============================================
// ID Parameter Schema
// ============================================

const idParamSchema = z.object({
  id: z.string().min(1),
});

const memberIdParamSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
});

// ============================================
// OpenAPI Documentation - Organizations
// ============================================

registry.registerPath({
  method: 'post',
  path: '/api/v1/organizations',
  tags: ['Organizations'],
  summary: 'Create organization',
  description: 'Create a new organization. The creating user becomes the owner.',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createOrganizationSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Organization created',
      content: { 'application/json': { schema: singleOrganizationResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations',
  tags: ['Organizations'],
  summary: 'List organizations',
  description: "List all organizations the authenticated user is a member of",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of organizations',
      content: { 'application/json': { schema: organizationListResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/{id}',
  tags: ['Organizations'],
  summary: 'Get organization',
  description: 'Get organization details by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: 'Organization details',
      content: { 'application/json': { schema: singleOrganizationResponseSchema } },
    },
    404: { description: 'Organization not found' },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/organizations/{id}',
  tags: ['Organizations'],
  summary: 'Update organization',
  description: 'Update organization details. Requires owner or admin role.',
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateOrganizationSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Organization updated',
      content: { 'application/json': { schema: singleOrganizationResponseSchema } },
    },
    403: { description: 'Insufficient permissions' },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/organizations/{id}',
  tags: ['Organizations'],
  summary: 'Delete organization',
  description: 'Delete (deactivate) organization. Only owner can delete.',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    200: { description: 'Organization deleted' },
    403: { description: 'Only owner can delete' },
  },
});

// ============================================
// OpenAPI Documentation - Members
// ============================================

registry.registerPath({
  method: 'post',
  path: '/api/v1/organizations/{id}/members',
  tags: ['Members'],
  summary: 'Invite member',
  description: 'Invite a user to the organization. Requires owner or admin role.',
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: inviteMemberSchema.shape.body } } },
  },
  responses: {
    201: {
      description: 'Invitation sent',
      content: { 'application/json': { schema: invitationResponseSchema } },
    },
    409: { description: 'User already a member' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/{id}/members',
  tags: ['Members'],
  summary: 'List members',
  description: 'List all members of the organization',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: 'List of members',
      content: { 'application/json': { schema: memberListResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/organizations/{id}/members/{memberId}',
  tags: ['Members'],
  summary: 'Update member role',
  description: 'Update member role. Owner/admin only.',
  security: [{ bearerAuth: [] }],
  request: {
    params: memberIdParamSchema,
    body: { content: { 'application/json': { schema: updateMemberRoleSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Role updated',
      content: { 'application/json': { schema: singleMemberResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/organizations/{id}/members/{memberId}',
  tags: ['Members'],
  summary: 'Remove member',
  description: 'Remove member from organization. Owner/admin only.',
  security: [{ bearerAuth: [] }],
  request: { params: memberIdParamSchema },
  responses: {
    204: { description: 'Member removed' },
  },
});

// ============================================
// OpenAPI Documentation - Invitations
// ============================================

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/invitations',
  tags: ['Invitations'],
  summary: 'Get pending invitations',
  description: "Get all pending invitations for the authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of pending invitations',
      content: { 'application/json': { schema: memberListResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/organizations/accept-invitation',
  tags: ['Invitations'],
  summary: 'Accept invitation',
  description: 'Accept a pending invitation',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: acceptInvitationSchema.shape.body } } },
  },
  responses: {
    200: {
      description: 'Invitation accepted',
      content: { 'application/json': { schema: singleMemberResponseSchema } },
    },
    400: { description: 'Invalid or expired invitation' },
  },
});

// ============================================
// Route Definitions
// ============================================

// Invitation routes (must be before /:id routes)
router.get('/invitations', organizationController.getPendingInvitations);
router.post(
  '/accept-invitation',
  validateBody(acceptInvitationSchema.shape.body),
  organizationController.acceptInvitation
);
router.post(
  '/decline-invitation',
  validateBody(z.object({ token: z.string().min(1) })),
  organizationController.declineInvitation
);

// Organization CRUD
router.post(
  '/',
  validateBody(createOrganizationSchema.shape.body),
  organizationController.create
);
router.get('/', organizationController.list);
router.get('/:id', validateParams(idParamSchema), organizationController.getById);
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateOrganizationSchema.shape.body),
  organizationController.update
);
router.delete('/:id', validateParams(idParamSchema), organizationController.delete);

// Organization actions
router.post('/:id/switch', validateParams(idParamSchema), organizationController.switchOrganization);
router.post('/:id/leave', validateParams(idParamSchema), organizationController.leaveOrganization);
router.post(
  '/:id/transfer-ownership',
  validateParams(idParamSchema),
  validateBody(z.object({ newOwnerId: z.string().min(1) })),
  organizationController.transferOwnership
);

// Member routes
router.post(
  '/:id/members',
  validateParams(idParamSchema),
  validateBody(inviteMemberSchema.shape.body),
  organizationController.inviteMember
);
router.get('/:id/members', validateParams(idParamSchema), organizationController.listMembers);
router.get(
  '/:id/members/:memberId',
  validateParams(memberIdParamSchema),
  organizationController.getMember
);
router.put(
  '/:id/members/:memberId',
  validateParams(memberIdParamSchema),
  validateBody(updateMemberRoleSchema.shape.body),
  organizationController.updateMemberRole
);
router.delete(
  '/:id/members/:memberId',
  validateParams(memberIdParamSchema),
  organizationController.removeMember
);

export default router;
