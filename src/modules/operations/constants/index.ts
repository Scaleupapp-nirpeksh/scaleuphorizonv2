/**
 * Operations Module Constants
 *
 * Centralized constants for all operations sub-modules:
 * - Tasks (Task Management)
 * - Milestones (Product Milestones)
 * - Meetings (Investor Meetings)
 */

// ============ Task Constants ============

export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskCategory = {
  FINANCE: 'finance',
  LEGAL: 'legal',
  FUNDRAISING: 'fundraising',
  OPERATIONS: 'operations',
  PRODUCT: 'product',
  MARKETING: 'marketing',
  SALES: 'sales',
  HR: 'hr',
  ADMIN: 'admin',
  OTHER: 'other',
} as const;

export type TaskCategoryType = (typeof TaskCategory)[keyof typeof TaskCategory];

// ============ Milestone Constants ============

export const MilestoneStatus = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  AT_RISK: 'at_risk',
  COMPLETED: 'completed',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled',
} as const;

export type MilestoneStatusType = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const MilestoneCategory = {
  PRODUCT: 'product',
  REVENUE: 'revenue',
  FUNDRAISING: 'fundraising',
  TEAM: 'team',
  PARTNERSHIP: 'partnership',
  REGULATORY: 'regulatory',
  MARKET_EXPANSION: 'market_expansion',
  TECH_INFRASTRUCTURE: 'tech_infrastructure',
  OTHER: 'other',
} as const;

export type MilestoneCategoryType = (typeof MilestoneCategory)[keyof typeof MilestoneCategory];

// ============ Meeting Constants ============

export const MeetingType = {
  INVESTOR_UPDATE: 'investor_update',
  PITCH: 'pitch',
  DUE_DILIGENCE: 'due_diligence',
  BOARD_MEETING: 'board_meeting',
  INTRO_CALL: 'intro_call',
  FOLLOW_UP: 'follow_up',
  TERM_SHEET_DISCUSSION: 'term_sheet_discussion',
  CLOSING: 'closing',
  OTHER: 'other',
} as const;

export type MeetingTypeType = (typeof MeetingType)[keyof typeof MeetingType];

export const MeetingStatus = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
  NO_SHOW: 'no_show',
} as const;

export type MeetingStatusType = (typeof MeetingStatus)[keyof typeof MeetingStatus];

export const MeetingOutcome = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
  FOLLOW_UP_NEEDED: 'follow_up_needed',
  PASSED: 'passed',
  COMMITTED: 'committed',
  PENDING: 'pending',
} as const;

export type MeetingOutcomeType = (typeof MeetingOutcome)[keyof typeof MeetingOutcome];

export const ActionItemStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ActionItemStatusType = (typeof ActionItemStatus)[keyof typeof ActionItemStatus];

// ============ Reminder Constants ============

export const ReminderType = {
  EMAIL: 'email',
  IN_APP: 'in_app',
  BOTH: 'both',
} as const;

export type ReminderTypeType = (typeof ReminderType)[keyof typeof ReminderType];

// ============ Validation Constants ============

export const OPERATIONS_CONSTANTS = {
  // Task limits
  MAX_TASKS_PER_ORG: 10000,
  MAX_TASK_TITLE_LENGTH: 200,
  MAX_TASK_DESCRIPTION_LENGTH: 10000,
  MAX_COMMENTS_PER_TASK: 500,
  MAX_COMMENT_LENGTH: 5000,
  MAX_ATTACHMENTS_PER_TASK: 20,
  MAX_TAGS_PER_TASK: 10,
  MAX_SUBTASKS_PER_TASK: 50,

  // Milestone limits
  MAX_MILESTONES_PER_ORG: 500,
  MAX_MILESTONE_TITLE_LENGTH: 200,
  MAX_MILESTONE_DESCRIPTION_LENGTH: 5000,
  MAX_KEY_RESULTS_PER_MILESTONE: 10,

  // Meeting limits
  MAX_MEETINGS_PER_ORG: 5000,
  MAX_MEETING_TITLE_LENGTH: 200,
  MAX_MEETING_NOTES_LENGTH: 50000,
  MAX_ACTION_ITEMS_PER_MEETING: 50,
  MAX_ATTENDEES_PER_MEETING: 50,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============ Helper Functions ============

/**
 * Get all task statuses
 */
export function getTaskStatuses(): TaskStatusType[] {
  return Object.values(TaskStatus);
}

/**
 * Get all task priorities
 */
export function getTaskPriorities(): TaskPriorityType[] {
  return Object.values(TaskPriority);
}

/**
 * Get all milestone statuses
 */
export function getMilestoneStatuses(): MilestoneStatusType[] {
  return Object.values(MilestoneStatus);
}

/**
 * Get all meeting types
 */
export function getMeetingTypes(): MeetingTypeType[] {
  return Object.values(MeetingType);
}

/**
 * Check if task status transition is valid
 */
export function isValidTaskStatusTransition(
  currentStatus: TaskStatusType,
  newStatus: TaskStatusType
): boolean {
  const transitions: Record<TaskStatusType, TaskStatusType[]> = {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.COMPLETED, TaskStatus.CANCELLED],
    [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED],
    [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
    [TaskStatus.COMPLETED]: [TaskStatus.TODO], // Can reopen
    [TaskStatus.CANCELLED]: [TaskStatus.TODO], // Can restore
  };

  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Check if milestone status transition is valid
 */
export function isValidMilestoneStatusTransition(
  currentStatus: MilestoneStatusType,
  newStatus: MilestoneStatusType
): boolean {
  const transitions: Record<MilestoneStatusType, MilestoneStatusType[]> = {
    [MilestoneStatus.PLANNED]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.CANCELLED],
    [MilestoneStatus.IN_PROGRESS]: [MilestoneStatus.PLANNED, MilestoneStatus.AT_RISK, MilestoneStatus.COMPLETED, MilestoneStatus.DELAYED, MilestoneStatus.CANCELLED],
    [MilestoneStatus.AT_RISK]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.DELAYED, MilestoneStatus.COMPLETED, MilestoneStatus.CANCELLED],
    [MilestoneStatus.COMPLETED]: [], // Final state
    [MilestoneStatus.DELAYED]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.CANCELLED, MilestoneStatus.COMPLETED],
    [MilestoneStatus.CANCELLED]: [MilestoneStatus.PLANNED], // Can restore
  };

  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get priority weight for sorting
 */
export function getPriorityWeight(priority: TaskPriorityType): number {
  const weights: Record<TaskPriorityType, number> = {
    [TaskPriority.URGENT]: 4,
    [TaskPriority.HIGH]: 3,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.LOW]: 1,
  };
  return weights[priority] || 0;
}

/**
 * Get status color for UI
 */
export function getTaskStatusColor(status: TaskStatusType): string {
  const colors: Record<TaskStatusType, string> = {
    [TaskStatus.TODO]: '#6B7280', // gray
    [TaskStatus.IN_PROGRESS]: '#3B82F6', // blue
    [TaskStatus.IN_REVIEW]: '#8B5CF6', // purple
    [TaskStatus.BLOCKED]: '#EF4444', // red
    [TaskStatus.COMPLETED]: '#10B981', // green
    [TaskStatus.CANCELLED]: '#9CA3AF', // light gray
  };
  return colors[status] || '#6B7280';
}

/**
 * Get milestone status color for UI
 */
export function getMilestoneStatusColor(status: MilestoneStatusType): string {
  const colors: Record<MilestoneStatusType, string> = {
    [MilestoneStatus.PLANNED]: '#6B7280', // gray
    [MilestoneStatus.IN_PROGRESS]: '#3B82F6', // blue
    [MilestoneStatus.AT_RISK]: '#F59E0B', // amber
    [MilestoneStatus.COMPLETED]: '#10B981', // green
    [MilestoneStatus.DELAYED]: '#EF4444', // red
    [MilestoneStatus.CANCELLED]: '#9CA3AF', // light gray
  };
  return colors[status] || '#6B7280';
}
