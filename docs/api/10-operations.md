# Module 10: Operations - Frontend Integration Guide

## Overview

The Operations module handles operational activities including:
- **Tasks**: Task management with subtasks, comments, reminders, and workflow
- **Milestones**: Product milestones with key results (OKR-style tracking)
- **Meetings**: Investor meeting management with attendees and action items

## Base URL

```
/api/v1/operations
```

## Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer <access_token>
X-Organization-Id: <organization_id>
```

---

## 1. Tasks Sub-module

Comprehensive task management for startup operations.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/tasks` | List all tasks | all |
| POST | `/tasks` | Create task | all |
| GET | `/tasks/my` | Get my tasks | all |
| GET | `/tasks/stats` | Get task statistics | all |
| GET | `/tasks/:id` | Get task details | all |
| PUT | `/tasks/:id` | Update task | all |
| DELETE | `/tasks/:id` | Delete task | owner, admin |
| PUT | `/tasks/:id/status` | Update task status | all |
| POST | `/tasks/:id/archive` | Archive task | all |
| GET | `/tasks/:id/comments` | Get task comments | all |
| POST | `/tasks/:id/comments` | Add comment | all |
| DELETE | `/tasks/:id/comments/:commentId` | Delete comment | owner, admin |
| POST | `/tasks/:id/reminders` | Add reminder | all |
| DELETE | `/tasks/:id/reminders/:reminderId` | Delete reminder | all |
| PUT | `/tasks/bulk` | Bulk update tasks | owner, admin |

### TypeScript Types

```typescript
interface Task {
  id: string;
  organization: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  subcategory?: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignee?: string | User;
  createdBy: string | User;
  parentTask?: string;
  linkedMilestone?: string;
  linkedRound?: string;
  linkedInvestor?: string;
  tags?: string[];
  comments: TaskComment[];
  reminders: TaskReminder[];
  attachments?: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Virtuals
  isOverdue?: boolean;
  daysUntilDue?: number;
  commentCount?: number;
  subtaskCount?: number;
}

type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'cancelled';

type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

type TaskCategory =
  | 'finance'
  | 'fundraising'
  | 'product'
  | 'engineering'
  | 'marketing'
  | 'sales'
  | 'operations'
  | 'legal'
  | 'hr'
  | 'other';

interface TaskComment {
  id: string;
  content: string;
  author: string | User;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
}

interface TaskReminder {
  id: string;
  reminderDate: string;
  reminderType: 'email' | 'push' | 'in_app';
  isSent: boolean;
  sentAt?: string;
  createdAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
```

### Create Task

**POST** `/operations/tasks`

```typescript
// Request
interface CreateTaskRequest {
  title: string;                  // Required: max 200 chars
  description?: string;           // Optional: max 2000 chars
  priority?: TaskPriority;        // Default: 'medium'
  category?: TaskCategory;        // Default: 'other'
  subcategory?: string;
  dueDate?: string;               // ISO datetime
  estimatedHours?: number;        // 0-999
  assignee?: string;              // User ID
  parentTask?: string;            // Parent task ID (for subtasks)
  linkedMilestone?: string;       // Milestone ID
  linkedRound?: string;           // Funding round ID
  linkedInvestor?: string;        // Investor ID
  tags?: string[];                // Max 10 tags
}

// Response (201)
{
  success: true,
  data: Task,
  message: "Task created successfully"
}
```

### Update Task

**PUT** `/operations/tasks/:id`

```typescript
// Request
interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  subcategory?: string;
  dueDate?: string | null;
  estimatedHours?: number;
  actualHours?: number;
  assignee?: string | null;
  linkedMilestone?: string | null;
  linkedRound?: string | null;
  linkedInvestor?: string | null;
  tags?: string[];
}

// Response (200)
{
  success: true,
  data: Task,
  message: "Task updated successfully"
}
```

### Task Status Workflow

```
Pending → In Progress → Completed
    ↓         ↓             ↓
    └──→ Blocked ←──────────┘
           ↓
        Cancelled
```

**Update Status** - PUT `/tasks/:id/status`

```typescript
// Request
{ status: TaskStatus }

// Valid transitions:
// pending → in_progress, blocked, cancelled
// in_progress → completed, blocked, cancelled
// blocked → in_progress, cancelled
// completed → in_progress (reopen)
```

### Task Comments

**Add Comment** - POST `/tasks/:id/comments`

```typescript
// Request
{ content: string }  // Required: 1-5000 chars

// Response (201)
{
  success: true,
  data: Task,  // Full task with updated comments
  message: "Comment added successfully"
}
```

**Get Comments** - GET `/tasks/:id/comments`

```typescript
// Response
{
  success: true,
  data: TaskComment[]
}
```

### Task Reminders

**Add Reminder** - POST `/tasks/:id/reminders`

```typescript
// Request
{
  reminderDate: string,           // Required: ISO datetime
  reminderType?: ReminderType     // Default: 'email'
}

// Response (201)
{
  success: true,
  data: Task,
  message: "Reminder added successfully"
}
```

### Query Parameters

```typescript
interface TaskQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assignee?: string;              // User ID
  parentTask?: string;            // Get subtasks of a task
  linkedMilestone?: string;
  linkedRound?: string;
  linkedInvestor?: string;
  isArchived?: boolean;           // Default: false
  dueBefore?: string;             // ISO datetime
  dueAfter?: string;
  search?: string;                // Search in title/description
  page?: number;                  // Default: 1
  limit?: number;                 // Default: 20, max: 100
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

### My Tasks

**GET** `/operations/tasks/my`

Returns tasks where:
- Current user is the assignee, OR
- Current user created the task and no assignee set

```typescript
// Query
{
  status?: TaskStatus;
  priority?: TaskPriority;
  limit?: number;                 // Default: 50
}

// Response
{
  success: true,
  data: Task[]
}
```

### Task Statistics

**GET** `/operations/tasks/stats`

```typescript
// Response
{
  success: true,
  data: {
    total: number,
    byStatus: {
      pending: number,
      in_progress: number,
      completed: number,
      blocked: number,
      cancelled: number
    },
    byPriority: {
      low: number,
      medium: number,
      high: number,
      urgent: number
    },
    byCategory: {
      finance: number,
      fundraising: number,
      product: number,
      // ... etc
    },
    overdue: number,
    completedThisWeek: number,
    averageCompletionTime: number  // in hours
  }
}
```

### Bulk Update

**PUT** `/operations/tasks/bulk`

```typescript
// Request
{
  taskIds: string[],              // Required: 1-50 task IDs
  updates: {
    status?: TaskStatus,
    priority?: TaskPriority,
    category?: TaskCategory,
    assignee?: string | null,
    dueDate?: string | null,
    linkedMilestone?: string | null,
    tags?: string[]
  }
}

// Response
{
  success: true,
  data: {
    modifiedCount: number
  },
  message: "X tasks updated successfully"
}
```

---

## 2. Milestones Sub-module

Track product milestones with OKR-style key results.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/milestones` | List milestones | all |
| POST | `/milestones` | Create milestone | owner, admin |
| GET | `/milestones/roadmap` | Get roadmap view | all |
| GET | `/milestones/stats` | Get statistics | all |
| GET | `/milestones/:id` | Get milestone details | all |
| PUT | `/milestones/:id` | Update milestone | owner, admin |
| DELETE | `/milestones/:id` | Delete milestone | owner |
| PUT | `/milestones/:id/status` | Update status | owner, admin |
| PUT | `/milestones/:id/progress` | Update progress | owner, admin |
| POST | `/milestones/:id/archive` | Archive milestone | owner, admin |
| POST | `/milestones/:id/key-results` | Add key result | owner, admin |
| PUT | `/milestones/:id/key-results/:krId` | Update key result | owner, admin |
| DELETE | `/milestones/:id/key-results/:krId` | Delete key result | owner, admin |
| POST | `/milestones/:id/tasks` | Link tasks | owner, admin |
| DELETE | `/milestones/:id/tasks/:taskId` | Unlink task | owner, admin |

### TypeScript Types

```typescript
interface Milestone {
  id: string;
  organization: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  category: MilestoneCategory;
  targetDate: string;
  completedDate?: string;
  progress: number;                // 0-100
  keyResults: KeyResult[];
  owner?: string | User;
  stakeholders?: (string | User)[];
  linkedRound?: string | Round;
  linkedTasks?: (string | Task)[];
  tags?: string[];
  notes?: string;
  isArchived: boolean;
  createdBy: string | User;
  updatedBy?: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtuals
  isOverdue?: boolean;
  daysUntilTarget?: number;
  keyResultsProgress?: number;
}

type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'at_risk'
  | 'delayed'
  | 'completed'
  | 'cancelled';

type MilestoneCategory =
  | 'product'
  | 'engineering'
  | 'fundraising'
  | 'hiring'
  | 'revenue'
  | 'partnership'
  | 'marketing'
  | 'operations'
  | 'other';

interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;                    // e.g., "users", "percent", "dollars"
  status: KeyResultStatus;
  notes?: string;
}

type KeyResultStatus =
  | 'pending'
  | 'on_track'
  | 'at_risk'
  | 'completed'
  | 'missed';
```

### Create Milestone

**POST** `/operations/milestones`

```typescript
// Request
interface CreateMilestoneRequest {
  title: string;                  // Required: max 200 chars
  description?: string;           // max 2000 chars
  category?: MilestoneCategory;   // Default: 'other'
  targetDate: string;             // Required: ISO datetime
  keyResults?: CreateKeyResultInput[];
  owner?: string;                 // User ID
  stakeholders?: string[];        // User IDs
  linkedRound?: string;           // Round ID
  tags?: string[];                // Max 10 tags
}

interface CreateKeyResultInput {
  title: string;                  // Required
  targetValue: number;            // Required
  currentValue?: number;          // Default: 0
  unit: string;                   // Required
  status?: KeyResultStatus;       // Default: 'pending'
}

// Response (201)
{
  success: true,
  data: Milestone,
  message: "Milestone created successfully"
}
```

### Milestone Status Workflow

```
Pending → In Progress → Completed
    ↓         ↓    ↓
    ↓      At Risk ↓
    ↓         ↓    ↓
    └──→ Delayed ←─┘
           ↓
        Cancelled
```

**Update Status** - PUT `/milestones/:id/status`

```typescript
// Request
{
  status: MilestoneStatus,
  notes?: string                  // Appended to milestone notes
}

// Valid transitions:
// pending → in_progress
// in_progress → at_risk, delayed, completed
// at_risk → in_progress, delayed, completed
// delayed → in_progress, at_risk, completed
// Any status except completed → cancelled
```

### Update Progress

**PUT** `/milestones/:id/progress`

```typescript
// Request
{ progress: number }              // 0-100

// Note: Setting progress to 100 auto-completes the milestone
```

### Key Results

**Add Key Result** - POST `/milestones/:id/key-results`

```typescript
// Request
{
  title: string,                  // Required
  targetValue: number,            // Required
  currentValue?: number,          // Default: 0
  unit: string,                   // Required
  status?: KeyResultStatus        // Default: 'pending'
}
```

**Update Key Result** - PUT `/milestones/:id/key-results/:krId`

```typescript
// Request
{
  title?: string,
  targetValue?: number,
  currentValue?: number,
  unit?: string,
  status?: KeyResultStatus,
  notes?: string
}
```

### Link Tasks

**POST** `/milestones/:id/tasks`

```typescript
// Request
{ taskIds: string[] }             // Array of task IDs

// Note: Tasks are bidirectionally linked
```

### Roadmap View

**GET** `/operations/milestones/roadmap`

Returns milestones grouped by quarter.

```typescript
// Response
{
  success: true,
  data: {
    quarters: [
      {
        quarter: "2026 Q1",
        milestones: Milestone[]
      },
      {
        quarter: "2026 Q2",
        milestones: Milestone[]
      }
      // ... more quarters
    ]
  }
}
```

### Milestone Statistics

**GET** `/operations/milestones/stats`

```typescript
// Response
{
  success: true,
  data: {
    total: number,
    byStatus: {
      pending: number,
      in_progress: number,
      at_risk: number,
      delayed: number,
      completed: number,
      cancelled: number
    },
    byCategory: {
      product: number,
      engineering: number,
      fundraising: number,
      // ... etc
    },
    onTrack: number,              // in_progress count
    atRisk: number,               // at_risk + delayed count
    overdue: number,
    averageProgress: number       // 0-100
  }
}
```

### Query Parameters

```typescript
interface MilestoneQuery {
  status?: MilestoneStatus;
  category?: MilestoneCategory;
  owner?: string;                 // User ID
  linkedRound?: string;           // Round ID
  targetFrom?: string;            // ISO datetime
  targetTo?: string;
  search?: string;
  page?: number;                  // Default: 1
  limit?: number;                 // Default: 20, max: 100
  sortBy?: 'createdAt' | 'targetDate' | 'progress' | 'status';
  sortOrder?: 'asc' | 'desc';     // Default: 'asc' for targetDate
}
```

---

## 3. Meetings Sub-module

Manage investor meetings with full lifecycle tracking.

### Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/meetings` | List meetings | all |
| POST | `/meetings` | Schedule meeting | all |
| GET | `/meetings/upcoming` | Get upcoming meetings | all |
| GET | `/meetings/stats` | Get statistics | all |
| GET | `/meetings/investor/:investorId` | Get investor meetings | all |
| GET | `/meetings/:id` | Get meeting details | all |
| PUT | `/meetings/:id` | Update meeting | all |
| DELETE | `/meetings/:id` | Delete meeting | owner, admin |
| POST | `/meetings/:id/complete` | Complete meeting | all |
| POST | `/meetings/:id/cancel` | Cancel meeting | all |
| POST | `/meetings/:id/reschedule` | Reschedule meeting | all |
| POST | `/meetings/:id/archive` | Archive meeting | all |
| POST | `/meetings/:id/actions` | Add action item | all |
| PUT | `/meetings/:id/actions/:actionId` | Update action item | all |
| DELETE | `/meetings/:id/actions/:actionId` | Delete action item | all |

### TypeScript Types

```typescript
interface Meeting {
  id: string;
  organization: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  startTime: string;
  endTime: string;
  timezone?: string;              // Default: 'UTC'
  location?: string;
  meetingLink?: string;           // Video call URL
  investor?: string | Investor;
  round?: string | Round;
  attendees: MeetingAttendee[];
  agenda?: string;
  notes?: string;
  outcome?: MeetingOutcome;
  outcomeNotes?: string;
  actionItems: MeetingActionItem[];
  followUpDate?: string;
  followUpMeeting?: string;       // Linked meeting ID
  isRecurring?: boolean;
  recurringConfig?: RecurringConfig;
  reminders: MeetingReminder[];
  attachments?: string[];
  isArchived: boolean;
  createdBy: string | User;
  updatedBy?: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtuals
  duration?: number;              // in minutes
  isPast?: boolean;
  isUpcoming?: boolean;
  isInProgress?: boolean;
}

type MeetingType =
  | 'intro_call'
  | 'pitch'
  | 'follow_up'
  | 'due_diligence'
  | 'term_sheet'
  | 'closing'
  | 'board_meeting'
  | 'investor_update'
  | 'other';

type MeetingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

type MeetingOutcome =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'follow_up_scheduled'
  | 'passed'
  | 'term_sheet'
  | 'committed';

interface MeetingAttendee {
  id?: string;
  user?: string | User;           // Internal user
  name: string;
  email?: string;
  role?: string;
  isRequired: boolean;
  isOrganizer?: boolean;
  rsvpStatus?: 'pending' | 'accepted' | 'declined' | 'tentative';
}

interface MeetingActionItem {
  id: string;
  title: string;
  description?: string;
  assignee?: string | User;
  dueDate?: string;
  status: ActionItemStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type ActionItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  endDate?: string;
  daysOfWeek?: number[];          // 0-6 (Sunday-Saturday)
}

interface MeetingReminder {
  id: string;
  reminderTime: string;
  type: 'email' | 'push' | 'in_app';
  isSent: boolean;
}
```

### Create Meeting

**POST** `/operations/meetings`

```typescript
// Request
interface CreateMeetingRequest {
  title: string;                  // Required: max 200 chars
  type?: MeetingType;             // Default: 'other'
  startTime: string;              // Required: ISO datetime
  endTime: string;                // Required: ISO datetime
  timezone?: string;              // Default: 'UTC'
  location?: string;
  meetingLink?: string;
  investor?: string;              // Investor ID
  round?: string;                 // Round ID
  attendees?: AttendeeInput[];
  agenda?: string;                // max 5000 chars
  isRecurring?: boolean;
  recurringConfig?: RecurringConfig;
  reminders?: ReminderInput[];
}

interface AttendeeInput {
  user?: string;                  // User ID (for internal users)
  name: string;                   // Required
  email?: string;
  role?: string;
  isRequired?: boolean;           // Default: true
  isOrganizer?: boolean;
}

// Response (201)
{
  success: true,
  data: Meeting,
  message: "Meeting scheduled successfully"
}
```

### Complete Meeting

**POST** `/operations/meetings/:id/complete`

```typescript
// Request
{
  outcome: MeetingOutcome,        // Required
  outcomeNotes?: string,
  notes?: string,                 // Meeting notes
  followUpDate?: string,          // ISO datetime
  actionItems?: [{
    title: string,
    description?: string,
    assignee?: string,
    dueDate?: string
  }]
}

// Response
{
  success: true,
  data: Meeting,
  message: "Meeting completed successfully"
}
```

### Reschedule Meeting

**POST** `/operations/meetings/:id/reschedule`

```typescript
// Request
{
  startTime: string,              // Required: ISO datetime
  endTime: string,                // Required: ISO datetime
  notes?: string                  // Reschedule reason
}

// Response
{
  success: true,
  data: Meeting,
  message: "Meeting rescheduled successfully"
}
```

### Action Items

**Add Action Item** - POST `/meetings/:id/actions`

```typescript
// Request
{
  title: string,                  // Required
  description?: string,
  assignee?: string,              // User ID
  dueDate?: string,
  status?: ActionItemStatus       // Default: 'pending'
}
```

**Update Action Item** - PUT `/meetings/:id/actions/:actionId`

```typescript
// Request
{
  title?: string,
  description?: string,
  assignee?: string | null,
  dueDate?: string | null,
  status?: ActionItemStatus
}
```

### Upcoming Meetings

**GET** `/operations/meetings/upcoming`

Returns meetings grouped by timeframe.

```typescript
// Response
{
  success: true,
  data: {
    today: Meeting[],
    thisWeek: Meeting[],          // Excluding today
    later: Meeting[]              // Next 30 days
  }
}
```

### Meeting Statistics

**GET** `/operations/meetings/stats`

```typescript
// Response
{
  success: true,
  data: {
    total: number,
    upcoming: number,
    completed: number,
    cancelled: number,
    byType: {
      intro_call: number,
      pitch: number,
      follow_up: number,
      due_diligence: number,
      // ... etc
    },
    byOutcome: {
      positive: number,
      neutral: number,
      negative: number,
      follow_up_scheduled: number,
      passed: number,
      term_sheet: number,
      committed: number
    },
    thisMonth: number,
    conversionRate: number        // % positive outcomes
  }
}
```

### Investor Meetings

**GET** `/operations/meetings/investor/:investorId`

```typescript
// Response
{
  success: true,
  data: Meeting[]                 // All meetings with this investor
}
```

### Query Parameters

```typescript
interface MeetingQuery {
  status?: MeetingStatus;
  type?: MeetingType;
  outcome?: MeetingOutcome;
  investor?: string;              // Investor ID
  round?: string;                 // Round ID
  startFrom?: string;             // ISO datetime
  startTo?: string;
  isArchived?: boolean;           // Default: false
  search?: string;
  page?: number;                  // Default: 1
  limit?: number;                 // Default: 20, max: 100
  sortBy?: 'createdAt' | 'startTime' | 'status' | 'type';
  sortOrder?: 'asc' | 'desc';
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Validation error or business rule violation |
| 401 | Unauthorized - invalid or missing token |
| 403 | Forbidden - insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict - e.g., duplicate task |

### Common Errors

```typescript
// Task errors
"Task not found"
"Cannot update archived task"
"Invalid status transition from {from} to {to}"
"Task limit exceeded for organization"
"Cannot add more than 50 comments per task"

// Milestone errors
"Milestone not found"
"Cannot update archived milestone"
"Invalid status transition from {from} to {to}"
"Key result not found"

// Meeting errors
"Meeting not found"
"Cannot update archived meeting"
"End time must be after start time"
"Meeting has already been completed"
"Action item not found"
```

---

## UI Components Needed

### Tasks
1. **TaskList** - Sortable table with status, priority badges
2. **TaskBoard** - Kanban board by status
3. **TaskForm** - Create/edit with rich description
4. **TaskDetail** - Full view with comments sidebar
5. **TaskComments** - Threaded comment component
6. **TaskReminders** - Reminder scheduler
7. **TaskStats** - Dashboard statistics cards

### Milestones
1. **MilestoneList** - Table with progress bars
2. **MilestoneRoadmap** - Timeline/Gantt view by quarter
3. **MilestoneForm** - Create/edit with key results
4. **MilestoneDetail** - Full view with linked tasks
5. **KeyResultProgress** - OKR-style progress tracker
6. **MilestoneStats** - Status overview dashboard

### Meetings
1. **MeetingCalendar** - Calendar view with day/week/month
2. **MeetingList** - Sortable table by date
3. **MeetingForm** - Schedule with attendees
4. **MeetingDetail** - Full view with action items
5. **UpcomingMeetings** - Today/This Week widget
6. **MeetingComplete** - Completion wizard with outcome
7. **ActionItemTracker** - Track action items across meetings
8. **MeetingStats** - Funnel/conversion chart

---

## User Flows

### Creating and Managing Tasks

1. Navigate to Operations > Tasks
2. Click "Create Task"
3. Enter title, description, priority, category
4. Optionally assign to team member
5. Set due date
6. Save task
7. Add comments as work progresses
8. Update status through workflow
9. Mark as completed

### Tracking Milestones with OKRs

1. Navigate to Operations > Milestones
2. Click "Create Milestone"
3. Set title, category, target date
4. Add key results with measurable targets
5. Assign owner and stakeholders
6. Save milestone
7. Link related tasks
8. Update key result progress regularly
9. Update milestone status based on progress
10. Complete milestone when all KRs met

### Managing Investor Meetings

1. Navigate to Operations > Meetings
2. Click "Schedule Meeting"
3. Select meeting type (intro, pitch, etc.)
4. Set date, time, duration
5. Add attendees (internal and external)
6. Set agenda
7. Link to investor and/or round
8. Save meeting
9. Add action items as follow-ups identified
10. Complete meeting with outcome after it occurs
11. Schedule follow-up meeting if needed

### Weekly Operations Review

1. Check Tasks Stats for overdue/blocked items
2. Review Milestone Roadmap for upcoming targets
3. Check Upcoming Meetings widget
4. Review action items due this week
5. Update task statuses
6. Update milestone progress
7. Prepare for scheduled meetings

---

## State Management

```typescript
// Redux slices
interface OperationsState {
  tasks: {
    list: Task[];
    myTasks: Task[];
    current: Task | null;
    stats: TaskStats | null;
    isLoading: boolean;
    pagination: Pagination;
  };
  milestones: {
    list: Milestone[];
    roadmap: RoadmapData | null;
    current: Milestone | null;
    stats: MilestoneStats | null;
    isLoading: boolean;
    pagination: Pagination;
  };
  meetings: {
    list: Meeting[];
    upcoming: UpcomingMeetings | null;
    current: Meeting | null;
    stats: MeetingStats | null;
    isLoading: boolean;
    pagination: Pagination;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UpcomingMeetings {
  today: Meeting[];
  thisWeek: Meeting[];
  later: Meeting[];
}

// React Query hooks
const useTasks = (query?: TaskQuery) =>
  useQuery(['tasks', query], () => fetchTasks(query));

const useTask = (id: string) =>
  useQuery(['task', id], () => fetchTask(id));

const useMyTasks = () =>
  useQuery(['my-tasks'], fetchMyTasks);

const useTaskStats = () =>
  useQuery(['task-stats'], fetchTaskStats);

const useMilestones = (query?: MilestoneQuery) =>
  useQuery(['milestones', query], () => fetchMilestones(query));

const useMilestoneRoadmap = () =>
  useQuery(['milestone-roadmap'], fetchRoadmap);

const useMilestoneStats = () =>
  useQuery(['milestone-stats'], fetchMilestoneStats);

const useMeetings = (query?: MeetingQuery) =>
  useQuery(['meetings', query], () => fetchMeetings(query));

const useUpcomingMeetings = () =>
  useQuery(['upcoming-meetings'], fetchUpcomingMeetings);

const useMeetingStats = () =>
  useQuery(['meeting-stats'], fetchMeetingStats);

const useInvestorMeetings = (investorId: string) =>
  useQuery(['investor-meetings', investorId], () => fetchInvestorMeetings(investorId));

// Mutations
const useCreateTask = () =>
  useMutation(createTask, {
    onSuccess: () => queryClient.invalidateQueries(['tasks'])
  });

const useUpdateTaskStatus = () =>
  useMutation(updateTaskStatus, {
    onSuccess: () => queryClient.invalidateQueries(['tasks'])
  });

const useAddComment = () =>
  useMutation(addTaskComment, {
    onSuccess: (_, { taskId }) => queryClient.invalidateQueries(['task', taskId])
  });

const useCompleteMeeting = () =>
  useMutation(completeMeeting, {
    onSuccess: () => {
      queryClient.invalidateQueries(['meetings']);
      queryClient.invalidateQueries(['meeting-stats']);
    }
  });
```

---

## Integration with Other Modules

- **Auth**: User context for assignees, attendees, creators
- **Organization**: Multi-tenancy for all operations data
- **Fundraising**:
  - Tasks/Milestones can link to funding rounds
  - Meetings can link to investors and rounds
  - Investor meetings feed into meeting stats
- **Reporting**:
  - Operations data for investor reports
  - Task/milestone completion metrics
- **Planning**: Budget items may link to operational milestones

---

## Webhook Events (Future)

```typescript
// Task events
"operations.task.created"
"operations.task.completed"
"operations.task.overdue"

// Milestone events
"operations.milestone.created"
"operations.milestone.completed"
"operations.milestone.at_risk"

// Meeting events
"operations.meeting.scheduled"
"operations.meeting.completed"
"operations.meeting.reminder"
"operations.meeting.action_item.due"
```

---

## Best Practices

### Tasks
- Use subtasks for complex tasks
- Set realistic due dates
- Add comments for progress updates
- Use tags for cross-cutting concerns
- Link to relevant milestones

### Milestones
- Define measurable key results
- Update progress weekly
- Adjust status proactively (at_risk, delayed)
- Link all related tasks
- Use roadmap view for planning

### Meetings
- Always set agenda before meeting
- Complete meetings promptly with outcomes
- Create action items during completion
- Link to investor for tracking
- Use follow-up scheduling for continuous engagement
