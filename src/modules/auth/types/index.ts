import { Types } from 'mongoose';

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  organizationId?: string;
  iat: number;
  exp: number;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Auth result (user + tokens)
 */
export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar?: string;
    isEmailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: TokenPair;
}

/**
 * Password reset token payload
 */
export interface PasswordResetPayload {
  userId: Types.ObjectId;
  email: string;
  token: string;
  expiresAt: Date;
}

/**
 * Email verification payload
 */
export interface EmailVerificationPayload {
  userId: Types.ObjectId;
  email: string;
  token: string;
  expiresAt: Date;
}
