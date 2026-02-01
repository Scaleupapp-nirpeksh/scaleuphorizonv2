import { Types } from 'mongoose';
import crypto from 'crypto';
import {
  Organization,
  Membership,
  IMembership,
  OrganizationRoles,
  OrganizationRole,
  InvitationStatus,
} from '../models';
import { User } from '@/modules/auth/models';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '@/core/errors';
import type { InviteMemberInput, UpdateMemberRoleInput } from '../schemas';

/**
 * Membership Service - Handles member management business logic
 */
export class MembershipService {
  /**
   * Invite a new member to organization
   */
  async inviteMember(
    organizationId: Types.ObjectId,
    data: InviteMemberInput,
    invitedById: Types.ObjectId
  ): Promise<{ membership: IMembership; invitationToken: string }> {
    // Verify organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization not found');
    }

    // Verify inviter has permission
    const inviterMembership = await Membership.findOne({
      user: invitedById,
      organization: organizationId,
      isActive: true,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    if (!inviterMembership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    if (!['owner', 'admin'].includes(inviterMembership.role)) {
      throw new ForbiddenError('You do not have permission to invite members');
    }

    // Find or create user
    let user = await User.findOne({ email: data.email.toLowerCase() });

    if (!user) {
      // Create placeholder user (they'll need to complete registration)
      user = await User.create({
        email: data.email.toLowerCase(),
        password: crypto.randomBytes(32).toString('hex'), // Random password
        firstName: 'Pending',
        lastName: 'User',
        isActive: true,
        isEmailVerified: false,
      });
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
      user: user._id,
      organization: organizationId,
    });

    if (existingMembership) {
      if (existingMembership.isActive && existingMembership.invitationStatus === 'accepted') {
        throw new ConflictError('User is already a member of this organization');
      }

      if (existingMembership.invitationStatus === 'pending') {
        throw new ConflictError('User already has a pending invitation');
      }

      // Reactivate declined/expired invitation
      existingMembership.isActive = true;
      existingMembership.invitationStatus = InvitationStatus.PENDING;
      existingMembership.role = data.role as OrganizationRole;
      existingMembership.invitedBy = invitedById;
      existingMembership.invitedAt = new Date();
      existingMembership.invitationToken = crypto.randomBytes(32).toString('hex');
      existingMembership.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await existingMembership.save();

      return {
        membership: existingMembership,
        invitationToken: existingMembership.invitationToken!,
      };
    }

    // Create new membership with pending invitation
    const invitationToken = crypto.randomBytes(32).toString('hex');

    const membership = await Membership.create({
      user: user._id,
      organization: organizationId,
      role: data.role as OrganizationRole,
      invitedBy: invitedById,
      invitedAt: new Date(),
      invitationToken,
      invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      invitationStatus: InvitationStatus.PENDING,
    });

    return { membership, invitationToken };
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(
    invitationToken: string,
    userId: Types.ObjectId
  ): Promise<IMembership> {
    const membership = await Membership.findOne({
      invitationToken,
      invitationStatus: InvitationStatus.PENDING,
      invitationExpires: { $gt: new Date() },
    }).select('+invitationToken +invitationExpires');

    if (!membership) {
      throw new BadRequestError('Invalid or expired invitation');
    }

    // Verify the accepting user matches the invited user
    if (!membership.user.equals(userId)) {
      throw new ForbiddenError('This invitation is not for your account');
    }

    // Accept invitation
    membership.invitationStatus = InvitationStatus.ACCEPTED;
    membership.joinedAt = new Date();
    membership.invitationToken = undefined;
    membership.invitationExpires = undefined;
    await membership.save();

    return membership;
  }

  /**
   * Decline invitation
   */
  async declineInvitation(
    invitationToken: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const membership = await Membership.findOne({
      invitationToken,
      invitationStatus: InvitationStatus.PENDING,
    }).select('+invitationToken');

    if (!membership) {
      throw new BadRequestError('Invalid or expired invitation');
    }

    // Verify the declining user matches the invited user
    if (!membership.user.equals(userId)) {
      throw new ForbiddenError('This invitation is not for your account');
    }

    membership.invitationStatus = InvitationStatus.DECLINED;
    membership.invitationToken = undefined;
    membership.invitationExpires = undefined;
    await membership.save();
  }

  /**
   * Get organization members
   */
  async getMembers(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IMembership[]> {
    // Verify user has access
    const userMembership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    if (!userMembership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    const members = await Membership.find({
      organization: organizationId,
      isActive: true,
    }).populate('user', 'email firstName lastName avatar');

    return members;
  }

  /**
   * Get specific member
   */
  async getMember(
    organizationId: Types.ObjectId,
    memberId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IMembership> {
    // Verify user has access
    const userMembership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    if (!userMembership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    const member = await Membership.findOne({
      _id: memberId,
      organization: organizationId,
      isActive: true,
    }).populate('user', 'email firstName lastName avatar');

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    return member;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: Types.ObjectId,
    memberId: Types.ObjectId,
    data: UpdateMemberRoleInput,
    userId: Types.ObjectId
  ): Promise<IMembership> {
    // Verify user has permission
    const userMembership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    if (!userMembership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    if (!['owner', 'admin'].includes(userMembership.role)) {
      throw new ForbiddenError('You do not have permission to update member roles');
    }

    // Get target member
    const targetMember = await Membership.findOne({
      _id: memberId,
      organization: organizationId,
      isActive: true,
    });

    if (!targetMember) {
      throw new NotFoundError('Member not found');
    }

    // Cannot change owner's role (must transfer ownership instead)
    if (targetMember.role === OrganizationRoles.OWNER) {
      throw new ForbiddenError('Cannot change owner role. Transfer ownership instead.');
    }

    // Admin cannot change another admin's role (only owner can)
    if (
      targetMember.role === OrganizationRoles.ADMIN &&
      userMembership.role !== OrganizationRoles.OWNER
    ) {
      throw new ForbiddenError('Only owners can change admin roles');
    }

    // Note: Zod schema already validates that role cannot be 'owner'
    targetMember.role = data.role as OrganizationRole;
    await targetMember.save();

    return targetMember.populate('user', 'email firstName lastName avatar');
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: Types.ObjectId,
    memberId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<void> {
    // Verify user has permission
    const userMembership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    if (!userMembership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    if (!['owner', 'admin'].includes(userMembership.role)) {
      throw new ForbiddenError('You do not have permission to remove members');
    }

    // Get target member
    const targetMember = await Membership.findOne({
      _id: memberId,
      organization: organizationId,
      isActive: true,
    });

    if (!targetMember) {
      throw new NotFoundError('Member not found');
    }

    // Cannot remove owner
    if (targetMember.role === OrganizationRoles.OWNER) {
      throw new ForbiddenError('Cannot remove organization owner');
    }

    // Admin cannot remove another admin (only owner can)
    if (
      targetMember.role === OrganizationRoles.ADMIN &&
      userMembership.role !== OrganizationRoles.OWNER
    ) {
      throw new ForbiddenError('Only owners can remove admins');
    }

    // Soft delete
    targetMember.isActive = false;
    await targetMember.save();
  }

  /**
   * Leave organization (self-removal)
   */
  async leaveOrganization(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<void> {
    const membership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    if (!membership) {
      throw new NotFoundError('You are not a member of this organization');
    }

    // Owner cannot leave (must transfer ownership first)
    if (membership.role === OrganizationRoles.OWNER) {
      throw new ForbiddenError(
        'Owner cannot leave organization. Transfer ownership first.'
      );
    }

    membership.isActive = false;
    await membership.save();
  }

  /**
   * Get user's pending invitations
   */
  async getPendingInvitations(userId: Types.ObjectId): Promise<IMembership[]> {
    return Membership.find({
      user: userId,
      invitationStatus: InvitationStatus.PENDING,
      invitationExpires: { $gt: new Date() },
    }).populate('organization', 'name slug logo');
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(
    userId: Types.ObjectId,
    organizationId: Types.ObjectId
  ): Promise<void> {
    await Membership.findOneAndUpdate(
      {
        user: userId,
        organization: organizationId,
        isActive: true,
      },
      { lastAccessedAt: new Date() }
    );
  }
}

// Export singleton instance
export const membershipService = new MembershipService();

export default membershipService;
