import { Router } from 'express';
import { authController } from '../controllers';
import { protect } from '@/core/middleware/auth.middleware';
import { validateBody } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  authResponseSchema,
  tokenRefreshResponseSchema,
  messageResponseSchema,
  userProfileResponseSchema,
} from '../schemas';

const router = Router();

// ============================================
// OpenAPI Documentation
// ============================================

// Register endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary: 'Register new user',
  description: 'Create a new user account and receive authentication tokens',
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerSchema.shape.body,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: authResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
    },
    409: {
      description: 'User already exists',
    },
  },
});

// Login endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'User login',
  description: 'Authenticate user and receive tokens',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: authResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
    },
  },
});

// Logout endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  tags: ['Auth'],
  summary: 'User logout',
  description: 'Invalidate refresh token',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: refreshTokenSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
  },
});

// Refresh token endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh-token',
  tags: ['Auth'],
  summary: 'Refresh access token',
  description: 'Get new access token using refresh token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: refreshTokenSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token refreshed',
      content: {
        'application/json': {
          schema: tokenRefreshResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid or expired refresh token',
    },
  },
});

// Get profile endpoint
registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'Get current user profile',
  description: 'Retrieve the authenticated user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile',
      content: {
        'application/json': {
          schema: userProfileResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

// Update profile endpoint
registry.registerPath({
  method: 'put',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'Update user profile',
  description: 'Update the authenticated user profile',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateProfileSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated',
      content: {
        'application/json': {
          schema: userProfileResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

// Change password endpoint
registry.registerPath({
  method: 'put',
  path: '/api/v1/auth/change-password',
  tags: ['Auth'],
  summary: 'Change password',
  description: 'Change the authenticated user password',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: changePasswordSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password changed',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid current password',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

// Forgot password endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/forgot-password',
  tags: ['Auth'],
  summary: 'Forgot password',
  description: 'Request password reset email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: forgotPasswordSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Reset email sent',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
  },
});

// Reset password endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/reset-password',
  tags: ['Auth'],
  summary: 'Reset password',
  description: 'Reset password using token from email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: resetPasswordSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset successful',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid or expired token',
    },
  },
});

// Request email verification endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/request-verification',
  tags: ['Auth'],
  summary: 'Request email verification',
  description: 'Send verification email to authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Verification email sent',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
    400: {
      description: 'Email already verified',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

// Verify email endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/verify-email',
  tags: ['Auth'],
  summary: 'Verify email',
  description: 'Verify email using token from verification email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: verifyEmailSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Email verified',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid or expired token',
    },
  },
});

// ============================================
// Route Definitions
// ============================================

// Public routes (no auth required)
router.post('/register', validateBody(registerSchema.shape.body), authController.register);
router.post('/login', validateBody(loginSchema.shape.body), authController.login);
router.post('/refresh-token', validateBody(refreshTokenSchema.shape.body), authController.refreshToken);
router.post('/forgot-password', validateBody(forgotPasswordSchema.shape.body), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema.shape.body), authController.resetPassword);
router.post('/verify-email', validateBody(verifyEmailSchema.shape.body), authController.verifyEmail);

// Protected routes (auth required)
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getProfile);
router.put('/me', protect, validateBody(updateProfileSchema.shape.body), authController.updateProfile);
router.put('/change-password', protect, validateBody(changePasswordSchema.shape.body), authController.changePassword);
router.post('/request-verification', protect, authController.requestEmailVerification);

export default router;
