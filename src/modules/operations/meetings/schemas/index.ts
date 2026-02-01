/**
 * Meeting Schemas
 *
 * Zod validation schemas for meeting endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { MeetingType, MeetingStatus, MeetingOutcome, ActionItemStatus, ReminderType, OPERATIONS_CONSTANTS } from '../../constants';

extendZodWithOpenApi(z);

// ============ Nested Schemas ============

export const meetingAttendeeSchema = z.object({
  user: z.string().optional(),
  investor: z.string().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  role: z.string().max(100).optional(),
  isRequired: z.boolean().optional().default(true),
  rsvpStatus: z.enum(['pending', 'accepted', 'declined', 'tentative']).optional().default('pending'),
});

export type MeetingAttendeeInput = z.infer<typeof meetingAttendeeSchema>;

export const meetingActionItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum([
    ActionItemStatus.PENDING,
    ActionItemStatus.IN_PROGRESS,
    ActionItemStatus.COMPLETED,
    ActionItemStatus.CANCELLED,
  ]).optional().default(ActionItemStatus.PENDING),
});

export type MeetingActionItemInput = z.infer<typeof meetingActionItemSchema>;

export const meetingReminderSchema = z.object({
  reminderDate: z.string().datetime(),
  reminderType: z.enum([ReminderType.EMAIL, ReminderType.IN_APP, ReminderType.BOTH]).optional().default(ReminderType.IN_APP),
});

export const recurringPatternSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  endDate: z.string().datetime().optional(),
  occurrences: z.number().int().min(1).optional(),
});

// ============ Create Schema ============

export const createMeetingSchema = z.object({
  title: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_MEETING_TITLE_LENGTH).openapi({ description: 'Meeting title', example: 'Series A Discussion with Sequoia' }),
  type: z.enum([
    MeetingType.INVESTOR_UPDATE,
    MeetingType.PITCH,
    MeetingType.DUE_DILIGENCE,
    MeetingType.BOARD_MEETING,
    MeetingType.INTRO_CALL,
    MeetingType.FOLLOW_UP,
    MeetingType.TERM_SHEET_DISCUSSION,
    MeetingType.CLOSING,
    MeetingType.OTHER,
  ]).openapi({ description: 'Type of meeting' }),
  startTime: z.string().datetime().openapi({ description: 'Meeting start time' }),
  endTime: z.string().datetime().openapi({ description: 'Meeting end time' }),
  timezone: z.string().optional().default('UTC'),
  location: z.string().max(500).optional(),
  meetingLink: z.string().url().optional(),
  investor: z.string().optional().openapi({ description: 'Investor ID' }),
  round: z.string().optional().openapi({ description: 'Funding round ID' }),
  attendees: z.array(meetingAttendeeSchema).max(OPERATIONS_CONSTANTS.MAX_ATTENDEES_PER_MEETING).optional(),
  agenda: z.string().max(10000).optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: recurringPatternSchema.optional(),
  reminders: z.array(meetingReminderSchema).optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

// ============ Update Schema ============

export const updateMeetingSchema = z.object({
  title: z.string().min(1).max(OPERATIONS_CONSTANTS.MAX_MEETING_TITLE_LENGTH).optional(),
  type: z.enum([
    MeetingType.INVESTOR_UPDATE,
    MeetingType.PITCH,
    MeetingType.DUE_DILIGENCE,
    MeetingType.BOARD_MEETING,
    MeetingType.INTRO_CALL,
    MeetingType.FOLLOW_UP,
    MeetingType.TERM_SHEET_DISCUSSION,
    MeetingType.CLOSING,
    MeetingType.OTHER,
  ]).optional(),
  status: z.enum([
    MeetingStatus.SCHEDULED,
    MeetingStatus.CONFIRMED,
    MeetingStatus.IN_PROGRESS,
    MeetingStatus.COMPLETED,
    MeetingStatus.CANCELLED,
    MeetingStatus.RESCHEDULED,
    MeetingStatus.NO_SHOW,
  ]).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().url().optional(),
  investor: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
  attendees: z.array(meetingAttendeeSchema).max(OPERATIONS_CONSTANTS.MAX_ATTENDEES_PER_MEETING).optional(),
  agenda: z.string().max(10000).optional(),
  notes: z.string().max(OPERATIONS_CONSTANTS.MAX_MEETING_NOTES_LENGTH).optional(),
  attachments: z.array(z.string().url()).max(20).optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  reminders: z.array(meetingReminderSchema).optional(),
});

export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

// ============ Query Schema ============

export const meetingQuerySchema = z.object({
  type: z.enum([
    MeetingType.INVESTOR_UPDATE,
    MeetingType.PITCH,
    MeetingType.DUE_DILIGENCE,
    MeetingType.BOARD_MEETING,
    MeetingType.INTRO_CALL,
    MeetingType.FOLLOW_UP,
    MeetingType.TERM_SHEET_DISCUSSION,
    MeetingType.CLOSING,
    MeetingType.OTHER,
  ]).optional(),
  status: z.enum([
    MeetingStatus.SCHEDULED,
    MeetingStatus.CONFIRMED,
    MeetingStatus.IN_PROGRESS,
    MeetingStatus.COMPLETED,
    MeetingStatus.CANCELLED,
    MeetingStatus.RESCHEDULED,
    MeetingStatus.NO_SHOW,
  ]).optional(),
  investor: z.string().optional(),
  round: z.string().optional(),
  startFrom: z.string().datetime().optional(),
  startTo: z.string().datetime().optional(),
  outcome: z.enum([
    MeetingOutcome.POSITIVE,
    MeetingOutcome.NEUTRAL,
    MeetingOutcome.NEGATIVE,
    MeetingOutcome.FOLLOW_UP_NEEDED,
    MeetingOutcome.PASSED,
    MeetingOutcome.COMMITTED,
    MeetingOutcome.PENDING,
  ]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(OPERATIONS_CONSTANTS.MAX_PAGE_SIZE).optional().default(OPERATIONS_CONSTANTS.DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'startTime', 'title', 'status', 'type']).optional().default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type MeetingQueryInput = z.infer<typeof meetingQuerySchema>;

// ============ Action Schemas ============

export const completeMeetingSchema = z.object({
  outcome: z.enum([
    MeetingOutcome.POSITIVE,
    MeetingOutcome.NEUTRAL,
    MeetingOutcome.NEGATIVE,
    MeetingOutcome.FOLLOW_UP_NEEDED,
    MeetingOutcome.PASSED,
    MeetingOutcome.COMMITTED,
    MeetingOutcome.PENDING,
  ]),
  outcomeNotes: z.string().max(5000).optional(),
  notes: z.string().max(OPERATIONS_CONSTANTS.MAX_MEETING_NOTES_LENGTH).optional(),
  followUpDate: z.string().datetime().optional(),
  actionItems: z.array(meetingActionItemSchema).optional(),
});

export type CompleteMeetingInput = z.infer<typeof completeMeetingSchema>;

export const addActionItemSchema = meetingActionItemSchema;
export type AddActionItemInput = MeetingActionItemInput;

export const updateActionItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum([
    ActionItemStatus.PENDING,
    ActionItemStatus.IN_PROGRESS,
    ActionItemStatus.COMPLETED,
    ActionItemStatus.CANCELLED,
  ]).optional(),
});

export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;

export const rescheduleSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;

// ============ Response Schemas ============

export const meetingResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    organization: z.string(),
    title: z.string(),
    type: z.string(),
    status: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    timezone: z.string().optional(),
    location: z.string().optional(),
    meetingLink: z.string().optional(),
    investor: z.any().optional(),
    round: z.any().optional(),
    attendees: z.array(z.any()),
    agenda: z.string().optional(),
    notes: z.string().optional(),
    outcome: z.string().optional(),
    outcomeNotes: z.string().optional(),
    actionItems: z.array(z.any()).optional(),
    attachments: z.array(z.string()).optional(),
    followUpDate: z.string().optional(),
    followUpMeeting: z.string().optional(),
    previousMeeting: z.string().optional(),
    isRecurring: z.boolean(),
    recurringPattern: z.any().optional(),
    reminders: z.array(z.any()).optional(),
    isArchived: z.boolean(),
    duration: z.number().optional(),
    isPast: z.boolean().optional(),
    isUpcoming: z.boolean().optional(),
    isInProgress: z.boolean().optional(),
    attendeeCount: z.number().optional(),
    actionItemCount: z.number().optional(),
    pendingActionItems: z.number().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  message: z.string().optional(),
});

export const meetingListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(meetingResponseSchema.shape.data),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export const meetingStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    byType: z.record(z.number()),
    byStatus: z.record(z.number()),
    byOutcome: z.record(z.number()),
    thisWeek: z.number(),
    thisMonth: z.number(),
    averageDuration: z.number().optional(),
  }),
});

export const upcomingMeetingsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    today: z.array(meetingResponseSchema.shape.data),
    thisWeek: z.array(meetingResponseSchema.shape.data),
    later: z.array(meetingResponseSchema.shape.data),
  }),
});
