import { Request, Response } from 'express';
import { authService } from '../services';
import { asyncHandler } from '@/core/utils';
import { sendSuccess, sendCreated, sendMessage } from '@/core/utils/response.util';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
  UpdateProfileInput,
} from '../schemas';

/**
 * Auth Controller - Handles authentication HTTP requests
 */
export class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request<object, object, RegisterInput>, res: Response) => {
    const result = await authService.register(req.body);
    sendCreated(res, result, 'Registration successful');
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request<object, object, LoginInput>, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 200, 'Login successful');
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken;
    if (refreshToken && req.user?.id) {
      await authService.logout(req.user.id, refreshToken);
    }
    sendMessage(res, 'Logout successful');
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  refreshToken = asyncHandler(
    async (req: Request<object, object, RefreshTokenInput>, res: Response) => {
      const tokens = await authService.refreshToken(req.body.refreshToken);
      sendSuccess(res, { tokens }, 200, 'Token refreshed');
    }
  );

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    sendSuccess(res, user);
  });

  /**
   * Update user profile
   * PUT /api/v1/auth/me
   */
  updateProfile = asyncHandler(
    async (req: Request<object, object, UpdateProfileInput>, res: Response) => {
      const user = await authService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, user, 200, 'Profile updated');
    }
  );

  /**
   * Change password
   * PUT /api/v1/auth/change-password
   */
  changePassword = asyncHandler(
    async (req: Request<object, object, ChangePasswordInput>, res: Response) => {
      await authService.changePassword(req.user!.id, req.body);
      sendMessage(res, 'Password changed successfully');
    }
  );

  /**
   * Forgot password - Request reset link
   * POST /api/v1/auth/forgot-password
   */
  forgotPassword = asyncHandler(
    async (req: Request<object, object, ForgotPasswordInput>, res: Response) => {
      const result = await authService.forgotPassword(req.body.email);
      sendMessage(res, result.message);
    }
  );

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(
    async (req: Request<object, object, ResetPasswordInput>, res: Response) => {
      await authService.resetPassword(req.body.token, req.body.password);
      sendMessage(res, 'Password reset successful');
    }
  );

  /**
   * Request email verification
   * POST /api/v1/auth/request-verification
   */
  requestEmailVerification = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.requestEmailVerification(req.user!.id);
    sendMessage(res, result.message);
  });

  /**
   * Verify email with token
   * POST /api/v1/auth/verify-email
   */
  verifyEmail = asyncHandler(
    async (req: Request<object, object, VerifyEmailInput>, res: Response) => {
      await authService.verifyEmail(req.body.token);
      sendMessage(res, 'Email verified successfully');
    }
  );
}

// Export singleton instance
export const authController = new AuthController();

export default authController;
