/**
 * Task Model
 *
 * Represents a task with comments, reminders, and subtask support
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  TaskStatus,
  TaskStatusType,
  TaskPriority,
  TaskPriorityType,
  TaskCategory,
  TaskCategoryType,
  ReminderType,
  OPERATIONS_CONSTANTS,
} from '../../constants';

// ============ Sub-document Interfaces ============

export interface ITaskReminder {
  reminderDate: Date;
  reminderType: 'email' | 'in_app' | 'both';
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

// ============ Task Interface ============

export interface ITask extends Document {
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

// ============ Sub-document Schemas ============

const taskReminderSchema = new Schema<ITaskReminder>(
  {
    reminderDate: { type: Date, required: true },
    reminderType: {
      type: String,
      enum: Object.values(ReminderType),
      default: ReminderType.IN_APP,
    },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { _id: false }
);

const taskCommentSchema = new Schema<ITaskComment>(
  {
    content: {
      type: String,
      required: true,
      maxlength: OPERATIONS_CONSTANTS.MAX_COMMENT_LENGTH,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attachments: [{ type: String }],
  },
  { _id: true }
);

// ============ Task Schema ============

const taskSchema = new Schema<ITask>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: OPERATIONS_CONSTANTS.MAX_TASK_TITLE_LENGTH,
    },
    description: {
      type: String,
      maxlength: OPERATIONS_CONSTANTS.MAX_TASK_DESCRIPTION_LENGTH,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(TaskCategory),
      default: TaskCategory.OTHER,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
    },
    tags: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length <= OPERATIONS_CONSTANTS.MAX_TAGS_PER_TASK,
        message: `Maximum ${OPERATIONS_CONSTANTS.MAX_TAGS_PER_TASK} tags allowed`,
      },
    },
    attachments: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length <= OPERATIONS_CONSTANTS.MAX_ATTACHMENTS_PER_TASK,
        message: `Maximum ${OPERATIONS_CONSTANTS.MAX_ATTACHMENTS_PER_TASK} attachments allowed`,
      },
    },
    comments: {
      type: [taskCommentSchema],
      validate: {
        validator: (v: ITaskComment[]) => v.length <= OPERATIONS_CONSTANTS.MAX_COMMENTS_PER_TASK,
        message: `Maximum ${OPERATIONS_CONSTANTS.MAX_COMMENTS_PER_TASK} comments allowed`,
      },
    },
    reminders: [taskReminderSchema],
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    subtasks: [{
      type: Schema.Types.ObjectId,
      ref: 'Task',
    }],
    linkedMilestone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    linkedMeeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
    },
    watchers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============ Indexes ============

taskSchema.index({ organization: 1, status: 1, priority: 1 });
taskSchema.index({ organization: 1, assignee: 1, status: 1 });
taskSchema.index({ organization: 1, category: 1 });
taskSchema.index({ organization: 1, dueDate: 1 });
taskSchema.index({ organization: 1, createdAt: -1 });
taskSchema.index({ organization: 1, linkedMilestone: 1 });
taskSchema.index({ organization: 1, tags: 1 });
taskSchema.index({ organization: 1, title: 'text', description: 'text' });

// ============ Virtuals ============

taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if (this.status === TaskStatus.COMPLETED || this.status === TaskStatus.CANCELLED) return false;
  return new Date() > this.dueDate;
});

taskSchema.virtual('daysUntilDue').get(function () {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

taskSchema.virtual('commentCount').get(function () {
  return this.comments?.length || 0;
});

taskSchema.virtual('subtaskCount').get(function () {
  return this.subtasks?.length || 0;
});

// ============ Pre-save Hooks ============

taskSchema.pre('save', function (next) {
  // Set completedAt when status changes to completed
  if (this.isModified('status')) {
    if (this.status === TaskStatus.COMPLETED && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== TaskStatus.COMPLETED) {
      this.completedAt = undefined;
    }
  }
  next();
});

// ============ Static Methods ============

taskSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isArchived: false });
};

export const Task = mongoose.model<ITask>('Task', taskSchema);
