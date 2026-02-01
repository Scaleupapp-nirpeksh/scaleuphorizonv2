/**
 * Share Class Model
 *
 * Represents a share class configuration (Common, Preferred, Series A, etc.)
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import { ShareClass, ShareClassType } from '../../constants';

export interface IShareClass extends Document {
  organization: Types.ObjectId;
  name: string;
  class: ShareClassType;
  authorizedShares: number;
  issuedShares: number;
  outstandingShares: number;
  parValue?: number;
  votingRights: number;
  liquidationPreference?: number;
  participatingPreferred?: boolean;
  conversionRatio?: number;
  dividendRate?: number;
  seniority: number; // Order for liquidation preference
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shareClassSchema = new Schema<IShareClass>(
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
    class: {
      type: String,
      enum: Object.values(ShareClass),
      required: true,
    },
    authorizedShares: {
      type: Number,
      required: true,
      min: 0,
    },
    issuedShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingShares: {
      type: Number,
      default: 0,
      min: 0,
    },
    parValue: {
      type: Number,
      min: 0,
    },
    votingRights: {
      type: Number,
      default: 1, // 1 vote per share
      min: 0,
    },
    liquidationPreference: {
      type: Number,
      min: 0,
    },
    participatingPreferred: {
      type: Boolean,
      default: false,
    },
    conversionRatio: {
      type: Number,
      min: 0,
    },
    dividendRate: {
      type: Number,
      min: 0,
    },
    seniority: {
      type: Number,
      default: 0,
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
shareClassSchema.index({ organization: 1, class: 1 }, { unique: true });
shareClassSchema.index({ organization: 1, seniority: 1 });

// Virtual: Available shares
shareClassSchema.virtual('availableShares').get(function () {
  return this.authorizedShares - this.issuedShares;
});

// Virtual: Percent issued
shareClassSchema.virtual('percentIssued').get(function () {
  if (this.authorizedShares === 0) return 0;
  return (this.issuedShares / this.authorizedShares) * 100;
});

export const ShareClassModel = mongoose.model<IShareClass>(
  'ShareClass',
  shareClassSchema
);
