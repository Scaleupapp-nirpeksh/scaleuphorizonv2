/**
 * Investor Report Zod Schemas
 *
 * Validation schemas for investor report API requests/responses
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ReportType, ReportStatus, ReportSection, REPORTING_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Section Schemas ============

const sectionMetricSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.union([z.number(), z.string()]),
  previousValue: z.union([z.number(), z.string()]).optional(),
  change: z.number().optional(),
  changeType: z.enum(['increase', 'decrease', 'neutral']).optional(),
  format: z.enum(['currency', 'percentage', 'number']).optional(),
});

const sectionChartSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'area']),
  title: z.string().min(1).max(100),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      category: z.string().optional(),
    })
  ),
});

const reportSectionSchema = z.object({
  type: z.enum(Object.values(ReportSection) as [string, ...string[]]),
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
  content: z.string().max(REPORTING_CONSTANTS.MAX_SECTION_CONTENT_LENGTH).default(''),
  metrics: z.array(sectionMetricSchema).optional(),
  charts: z.array(sectionChartSchema).optional(),
  isVisible: z.boolean().default(true),
});

// ============ Period Schema ============

const reportingPeriodSchema = z.object({
  type: z.enum(['monthly', 'quarterly', 'annual', 'custom']),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============ Recipient Schema ============

const reportRecipientSchema = z.object({
  investorId: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// ============ Metrics Schema ============

const reportMetricsSchema = z.object({
  mrr: z.number().optional(),
  arr: z.number().optional(),
  runway: z.number().optional(),
  burnRate: z.number().optional(),
  cashBalance: z.number().optional(),
  revenue: z.number().optional(),
  expenses: z.number().optional(),
  netIncome: z.number().optional(),
  headcount: z.number().int().optional(),
  customers: z.number().int().optional(),
  churnRate: z.number().optional(),
  customMetrics: z.record(z.union([z.number(), z.string()])).optional(),
});

// ============ Report Schemas ============

export const createReportSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(REPORTING_CONSTANTS.MAX_REPORT_TITLE_LENGTH).openapi({
      example: 'Q4 2024 Investor Update',
    }),
    type: z.enum(Object.values(ReportType) as [string, ...string[]]).openapi({
      example: 'quarterly_report',
    }),
    reportingPeriod: reportingPeriodSchema,
    sections: z.array(reportSectionSchema).max(REPORTING_CONSTANTS.MAX_SECTIONS_PER_REPORT).optional(),
    recipients: z.array(reportRecipientSchema).max(REPORTING_CONSTANTS.MAX_RECIPIENTS_PER_REPORT).optional(),
    metrics: reportMetricsSchema.optional(),
    notes: z.string().max(2000).optional(),
  }),
});

export const updateReportSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(REPORTING_CONSTANTS.MAX_REPORT_TITLE_LENGTH).optional(),
    reportingPeriod: reportingPeriodSchema.optional(),
    sections: z.array(reportSectionSchema).max(REPORTING_CONSTANTS.MAX_SECTIONS_PER_REPORT).optional(),
    recipients: z.array(reportRecipientSchema).max(REPORTING_CONSTANTS.MAX_RECIPIENTS_PER_REPORT).optional(),
    metrics: reportMetricsSchema.optional(),
    notes: z.string().max(2000).optional(),
  }),
});

export const addSectionSchema = z.object({
  body: reportSectionSchema,
});

export const updateSectionSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    order: z.number().int().min(0).optional(),
    content: z.string().max(REPORTING_CONSTANTS.MAX_SECTION_CONTENT_LENGTH).optional(),
    metrics: z.array(sectionMetricSchema).optional(),
    charts: z.array(sectionChartSchema).optional(),
    isVisible: z.boolean().optional(),
  }),
});

export const submitForReviewSchema = z.object({
  body: z.object({
    reviewers: z.array(z.string().email()).optional(),
  }),
});

export const approveReportSchema = z.object({
  body: z.object({
    notes: z.string().max(500).optional(),
  }),
});

export const sendReportSchema = z.object({
  body: z.object({
    additionalRecipients: z.array(reportRecipientSchema).optional(),
    customMessage: z.string().max(1000).optional(),
    scheduleAt: z.string().datetime().optional(),
  }),
});

export const reportQuerySchema = z.object({
  query: z.object({
    type: z.enum(Object.values(ReportType) as [string, ...string[]]).optional(),
    status: z.enum(Object.values(ReportStatus) as [string, ...string[]]).optional(),
    year: z.string().regex(/^\d{4}$/).transform(Number).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    sortBy: z.enum(['title', 'type', 'status', 'createdAt', 'sentAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ============ Template Schemas ============

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).openapi({ example: 'Monthly Update Template' }),
    description: z.string().max(500).optional(),
    type: z.enum(Object.values(ReportType) as [string, ...string[]]),
    sections: z.array(
      z.object({
        type: z.enum(Object.values(ReportSection) as [string, ...string[]]),
        title: z.string().min(1).max(200),
        order: z.number().int().min(0),
        defaultContent: z.string().optional(),
        isRequired: z.boolean().default(false),
      })
    ),
    isDefault: z.boolean().default(false),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    sections: z
      .array(
        z.object({
          type: z.enum(Object.values(ReportSection) as [string, ...string[]]),
          title: z.string().min(1).max(200),
          order: z.number().int().min(0),
          defaultContent: z.string().optional(),
          isRequired: z.boolean().default(false),
        })
      )
      .optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

// ============ Type Exports ============

export type CreateReportInput = z.infer<typeof createReportSchema>['body'];
export type UpdateReportInput = z.infer<typeof updateReportSchema>['body'];
export type AddSectionInput = z.infer<typeof addSectionSchema>['body'];
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>['body'];
export type SubmitForReviewInput = z.infer<typeof submitForReviewSchema>['body'];
export type ApproveReportInput = z.infer<typeof approveReportSchema>['body'];
export type SendReportInput = z.infer<typeof sendReportSchema>['body'];
export type ReportQueryInput = z.infer<typeof reportQuerySchema>['query'];
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>['body'];
