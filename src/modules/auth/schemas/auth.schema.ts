import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { userResponseSchema } from './user.schema';

extendZodWithOpenApi(z);

// ============================================
// Request Schemas
// ============================================

/**
 * Register request schema
 */
export const registerSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email('Invalid email address')
        .openapi({ example: 'john@example.com' }),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        )
        .openapi({ example: 'SecurePass123' }),
      firstName: z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name cannot exceed 50 characters')
        .openapi({ example: 'John' }),
      lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(50, 'Last name cannot exceed 50 characters')
        .openapi({ example: 'Doe' }),
    })
    .openapi('RegisterRequest'),
});

/**
 * Login request schema
 */
export const loginSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email('Invalid email address')
        .openapi({ example: 'john@example.com' }),
      password: z
        .string()
        .min(1, 'Password is required')
        .openapi({ example: 'SecurePass123' }),
    })
    .openapi('LoginRequest'),
});

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z
        .string()
        .min(1, 'Refresh token is required')
        .openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    })
    .openapi('RefreshTokenRequest'),
});

/**
 * Forgot password request schema
 */
export const forgotPasswordSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email('Invalid email address')
        .openapi({ example: 'john@example.com' }),
    })
    .openapi('ForgotPasswordRequest'),
});

/**
 * Reset password request schema
 */
export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z
        .string()
        .min(1, 'Reset token is required')
        .openapi({ example: 'abc123def456...' }),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        )
        .openapi({ example: 'NewSecurePass123' }),
    })
    .openapi('ResetPasswordRequest'),
});

/**
 * Change password request schema
 */
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string()
        .min(1, 'Current password is required')
        .openapi({ example: 'OldSecurePass123' }),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        )
        .openapi({ example: 'NewSecurePass123' }),
    })
    .openapi('ChangePasswordRequest'),
});

/**
 * Verify email request schema
 */
export const verifyEmailSchema = z.object({
  body: z
    .object({
      token: z
        .string()
        .min(1, 'Verification token is required')
        .openapi({ example: 'abc123def456...' }),
    })
    .openapi('VerifyEmailRequest'),
});

/**
 * Update profile request schema (body wrapper)
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      firstName: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .openapi({ example: 'John' }),
      lastName: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .openapi({ example: 'Doe' }),
      avatar: z
        .string()
        .url()
        .optional()
        .openapi({ example: 'https://example.com/avatar.jpg' }),
    })
    .openapi('UpdateProfileRequest'),
});

// ============================================
// Response Schemas
// ============================================

/**
 * Token pair schema
 */
export const tokenPairSchema = z
  .object({
    accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    refreshToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    expiresIn: z.number().openapi({ example: 900, description: 'Access token expiry in seconds' }),
  })
  .openapi('TokenPair');

/**
 * Auth response schema (login/register response)
 */
export const authResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: userResponseSchema,
      tokens: tokenPairSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('AuthResponse');

/**
 * Token refresh response schema
 */
export const tokenRefreshResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      tokens: tokenPairSchema,
    }),
  })
  .openapi('TokenRefreshResponse');

/**
 * Message response schema
 */
export const messageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('MessageResponse');

/**
 * User profile response schema
 */
export const userProfileResponseSchema = z
  .object({
    success: z.literal(true),
    data: userResponseSchema,
  })
  .openapi('UserProfileResponse');

// ============================================
// Type Exports
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
