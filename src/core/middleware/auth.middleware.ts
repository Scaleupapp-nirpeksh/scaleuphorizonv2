import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '@/config';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { asyncHandler } from '../utils';
import { ErrorMessages } from '../constants';

interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string;
  iat: number;
  exp: number;
}

/**
 * Extended organization context for multi-tenant routes
 */
declare global {
  namespace Express {
    interface Request {
      organizationContext?: {
        organizationId: Types.ObjectId;
        role: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Protect routes - Verify JWT token and attach user to request
 */
export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError(ErrorMessages.TOKEN_MISSING);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Attach user info to request
    // In real implementation, you would fetch full user from DB
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      firstName: '', // Would be fetched from DB
      lastName: '',
      isActive: true,
    };

    // If token contains organization context
    if (decoded.organizationId) {
      req.organization = {
        id: decoded.organizationId,
        name: '', // Would be fetched from DB
        slug: '',
      };
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(ErrorMessages.TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError(ErrorMessages.TOKEN_INVALID);
    }
    throw error;
  }
});

/**
 * Require an active organization context
 * This checks for organization from:
 * 1. X-Organization-Id header
 * 2. JWT token organization context
 *
 * Then fetches the user's membership to set role and permissions
 */
export const requireOrganization = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Get organization ID from header or JWT
    const orgIdFromHeader = req.headers['x-organization-id'] as string;
    const orgIdFromJwt = req.organization?.id;
    const organizationId = orgIdFromHeader || orgIdFromJwt;

    if (!organizationId) {
      throw new ForbiddenError(ErrorMessages.ORGANIZATION_REQUIRED);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError(ErrorMessages.TOKEN_INVALID);
    }

    try {
      // Dynamically import Membership model to avoid circular dependencies
      const { Membership } = await import('@/modules/organization/models');
      const { RolePermissions } = await import('@/modules/organization/models/membership.model');

      // Find user's membership in this organization
      const membership = await Membership.findOne({
        user: new Types.ObjectId(userId),
        organization: new Types.ObjectId(organizationId),
        isActive: true,
        invitationStatus: 'accepted',
      });

      if (!membership) {
        throw new ForbiddenError('You are not a member of this organization');
      }

      // Set organization context with role and permissions
      req.organizationContext = {
        organizationId: new Types.ObjectId(organizationId),
        role: membership.role,
        permissions: RolePermissions[membership.role as keyof typeof RolePermissions] || [],
      };

      // Also set legacy organization property
      req.organization = {
        id: organizationId,
        name: '', // Would be populated if needed
        slug: '',
      };

      req.membership = {
        id: membership._id.toString(),
        role: membership.role as 'owner' | 'admin' | 'member' | 'viewer',
        permissions: RolePermissions[membership.role as keyof typeof RolePermissions] || [],
      };

      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      // If models aren't loaded yet, just set basic context
      req.organizationContext = {
        organizationId: new Types.ObjectId(organizationId),
        role: 'member',
        permissions: [],
      };
      next();
    }
  }
);

/**
 * Authorize based on organization role
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.organizationContext?.role || req.membership?.role;

    if (!role) {
      throw new ForbiddenError(ErrorMessages.ROLE_REQUIRED);
    }

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenError(ErrorMessages.INSUFFICIENT_PERMISSIONS);
    }

    next();
  });
};

/**
 * Optional authentication - don't fail if no token
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          firstName: '',
          lastName: '',
          isActive: true,
        };
      } catch {
        // Ignore token errors for optional auth
      }
    }

    next();
  }
);

export default { protect, requireOrganization, authorizeRoles, optionalAuth };
