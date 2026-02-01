/**
 * Milestone Model
 *
 * Represents a product or business milestone with key results
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  MilestoneStatus,
  MilestoneStatusType,
  MilestoneCategory,
  MilestoneCategoryType,
  OPERATIONS_CONSTANTS,
} from '../../constants';

// ============ Key Result Interface ============

export interface IKeyResult {
  _id?: Types.ObjectId;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  status: 'pending' | 'on_track' | 'at_risk' | 'achieved' | 'missed';
}

// ============ Milestone Interface ============

export interface IMilestone extends Document {
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

// ============ Key Result Schema ============

const keyResultSchema = new Schema<IKeyResult>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ['pending', 'on_track', 'at_risk', 'achieved', 'missed'],
      default: 'pending',
    },
  },
  { _id: true }
);

// ============ Milestone Schema ============

const milestoneSchema = new Schema<IMilestone>(
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
      maxlength: OPERATIONS_CONSTANTS.MAX_MILESTONE_TITLE_LENGTH,
    },
    description: {
      type: String,
      maxlength: OPERATIONS_CONSTANTS.MAX_MILESTONE_DESCRIPTION_LENGTH,
    },
    category: {
      type: String,
      enum: Object.values(MilestoneCategory),
      default: MilestoneCategory.OTHER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MilestoneStatus),
      default: MilestoneStatus.PLANNED,
      index: true,
    },
    targetDate: {
      type: Date,
      required: true,
      index: true,
    },
    completedDate: {
      type: Date,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    keyResults: {
      type: [keyResultSchema],
      validate: {
        validator: (v: IKeyResult[]) => v.length <= OPERATIONS_CONSTANTS.MAX_KEY_RESULTS_PER_MILESTONE,
        message: `Maximum ${OPERATIONS_CONSTANTS.MAX_KEY_RESULTS_PER_MILESTONE} key results allowed`,
      },
    },
    linkedRound: {
      type: Schema.Types.ObjectId,
      ref: 'Round',
    },
    linkedTasks: [{
      type: Schema.Types.ObjectId,
      ref: 'Task',
    }],
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    stakeholders: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    tags: {
      type: [String],
    },
    notes: {
      type: String,
      maxlength: 5000,
    },
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

milestoneSchema.index({ organization: 1, status: 1 });
milestoneSchema.index({ organization: 1, category: 1 });
milestoneSchema.index({ organization: 1, targetDate: 1 });
milestoneSchema.index({ organization: 1, owner: 1 });
milestoneSchema.index({ organization: 1, linkedRound: 1 });
milestoneSchema.index({ organization: 1, createdAt: -1 });

// ============ Virtuals ============

milestoneSchema.virtual('isOverdue').get(function () {
  if (!this.targetDate) return false;
  if (this.status === MilestoneStatus.COMPLETED || this.status === MilestoneStatus.CANCELLED) {
    return false;
  }
  return new Date() > this.targetDate;
});

milestoneSchema.virtual('daysUntilTarget').get(function () {
  if (!this.targetDate) return null;
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

milestoneSchema.virtual('keyResultsProgress').get(function () {
  if (!this.keyResults || this.keyResults.length === 0) return null;

  const totalProgress = this.keyResults.reduce((sum, kr) => {
    if (kr.targetValue === 0) return sum;
    const progress = Math.min((kr.currentValue / kr.targetValue) * 100, 100);
    return sum + progress;
  }, 0);

  return totalProgress / this.keyResults.length;
});

// ============ Pre-save Hooks ============

milestoneSchema.pre('save', function (next) {
  // Set completedDate when status changes to completed
  if (this.isModified('status')) {
    if (this.status === MilestoneStatus.COMPLETED && !this.completedDate) {
      this.completedDate = new Date();
      this.progress = 100;
    } else if (this.status !== MilestoneStatus.COMPLETED) {
      this.completedDate = undefined;
    }
  }

  // Auto-calculate progress from key results if available
  if (this.keyResults && this.keyResults.length > 0 && this.isModified('keyResults')) {
    const totalProgress = this.keyResults.reduce((sum, kr) => {
      if (kr.targetValue === 0) return sum;
      const progress = Math.min((kr.currentValue / kr.targetValue) * 100, 100);
      return sum + progress;
    }, 0);
    this.progress = Math.round(totalProgress / this.keyResults.length);
  }

  next();
});

export const Milestone = mongoose.model<IMilestone>('Milestone', milestoneSchema);
