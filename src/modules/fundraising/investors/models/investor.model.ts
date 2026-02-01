/**
 * Investor Model
 *
 * Represents an investor with their investment tranches
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  InvestorType,
  InvestorTypeType,
  InvestorStatus,
  InvestorStatusType,
  TrancheStatus,
  TrancheStatusType,
  ShareClass,
  ShareClassType,
} from '../../constants';

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface IContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
}

export interface ITranche extends Document {
  round?: Types.ObjectId;
  amount: number;
  scheduledDate: Date;
  receivedDate?: Date;
  status: TrancheStatusType;
  shareClass?: ShareClassType;
  sharesIssued?: number;
  pricePerShare?: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IInvestorDocument {
  name: string;
  type: 'kyc' | 'agreement' | 'consent' | 'other';
  url: string;
  uploadedAt: Date;
}

export interface IInvestor extends Document {
  organization: Types.ObjectId;
  name: string;
  type: InvestorTypeType;
  status: InvestorStatusType;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: IAddress;
  contactPerson?: IContactPerson;
  linkedRound?: Types.ObjectId;
  totalCommitted: number;
  totalInvested: number;
  sharesOwned: number;
  ownershipPercent: number;
  tranches: Types.DocumentArray<ITranche>;
  notes?: string;
  tags?: string[];
  documents?: IInvestorDocument[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  recalculateTotals(): void;
}

const addressSchema = new Schema<IAddress>(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const contactPersonSchema = new Schema<IContactPerson>(
  {
    name: { type: String, required: true },
    title: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  { _id: false }
);

const trancheSchema = new Schema<ITranche>(
  {
    round: {
      type: Schema.Types.ObjectId,
      ref: 'Round',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    receivedDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(TrancheStatus),
      default: TrancheStatus.SCHEDULED,
    },
    shareClass: {
      type: String,
      enum: Object.values(ShareClass),
    },
    sharesIssued: {
      type: Number,
      min: 0,
    },
    pricePerShare: {
      type: Number,
      min: 0,
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
  }
);

const investorDocumentSchema = new Schema<IInvestorDocument>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['kyc', 'agreement', 'consent', 'other'],
      required: true,
    },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const investorSchema = new Schema<IInvestor>(
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
      maxlength: 200,
    },
    type: {
      type: String,
      enum: Object.values(InvestorType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(InvestorStatus),
      default: InvestorStatus.PROSPECT,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: addressSchema,
    contactPerson: contactPersonSchema,
    linkedRound: {
      type: Schema.Types.ObjectId,
      ref: 'Round',
    },
    totalCommitted: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInvested: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharesOwned: {
      type: Number,
      default: 0,
      min: 0,
    },
    ownershipPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tranches: [trancheSchema],
    notes: {
      type: String,
      maxlength: 5000,
    },
    tags: [{ type: String }],
    documents: [investorDocumentSchema],
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
investorSchema.index({ organization: 1, status: 1 });
investorSchema.index({ organization: 1, type: 1 });
investorSchema.index({ organization: 1, linkedRound: 1 });
investorSchema.index({ organization: 1, name: 'text' });

// Virtual: pending amount
investorSchema.virtual('pendingAmount').get(function () {
  return this.totalCommitted - this.totalInvested;
});

// Method: Recalculate totals from tranches
investorSchema.methods.recalculateTotals = function () {
  const tranches = this.tranches || [];

  this.totalCommitted = tranches.reduce((sum: number, t: ITranche) => sum + (t.amount || 0), 0);

  this.totalInvested = tranches
    .filter((t: ITranche) => t.status === TrancheStatus.RECEIVED)
    .reduce((sum: number, t: ITranche) => sum + (t.amount || 0), 0);

  this.sharesOwned = tranches
    .filter((t: ITranche) => t.status === TrancheStatus.RECEIVED)
    .reduce((sum: number, t: ITranche) => sum + (t.sharesIssued || 0), 0);
};

// Pre-save: Update status based on tranches
investorSchema.pre('save', function (next) {
  if (this.tranches && this.tranches.length > 0) {
    const hasReceived = this.tranches.some(
      (t: ITranche) => t.status === TrancheStatus.RECEIVED
    );
    const allReceived = this.tranches.every(
      (t: ITranche) => t.status === TrancheStatus.RECEIVED || t.status === TrancheStatus.CANCELLED
    );

    if (allReceived && hasReceived) {
      this.status = InvestorStatus.INVESTED;
    } else if (hasReceived) {
      this.status = InvestorStatus.COMMITTED;
    }
  }
  next();
});

export const Investor = mongoose.model<IInvestor>('Investor', investorSchema);
