import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { ScenarioStatus, ScenarioType, PLANNING_CONSTANTS } from '../../constants';

export interface IScenario extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  type: string;
  fiscalYear: number;
  linkedBudget?: Types.ObjectId;
  linkedHeadcountPlan?: Types.ObjectId;
  linkedRevenuePlan?: Types.ObjectId;
  status: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetIncome: number;
  projectedRunway?: number;
  probability?: number;
  assumptions?: string;
  methodology?: string;
  currency: string;
  tags?: string[];
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScenarioModel extends Model<IScenario> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IScenario[]>;
}

const scenarioSchema = new Schema<IScenario>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: PLANNING_CONSTANTS.NAME_MAX_LENGTH },
    description: { type: String, trim: true, maxlength: PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH },
    type: { type: String, default: ScenarioType.BASE, enum: Object.values(ScenarioType) },
    fiscalYear: { type: Number, required: true },
    linkedBudget: { type: Schema.Types.ObjectId, ref: 'Budget' },
    linkedHeadcountPlan: { type: Schema.Types.ObjectId, ref: 'HeadcountPlan' },
    linkedRevenuePlan: { type: Schema.Types.ObjectId, ref: 'RevenuePlan' },
    status: { type: String, default: ScenarioStatus.DRAFT, enum: Object.values(ScenarioStatus) },
    projectedRevenue: { type: Number, default: 0, min: 0 },
    projectedExpenses: { type: Number, default: 0, min: 0 },
    projectedNetIncome: { type: Number, default: 0 },
    projectedRunway: { type: Number, min: 0 },
    probability: { type: Number, min: 0, max: 100 },
    assumptions: { type: String, maxlength: PLANNING_CONSTANTS.ASSUMPTIONS_MAX_LENGTH },
    methodology: { type: String, maxlength: PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH },
    currency: { type: String, default: PLANNING_CONSTANTS.DEFAULT_CURRENCY },
    tags: [String],
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

scenarioSchema.index({ organization: 1, fiscalYear: 1 });
scenarioSchema.index({ organization: 1, type: 1 });
scenarioSchema.index({ organization: 1, status: 1 });

scenarioSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isArchived: false }).sort({ fiscalYear: -1, type: 1 });
};

export const Scenario = mongoose.model<IScenario, IScenarioModel>('Scenario', scenarioSchema);
export default Scenario;
