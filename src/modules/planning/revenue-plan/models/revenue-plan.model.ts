import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { RevenuePlanStatus, RevenueModel, PLANNING_CONSTANTS } from '../../constants';

export interface IRevenuePlan extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  fiscalYear: number;
  linkedBudget?: Types.ObjectId;
  status: string;
  startDate: Date;
  endDate: Date;
  totalProjectedRevenue: number;
  currency: string;
  revenueModel: string;
  growthTargetPercentage?: number;
  baselineRevenue?: number;
  assumptions?: string;
  methodology?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  version: number;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRevenuePlanModel extends Model<IRevenuePlan> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IRevenuePlan[]>;
}

const revenuePlanSchema = new Schema<IRevenuePlan>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: PLANNING_CONSTANTS.NAME_MAX_LENGTH },
    description: { type: String, trim: true, maxlength: PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH },
    fiscalYear: { type: Number, required: true },
    linkedBudget: { type: Schema.Types.ObjectId, ref: 'Budget' },
    status: { type: String, default: RevenuePlanStatus.DRAFT, enum: Object.values(RevenuePlanStatus) },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalProjectedRevenue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: PLANNING_CONSTANTS.DEFAULT_CURRENCY },
    revenueModel: { type: String, default: RevenueModel.SUBSCRIPTION, enum: Object.values(RevenueModel) },
    growthTargetPercentage: { type: Number, min: -100 },
    baselineRevenue: { type: Number, min: 0 },
    assumptions: { type: String, maxlength: PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH },
    methodology: { type: String, maxlength: PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    version: { type: Number, default: 1 },
    notes: { type: String, maxlength: PLANNING_CONSTANTS.NOTES_MAX_LENGTH },
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

revenuePlanSchema.index({ organization: 1, fiscalYear: 1 });
revenuePlanSchema.index({ organization: 1, status: 1 });

revenuePlanSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isArchived: false }).sort({ fiscalYear: -1 });
};

export const RevenuePlan = mongoose.model<IRevenuePlan, IRevenuePlanModel>('RevenuePlan', revenuePlanSchema);
export default RevenuePlan;
