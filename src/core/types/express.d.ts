import { Types } from 'mongoose';

/**
 * Extended Express types for ScaleUp Horizon
 */
declare global {
  namespace Express {
    /**
     * Authenticated user attached to request
     */
    interface AuthUser {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
    }

    /**
     * Active organization context
     */
    interface OrganizationContext {
      id: string;
      name: string;
      slug: string;
    }

    /**
     * Membership details for current user in active organization
     */
    interface MembershipContext {
      id: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      permissions: string[];
    }

    /**
     * Extended Request interface
     */
    interface Request {
      /**
       * Authenticated user (set by auth middleware)
       */
      user?: AuthUser;

      /**
       * Active organization (set by org middleware)
       */
      organization?: OrganizationContext;

      /**
       * User's membership in active organization
       */
      membership?: MembershipContext;

      /**
       * User's role in active organization (shorthand)
       */
      organizationRole?: string;

      /**
       * Shorthand for organization.id (set by org middleware)
       */
      organizationId?: string;

      /**
       * Request ID for tracing
       */
      requestId?: string;

      /**
       * Start time for request timing
       */
      startTime?: number;
    }
  }
}

export {};
