/**
 * Auth Module
 *
 * Handles user authentication, registration, password management,
 * and email verification.
 *
 * Endpoints:
 * - POST /auth/register - Register new user
 * - POST /auth/login - User login
 * - POST /auth/logout - User logout
 * - POST /auth/refresh-token - Refresh access token
 * - GET  /auth/me - Get current user profile
 * - PUT  /auth/me - Update user profile
 * - PUT  /auth/change-password - Change password
 * - POST /auth/forgot-password - Request password reset
 * - POST /auth/reset-password - Reset password with token
 * - POST /auth/request-verification - Request email verification
 * - POST /auth/verify-email - Verify email with token
 */

// Models
export * from './models';

// Services
export * from './services';

// Controllers
export * from './controllers';

// Routes
export * from './routes';

// Schemas (includes Zod schemas and inferred types)
export * from './schemas';

// Types (exclude TokenPair which is already exported from schemas)
export type { JwtPayload, AuthResult, PasswordResetPayload, EmailVerificationPayload } from './types';

// Constants
export * from './constants';

// Default export is the router
export { authRoutes as default } from './routes';
