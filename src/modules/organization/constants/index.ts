/**
 * Organization module constants
 */

export const ORGANIZATION_CONSTANTS = {
  // Invitation expiry
  INVITATION_EXPIRY_DAYS: 7,

  // Name limits
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,

  // Supported industries
  INDUSTRIES: [
    'technology',
    'healthcare',
    'finance',
    'education',
    'retail',
    'manufacturing',
    'services',
    'media',
    'real_estate',
    'other',
  ] as const,

  // Company sizes
  SIZES: ['startup', 'small', 'medium', 'large', 'enterprise'] as const,

  // Currencies
  CURRENCIES: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'] as const,

  // Date formats
  DATE_FORMATS: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY'] as const,
} as const;

export default ORGANIZATION_CONSTANTS;
