import { User, IUser } from '../models';
import { tokenService } from './token.service';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '@/core/errors';
import { emailService } from '@/core/services';
import type { AuthResult, TokenPair } from '../types';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from '../schemas';

/**
 * Auth Service - Handles authentication business logic
 */
export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterInput): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create new user
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    // Generate tokens
    const tokens = tokenService.generateTokenPair(
      user._id.toString(),
      user.email
    );

    // Store refresh token
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Send welcome email (non-blocking)
    if (emailService.isConfigured()) {
      emailService
        .sendWelcome(user.email, user.firstName)
        .catch((err) => console.error('Failed to send welcome email:', err));
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginInput): Promise<AuthResult> {
    // Find user with password
    const user = await User.findOne({ email: data.email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = tokenService.generateTokenPair(
      user._id.toString(),
      user.email
    );

    // Store refresh token
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.removeRefreshToken(userId, refreshToken);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = tokenService.verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(payload.userId).select('+refreshTokens');
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if refresh token is in user's stored tokens
    const hashedToken = tokenService.hashToken(refreshToken);
    if (!user.refreshTokens.includes(hashedToken)) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(payload.iat)) {
      throw new UnauthorizedError('Password was changed, please login again');
    }

    // Remove old refresh token
    await this.removeRefreshToken(user._id.toString(), refreshToken);

    // Generate new token pair
    const tokens = tokenService.generateTokenPair(
      user._id.toString(),
      user.email
    );

    // Store new refresh token
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<AuthResult['user']> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<AuthResult['user']> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update fields
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.avatar !== undefined) user.avatar = data.avatar;

    await user.save();

    return this.sanitizeUser(user);
  }

  /**
   * Change password
   */
  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(data.currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Check if new password is different
    if (data.currentPassword === data.newPassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    // Update password
    user.password = data.newPassword;
    await user.save();

    // Invalidate all refresh tokens (security measure)
    await this.clearAllRefreshTokens(userId);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success message to prevent email enumeration
    const successMessage = 'If the email exists, a reset link will be sent';

    if (!user) {
      return { message: successMessage };
    }

    // Generate reset token
    const resetToken = tokenService.generateRandomToken();
    const hashedToken = tokenService.hashToken(resetToken);

    // Store hashed token with expiry (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    if (emailService.isConfigured()) {
      try {
        await emailService.sendPasswordReset(user.email, resetToken, user.firstName);
      } catch (err) {
        console.error('Failed to send password reset email:', err);
        // Don't fail the request if email fails
      }
    }

    return { message: successMessage };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the provided token
    const hashedToken = tokenService.hashToken(token);

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Invalidate all refresh tokens
    await this.clearAllRefreshTokens(user._id.toString());
  }

  /**
   * Request email verification
   */
  async requestEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    // Generate verification token
    const verificationToken = tokenService.generateRandomToken();
    const hashedToken = tokenService.hashToken(verificationToken);

    // Store hashed token with expiry (24 hours)
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Send verification email
    if (emailService.isConfigured()) {
      try {
        await emailService.sendEmailVerification(user.email, verificationToken, user.firstName);
      } catch (err) {
        console.error('Failed to send verification email:', err);
        throw new BadRequestError('Failed to send verification email. Please try again.');
      }
    }

    return { message: 'Verification email sent successfully' };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    // Hash the provided token
    const hashedToken = tokenService.hashToken(token);

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }

  /**
   * Store refresh token (hashed)
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = tokenService.hashToken(refreshToken);
    await User.findByIdAndUpdate(userId, {
      $push: { refreshTokens: hashedToken },
    });
  }

  /**
   * Remove refresh token
   */
  private async removeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = tokenService.hashToken(refreshToken);
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: hashedToken },
    });
  }

  /**
   * Clear all refresh tokens for user
   */
  private async clearAllRefreshTokens(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  /**
   * Sanitize user object for response
   */
  private sanitizeUser(user: IUser): AuthResult['user'] {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
