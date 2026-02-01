import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '@/config';
import { UnauthorizedError } from '@/core/errors';
import type { JwtPayload, TokenPair } from '../types';

/**
 * Token Service - Handles JWT token generation and validation
 */
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor() {
    this.accessSecret = config.jwt.secret;
    this.refreshSecret = config.jwt.refreshSecret;
    this.accessExpiry = config.jwt.accessExpiry;
    this.refreshExpiry = config.jwt.refreshExpiry;
  }

  /**
   * Generate access token
   */
  generateAccessToken(userId: string, email: string, organizationId?: string): string {
    const payload = {
      userId,
      email,
      type: 'access' as const,
      ...(organizationId && { organizationId }),
    };

    const options: SignOptions = {
      expiresIn: this.parseExpiryToSeconds(this.accessExpiry),
    };

    return jwt.sign(payload, this.accessSecret, options);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      type: 'refresh' as const,
    };

    const options: SignOptions = {
      expiresIn: this.parseExpiryToSeconds(this.refreshExpiry),
    };

    return jwt.sign(payload, this.refreshSecret, options);
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(userId: string, email: string, organizationId?: string): TokenPair {
    const accessToken = this.generateAccessToken(userId, email, organizationId);
    const refreshToken = this.generateRefreshToken(userId, email);

    // Parse expiry to seconds
    const expiresIn = this.parseExpiryToSeconds(this.accessExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as JwtPayload;

      if (decoded.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as JwtPayload;

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Generate random token for password reset / email verification
   */
  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage (password reset, email verification)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();

export default tokenService;
