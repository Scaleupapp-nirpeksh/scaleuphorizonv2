/**
 * Task Schemas
 *
 * Zod validation schemas for task endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { TaskStatus, TaskPriority, TaskCategory, ReminderType, OPERATIONS_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Nested Schemas ============

export const taskReminderSchema = z.object({
  reminderDate: z.string().datetime(),
  reminderType: z.enum([ReminderType.EMAIL, ReminderType.IN_APP, ReminderType.BOTH]).optional().default(ReminderType.IN_APP),
});

export const taskCommentInputSchema = z.object({
  content: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_COMMENT_LENGTH),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.string().url()).optional(),
});

// ============ Create Schema ============

export const createTaskSchema = z.object({
  title: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_TASK_TITLE_LENGTH).openapi({ description: 'Task title', example: 'Review Q4 financial projections' }),
  description: z.string().max(OPERATIONS_CONSTANTS.MAX_TASK_DESCRIPTION_LENGTH).optional().openapi({ description: 'Detailed task description' }),
  status: z.enum([
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.BLOCKED,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ]).optional().default(TaskStatus.TODO),
  priority: z.enum([
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ]).optional().default(TaskPriority.MEDIUM),
  category: z.enum([
    TaskCategory.FINANCE,
    TaskCategory.LEGAL,
    TaskCategory.FUNDRAISING,
    TaskCategory.OPERATIONS,
    TaskCategory.PRODUCT,
    TaskCategory.MARKETING,
    TaskCategory.SALES,
    TaskCategory.HR,
    TaskCategory.ADMIN,
    TaskCategory.OTHER,
  ]).optional().default(TaskCategory.OTHER),
  subcategory: z.string().max(100).optional(),
  assignee: z.string().optional().openapi({ description: 'User ID of assignee' }),
  dueDate: z.string().datetime().optional().openapi({ description: 'Task due date' }),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).max(OPERATIONS_CONSTANTS.MAX_TAGS_PER_TASK).optional(),
  attachments: z.array(z.string().url()).max(OPERATIONS_CONSTANTS.MAX_ATTACHMENTS_PER_TASK).optional(),
  parentTask: z.string().optional().openapi({ description: 'Parent task ID for subtasks' }),
  linkedMilestone: z.string().optional(),
  linkedMeeting: z.string().optional(),
  watchers: z.array(z.string()).optional(),
  reminders: z.array(taskReminderSchema).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ============ Update Schema ============

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_TASK_TITLE_LENGTH).optional(),
  description: z.string().max(OPERATIONS_CONSTANTS.MAX_TASK_DESCRIPTION_LENGTH).optional(),
  status: z.enum([
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.BLOCKED,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ]).optional(),
  priority: z.enum([
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ]).optional(),
  category: z.enum([
    TaskCategory.FINANCE,
    TaskCategory.LEGAL,
    TaskCategory.FUNDRAISING,
    TaskCategory.OPERATIONS,
    TaskCategory.PRODUCT,
    TaskCategory.MARKETING,
    TaskCategory.SALES,
    TaskCategory.HR,
    TaskCategory.ADMIN,
    TaskCategory.OTHER,
  ]).optional(),
  subcategory: z.string().max(100).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  actualHours: z.number().min(0).optional(),
  tags: z.array(z.string()).max(OPERATIONS_CONSTANTS.MAX_TAGS_PER_TASK).optional(),
  attachments: z.array(z.string().url()).max(OPERATIONS_CONSTANTS.MAX_ATTACHMENTS_PER_TASK).optional(),
  linkedMilestone: z.string().nullable().optional(),
  linkedMeeting: z.string().nullable().optional(),
  watchers: z.array(z.string()).optional(),
  reminders: z.array(taskReminderSchema).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ============ Query Schema ============

export const taskQuerySchema = z.object({
  status: z.enum([
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.BLOCKED,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ]).optional(),
  priority: z.enum([
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ]).optional(),
  category: z.enum([
    TaskCategory.FINANCE,
    TaskCategory.LEGAL,
    TaskCategory.FUNDRAISING,
    TaskCategory.OPERATIONS,
    TaskCategory.PRODUCT,
    TaskCategory.MARKETING,
    TaskCategory.SALES,
    TaskCategory.HR,
    TaskCategory.ADMIN,
    TaskCategory.OTHER,
  ]).optional(),
  assignee: z.string().optional(),
  reporter: z.string().optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  isOverdue: z.coerce.boolean().optional(),
  hasNoAssignee: z.coerce.boolean().optional(),
  linkedMilestone: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(OPERATIONS_CONSTANTS.MAX_PAGE_SIZE).optional().default(OPERATIONS_CONSTANTS.DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type TaskQueryInput = z.infer<typeof taskQuerySchema>;

// ============ Action Schemas ============

export const updateStatusSchema = z.object({
  status: z.enum([
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.BLOCKED,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ]),
  actualHours: z.number().min(0).optional(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const addCommentSchema = z.object({
  content: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_COMMENT_LENGTH),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.string().url()).optional(),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_COMMENT_LENGTH),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const addReminderSchema = z.object({
  reminderDate: z.string().datetime(),
  reminderType: z.enum([ReminderType.EMAIL, ReminderType.IN_APP, ReminderType.BOTH]).optional().default(ReminderType.IN_APP),
});

export type AddReminderInput = z.infer<typeof addReminderSchema>;

export const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1).max(50),
  updates: z.object({
    status: z.enum([
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.BLOCKED,
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED,
    ]).optional(),
    priority: z.enum([
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.URGENT,
    ]).optional(),
    assignee: z.string().nullable().optional(),
    category: z.enum([
      TaskCategory.FINANCE,
      TaskCategory.LEGAL,
      TaskCategory.FUNDRAISING,
      TaskCategory.OPERATIONS,
      TaskCategory.PRODUCT,
      TaskCategory.MARKETING,
      TaskCategory.SALES,
      TaskCategory.HR,
      TaskCategory.ADMIN,
      TaskCategory.OTHER,
    ]).optional(),
  }),
});

export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;

// ============ Response Schemas ============

export const taskResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    organization: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    priority: z.string(),
    category: z.string(),
    subcategory: z.string().optional(),
    assignee: z.any().optional(),
    reporter: z.any(),
    dueDate: z.string().optional(),
    startDate: z.string().optional(),
    completedAt: z.string().optional(),
    estimatedHours: z.number().optional(),
    actualHours: z.number().optional(),
    tags: z.array(z.string()).optional(),
    attachments: z.array(z.string()).optional(),
    comments: z.array(z.any()).optional(),
    reminders: z.array(z.any()).optional(),
    parentTask: z.string().optional(),
    subtasks: z.array(z.string()).optional(),
    linkedMilestone: z.string().optional(),
    linkedMeeting: z.string().optional(),
    watchers: z.array(z.string()).optional(),
    isArchived: z.boolean(),
    isOverdue: z.boolean().optional(),
    daysUntilDue: z.number().optional(),
    commentCount: z.number().optional(),
    subtaskCount: z.number().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  message: z.string().optional(),
});

export const taskListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(taskResponseSchema.shape.data),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export const taskStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    byStatus: z.record(z.number()),
    byPriority: z.record(z.number()),
    byCategory: z.record(z.number()),
    overdue: z.number(),
    completedThisWeek: z.number(),
    completedThisMonth: z.number(),
    averageCompletionTime: z.number().optional(),
  }),
});
