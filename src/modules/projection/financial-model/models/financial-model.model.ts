import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  FinancialModelStatus,
  ModelPeriod,
  FinancialModelStatusType,
  ModelPeriodType,
} from '../../constants';

/**
 * Monthly Amount Interface
 */
export interface IMonthlyAmount {
  month: Date;
  amount: number;
  isActual: boolean;
  notes?: string;
}

/**
 * Income Statement Line Interface
 */
export interface IIncomeStatementLine {
  category: 'revenue' | 'cogs' | 'operating_expense' | 'other_income' | 'other_expense' | 'tax';
  subcategory?: string;
  account?: Types.ObjectId;
  name: string;
  amounts: IMonthlyAmount[];
  total: number;
}

/**
 * Balance Sheet Line Interface
 */
export interface IBalanceSheetLine {
  category: 'asset' | 'liability' | 'equity';
  subcategory?:
    | 'current_asset'
    | 'fixed_asset'
    | 'current_liability'
    | 'long_term_liability'
    | 'equity';
  account?: Types.ObjectId;
  name: string;
  amounts: IMonthlyAmount[];
  total: number;
}

/**
 * Cash Flow Statement Line Interface
 */
export interface ICashFlowStatementLine {
  category: 'operating' | 'investing' | 'financing';
  subcategory?: string;
  name: string;
  amounts: IMonthlyAmount[];
  total: number;
}

/**
 * Key Metrics Interface
 */
export interface IKeyMetrics {
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitdaMargin: number;
  // Liquidity
  currentRatio: number;
  quickRatio: number;
  // Leverage
  debtToEquity: number;
  // Growth
  revenueGrowth: number;
  expenseGrowth: number;
  // SaaS Specific
  mrr?: number;
  arr?: number;
  burnRate?: number;
  runway?: number;
}

/**
 * Financial Model Document Interface
 */
export interface IFinancialModel extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  fiscalYear: number;
  period: ModelPeriodType;
  status: FinancialModelStatusType;
  // Statements
  incomeStatement: IIncomeStatementLine[];
  balanceSheet: IBalanceSheetLine[];
  cashFlowStatement: ICashFlowStatementLine[];
  // Calculated Totals
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netCashFlow: number;
  // Key Metrics
  keyMetrics: IKeyMetrics;
  // Linked resources
  linkedBudget?: Types.ObjectId;
  linkedRevenuePlan?: Types.ObjectId;
  linkedHeadcountPlan?: Types.ObjectId;
  // Metadata
  notes?: string;
  lastCalculatedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Financial Model Model Interface
 */
export interface IFinancialModelModel extends Model<IFinancialModel> {
  findByOrganization(
    organizationId: Types.ObjectId,
    fiscalYear?: number
  ): Promise<IFinancialModel[]>;
  findActiveModel(
    organizationId: Types.ObjectId,
    fiscalYear: number
  ): Promise<IFinancialModel | null>;
}

/**
 * Monthly Amount Schema
 */
const monthlyAmountSchema = new Schema<IMonthlyAmount>(
  {
    month: { type: Date, required: true },
    amount: { type: Number, required: true, default: 0 },
    isActual: { type: Boolean, default: false },
    notes: String,
  },
  { _id: false }
);

/**
 * Income Statement Line Schema
 */
const incomeStatementLineSchema = new Schema<IIncomeStatementLine>(
  {
    category: {
      type: String,
      enum: ['revenue', 'cogs', 'operating_expense', 'other_income', 'other_expense', 'tax'],
      required: true,
    },
    subcategory: String,
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    name: { type: String, required: true },
    amounts: [monthlyAmountSchema],
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Balance Sheet Line Schema
 */
const balanceSheetLineSchema = new Schema<IBalanceSheetLine>(
  {
    category: {
      type: String,
      enum: ['asset', 'liability', 'equity'],
      required: true,
    },
    subcategory: {
      type: String,
      enum: ['current_asset', 'fixed_asset', 'current_liability', 'long_term_liability', 'equity'],
    },
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    name: { type: String, required: true },
    amounts: [monthlyAmountSchema],
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Cash Flow Statement Line Schema
 */
const cashFlowStatementLineSchema = new Schema<ICashFlowStatementLine>(
  {
    category: {
      type: String,
      enum: ['operating', 'investing', 'financing'],
      required: true,
    },
    subcategory: String,
    name: { type: String, required: true },
    amounts: [monthlyAmountSchema],
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Key Metrics Schema
 */
const keyMetricsSchema = new Schema<IKeyMetrics>(
  {
    grossMargin: { type: Number, default: 0 },
    operatingMargin: { type: Number, default: 0 },
    netMargin: { type: Number, default: 0 },
    ebitdaMargin: { type: Number, default: 0 },
    currentRatio: { type: Number, default: 0 },
    quickRatio: { type: Number, default: 0 },
    debtToEquity: { type: Number, default: 0 },
    revenueGrowth: { type: Number, default: 0 },
    expenseGrowth: { type: Number, default: 0 },
    mrr: Number,
    arr: Number,
    burnRate: Number,
    runway: Number,
  },
  { _id: false }
);

/**
 * Financial Model Schema
 */
const financialModelSchema = new Schema<IFinancialModel>(
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
    period: {
      type: String,
      enum: Object.values(ModelPeriod),
      default: ModelPeriod.MONTHLY,
    },
    status: {
      type: String,
      enum: Object.values(FinancialModelStatus),
      default: FinancialModelStatus.DRAFT,
    },
    // Statements
    incomeStatement: [incomeStatementLineSchema],
    balanceSheet: [balanceSheetLineSchema],
    cashFlowStatement: [cashFlowStatementLineSchema],
    // Totals
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    operatingIncome: { type: Number, default: 0 },
    netIncome: { type: Number, default: 0 },
    totalAssets: { type: Number, default: 0 },
    totalLiabilities: { type: Number, default: 0 },
    totalEquity: { type: Number, default: 0 },
    netCashFlow: { type: Number, default: 0 },
    // Metrics
    keyMetrics: {
      type: keyMetricsSchema,
      default: () => ({}),
    },
    // Links
    linkedBudget: { type: Schema.Types.ObjectId, ref: 'Budget' },
    linkedRevenuePlan: { type: Schema.Types.ObjectId, ref: 'RevenuePlan' },
    linkedHeadcountPlan: { type: Schema.Types.ObjectId, ref: 'HeadcountPlan' },
    // Metadata
    notes: String,
    lastCalculatedAt: Date,
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
financialModelSchema.index({ organization: 1, fiscalYear: 1 });
financialModelSchema.index({ organization: 1, status: 1 });
financialModelSchema.index({ organization: 1, isArchived: 1 });

// Static methods
financialModelSchema.statics.findByOrganization = function (
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

financialModelSchema.statics.findActiveModel = function (
  organizationId: Types.ObjectId,
  fiscalYear: number
) {
  return this.findOne({
    organization: organizationId,
    fiscalYear,
    status: FinancialModelStatus.ACTIVE,
    isArchived: false,
  });
};

export const FinancialModel = mongoose.model<IFinancialModel, IFinancialModelModel>(
  'FinancialModel',
  financialModelSchema
);
