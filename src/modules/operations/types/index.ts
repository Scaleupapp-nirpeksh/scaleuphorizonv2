/**
 * Operations Module Types
 *
 * Shared TypeScript interfaces for operations sub-modules
 */

import { Types } from 'mongoose';
import {
  TaskStatusType,
  TaskPriorityType,
  TaskCategoryType,
  MilestoneStatusType,
  MilestoneCategoryType,
  MeetingTypeType,
  MeetingStatusType,
  MeetingOutcomeType,
  ActionItemStatusType,
  ReminderTypeType,
} from '../constants';

// ============ Task Types ============

export interface ITaskReminder {
  reminderDate: Date;
  reminderType: ReminderTypeType;
  sent: boolean;
  sentAt?: Date;
}

export interface ITaskComment {
  _id?: Types.ObjectId;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  mentions?: Types.ObjectId[];
  attachments?: string[];
}

export interface ITask {
  organization: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  category: TaskCategoryType;
  subcategory?: string;
  assignee?: Types.ObjectId;
  reporter: Types.ObjectId;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  attachments?: string[];
  comments?: ITaskComment[];
  reminders?: ITaskReminder[];
  parentTask?: Types.ObjectId;
  subtasks?: Types.ObjectId[];
  linkedMilestone?: Types.ObjectId;
  linkedMeeting?: Types.ObjectId;
  watchers?: Types.ObjectId[];
  isArchived: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Milestone Types ============

export interface IKeyResult {
  _id?: Types.ObjectId;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  status: 'pending' | 'on_track' | 'at_risk' | 'achieved' | 'missed';
}

export interface IMilestone {
  organization: Types.ObjectId;
  title: string;
  description?: string;
  category: MilestoneCategoryType;
  status: MilestoneStatusType;
  targetDate: Date;
  completedDate?: Date;
  progress: number; // 0-100
  keyResults?: IKeyResult[];
  linkedRound?: Types.ObjectId;
  linkedTasks?: Types.ObjectId[];
  owner?: Types.ObjectId;
  stakeholders?: Types.ObjectId[];
  tags?: string[];
  notes?: string;
  isArchived: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Meeting Types ============

export interface IMeetingAttendee {
  user?: Types.ObjectId;
  investor?: Types.ObjectId;
  name: string;
  email?: string;
  role?: string;
  isRequired: boolean;
  rsvpStatus: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface IMeetingActionItem {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  assignee?: Types.ObjectId;
  dueDate?: Date;
  status: ActionItemStatusType;
  completedAt?: Date;
  createdAt: Date;
}

export interface IMeeting {
  organization: Types.ObjectId;
  title: string;
  type: MeetingTypeType;
  status: MeetingStatusType;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  location?: string;
  meetingLink?: string;
  investor?: Types.ObjectId;
  round?: Types.ObjectId;
  attendees: IMeetingAttendee[];
  agenda?: string;
  notes?: string;
  outcome?: MeetingOutcomeType;
  outcomeNotes?: string;
  actionItems?: IMeetingActionItem[];
  attachments?: string[];
  followUpDate?: Date;
  followUpMeeting?: Types.ObjectId;
  previousMeeting?: Types.ObjectId;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    endDate?: Date;
    occurrences?: number;
  };
  reminders?: ITaskReminder[];
  isArchived: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Query Types ============

export interface TaskQueryOptions {
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  category?: TaskCategoryType;
  assignee?: string;
  reporter?: string;
  dueFrom?: Date;
  dueTo?: Date;
  isOverdue?: boolean;
  hasNoAssignee?: boolean;
  linkedMilestone?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MilestoneQueryOptions {
  status?: MilestoneStatusType;
  category?: MilestoneCategoryType;
  owner?: string;
  targetFrom?: Date;
  targetTo?: Date;
  linkedRound?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MeetingQueryOptions {
  type?: MeetingTypeType;
  status?: MeetingStatusType;
  investor?: string;
  round?: string;
  startFrom?: Date;
  startTo?: Date;
  outcome?: MeetingOutcomeType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============ Stats Types ============

export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatusType, number>;
  byPriority: Record<TaskPriorityType, number>;
  byCategory: Record<TaskCategoryType, number>;
  overdue: number;
  completedThisWeek: number;
  completedThisMonth: number;
  averageCompletionTime?: number; // in days
}

export interface MilestoneStats {
  total: number;
  byStatus: Record<MilestoneStatusType, number>;
  byCategory: Record<MilestoneCategoryType, number>;
  onTrack: number;
  atRisk: number;
  overdue: number;
  averageProgress: number;
}

export interface MeetingStats {
  total: number;
  byType: Record<MeetingTypeType, number>;
  byStatus: Record<MeetingStatusType, number>;
  byOutcome: Record<MeetingOutcomeType, number>;
  thisWeek: number;
  thisMonth: number;
  averageDuration?: number; // in minutes
}
