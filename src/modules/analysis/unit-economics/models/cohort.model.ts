/**
 * Cohort Model
 *
 * Stores customer cohort data for retention and LTV analysis
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { CohortPeriod } from '../../constants';

export interface ICohortRetention {
  periodNumber: number; // 0 = cohort period, 1 = period 1 after, etc.
  activeCustomers: number;
  retentionRate: number;
  revenue: number;
  averageRevenuePerCustomer: number;
}

export interface ICohort extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  cohortPeriod: Date;
  periodType: string;
  customerCount: number;
  initialRevenue: number;
  retention: ICohortRetention[];
  cumulativeRevenue: number;
  averageLTV: number;
  calculatedAt: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICohortModel extends Model<ICohort> {
  findByCohortPeriod(
    organizationId: Types.ObjectId,
    periodType: string,
    cohortPeriod: Date
  ): Promise<ICohort | null>;
  findLatestCohorts(
    organizationId: Types.ObjectId,
    periodType: string,
    limit: number
  ): Promise<ICohort[]>;
}

const cohortRetentionSchema = new Schema<ICohortRetention>(
  {
    periodNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    activeCustomers: {
      type: Number,
      required: true,
      min: 0,
    },
    retentionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    revenue: {
      type: Number,
      required: true,
      min: 0,
    },
    averageRevenuePerCustomer: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const cohortSchema = new Schema<ICohort>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    cohortPeriod: {
      type: Date,
      required: [true, 'Cohort period is required'],
    },
    periodType: {
      type: String,
      required: [true, 'Period type is required'],
      enum: Object.values(CohortPeriod),
    },
    customerCount: {
      type: Number,
      required: true,
      min: 0,
    },
    initialRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    retention: {
      type: [cohortRetentionSchema],
      default: [],
    },
    cumulativeRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageLTV: {
      type: Number,
      default: 0,
      min: 0,
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
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
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
cohortSchema.index({ organization: 1, periodType: 1, cohortPeriod: -1 });
cohortSchema.index({ organization: 1, calculatedAt: -1 });

// Static methods
cohortSchema.statics.findByCohortPeriod = function (
  organizationId: Types.ObjectId,
  periodType: string,
  cohortPeriod: Date
): Promise<ICohort | null> {
  return this.findOne({
    organization: organizationId,
    periodType,
    cohortPeriod,
    isArchived: false,
  });
};

cohortSchema.statics.findLatestCohorts = function (
  organizationId: Types.ObjectId,
  periodType: string,
  limit: number
): Promise<ICohort[]> {
  return this.find({
    organization: organizationId,
    periodType,
    isArchived: false,
  })
    .sort({ cohortPeriod: -1 })
    .limit(limit);
};

export const Cohort = mongoose.model<ICohort, ICohortModel>('Cohort', cohortSchema);

export default Cohort;
