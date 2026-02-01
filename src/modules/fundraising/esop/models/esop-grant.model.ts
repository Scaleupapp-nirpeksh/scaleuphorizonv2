/**
 * ESOP Grant Model
 *
 * Represents an individual stock option grant to an employee
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  GrantStatus,
  GrantStatusType,
  VestingScheduleType,
  VestingScheduleTypeType,
  GrantType,
  GrantTypeType,
} from '../../constants';

export interface IVestingEvent {
  date: Date;
  sharesVested: number;
  cumulativeVested: number;
  percentVested: number;
  isMilestone?: boolean;
  milestoneDescription?: string;
}

export interface IExerciseEvent extends Document {
  date: Date;
  sharesExercised: number;
  pricePerShare: number;
  totalCost: number;
  paymentMethod?: string;
  capTableEntryId?: Types.ObjectId;
  notes?: string;
}

export interface IAccelerationClause {
  singleTrigger?: boolean;
  doubleTrigger?: boolean;
  accelerationPercent: number;
}

export interface IESOPGrant extends Document {
  organization: Types.ObjectId;
  pool: Types.ObjectId;
  grantee: Types.ObjectId;
  granteeName: string;
  granteeEmail?: string;
  employeeId?: string;
  department?: string;
  grantType: GrantTypeType;
  status: GrantStatusType;
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  exercisedShares: number;
  exercisePrice: number;
  fairMarketValue?: number;
  grantDate: Date;
  vestingSchedule: VestingScheduleTypeType;
  vestingStartDate: Date;
  vestingMonths: number;
  cliffMonths: number;
  vestingEvents: IVestingEvent[];
  exerciseEvents: IExerciseEvent[];
  expirationDate?: Date;
  accelerationClause?: IAccelerationClause;
  boardApprovalDate?: Date;
  grantAgreementUrl?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vestingEventSchema = new Schema<IVestingEvent>(
  {
    date: { type: Date, required: true },
    sharesVested: { type: Number, required: true },
    cumulativeVested: { type: Number, required: true },
    percentVested: { type: Number, required: true },
    isMilestone: { type: Boolean },
    milestoneDescription: { type: String },
  },
  { _id: false }
);

const exerciseEventSchema = new Schema<IExerciseEvent>(
  {
    date: { type: Date, required: true },
    sharesExercised: { type: Number, required: true, min: 0 },
    pricePerShare: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String },
    capTableEntryId: { type: Schema.Types.ObjectId, ref: 'CapTableEntry' },
    notes: { type: String },
  },
  { timestamps: true }
);

const accelerationClauseSchema = new Schema<IAccelerationClause>(
  {
    singleTrigger: { type: Boolean },
    doubleTrigger: { type: Boolean },
    accelerationPercent: { type: Number, min: 0, max: 100, default: 100 },
  },
  { _id: false }
);

const esopGrantSchema = new Schema<IESOPGrant>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    pool: {
      type: Schema.Types.ObjectId,
      ref: 'ESOPPool',
      required: true,
    },
    grantee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    granteeName: {
      type: String,
      required: true,
      trim: true,
    },
    granteeEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    grantType: {
      type: String,
      enum: Object.values(GrantType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(GrantStatus),
      default: GrantStatus.DRAFT,
    },
    totalShares: {
      type: Number,
      required: true,
      min: 0,
    },
    vestedShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    unvestedShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    exercisedShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    exercisePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    fairMarketValue: {
      type: Number,
      min: 0,
    },
    grantDate: {
      type: Date,
      required: true,
    },
    vestingSchedule: {
      type: String,
      enum: Object.values(VestingScheduleType),
      default: VestingScheduleType.STANDARD_4Y_1Y_CLIFF,
    },
    vestingStartDate: {
      type: Date,
      required: true,
    },
    vestingMonths: {
      type: Number,
      default: 48,
      min: 1,
    },
    cliffMonths: {
      type: Number,
      default: 12,
      min: 0,
    },
    vestingEvents: [vestingEventSchema],
    exerciseEvents: [exerciseEventSchema],
    expirationDate: {
      type: Date,
    },
    accelerationClause: accelerationClauseSchema,
    boardApprovalDate: {
      type: Date,
    },
    grantAgreementUrl: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: 5000,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
esopGrantSchema.index({ organization: 1, status: 1 });
esopGrantSchema.index({ organization: 1, grantee: 1 });
esopGrantSchema.index({ organization: 1, pool: 1 });
esopGrantSchema.index({ organization: 1, department: 1 });

// Virtual: Exercisable shares
esopGrantSchema.virtual('exercisableShares').get(function () {
  return this.vestedShares - this.exercisedShares;
});

// Virtual: Vesting progress percent
esopGrantSchema.virtual('vestingProgress').get(function () {
  if (this.totalShares === 0) return 0;
  return (this.vestedShares / this.totalShares) * 100;
});

// Pre-save: Calculate unvested
esopGrantSchema.pre('save', function (next) {
  this.unvestedShares = this.totalShares - this.vestedShares;
  next();
});

export const ESOPGrant = mongoose.model<IESOPGrant>('ESOPGrant', esopGrantSchema);
