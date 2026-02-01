import { Types } from 'mongoose';

/**
 * Organization with user's membership info
 */
export interface OrganizationWithMembership {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  role: string;
  joinedAt?: Date;
  lastAccessedAt?: Date;
}

/**
 * Member with user details
 */
export interface MemberWithUser {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  role: string;
  joinedAt?: Date;
  lastAccessedAt?: Date;
}

/**
 * Organization context (for middleware)
 */
export interface OrganizationContext {
  organizationId: Types.ObjectId;
  role: string;
  permissions: string[];
}
