import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  AllocationMethod,
  Priority,
  AllocationMethodType,
  PriorityType,
  PLANNING_CONSTANTS,
} from '../../constants';

/**
 * Monthly amount breakdown
 */
export interface IMonthlyAmount {
  month: number;
  amount: number;
  notes?: string;
}

/**
 * Budget item document interface
 */
export interface IBudgetItem extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  budget: Types.ObjectId;
  account: Types.ObjectId;
  category: string;
  name: string;
  description?: string;
  annualAmount: number;
  monthlyBreakdown: IMonthlyAmount[];
  allocationMethod: AllocationMethodType;
  vendor?: string;
  department?: string;
  costCenter?: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'annual';
  startMonth?: number;
  endMonth?: number;
  assumptions?: string;
  priority: PriorityType;
  tags?: string[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget item model static methods
 */
export interface IBudgetItemModel extends Model<IBudgetItem> {
  findByBudget(budgetId: Types.ObjectId): Promise<IBudgetItem[]>;
  findByAccount(
    organizationId: Types.ObjectId,
    accountId: Types.ObjectId
  ): Promise<IBudgetItem[]>;
  getTotalByCategory(budgetId: Types.ObjectId): Promise<Record<string, number>>;
  getMonthlyTotals(budgetId: Types.ObjectId): Promise<{ month: number; total: number }[]>;
}

const monthlyAmountSchema = new Schema<IMonthlyAmount>(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes too long'],
    },
  },
  { _id: false }
);

const budgetItemSchema = new Schema<IBudgetItem>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    budget: {
      type: Schema.Types.ObjectId,
      ref: 'Budget',
      required: [true, 'Budget is required'],
      index: true,
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [PLANNING_CONSTANTS.NAME_MAX_LENGTH, 'Name too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH, 'Description too long'],
    },
    annualAmount: {
      type: Number,
      required: [true, 'Annual amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    monthlyBreakdown: {
      type: [monthlyAmountSchema],
      validate: {
        validator: function (v: IMonthlyAmount[]) {
          if (v.length === 0) return true;
          if (v.length !== 12) return false;
          const months = v.map((m) => m.month).sort((a, b) => a - b);
          return months.every((m, i) => m === i + 1);
        },
        message: 'Monthly breakdown must contain exactly 12 months (1-12)',
      },
    },
    allocationMethod: {
      type: String,
      default: AllocationMethod.EVEN,
      enum: {
        values: Object.values(AllocationMethod),
        message: 'Invalid allocation method: {VALUE}',
      },
    },
    vendor: {
      type: String,
      trim: true,
      maxlength: [100, 'Vendor name too long'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department name too long'],
    },
    costCenter: {
      type: String,
      trim: true,
      maxlength: [50, 'Cost center too long'],
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    recurringFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
    },
    startMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    endMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    assumptions: {
      type: String,
      trim: true,
      maxlength: [PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH, 'Assumptions too long'],
    },
    priority: {
      type: String,
      default: Priority.MEDIUM,
      enum: {
        values: Object.values(Priority),
        message: 'Invalid priority: {VALUE}',
      },
    },
    tags: [String],
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
budgetItemSchema.index({ organization: 1, budget: 1 });
budgetItemSchema.index({ organization: 1, account: 1 });
budgetItemSchema.index({ budget: 1, category: 1 });
budgetItemSchema.index({ budget: 1, isArchived: 1 });

// Pre-save: Generate monthly breakdown if not provided and method is 'even'
budgetItemSchema.pre('save', function (next) {
  if (
    this.allocationMethod === AllocationMethod.EVEN &&
    (!this.monthlyBreakdown || this.monthlyBreakdown.length === 0)
  ) {
    const monthlyAmount = this.annualAmount / 12;
    this.monthlyBreakdown = [];
    for (let month = 1; month <= 12; month++) {
      this.monthlyBreakdown.push({
        month,
        amount: Math.round(monthlyAmount * 100) / 100,
      });
    }
    // Adjust last month for rounding
    const totalMonthly = this.monthlyBreakdown.reduce((sum, m) => sum + m.amount, 0);
    const diff = this.annualAmount - totalMonthly;
    if (Math.abs(diff) > 0.01) {
      this.monthlyBreakdown[11].amount =
        Math.round((this.monthlyBreakdown[11].amount + diff) * 100) / 100;
    }
  }
  next();
});

// Static methods
budgetItemSchema.statics.findByBudget = function (
  budgetId: Types.ObjectId
): Promise<IBudgetItem[]> {
  return this.find({
    budget: budgetId,
    isArchived: false,
  })
    .populate('account', 'code name type subtype')
    .sort({ category: 1, name: 1 });
};

budgetItemSchema.statics.findByAccount = function (
  organizationId: Types.ObjectId,
  accountId: Types.ObjectId
): Promise<IBudgetItem[]> {
  return this.find({
    organization: organizationId,
    account: accountId,
    isArchived: false,
  }).populate('budget', 'name fiscalYear type status');
};

budgetItemSchema.statics.getTotalByCategory = async function (
  budgetId: Types.ObjectId
): Promise<Record<string, number>> {
  const result = await this.aggregate([
    { $match: { budget: budgetId, isArchived: false } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$annualAmount' },
      },
    },
  ]);

  const totals: Record<string, number> = {};
  for (const r of result) {
    totals[r._id] = r.total;
  }
  return totals;
};

budgetItemSchema.statics.getMonthlyTotals = async function (
  budgetId: Types.ObjectId
): Promise<{ month: number; total: number }[]> {
  const items = await this.find({
    budget: budgetId,
    isArchived: false,
  }).select('monthlyBreakdown');

  const monthlyTotals: Record<number, number> = {};
  for (let month = 1; month <= 12; month++) {
    monthlyTotals[month] = 0;
  }

  for (const item of items) {
    for (const m of item.monthlyBreakdown) {
      monthlyTotals[m.month] += m.amount;
    }
  }

  return Object.entries(monthlyTotals).map(([month, total]) => ({
    month: parseInt(month),
    total: Math.round(total * 100) / 100,
  }));
};

export const BudgetItem = mongoose.model<IBudgetItem, IBudgetItemModel>(
  'BudgetItem',
  budgetItemSchema
);

export default BudgetItem;
