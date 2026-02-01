/**
 * Meeting Model
 *
 * Represents an investor meeting with attendees, action items, and outcomes
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  MeetingType,
  MeetingTypeType,
  MeetingStatus,
  MeetingStatusType,
  MeetingOutcome,
  MeetingOutcomeType,
  ActionItemStatus,
  ActionItemStatusType,
  ReminderType,
  OPERATIONS_CONSTANTS,
} from '../../constants';

// ============ Sub-document Interfaces ============

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

export interface IMeetingReminder {
  reminderDate: Date;
  reminderType: 'email' | 'in_app' | 'both';
  sent: boolean;
  sentAt?: Date;
}

// ============ Meeting Interface ============

export interface IMeeting extends Document {
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
  reminders?: IMeetingReminder[];
  isArchived: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Sub-document Schemas ============

const meetingAttendeeSchema = new Schema<IMeetingAttendee>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    investor: {
      type: Schema.Types.ObjectId,
      ref: 'Investor',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    rsvpStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending',
    },
  },
  { _id: false }
);

const meetingActionItemSchema = new Schema<IMeetingActionItem>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(ActionItemStatus),
      default: ActionItemStatus.PENDING,
    },
    completedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const meetingReminderSchema = new Schema<IMeetingReminder>(
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

const recurringPatternSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      required: true,
    },
    endDate: { type: Date },
    occurrences: { type: Number, min: 1 },
  },
  { _id: false }
);

// ============ Meeting Schema ============

const meetingSchema = new Schema<IMeeting>(
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
      maxlength: OPERATIONS_CONSTANTS.MAX_MEETING_TITLE_LENGTH,
    },
    type: {
      type: String,
      enum: Object.values(MeetingType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MeetingStatus),
      default: MeetingStatus.SCHEDULED,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    location: {
      type: String,
      maxlength: 500,
    },
    meetingLink: {
      type: String,
      maxlength: 1000,
    },
    investor: {
      type: Schema.Types.ObjectId,
      ref: 'Investor',
      index: true,
    },
    round: {
      type: Schema.Types.ObjectId,
      ref: 'Round',
      index: true,
    },
    attendees: {
      type: [meetingAttendeeSchema],
      validate: {
        validator: (v: IMeetingAttendee[]) => v.length <= OPERATIONS_CONSTANTS.MAX_ATTENDEES_PER_MEETING,
        message: `Maximum ${OPERATIONS_CONSTANTS.MAX_ATTENDEES_PER_MEETING} attendees allowed`,
      },
    },
    agenda: {
      type: String,
      maxlength: 10000,
    },
    notes: {
      type: String,
      maxlength: OPERATIONS_CONSTANTS.MAX_MEETING_NOTES_LENGTH,
    },
    outcome: {
      type: String,
      enum: Object.values(MeetingOutcome),
    },
    outcomeNotes: {
      type: String,
      maxlength: 5000,
    },
    actionItems: {
      type: [meetingActionItemSchema],
      validate: {
        validator: (v: IMeetingActionItem[]) => v.length <= OPERATIONS_CONSTANTS.MAX_ACTION_ITEMS_PER_MEETING,
        message: `Maximum ${OPERATIONS_CONSTANTS.MAX_ACTION_ITEMS_PER_MEETING} action items allowed`,
      },
    },
    attachments: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length <= 20,
        message: 'Maximum 20 attachments allowed',
      },
    },
    followUpDate: {
      type: Date,
    },
    followUpMeeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
    },
    previousMeeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: recurringPatternSchema,
    reminders: [meetingReminderSchema],
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

meetingSchema.index({ organization: 1, startTime: 1 });
meetingSchema.index({ organization: 1, status: 1 });
meetingSchema.index({ organization: 1, type: 1 });
meetingSchema.index({ organization: 1, investor: 1 });
meetingSchema.index({ organization: 1, round: 1 });
meetingSchema.index({ organization: 1, createdAt: -1 });

// ============ Virtuals ============

meetingSchema.virtual('duration').get(function () {
  if (!this.startTime || !this.endTime) return null;
  const start = new Date(this.startTime);
  const end = new Date(this.endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
});

meetingSchema.virtual('isPast').get(function () {
  if (!this.endTime) return false;
  return new Date() > new Date(this.endTime);
});

meetingSchema.virtual('isUpcoming').get(function () {
  if (!this.startTime) return false;
  return new Date() < new Date(this.startTime);
});

meetingSchema.virtual('isInProgress').get(function () {
  if (!this.startTime || !this.endTime) return false;
  const now = new Date();
  return now >= new Date(this.startTime) && now <= new Date(this.endTime);
});

meetingSchema.virtual('attendeeCount').get(function () {
  return this.attendees?.length || 0;
});

meetingSchema.virtual('actionItemCount').get(function () {
  return this.actionItems?.length || 0;
});

meetingSchema.virtual('pendingActionItems').get(function () {
  return this.actionItems?.filter(ai => ai.status === ActionItemStatus.PENDING).length || 0;
});

// ============ Pre-save Hooks ============

meetingSchema.pre('save', function (next) {
  // Validate end time is after start time
  if (this.endTime && this.startTime && this.endTime <= this.startTime) {
    const error = new Error('End time must be after start time');
    return next(error);
  }

  // Auto-update status based on time
  if (this.isModified('status') === false) {
    const now = new Date();
    if (this.status === MeetingStatus.SCHEDULED) {
      if (now >= new Date(this.startTime) && now <= new Date(this.endTime)) {
        this.status = MeetingStatus.IN_PROGRESS;
      }
    }
  }

  next();
});

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
