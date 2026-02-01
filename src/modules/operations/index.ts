/**
 * Operations Module
 *
 * Module 10: Operations management including:
 * - Task Management (CRUD, comments, reminders, subtasks)
 * - Product Milestones (key results, roadmap)
 * - Investor Meetings (scheduling, outcomes, action items)
 */

// Routes
export { default as operationsRoutes } from './routes';

// Constants
export * from './constants';

// Types
export * from './types';

// Tasks
export { Task, ITask, ITaskComment, ITaskReminder } from './tasks/models';
export { taskService } from './tasks/services';

// Milestones
export { Milestone, IMilestone, IKeyResult } from './milestones/models';
export { milestoneService } from './milestones/services';

// Meetings
export { Meeting, IMeeting, IMeetingAttendee, IMeetingActionItem, IMeetingReminder } from './meetings/models';
export { meetingService } from './meetings/services';
