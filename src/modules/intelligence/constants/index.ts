/**
 * Intelligence Module Constants
 *
 * Enums and constants for AI/ML features
 */

// ============ AI Feature Types ============

export const AIFeature = {
  COPILOT: 'copilot',
  CATEGORIZATION: 'categorization',
  DOCUMENT_PARSER: 'document_parser',
  REPORT_GENERATOR: 'report_generator',
  MEETING_INTEL: 'meeting_intel',
} as const;

export type AIFeatureType = typeof AIFeature[keyof typeof AIFeature];

// ============ Query Types ============

export const QueryType = {
  // Financial queries
  FINANCIAL_METRIC: 'financial_metric',
  COMPARISON: 'comparison',
  TREND_ANALYSIS: 'trend_analysis',
  WHAT_IF: 'what_if',
  EXPLANATION: 'explanation',
  RECOMMENDATION: 'recommendation',
  // General queries
  GENERAL: 'general',
} as const;

export type QueryTypeValue = typeof QueryType[keyof typeof QueryType];

// ============ Categorization Types ============

export const CategorizationSource = {
  TRANSACTION: 'transaction',
  EXPENSE: 'expense',
  REVENUE: 'revenue',
  BANK_TRANSACTION: 'bank_transaction',
} as const;

export type CategorizationSourceType = typeof CategorizationSource[keyof typeof CategorizationSource];

export const CategorizationConfidence = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type CategorizationConfidenceType = typeof CategorizationConfidence[keyof typeof CategorizationConfidence];

// ============ Document Types ============

export const DocumentType = {
  BANK_STATEMENT: 'bank_statement',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  TERM_SHEET: 'term_sheet',
  CONTRACT: 'contract',
  UNKNOWN: 'unknown',
} as const;

export type DocumentTypeValue = typeof DocumentType[keyof typeof DocumentType];

export const ParseStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  NEEDS_REVIEW: 'needs_review',
} as const;

export type ParseStatusValue = typeof ParseStatus[keyof typeof ParseStatus];

// ============ Report Types ============

export const ReportType = {
  INVESTOR_UPDATE: 'investor_update',
  MONTHLY_SUMMARY: 'monthly_summary',
  QUARTERLY_SUMMARY: 'quarterly_summary',
  FINANCIAL_HIGHLIGHTS: 'financial_highlights',
  MILESTONE_UPDATE: 'milestone_update',
  FUNDRAISING_STATUS: 'fundraising_status',
  CUSTOM: 'custom',
} as const;

export type ReportTypeValue = typeof ReportType[keyof typeof ReportType];

export const ReportTone = {
  PROFESSIONAL: 'professional',
  CASUAL: 'casual',
  FORMAL: 'formal',
  OPTIMISTIC: 'optimistic',
  CONSERVATIVE: 'conservative',
} as const;

export type ReportToneValue = typeof ReportTone[keyof typeof ReportTone];

// ============ Meeting Intelligence Types ============

export const MeetingIntelType = {
  PREP_BRIEF: 'prep_brief',
  SUMMARY: 'summary',
  ACTION_ITEMS: 'action_items',
  FOLLOW_UP_EMAIL: 'follow_up_email',
  INVESTOR_RESEARCH: 'investor_research',
} as const;

export type MeetingIntelTypeValue = typeof MeetingIntelType[keyof typeof MeetingIntelType];

// ============ AI Model Configuration ============

export const AIModel = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
} as const;

export type AIModelType = typeof AIModel[keyof typeof AIModel];

// ============ Validation Constants ============

export const AI_LIMITS = {
  MAX_QUERY_LENGTH: 2000,
  MAX_CONTEXT_TOKENS: 8000,
  MAX_RESPONSE_TOKENS: 4000,
  MAX_DOCUMENT_SIZE_MB: 10,
  MAX_BATCH_SIZE: 50,
  MAX_HISTORY_ITEMS: 100,
  CACHE_TTL_SECONDS: 300,
  RATE_LIMIT_PER_MINUTE: 30,
} as const;

// ============ Default Prompts ============

export const DEFAULT_SYSTEM_CONTEXT = `You are a helpful financial assistant for a startup management platform called ScaleUp Horizon.
You help founders and finance teams understand their financial data, make informed decisions, and communicate with investors.
Always be concise, accurate, and actionable in your responses.
When discussing financial metrics, use proper formatting for numbers and currencies.
If you don't have enough information to answer accurately, say so and ask for clarification.`;

// ============ Feature Flags ============

export const AI_FEATURES_ENABLED = {
  COPILOT: true,
  CATEGORIZATION: true,
  DOCUMENT_PARSER: true,
  REPORT_GENERATOR: true,
  MEETING_INTEL: true,
} as const;
