import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { RunwayScenario, RunwayStatus, RunwayScenarioType, RunwayStatusType } from '../../constants';

/**
 * Runway Projection Interface
 */
export interface IRunwayProjection {
  month: Date;
  startingCash: number;
  projectedRevenue: number;
  projectedExpenses: number;
  netCashFlow: number;
  endingCash: number;
  cumulativeMonths: number;
}

/**
 * Runway Assumptions Interface
 */
export interface IRunwayAssumptions {
  revenueGrowthRate: number; // Monthly percentage
  expenseGrowthRate: number;
  oneTimeInflows?: number;
  oneTimeOutflows?: number;
  newHiringCost?: number;
}

/**
 * Runway Snapshot Document Interface
 */
export interface IRunwaySnapshot extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  snapshotDate: Date;
  scenario: RunwayScenarioType;
  // Current state
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  netBurnRate: number;
  // Calculations
  runwayMonths: number;
  runwayEndDate: Date;
  status: RunwayStatusType;
  // Assumptions
  assumptions: IRunwayAssumptions;
  // Projections
  projections: IRunwayProjection[];
  // Linked data sources
  linkedBankAccounts?: Types.ObjectId[];
  linkedBudget?: Types.ObjectId;
  // Metadata
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Runway Snapshot Model Interface
 */
export interface IRunwaySnapshotModel extends Model<IRunwaySnapshot> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IRunwaySnapshot[]>;
  getLatestSnapshot(organizationId: Types.ObjectId): Promise<IRunwaySnapshot | null>;
}

/**
 * Runway Assumptions Schema
 */
const runwayAssumptionsSchema = new Schema<IRunwayAssumptions>(
  {
    revenueGrowthRate: { type: Number, default: 0 },
    expenseGrowthRate: { type: Number, default: 0 },
    oneTimeInflows: { type: Number, default: 0 },
    oneTimeOutflows: { type: Number, default: 0 },
    newHiringCost: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Runway Projection Schema
 */
const runwayProjectionSchema = new Schema<IRunwayProjection>(
  {
    month: { type: Date, required: true },
    startingCash: { type: Number, required: true },
    projectedRevenue: { type: Number, required: true },
    projectedExpenses: { type: Number, required: true },
    netCashFlow: { type: Number, required: true },
    endingCash: { type: Number, required: true },
    cumulativeMonths: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Runway Snapshot Schema
 */
const runwaySnapshotSchema = new Schema<IRunwaySnapshot>(
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
    snapshotDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    scenario: {
      type: String,
      enum: Object.values(RunwayScenario),
      default: RunwayScenario.CURRENT,
    },
    currentCash: {
      type: Number,
      required: true,
      min: 0,
    },
    monthlyBurnRate: {
      type: Number,
      required: true,
      min: 0,
    },
    monthlyRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    netBurnRate: {
      type: Number,
      required: true,
    },
    runwayMonths: {
      type: Number,
      required: true,
      min: 0,
    },
    runwayEndDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RunwayStatus),
      required: true,
    },
    assumptions: {
      type: runwayAssumptionsSchema,
      default: () => ({}),
    },
    projections: [runwayProjectionSchema],
    linkedBankAccounts: [{ type: Schema.Types.ObjectId, ref: 'BankAccount' }],
    linkedBudget: { type: Schema.Types.ObjectId, ref: 'Budget' },
    notes: String,
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
runwaySnapshotSchema.index({ organization: 1, snapshotDate: -1 });
runwaySnapshotSchema.index({ organization: 1, scenario: 1 });
runwaySnapshotSchema.index({ organization: 1, isArchived: 1 });

// Static methods
runwaySnapshotSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({
    organization: organizationId,
    isArchived: false,
  }).sort({ snapshotDate: -1 });
};

runwaySnapshotSchema.statics.getLatestSnapshot = function (organizationId: Types.ObjectId) {
  return this.findOne({
    organization: organizationId,
    isArchived: false,
  }).sort({ snapshotDate: -1 });
};

export const RunwaySnapshot = mongoose.model<IRunwaySnapshot, IRunwaySnapshotModel>(
  'RunwaySnapshot',
  runwaySnapshotSchema
);
