import { config } from './index';

export const authConfig = {
  jwt: {
    secret: config.jwt.secret,
    accessTokenExpiry: config.jwt.accessExpiry,
    refreshTokenExpiry: config.jwt.refreshExpiry,
    issuer: 'scaleup-horizon',
    audience: 'scaleup-horizon-api',
  },

  password: {
    saltRounds: 12,
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  session: {
    cookieName: 'sh_session',
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    secure: config.isProduction,
    httpOnly: true,
    sameSite: 'strict' as const,
  },

  resetToken: {
    expiryMinutes: 60, // 1 hour
    length: 32,
  },

  setupToken: {
    expiryDays: 7,
    length: 32,
  },
} as const;

export type AuthConfig = typeof authConfig;
export default authConfig;
