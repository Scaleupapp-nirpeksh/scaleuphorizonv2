import { model, Document, Types, Schema } from 'mongoose';
import { createBaseSchema } from '@/core/database';

/**
 * Organization roles with permissions
 */
export const OrganizationRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type OrganizationRole = (typeof OrganizationRoles)[keyof typeof OrganizationRoles];

/**
 * Role permissions
 */
export const RolePermissions: Record<OrganizationRole, string[]> = {
  owner: [
    'organization:read',
    'organization:update',
    'organization:delete',
    'members:read',
    'members:invite',
    'members:update',
    'members:remove',
    'billing:read',
    'billing:update',
    '*', // All permissions
  ],
  admin: [
    'organization:read',
    'organization:update',
    'members:read',
    'members:invite',
    'members:update',
    'members:remove',
    'data:read',
    'data:write',
    'data:delete',
    'reports:read',
    'reports:write',
  ],
  member: [
    'organization:read',
    'members:read',
    'data:read',
    'data:write',
    'reports:read',
  ],
  viewer: [
    'organization:read',
    'members:read',
    'data:read',
    'reports:read',
  ],
};

/**
 * Invitation status
 */
export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export type InvitationStatusType = (typeof InvitationStatus)[keyof typeof InvitationStatus];

/**
 * Membership document interface
 */
export interface IMembership extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  organization: Types.ObjectId;
  role: OrganizationRole;
  invitedBy?: Types.ObjectId;
  invitedAt?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  invitationStatus: InvitationStatusType;
  joinedAt?: Date;
  isActive: boolean;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  hasPermission(permission: string): boolean;
}

/**
 * Membership schema definition
 */
const membershipSchemaDefinition = {
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: Object.values(OrganizationRoles),
    default: OrganizationRoles.MEMBER,
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  invitedAt: {
    type: Date,
  },
  invitationToken: {
    type: String,
    select: false,
  },
  invitationExpires: {
    type: Date,
    select: false,
  },
  invitationStatus: {
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.ACCEPTED,
  },
  joinedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastAccessedAt: {
    type: Date,
  },
};

const membershipSchema = createBaseSchema(membershipSchemaDefinition);

/**
 * Compound unique index for user-organization pair
 */
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });

/**
 * Index for finding memberships by organization
 */
membershipSchema.index({ organization: 1, isActive: 1 });

/**
 * Index for invitation token lookup
 */
membershipSchema.index({ invitationToken: 1 }, { sparse: true });

/**
 * Instance method to check permission
 */
membershipSchema.methods.hasPermission = function (permission: string): boolean {
  const permissions = RolePermissions[this.role as OrganizationRole] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

/**
 * Static method to find user's memberships
 */
membershipSchema.statics.findUserMemberships = function (userId: Types.ObjectId) {
  return this.find({
    user: userId,
    isActive: true,
    invitationStatus: InvitationStatus.ACCEPTED,
  }).populate('organization');
};

/**
 * Static method to find organization members
 */
membershipSchema.statics.findOrganizationMembers = function (organizationId: Types.ObjectId) {
  return this.find({
    organization: organizationId,
    isActive: true,
    invitationStatus: InvitationStatus.ACCEPTED,
  }).populate('user', 'email firstName lastName avatar');
};

/**
 * Static method to find membership by user and organization
 */
membershipSchema.statics.findMembership = function (
  userId: Types.ObjectId,
  organizationId: Types.ObjectId
) {
  return this.findOne({
    user: userId,
    organization: organizationId,
    isActive: true,
  });
};

/**
 * Static method to find by invitation token
 */
membershipSchema.statics.findByInvitationToken = function (token: string) {
  return this.findOne({
    invitationToken: token,
    invitationStatus: InvitationStatus.PENDING,
    invitationExpires: { $gt: new Date() },
  }).select('+invitationToken +invitationExpires');
};

export const Membership = model<IMembership>('Membership', membershipSchema);

export default Membership;
