import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  ExpenseStatus,
  RecurringFrequency,
  PaymentMethod,
  TRACKING_CONSTANTS,
} from '../../constants';

export interface IExpense extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  account: Types.ObjectId;
  vendor?: Types.ObjectId;
  amount: number;
  date: Date;
  dueDate?: Date;
  description: string;
  category: string;
  status: string;
  submittedBy?: Types.ObjectId;
  submittedAt?: Date;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  paidAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  recurringEndDate?: Date;
  parentExpense?: Types.ObjectId;
  receipt?: string;
  attachments?: string[];
  transaction?: Types.ObjectId;
  department?: string;
  costCenter?: string;
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

export interface IExpenseModel extends Model<IExpense> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IExpense[]>;
  findPendingApprovals(organizationId: Types.ObjectId): Promise<IExpense[]>;
  findRecurring(organizationId: Types.ObjectId): Promise<IExpense[]>;
}

const expenseSchema = new Schema<IExpense>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: Date,
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ExpenseStatus),
      default: ExpenseStatus.DRAFT,
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    approvalNotes: {
      type: String,
      maxlength: TRACKING_CONSTANTS.NOTES_MAX_LENGTH,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: Date,
    rejectionReason: {
      type: String,
      maxlength: TRACKING_CONSTANTS.NOTES_MAX_LENGTH,
    },
    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: Object.values(RecurringFrequency),
    },
    recurringEndDate: Date,
    parentExpense: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
    },
    receipt: String,
    attachments: {
      type: [String],
      default: [],
      validate: {
        validator: function (attachments: string[]) {
          return attachments.length <= TRACKING_CONSTANTS.MAX_ATTACHMENTS;
        },
        message: `Maximum ${TRACKING_CONSTANTS.MAX_ATTACHMENTS} attachments allowed`,
      },
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    costCenter: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= TRACKING_CONSTANTS.MAX_TAGS;
        },
        message: `Maximum ${TRACKING_CONSTANTS.MAX_TAGS} tags allowed`,
      },
    },
    notes: {
      type: String,
      maxlength: TRACKING_CONSTANTS.NOTES_MAX_LENGTH,
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

// Compound indexes
expenseSchema.index({ organization: 1, status: 1 });
expenseSchema.index({ organization: 1, vendor: 1 });
expenseSchema.index({ organization: 1, date: -1 });
expenseSchema.index({ organization: 1, category: 1 });
expenseSchema.index({ organization: 1, isRecurring: 1 });
expenseSchema.index({ organization: 1, dueDate: 1 });
expenseSchema.index({ organization: 1, department: 1 });

// Pre-save validation
expenseSchema.pre('save', function (next) {
  // If recurring, frequency is required
  if (this.isRecurring && !this.recurringFrequency) {
    return next(new Error('Recurring frequency is required for recurring expenses'));
  }
  next();
});

// Static methods
expenseSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isArchived: false }).sort({ date: -1 });
};

expenseSchema.statics.findPendingApprovals = function (organizationId: Types.ObjectId) {
  return this.find({
    organization: organizationId,
    status: ExpenseStatus.PENDING_APPROVAL,
    isArchived: false,
  }).sort({ submittedAt: 1 });
};

expenseSchema.statics.findRecurring = function (organizationId: Types.ObjectId) {
  return this.find({
    organization: organizationId,
    isRecurring: true,
    parentExpense: { $exists: false },
    isArchived: false,
  }).sort({ date: -1 });
};

export const Expense = mongoose.model<IExpense, IExpenseModel>('Expense', expenseSchema);

export default Expense;
