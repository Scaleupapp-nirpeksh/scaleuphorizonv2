/**
 * Cap Table Entry Model
 *
 * Represents a single ownership entry in the cap table
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  ShareClass,
  ShareClassType,
  ShareholderType,
  ShareholderTypeType,
  CapTableEntryType,
  CapTableEntryTypeType,
} from '../../constants';

export interface ICapTableEntry extends Document {
  organization: Types.ObjectId;
  shareholder: Types.ObjectId;
  shareholderType: ShareholderTypeType;
  shareholderName: string;
  shareClass: ShareClassType;
  entryType: CapTableEntryTypeType;
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
  percentOwnership: number;
  round?: Types.ObjectId;
  grantId?: Types.ObjectId;
  effectiveDate: Date;
  certificateNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const capTableEntrySchema = new Schema<ICapTableEntry>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    shareholder: {
      type: Schema.Types.ObjectId,
      refPath: 'shareholderType',
      required: true,
    },
    shareholderType: {
      type: String,
      enum: Object.values(ShareholderType),
      required: true,
    },
    shareholderName: {
      type: String,
      required: true,
      trim: true,
    },
    shareClass: {
      type: String,
      enum: Object.values(ShareClass),
      required: true,
    },
    entryType: {
      type: String,
      enum: Object.values(CapTableEntryType),
      required: true,
    },
    shares: {
      type: Number,
      required: true,
    },
    pricePerShare: {
      type: Number,
      min: 0,
    },
    totalValue: {
      type: Number,
      min: 0,
    },
    percentOwnership: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    round: {
      type: Schema.Types.ObjectId,
      ref: 'Round',
    },
    grantId: {
      type: Schema.Types.ObjectId,
      ref: 'ESOPGrant',
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    certificateNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      maxlength: 2000,
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
capTableEntrySchema.index({ organization: 1, shareholder: 1 });
capTableEntrySchema.index({ organization: 1, shareClass: 1 });
capTableEntrySchema.index({ organization: 1, effectiveDate: -1 });
capTableEntrySchema.index({ organization: 1, round: 1 });

// Pre-save: Calculate total value
capTableEntrySchema.pre('save', function (next) {
  if (this.pricePerShare && this.shares) {
    this.totalValue = this.pricePerShare * Math.abs(this.shares);
  }
  next();
});

export const CapTableEntry = mongoose.model<ICapTableEntry>(
  'CapTableEntry',
  capTableEntrySchema
);
