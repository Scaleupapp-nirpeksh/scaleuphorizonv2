/**
 * Round Model
 *
 * Represents a funding round (Pre-seed, Seed, Series A, etc.)
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  RoundType,
  RoundTypeType,
  RoundStatus,
  RoundStatusType,
  ShareClass,
  ShareClassType,
} from '../../constants';

export interface IRoundTerms {
  liquidationPreference?: number;
  participatingPreferred?: boolean;
  antiDilution?: 'full_ratchet' | 'weighted_average' | 'none';
  boardSeats?: number;
  proRataRights?: boolean;
  informationRights?: boolean;
  votingRights?: string;
  dividends?: string;
  otherTerms?: string;
}

export interface IRoundDocument {
  name: string;
  type: 'term_sheet' | 'sha' | 'ssa' | 'side_letter' | 'other';
  url: string;
  uploadedAt: Date;
}

export interface IRound extends Document {
  organization: Types.ObjectId;
  name: string;
  type: RoundTypeType;
  status: RoundStatusType;
  targetAmount: number;
  raisedAmount: number;
  minimumInvestment?: number;
  pricePerShare?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  shareClass?: ShareClassType;
  newSharesIssued?: number;
  openDate?: Date;
  closeDate?: Date;
  targetCloseDate?: Date;
  leadInvestor?: Types.ObjectId;
  terms?: IRoundTerms;
  documents?: IRoundDocument[];
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roundTermsSchema = new Schema<IRoundTerms>(
  {
    liquidationPreference: { type: Number, min: 0 },
    participatingPreferred: { type: Boolean },
    antiDilution: {
      type: String,
      enum: ['full_ratchet', 'weighted_average', 'none'],
    },
    boardSeats: { type: Number, min: 0 },
    proRataRights: { type: Boolean },
    informationRights: { type: Boolean },
    votingRights: { type: String },
    dividends: { type: String },
    otherTerms: { type: String },
  },
  { _id: false }
);

const roundDocumentSchema = new Schema<IRoundDocument>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['term_sheet', 'sha', 'ssa', 'side_letter', 'other'],
      required: true,
    },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roundSchema = new Schema<IRound>(
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
    type: {
      type: String,
      enum: Object.values(RoundType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RoundStatus),
      default: RoundStatus.PLANNING,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    raisedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minimumInvestment: {
      type: Number,
      min: 0,
    },
    pricePerShare: {
      type: Number,
      min: 0,
    },
    preMoneyValuation: {
      type: Number,
      min: 0,
    },
    postMoneyValuation: {
      type: Number,
      min: 0,
    },
    shareClass: {
      type: String,
      enum: Object.values(ShareClass),
    },
    newSharesIssued: {
      type: Number,
      min: 0,
    },
    openDate: {
      type: Date,
    },
    closeDate: {
      type: Date,
    },
    targetCloseDate: {
      type: Date,
    },
    leadInvestor: {
      type: Schema.Types.ObjectId,
      ref: 'Investor',
    },
    terms: roundTermsSchema,
    documents: [roundDocumentSchema],
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
roundSchema.index({ organization: 1, status: 1 });
roundSchema.index({ organization: 1, type: 1 });
roundSchema.index({ organization: 1, createdAt: -1 });

// Virtual: percent raised
roundSchema.virtual('percentRaised').get(function () {
  if (this.targetAmount === 0) return 0;
  return (this.raisedAmount / this.targetAmount) * 100;
});

// Virtual: is active
roundSchema.virtual('isActive').get(function () {
  return this.status === RoundStatus.ACTIVE;
});

// Pre-save: Calculate post-money if pre-money and raised are set
roundSchema.pre('save', function (next) {
  if (this.preMoneyValuation && this.raisedAmount) {
    this.postMoneyValuation = this.preMoneyValuation + this.raisedAmount;
  }
  next();
});

export const Round = mongoose.model<IRound>('Round', roundSchema);
