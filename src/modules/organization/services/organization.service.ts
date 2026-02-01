import { Types } from 'mongoose';
import { Organization, IOrganization, Membership, OrganizationRoles } from '../models';
import { NotFoundError, ForbiddenError, ConflictError } from '@/core/errors';
import type { CreateOrganizationInput, UpdateOrganizationInput } from '../schemas';

/**
 * Organization Service - Handles organization business logic
 */
export class OrganizationService {
  /**
   * Create a new organization
   */
  async create(
    data: CreateOrganizationInput,
    ownerId: Types.ObjectId
  ): Promise<IOrganization> {
    // Create organization
    const organization = await Organization.create({
      ...data,
      owner: ownerId,
    });

    // Create owner membership
    await Membership.create({
      user: ownerId,
      organization: organization._id,
      role: OrganizationRoles.OWNER,
      invitationStatus: 'accepted',
      joinedAt: new Date(),
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getById(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization not found');
    }

    // Verify user has access
    const membership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: 'accepted',
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    return organization;
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string, userId: Types.ObjectId): Promise<IOrganization> {
    const organization = await Organization.findOne({ slug, isActive: true });

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    // Verify user has access
    const membership = await Membership.findOne({
      user: userId,
      organization: organization._id,
      isActive: true,
      invitationStatus: 'accepted',
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    return organization;
  }

  /**
   * List all organizations for a user
   */
  async listUserOrganizations(userId: Types.ObjectId): Promise<IOrganization[]> {
    const memberships = await Membership.find({
      user: userId,
      isActive: true,
      invitationStatus: 'accepted',
    }).populate('organization');

    return memberships
      .map((m) => m.organization as unknown as IOrganization)
      .filter((org) => org && org.isActive);
  }

  /**
   * Update organization
   */
  async update(
    organizationId: Types.ObjectId,
    data: UpdateOrganizationInput,
    userId: Types.ObjectId
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization not found');
    }

    // Verify user has permission to update
    const membership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: 'accepted',
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this organization');
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenError('You do not have permission to update this organization');
    }

    // Update fields
    if (data.name !== undefined) organization.name = data.name;
    if (data.description !== undefined) organization.description = data.description;
    if (data.logo !== undefined) organization.logo = data.logo;
    if (data.website !== undefined) organization.website = data.website;
    if (data.industry !== undefined) organization.industry = data.industry;
    if (data.size !== undefined) organization.size = data.size;
    if (data.foundedYear !== undefined) organization.foundedYear = data.foundedYear;

    if (data.settings) {
      organization.settings = {
        ...organization.settings,
        ...data.settings,
      };
    }

    await organization.save();

    return organization;
  }

  /**
   * Delete (deactivate) organization
   */
  async delete(organizationId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const organization = await Organization.findById(organizationId);

    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization not found');
    }

    // Only owner can delete
    if (!organization.owner.equals(userId)) {
      throw new ForbiddenError('Only the owner can delete the organization');
    }

    // Soft delete - deactivate organization
    organization.isActive = false;
    await organization.save();

    // Deactivate all memberships
    await Membership.updateMany(
      { organization: organizationId },
      { isActive: false }
    );
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    organizationId: Types.ObjectId,
    newOwnerId: Types.ObjectId,
    currentOwnerId: Types.ObjectId
  ): Promise<void> {
    const organization = await Organization.findById(organizationId);

    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization not found');
    }

    // Only current owner can transfer
    if (!organization.owner.equals(currentOwnerId)) {
      throw new ForbiddenError('Only the owner can transfer ownership');
    }

    // Verify new owner is a member
    const newOwnerMembership = await Membership.findOne({
      user: newOwnerId,
      organization: organizationId,
      isActive: true,
      invitationStatus: 'accepted',
    });

    if (!newOwnerMembership) {
      throw new NotFoundError('New owner must be a member of the organization');
    }

    // Check if new owner is different from current owner
    if (organization.owner.equals(newOwnerId)) {
      throw new ConflictError('User is already the owner');
    }

    // Update organization owner
    organization.owner = newOwnerId;
    await organization.save();

    // Update membership roles
    await Membership.findOneAndUpdate(
      { user: currentOwnerId, organization: organizationId },
      { role: OrganizationRoles.ADMIN }
    );

    await Membership.findOneAndUpdate(
      { user: newOwnerId, organization: organizationId },
      { role: OrganizationRoles.OWNER }
    );
  }

  /**
   * Check if user has access to organization
   */
  async hasAccess(
    userId: Types.ObjectId,
    organizationId: Types.ObjectId
  ): Promise<boolean> {
    const membership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: 'accepted',
    });

    return !!membership;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(
    userId: Types.ObjectId,
    organizationId: Types.ObjectId
  ): Promise<string | null> {
    const membership = await Membership.findOne({
      user: userId,
      organization: organizationId,
      isActive: true,
      invitationStatus: 'accepted',
    });

    return membership?.role || null;
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();

export default organizationService;
