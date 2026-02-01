/**
 * ESOP Pool Model
 *
 * Represents the Employee Stock Option Pool
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import { ShareClass, ShareClassType } from '../../constants';

export interface IESOPPool extends Document {
  organization: Types.ObjectId;
  name: string;
  totalShares: number;
  allocatedShares: number;
  availableShares: number;
  shareClass: ShareClassType;
  percentOfCompany: number;
  createdFromRound?: Types.ObjectId;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const esopPoolSchema = new Schema<IESOPPool>(
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
      default: 'ESOP Pool',
    },
    totalShares: {
      type: Number,
      required: true,
      min: 0,
    },
    allocatedShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareClass: {
      type: String,
      enum: Object.values(ShareClass),
      default: ShareClass.OPTIONS,
    },
    percentOfCompany: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    createdFromRound: {
      type: Schema.Types.ObjectId,
      ref: 'Round',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
esopPoolSchema.index({ organization: 1, isActive: 1 });

// Virtual: Utilization percentage
esopPoolSchema.virtual('utilizationPercent').get(function () {
  if (this.totalShares === 0) return 0;
  return (this.allocatedShares / this.totalShares) * 100;
});

// Pre-save: Calculate available shares
esopPoolSchema.pre('save', function (next) {
  this.availableShares = this.totalShares - this.allocatedShares;
  next();
});

export const ESOPPool = mongoose.model<IESOPPool>('ESOPPool', esopPoolSchema);
