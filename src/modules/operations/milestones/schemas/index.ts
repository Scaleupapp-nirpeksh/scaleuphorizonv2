/**
 * Milestone Schemas
 *
 * Zod validation schemas for milestone endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { MilestoneStatus, MilestoneCategory, OPERATIONS_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Key Result Schema ============

export const keyResultSchema = z.object({
  title: z.string().min(1).max(200),
  targetValue: z.number(),
  currentValue: z.number().optional().default(0),
  unit: z.string().max(50).optional(),
  status: z.enum(['pending', 'on_track', 'at_risk', 'achieved', 'missed']).optional().default('pending'),
});

export type KeyResultInput = z.infer<typeof keyResultSchema>;

export const updateKeyResultSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().max(50).optional(),
  status: z.enum(['pending', 'on_track', 'at_risk', 'achieved', 'missed']).optional(),
});

export type UpdateKeyResultInput = z.infer<typeof updateKeyResultSchema>;

// ============ Create Schema ============

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_MILESTONE_TITLE_LENGTH).openapi({ description: 'Milestone title', example: 'Launch MVP' }),
  description: z.string().max(OPERATIONS_CONSTANTS.MAX_MILESTONE_DESCRIPTION_LENGTH).optional(),
  category: z.enum([
    MilestoneCategory.PRODUCT,
    MilestoneCategory.REVENUE,
    MilestoneCategory.FUNDRAISING,
    MilestoneCategory.TEAM,
    MilestoneCategory.PARTNERSHIP,
    MilestoneCategory.REGULATORY,
    MilestoneCategory.MARKET_EXPANSION,
    MilestoneCategory.TECH_INFRASTRUCTURE,
    MilestoneCategory.OTHER,
  ]).optional().default(MilestoneCategory.OTHER),
  targetDate: z.string().datetime().openapi({ description: 'Target completion date' }),
  keyResults: z.array(keyResultSchema).max(OPERATIONS_CONSTANTS.MAX_KEY_RESULTS_PER_MILESTONE).optional(),
  linkedRound: z.string().optional().openapi({ description: 'Linked funding round ID' }),
  owner: z.string().optional().openapi({ description: 'Owner user ID' }),
  stakeholders: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

// ============ Update Schema ============

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_MILESTONE_TITLE_LENGTH).optional(),
  description: z.string().max(OPERATIONS_CONSTANTS.MAX_MILESTONE_DESCRIPTION_LENGTH).optional(),
  category: z.enum([
    MilestoneCategory.PRODUCT,
    MilestoneCategory.REVENUE,
    MilestoneCategory.FUNDRAISING,
    MilestoneCategory.TEAM,
    MilestoneCategory.PARTNERSHIP,
    MilestoneCategory.REGULATORY,
    MilestoneCategory.MARKET_EXPANSION,
    MilestoneCategory.TECH_INFRASTRUCTURE,
    MilestoneCategory.OTHER,
  ]).optional(),
  status: z.enum([
    MilestoneStatus.PLANNED,
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.AT_RISK,
    MilestoneStatus.COMPLETED,
    MilestoneStatus.DELAYED,
    MilestoneStatus.CANCELLED,
  ]).optional(),
  targetDate: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).optional(),
  keyResults: z.array(keyResultSchema).max(OPERATIONS_CONSTANTS.MAX_KEY_RESULTS_PER_MILESTONE).optional(),
  linkedRound: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  stakeholders: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
});

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ============ Query Schema ============

export const milestoneQuerySchema = z.object({
  status: z.enum([
    MilestoneStatus.PLANNED,
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.AT_RISK,
    MilestoneStatus.COMPLETED,
    MilestoneStatus.DELAYED,
    MilestoneStatus.CANCELLED,
  ]).optional(),
  category: z.enum([
    MilestoneCategory.PRODUCT,
    MilestoneCategory.REVENUE,
    MilestoneCategory.FUNDRAISING,
    MilestoneCategory.TEAM,
    MilestoneCategory.PARTNERSHIP,
    MilestoneCategory.REGULATORY,
    MilestoneCategory.MARKET_EXPANSION,
    MilestoneCategory.TECH_INFRASTRUCTURE,
    MilestoneCategory.OTHER,
  ]).optional(),
  owner: z.string().optional(),
  targetFrom: z.string().datetime().optional(),
  targetTo: z.string().datetime().optional(),
  linkedRound: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(OPERATIONS_CONSTANTS.MAX_PAGE_SIZE).optional().default(OPERATIONS_CONSTANTS.DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt', 'targetDate', 'title', 'status', 'progress']).optional().default('targetDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type MilestoneQueryInput = z.infer<typeof milestoneQuerySchema>;

// ============ Action Schemas ============

export const updateStatusSchema = z.object({
  status: z.enum([
    MilestoneStatus.PLANNED,
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.AT_RISK,
    MilestoneStatus.COMPLETED,
    MilestoneStatus.DELAYED,
    MilestoneStatus.CANCELLED,
  ]),
  notes: z.string().max(1000).optional(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const addKeyResultSchema = keyResultSchema;
export type AddKeyResultInput = KeyResultInput;

export const linkTasksSchema = z.object({
  taskIds: z.array(z.string()).min(1),
});

export type LinkTasksInput = z.infer<typeof linkTasksSchema>;

// ============ Response Schemas ============

export const milestoneResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    organization: z.string(),
    title: z.string(),
    description: z.string().optional(),
    category: z.string(),
    status: z.string(),
    targetDate: z.string(),
    completedDate: z.string().optional(),
    progress: z.number(),
    keyResults: z.array(z.any()).optional(),
    linkedRound: z.any().optional(),
    linkedTasks: z.array(z.any()).optional(),
    owner: z.any().optional(),
    stakeholders: z.array(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    isArchived: z.boolean(),
    isOverdue: z.boolean().optional(),
    daysUntilTarget: z.number().optional(),
    keyResultsProgress: z.number().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  message: z.string().optional(),
});

export const milestoneListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(milestoneResponseSchema.shape.data),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export const milestoneStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    byStatus: z.record(z.number()),
    byCategory: z.record(z.number()),
    onTrack: z.number(),
    atRisk: z.number(),
    overdue: z.number(),
    averageProgress: z.number(),
  }),
});

export const roadmapResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    quarters: z.array(z.object({
      quarter: z.string(),
      milestones: z.array(milestoneResponseSchema.shape.data),
    })),
  }),
});
