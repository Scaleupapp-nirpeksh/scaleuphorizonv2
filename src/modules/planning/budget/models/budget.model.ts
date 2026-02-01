import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  BudgetStatus,
  BudgetType,
  BudgetStatusType,
  BudgetTypeValue,
  PLANNING_CONSTANTS,
} from '../../constants';

/**
 * Budget document interface
 */
export interface IBudget extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  fiscalYear: number;
  type: BudgetTypeValue;
  quarter?: 1 | 2 | 3 | 4;
  month?: number;
  status: BudgetStatusType;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  currency: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  submittedBy?: Types.ObjectId;
  submittedAt?: Date;
  version: number;
  sourceClone?: Types.ObjectId;
  tags?: string[];
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget model static methods
 */
export interface IBudgetModel extends Model<IBudget> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IBudget[]>;
  findActiveBudget(
    organizationId: Types.ObjectId,
    fiscalYear: number,
    type?: BudgetTypeValue
  ): Promise<IBudget | null>;
  getNextVersion(organizationId: Types.ObjectId, name: string): Promise<number>;
}

const budgetSchema = new Schema<IBudget>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Budget name is required'],
      trim: true,
      minlength: [PLANNING_CONSTANTS.NAME_MIN_LENGTH, 'Name too short'],
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
      min: [PLANNING_CONSTANTS.MIN_FISCAL_YEAR, 'Invalid fiscal year'],
      max: [PLANNING_CONSTANTS.MAX_FISCAL_YEAR, 'Invalid fiscal year'],
    },
    type: {
      type: String,
      required: [true, 'Budget type is required'],
      enum: {
        values: Object.values(BudgetType),
        message: 'Invalid budget type: {VALUE}',
      },
    },
    quarter: {
      type: Number,
      enum: [1, 2, 3, 4],
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
    },
    status: {
      type: String,
      default: BudgetStatus.DRAFT,
      enum: {
        values: Object.values(BudgetStatus),
        message: 'Invalid budget status: {VALUE}',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    currency: {
      type: String,
      default: PLANNING_CONSTANTS.DEFAULT_CURRENCY,
      uppercase: true,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    approvalNotes: {
      type: String,
      maxlength: [PLANNING_CONSTANTS.NOTES_MAX_LENGTH, 'Notes too long'],
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: Date,
    rejectionReason: {
      type: String,
      maxlength: [PLANNING_CONSTANTS.NOTES_MAX_LENGTH, 'Reason too long'],
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: Date,
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    sourceClone: {
      type: Schema.Types.ObjectId,
      ref: 'Budget',
    },
    tags: [String],
    notes: {
      type: String,
      maxlength: [PLANNING_CONSTANTS.NOTES_MAX_LENGTH, 'Notes too long'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy is required'],
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
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes
budgetSchema.index({ organization: 1, fiscalYear: 1, type: 1 });
budgetSchema.index({ organization: 1, status: 1 });
budgetSchema.index({ organization: 1, name: 1, version: 1 }, { unique: true });
budgetSchema.index({ organization: 1, isArchived: 1 });

// Validation: quarterly budget needs quarter
budgetSchema.pre('validate', function (next) {
  if (this.type === BudgetType.QUARTERLY && !this.quarter) {
    this.invalidate('quarter', 'Quarter is required for quarterly budgets');
  }
  if (this.type === BudgetType.MONTHLY && !this.month) {
    this.invalidate('month', 'Month is required for monthly budgets');
  }
  if (this.startDate >= this.endDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Static methods
budgetSchema.statics.findByOrganization = function (
  organizationId: Types.ObjectId
): Promise<IBudget[]> {
  return this.find({
    organization: organizationId,
    isArchived: false,
  }).sort({ fiscalYear: -1, createdAt: -1 });
};

budgetSchema.statics.findActiveBudget = function (
  organizationId: Types.ObjectId,
  fiscalYear: number,
  type?: BudgetTypeValue
): Promise<IBudget | null> {
  const query: Record<string, unknown> = {
    organization: organizationId,
    fiscalYear,
    status: BudgetStatus.ACTIVE,
    isArchived: false,
  };
  if (type) {
    query.type = type;
  }
  return this.findOne(query);
};

budgetSchema.statics.getNextVersion = async function (
  organizationId: Types.ObjectId,
  name: string
): Promise<number> {
  const lastBudget = await this.findOne({
    organization: organizationId,
    name,
  })
    .sort({ version: -1 })
    .select('version');

  return lastBudget ? lastBudget.version + 1 : 1;
};

export const Budget = mongoose.model<IBudget, IBudgetModel>('Budget', budgetSchema);

export default Budget;
