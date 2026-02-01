import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  CashFlowPeriod,
  CashFlowStatus,
  CashFlowCategory,
  CashFlowPeriodType,
  CashFlowStatusType,
  CashFlowCategoryType,
  ForecastConfidenceType,
} from '../../constants';

/**
 * Cash Flow Item Interface
 */
export interface ICashFlowItem {
  category: CashFlowCategoryType;
  subcategory?: string;
  account?: Types.ObjectId;
  description: string;
  amount: number;
  isActual: boolean;
  confidence?: ForecastConfidenceType;
}

/**
 * Cash Flow Period Projection Interface
 */
export interface ICashFlowPeriodProjection {
  period: Date;
  openingBalance: number;
  inflows: ICashFlowItem[];
  outflows: ICashFlowItem[];
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
}

/**
 * Cash Flow Forecast Document Interface
 */
export interface ICashFlowForecast extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  fiscalYear: number;
  periodType: CashFlowPeriodType;
  status: CashFlowStatusType;
  startDate: Date;
  endDate: Date;
  startingBalance: number;
  projections: ICashFlowPeriodProjection[];
  // Summary fields (computed)
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  endingBalance: number;
  lowestBalance: number;
  lowestBalanceDate?: Date;
  // Linked plans
  linkedBudget?: Types.ObjectId;
  linkedRevenuePlan?: Types.ObjectId;
  // Metadata
  currency: string;
  notes?: string;
  lastRecalculatedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cash Flow Forecast Model Interface with statics
 */
export interface ICashFlowForecastModel extends Model<ICashFlowForecast> {
  findByOrganization(
    organizationId: Types.ObjectId,
    fiscalYear?: number
  ): Promise<ICashFlowForecast[]>;
  findActiveForecast(
    organizationId: Types.ObjectId,
    fiscalYear: number
  ): Promise<ICashFlowForecast | null>;
}

/**
 * Cash Flow Item Schema
 */
const cashFlowItemSchema = new Schema<ICashFlowItem>(
  {
    category: {
      type: String,
      enum: Object.values(CashFlowCategory),
      required: true,
    },
    subcategory: String,
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    isActual: { type: Boolean, default: false },
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
  },
  { _id: false }
);

/**
 * Cash Flow Period Projection Schema
 */
const cashFlowPeriodProjectionSchema = new Schema<ICashFlowPeriodProjection>(
  {
    period: { type: Date, required: true },
    openingBalance: { type: Number, required: true },
    inflows: [cashFlowItemSchema],
    outflows: [cashFlowItemSchema],
    totalInflows: { type: Number, default: 0 },
    totalOutflows: { type: Number, default: 0 },
    netCashFlow: { type: Number, default: 0 },
    closingBalance: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Cash Flow Forecast Schema
 */
const cashFlowForecastSchema = new Schema<ICashFlowForecast>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    fiscalYear: {
      type: Number,
      required: true,
      min: 2020,
      max: 2050,
    },
    periodType: {
      type: String,
      enum: Object.values(CashFlowPeriod),
      required: true,
      default: CashFlowPeriod.MONTHLY,
    },
    status: {
      type: String,
      enum: Object.values(CashFlowStatus),
      default: CashFlowStatus.DRAFT,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    projections: [cashFlowPeriodProjectionSchema],
    // Summary fields
    totalInflows: { type: Number, default: 0 },
    totalOutflows: { type: Number, default: 0 },
    netChange: { type: Number, default: 0 },
    endingBalance: { type: Number, default: 0 },
    lowestBalance: { type: Number, default: 0 },
    lowestBalanceDate: Date,
    // Linked plans
    linkedBudget: { type: Schema.Types.ObjectId, ref: 'Budget' },
    linkedRevenuePlan: { type: Schema.Types.ObjectId, ref: 'RevenuePlan' },
    // Metadata
    currency: { type: String, default: 'USD' },
    notes: String,
    lastRecalculatedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
cashFlowForecastSchema.index({ organization: 1, fiscalYear: 1 });
cashFlowForecastSchema.index({ organization: 1, status: 1 });
cashFlowForecastSchema.index({ organization: 1, isArchived: 1 });

// Pre-save hook to calculate summary fields
cashFlowForecastSchema.pre('save', function (next) {
  if (this.projections && this.projections.length > 0) {
    let totalInflows = 0;
    let totalOutflows = 0;
    let lowestBalance = this.startingBalance;
    let lowestBalanceDate = this.startDate;

    for (const projection of this.projections) {
      totalInflows += projection.totalInflows;
      totalOutflows += projection.totalOutflows;

      if (projection.closingBalance < lowestBalance) {
        lowestBalance = projection.closingBalance;
        lowestBalanceDate = projection.period;
      }
    }

    this.totalInflows = totalInflows;
    this.totalOutflows = totalOutflows;
    this.netChange = totalInflows - totalOutflows;
    this.endingBalance =
      this.projections[this.projections.length - 1]?.closingBalance ?? this.startingBalance;
    this.lowestBalance = lowestBalance;
    this.lowestBalanceDate = lowestBalanceDate;
  }
  next();
});

// Static methods
cashFlowForecastSchema.statics.findByOrganization = function (
  organizationId: Types.ObjectId,
  fiscalYear?: number
) {
  const query: Record<string, unknown> = {
    organization: organizationId,
    isArchived: false,
  };
  if (fiscalYear) {
    query.fiscalYear = fiscalYear;
  }
  return this.find(query).sort({ fiscalYear: -1, createdAt: -1 });
};

cashFlowForecastSchema.statics.findActiveForecast = function (
  organizationId: Types.ObjectId,
  fiscalYear: number
) {
  return this.findOne({
    organization: organizationId,
    fiscalYear,
    status: CashFlowStatus.ACTIVE,
    isArchived: false,
  });
};

export const CashFlowForecast = mongoose.model<ICashFlowForecast, ICashFlowForecastModel>(
  'CashFlowForecast',
  cashFlowForecastSchema
);
