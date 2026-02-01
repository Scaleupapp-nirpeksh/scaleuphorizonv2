import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { organizationService, membershipService } from '../services';
import { asyncHandler } from '@/core/utils';
import { sendSuccess, sendCreated, sendMessage, sendNoContent } from '@/core/utils/response.util';
import { config } from '@/config';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  AcceptInvitationInput,
} from '../schemas';

/**
 * Organization Controller - Handles organization HTTP requests
 */
export class OrganizationController {
  // ============================================
  // Organization Endpoints
  // ============================================

  /**
   * Create organization
   * POST /api/v1/organizations
   */
  create = asyncHandler(
    async (req: Request<object, object, CreateOrganizationInput>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organization = await organizationService.create(req.body, userId);
      sendCreated(res, organization, 'Organization created successfully');
    }
  );

  /**
   * List user's organizations
   * GET /api/v1/organizations
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const organizations = await organizationService.listUserOrganizations(userId);
    sendSuccess(res, organizations);
  });

  /**
   * Get organization by ID
   * GET /api/v1/organizations/:id
   */
  getById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const organizationId = new Types.ObjectId(req.params.id);
    const organization = await organizationService.getById(organizationId, userId);
    sendSuccess(res, organization);
  });

  /**
   * Update organization
   * PUT /api/v1/organizations/:id
   */
  update = asyncHandler(
    async (req: Request<{ id: string }, object, UpdateOrganizationInput>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organizationId = new Types.ObjectId(req.params.id);
      const organization = await organizationService.update(organizationId, req.body, userId);
      sendSuccess(res, organization, 200, 'Organization updated successfully');
    }
  );

  /**
   * Delete organization
   * DELETE /api/v1/organizations/:id
   */
  delete = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const organizationId = new Types.ObjectId(req.params.id);
    await organizationService.delete(organizationId, userId);
    sendMessage(res, 'Organization deleted successfully');
  });

  /**
   * Transfer ownership
   * POST /api/v1/organizations/:id/transfer-ownership
   */
  transferOwnership = asyncHandler(
    async (req: Request<{ id: string }, object, { newOwnerId: string }>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organizationId = new Types.ObjectId(req.params.id);
      const newOwnerId = new Types.ObjectId(req.body.newOwnerId);
      await organizationService.transferOwnership(organizationId, newOwnerId, userId);
      sendMessage(res, 'Ownership transferred successfully');
    }
  );

  // ============================================
  // Member Endpoints
  // ============================================

  /**
   * Invite member
   * POST /api/v1/organizations/:id/members
   */
  inviteMember = asyncHandler(
    async (req: Request<{ id: string }, object, InviteMemberInput>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organizationId = new Types.ObjectId(req.params.id);
      const { membership, invitationToken } = await membershipService.inviteMember(
        organizationId,
        req.body,
        userId
      );

      const response: {
        membership: typeof membership;
        invitationUrl?: string;
      } = { membership };

      // Include invitation URL in development
      if (config.isDevelopment) {
        response.invitationUrl = `${config.frontendUrl}/invite/${invitationToken}`;
      }

      sendCreated(res, response, 'Invitation sent successfully');
    }
  );

  /**
   * List organization members
   * GET /api/v1/organizations/:id/members
   */
  listMembers = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const organizationId = new Types.ObjectId(req.params.id);
    const members = await membershipService.getMembers(organizationId, userId);
    sendSuccess(res, members);
  });

  /**
   * Get member details
   * GET /api/v1/organizations/:id/members/:memberId
   */
  getMember = asyncHandler(
    async (req: Request<{ id: string; memberId: string }>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organizationId = new Types.ObjectId(req.params.id);
      const memberId = new Types.ObjectId(req.params.memberId);
      const member = await membershipService.getMember(organizationId, memberId, userId);
      sendSuccess(res, member);
    }
  );

  /**
   * Update member role
   * PUT /api/v1/organizations/:id/members/:memberId
   */
  updateMemberRole = asyncHandler(
    async (
      req: Request<{ id: string; memberId: string }, object, UpdateMemberRoleInput>,
      res: Response
    ) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organizationId = new Types.ObjectId(req.params.id);
      const memberId = new Types.ObjectId(req.params.memberId);
      const member = await membershipService.updateMemberRole(
        organizationId,
        memberId,
        req.body,
        userId
      );
      sendSuccess(res, member, 200, 'Member role updated');
    }
  );

  /**
   * Remove member
   * DELETE /api/v1/organizations/:id/members/:memberId
   */
  removeMember = asyncHandler(
    async (req: Request<{ id: string; memberId: string }>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const organizationId = new Types.ObjectId(req.params.id);
      const memberId = new Types.ObjectId(req.params.memberId);
      await membershipService.removeMember(organizationId, memberId, userId);
      sendNoContent(res);
    }
  );

  /**
   * Leave organization
   * POST /api/v1/organizations/:id/leave
   */
  leaveOrganization = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const organizationId = new Types.ObjectId(req.params.id);
    await membershipService.leaveOrganization(organizationId, userId);
    sendMessage(res, 'You have left the organization');
  });

  // ============================================
  // Invitation Endpoints
  // ============================================

  /**
   * Accept invitation
   * POST /api/v1/organizations/accept-invitation
   */
  acceptInvitation = asyncHandler(
    async (req: Request<object, object, AcceptInvitationInput>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      const membership = await membershipService.acceptInvitation(req.body.token, userId);
      sendSuccess(res, membership, 200, 'Invitation accepted');
    }
  );

  /**
   * Decline invitation
   * POST /api/v1/organizations/decline-invitation
   */
  declineInvitation = asyncHandler(
    async (req: Request<object, object, { token: string }>, res: Response) => {
      const userId = new Types.ObjectId(req.user!.id);
      await membershipService.declineInvitation(req.body.token, userId);
      sendMessage(res, 'Invitation declined');
    }
  );

  /**
   * Get pending invitations
   * GET /api/v1/organizations/invitations
   */
  getPendingInvitations = asyncHandler(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const invitations = await membershipService.getPendingInvitations(userId);
    sendSuccess(res, invitations);
  });

  /**
   * Switch organization (update last accessed)
   * POST /api/v1/organizations/:id/switch
   */
  switchOrganization = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const userId = new Types.ObjectId(req.user!.id);
    const organizationId = new Types.ObjectId(req.params.id);

    // Verify access and update last accessed
    await organizationService.getById(organizationId, userId);
    await membershipService.updateLastAccessed(userId, organizationId);

    sendMessage(res, 'Organization switched');
  });
}

// Export singleton instance
export const organizationController = new OrganizationController();

export default organizationController;
