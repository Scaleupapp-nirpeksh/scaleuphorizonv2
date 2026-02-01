import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { StreamType, PricingModel, Confidence, PLANNING_CONSTANTS } from '../../constants';

export interface IMonthlyRevenue {
  month: number;
  projected: number;
  confidence: string;
  notes?: string;
}

export interface IRevenueStream extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  revenuePlan: Types.ObjectId;
  account?: Types.ObjectId;
  name: string;
  description?: string;
  streamType: string;
  product?: string;
  segment?: string;
  region?: string;
  channel?: string;
  pricingModel: string;
  averagePrice?: number;
  pricePerUnit?: number;
  unitType?: string;
  monthlyProjections: IMonthlyRevenue[];
  annualProjected: number;
  startingMRR?: number;
  projectedMRRGrowth?: number;
  churnRate?: number;
  expansionRate?: number;
  startingCustomers?: number;
  newCustomersPerMonth?: number;
  averageTransactionValue?: number;
  growthDrivers?: string[];
  risks?: string[];
  assumptions?: string;
  confidence: string;
  priority: number;
  tags?: string[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRevenueStreamModel extends Model<IRevenueStream> {
  findByPlan(planId: Types.ObjectId): Promise<IRevenueStream[]>;
}

const monthlyRevenueSchema = new Schema<IMonthlyRevenue>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    projected: { type: Number, required: true, min: 0 },
    confidence: { type: String, enum: Object.values(Confidence), default: Confidence.MEDIUM },
    notes: String,
  },
  { _id: false }
);

const revenueStreamSchema = new Schema<IRevenueStream>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    revenuePlan: { type: Schema.Types.ObjectId, ref: 'RevenuePlan', required: true, index: true },
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    name: { type: String, required: true, trim: true, maxlength: PLANNING_CONSTANTS.NAME_MAX_LENGTH },
    description: { type: String, trim: true, maxlength: PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH },
    streamType: { type: String, required: true, enum: Object.values(StreamType) },
    product: String,
    segment: String,
    region: String,
    channel: String,
    pricingModel: { type: String, default: PricingModel.FIXED, enum: Object.values(PricingModel) },
    averagePrice: { type: Number, min: 0 },
    pricePerUnit: { type: Number, min: 0 },
    unitType: String,
    monthlyProjections: [monthlyRevenueSchema],
    annualProjected: { type: Number, default: 0, min: 0 },
    startingMRR: { type: Number, min: 0 },
    projectedMRRGrowth: { type: Number },
    churnRate: { type: Number, min: 0, max: 100 },
    expansionRate: { type: Number },
    startingCustomers: { type: Number, min: 0 },
    newCustomersPerMonth: { type: Number, min: 0 },
    averageTransactionValue: { type: Number, min: 0 },
    growthDrivers: [String],
    risks: [String],
    assumptions: { type: String, maxlength: PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH },
    confidence: { type: String, default: Confidence.MEDIUM, enum: Object.values(Confidence) },
    priority: { type: Number, default: 0 },
    tags: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false },
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

revenueStreamSchema.index({ organization: 1, revenuePlan: 1 });

// Calculate annual projected from monthly
revenueStreamSchema.pre('save', function (next) {
  if (this.monthlyProjections && this.monthlyProjections.length > 0) {
    this.annualProjected = this.monthlyProjections.reduce((sum, m) => sum + m.projected, 0);
  }
  next();
});

revenueStreamSchema.statics.findByPlan = function (planId: Types.ObjectId) {
  return this.find({ revenuePlan: planId, isArchived: false }).sort({ priority: 1, name: 1 });
};

export const RevenueStream = mongoose.model<IRevenueStream, IRevenueStreamModel>('RevenueStream', revenueStreamSchema);
export default RevenueStream;
