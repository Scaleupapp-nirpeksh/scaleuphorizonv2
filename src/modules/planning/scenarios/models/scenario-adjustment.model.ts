import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { AdjustmentType, AdjustmentMethod, ImpactType, ImpactCategory, PLANNING_CONSTANTS } from '../../constants';

export interface IScenarioAdjustment extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  scenario: Types.ObjectId;
  adjustmentType: string;
  referenceId?: Types.ObjectId;
  referenceName: string;
  referenceCategory?: string;
  adjustmentMethod: string;
  adjustmentPercentage?: number;
  adjustmentAmount?: number;
  originalAnnualAmount: number;
  adjustedAnnualAmount: number;
  impactType: string;
  impactCategory: string;
  monthlyImpact?: { month: number; original: number; adjusted: number; difference: number }[];
  description?: string;
  assumptions?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScenarioAdjustmentModel extends Model<IScenarioAdjustment> {
  findByScenario(scenarioId: Types.ObjectId): Promise<IScenarioAdjustment[]>;
}

const monthlyImpactSchema = new Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    original: { type: Number, required: true },
    adjusted: { type: Number, required: true },
    difference: { type: Number, required: true },
  },
  { _id: false }
);

const scenarioAdjustmentSchema = new Schema<IScenarioAdjustment>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    scenario: { type: Schema.Types.ObjectId, ref: 'Scenario', required: true, index: true },
    adjustmentType: { type: String, required: true, enum: Object.values(AdjustmentType) },
    referenceId: { type: Schema.Types.ObjectId },
    referenceName: { type: String, required: true, trim: true },
    referenceCategory: String,
    adjustmentMethod: { type: String, required: true, enum: Object.values(AdjustmentMethod) },
    adjustmentPercentage: { type: Number },
    adjustmentAmount: { type: Number },
    originalAnnualAmount: { type: Number, required: true },
    adjustedAnnualAmount: { type: Number, default: 0 },  // Calculated in pre-save hook
    impactType: { type: String, default: ImpactType.NEUTRAL, enum: Object.values(ImpactType) },  // Calculated in pre-save hook
    impactCategory: { type: String, required: true, enum: Object.values(ImpactCategory) },
    monthlyImpact: [monthlyImpactSchema],
    description: { type: String, maxlength: PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH },
    assumptions: { type: String, maxlength: PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH },
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

scenarioAdjustmentSchema.index({ organization: 1, scenario: 1 });
scenarioAdjustmentSchema.index({ scenario: 1, adjustmentType: 1 });

// Calculate impact type and adjusted amount
scenarioAdjustmentSchema.pre('save', function (next) {
  // Calculate adjusted amount based on method
  if (this.adjustmentMethod === AdjustmentMethod.PERCENTAGE && this.adjustmentPercentage !== undefined) {
    this.adjustedAnnualAmount = this.originalAnnualAmount * (1 + this.adjustmentPercentage / 100);
  } else if (this.adjustmentMethod === AdjustmentMethod.FIXED && this.adjustmentAmount !== undefined) {
    this.adjustedAnnualAmount = this.originalAnnualAmount + this.adjustmentAmount;
  }

  // Determine impact type
  const difference = this.adjustedAnnualAmount - this.originalAnnualAmount;
  if (difference > 0) {
    this.impactType = ImpactType.INCREASE;
  } else if (difference < 0) {
    this.impactType = ImpactType.DECREASE;
  } else {
    this.impactType = ImpactType.NEUTRAL;
  }

  next();
});

scenarioAdjustmentSchema.statics.findByScenario = function (scenarioId: Types.ObjectId) {
  return this.find({ scenario: scenarioId, isArchived: false }).sort({ impactCategory: 1, referenceName: 1 });
};

export const ScenarioAdjustment = mongoose.model<IScenarioAdjustment, IScenarioAdjustmentModel>(
  'ScenarioAdjustment',
  scenarioAdjustmentSchema
);
export default ScenarioAdjustment;
