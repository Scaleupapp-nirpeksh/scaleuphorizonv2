/**
 * Intelligence Module Schemas
 *
 * Zod validation schemas for AI/ML features
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  CategorizationSource,
  DocumentType,
  ReportType,
  ReportTone,
} from '../constants';

extendZodWithOpenApi(z);

// ============ Copilot Schemas ============

export const copilotQuerySchema = z.object({
  query: z.string().min(1).max(2000).openapi({
    description: 'Natural language query about financial data',
    example: 'What was our burn rate last month?',
  }),
  conversationId: z.string().optional().openapi({
    description: 'ID to continue a conversation',
  }),
  context: z
    .object({
      includeFinancials: z.boolean().optional(),
      includeRunway: z.boolean().optional(),
      includeFundraising: z.boolean().optional(),
      includeMilestones: z.boolean().optional(),
      dateRange: z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .optional(),
      customContext: z.string().optional(),
    })
    .optional(),
});

export const copilotFeedbackSchema = z.object({
  queryId: z.string(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
  wasHelpful: z.boolean().optional(),
});

export const copilotResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    answer: z.string(),
    queryType: z.string(),
    confidence: z.number(),
    sources: z
      .array(
        z.object({
          type: z.string(),
          description: z.string(),
          value: z.union([z.string(), z.number()]).optional(),
        })
      )
      .optional(),
    suggestions: z.array(z.string()).optional(),
    conversationId: z.string().optional(),
  }),
});

// ============ Categorization Schemas ============

export const categorizationItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1).max(500),
  amount: z.number(),
  date: z.string().optional(),
  vendor: z.string().optional(),
  additionalContext: z.string().optional(),
});

export const categorizationRequestSchema = z.object({
  source: z.enum([
    CategorizationSource.TRANSACTION,
    CategorizationSource.EXPENSE,
    CategorizationSource.REVENUE,
    CategorizationSource.BANK_TRANSACTION,
  ]),
  items: z.array(categorizationItemSchema).min(1).max(50),
});

export const categorizationFeedbackSchema = z.object({
  itemId: z.string(),
  suggestedCategory: z.string(),
  actualCategory: z.string(),
  wasCorrect: z.boolean(),
});

export const categorizationResultSchema = z.object({
  id: z.string(),
  suggestedCategory: z.string(),
  suggestedSubcategory: z.string().optional(),
  suggestedAccountId: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
  alternativeCategories: z
    .array(
      z.object({
        category: z.string(),
        confidence: z.enum(['high', 'medium', 'low']),
      })
    )
    .optional(),
});

// ============ Document Parser Schemas ============

export const documentParseRequestSchema = z.object({
  documentType: z
    .enum([
      DocumentType.BANK_STATEMENT,
      DocumentType.INVOICE,
      DocumentType.RECEIPT,
      DocumentType.TERM_SHEET,
      DocumentType.CONTRACT,
      DocumentType.UNKNOWN,
    ])
    .optional(),
  fileUrl: z.string().url().optional(),
  fileContent: z.string().optional(),
  fileName: z.string(),
  mimeType: z.string(),
});

export const parsedDocumentSchema = z.object({
  documentType: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'needs_review']),
  extractedData: z.record(z.unknown()),
  confidence: z.number(),
  rawText: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

// ============ Report Generator Schemas ============

export const reportGenerationRequestSchema = z.object({
  reportType: z.enum([
    ReportType.INVESTOR_UPDATE,
    ReportType.MONTHLY_SUMMARY,
    ReportType.QUARTERLY_SUMMARY,
    ReportType.FINANCIAL_HIGHLIGHTS,
    ReportType.MILESTONE_UPDATE,
    ReportType.FUNDRAISING_STATUS,
    ReportType.CUSTOM,
  ]),
  period: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  tone: z
    .enum([
      ReportTone.PROFESSIONAL,
      ReportTone.CASUAL,
      ReportTone.FORMAL,
      ReportTone.OPTIMISTIC,
      ReportTone.CONSERVATIVE,
    ])
    .optional(),
  includeMetrics: z.array(z.string()).optional(),
  customInstructions: z.string().max(1000).optional(),
  recipientType: z.enum(['investor', 'board', 'team', 'general']).optional(),
});

export const generatedReportSchema = z.object({
  reportType: z.string(),
  title: z.string(),
  subject: z.string().optional(),
  content: z.object({
    greeting: z.string().optional(),
    summary: z.string(),
    sections: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        metrics: z
          .array(
            z.object({
              label: z.string(),
              value: z.union([z.string(), z.number()]),
              change: z.string().optional(),
              trend: z.enum(['up', 'down', 'neutral']).optional(),
            })
          )
          .optional(),
      })
    ),
    highlights: z.array(z.string()).optional(),
    challenges: z.array(z.string()).optional(),
    askOrCTA: z.string().optional(),
    closing: z.string().optional(),
  }),
  metadata: z.object({
    generatedAt: z.string(),
    period: z.object({
      start: z.string(),
      end: z.string(),
    }),
    dataPoints: z.number(),
    model: z.string(),
  }),
});

// ============ Meeting Intelligence Schemas ============

export const meetingPrepRequestSchema = z.object({
  meetingId: z.string(),
});

export const meetingSummaryRequestSchema = z.object({
  meetingId: z.string().optional(),
  meetingNotes: z.string().min(10).max(10000),
  title: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});

export const actionItemsRequestSchema = z.object({
  notes: z.string().min(10).max(10000),
});

export const followUpEmailRequestSchema = z.object({
  meetingId: z.string().optional(),
  meetingSummary: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'formal']).optional(),
});

export const investorResearchRequestSchema = z.object({
  investorId: z.string(),
});

// ============ Query History Schema ============

export const queryHistorySchema = z.object({
  feature: z.string().optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
});

// ============ AI Stats Schema ============

export const aiStatsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    totalQueries: z.number(),
    queriesByFeature: z.record(z.number()),
    totalTokensUsed: z.number(),
    avgProcessingTime: z.number(),
    categorizationAccuracy: z.number().optional(),
  }),
});

// Type exports
export type CopilotQueryInput = z.infer<typeof copilotQuerySchema>;
export type CopilotFeedbackInput = z.infer<typeof copilotFeedbackSchema>;
export type CategorizationRequestInput = z.infer<typeof categorizationRequestSchema>;
export type CategorizationFeedbackInput = z.infer<typeof categorizationFeedbackSchema>;
export type DocumentParseRequestInput = z.infer<typeof documentParseRequestSchema>;
export type ReportGenerationRequestInput = z.infer<typeof reportGenerationRequestSchema>;
export type MeetingSummaryRequestInput = z.infer<typeof meetingSummaryRequestSchema>;
export type FollowUpEmailRequestInput = z.infer<typeof followUpEmailRequestSchema>;
