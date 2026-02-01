import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  HeadcountPlanStatus,
  HeadcountPlanStatusType,
  PLANNING_CONSTANTS,
} from '../../constants';

/**
 * Headcount Plan document interface
 */
export interface IHeadcountPlan extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  fiscalYear: number;
  linkedBudget?: Types.ObjectId;
  status: HeadcountPlanStatusType;
  startDate: Date;
  endDate: Date;
  currentHeadcount: number;
  targetHeadcount: number;
  totalSalaryCost: number;
  totalBenefitsCost: number;
  totalCost: number;
  currency: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  version: number;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHeadcountPlanModel extends Model<IHeadcountPlan> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IHeadcountPlan[]>;
  findActiveByYear(
    organizationId: Types.ObjectId,
    year: number
  ): Promise<IHeadcountPlan | null>;
}

const headcountPlanSchema = new Schema<IHeadcountPlan>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [PLANNING_CONSTANTS.NAME_MAX_LENGTH, 'Name too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH, 'Description too long'],
    },
    fiscalYear: {
      type: Number,
      required: [true, 'Fiscal year is required'],
      min: PLANNING_CONSTANTS.MIN_FISCAL_YEAR,
      max: PLANNING_CONSTANTS.MAX_FISCAL_YEAR,
    },
    linkedBudget: {
      type: Schema.Types.ObjectId,
      ref: 'Budget',
    },
    status: {
      type: String,
      default: HeadcountPlanStatus.DRAFT,
      enum: Object.values(HeadcountPlanStatus),
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    currentHeadcount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetHeadcount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSalaryCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBenefitsCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: PLANNING_CONSTANTS.DEFAULT_CURRENCY,
      uppercase: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    version: {
      type: Number,
      default: 1,
    },
    notes: {
      type: String,
      maxlength: [PLANNING_CONSTANTS.NOTES_MAX_LENGTH, 'Notes too long'],
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
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

headcountPlanSchema.index({ organization: 1, fiscalYear: 1 });
headcountPlanSchema.index({ organization: 1, status: 1 });

headcountPlanSchema.statics.findByOrganization = function (
  organizationId: Types.ObjectId
): Promise<IHeadcountPlan[]> {
  return this.find({
    organization: organizationId,
    isArchived: false,
  }).sort({ fiscalYear: -1, createdAt: -1 });
};

headcountPlanSchema.statics.findActiveByYear = function (
  organizationId: Types.ObjectId,
  year: number
): Promise<IHeadcountPlan | null> {
  return this.findOne({
    organization: organizationId,
    fiscalYear: year,
    status: HeadcountPlanStatus.ACTIVE,
    isArchived: false,
  });
};

export const HeadcountPlan = mongoose.model<IHeadcountPlan, IHeadcountPlanModel>(
  'HeadcountPlan',
  headcountPlanSchema
);

export default HeadcountPlan;
