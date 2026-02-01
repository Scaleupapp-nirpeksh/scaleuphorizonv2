/**
 * Auth module constants
 */

export const AUTH_CONSTANTS = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,

  // Token expiry (in seconds)
  PASSWORD_RESET_EXPIRY: 60 * 60, // 1 hour
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60, // 24 hours

  // Max refresh tokens per user
  MAX_REFRESH_TOKENS: 5,

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

export default AUTH_CONSTANTS;
