import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { BankTransactionStatus, TRACKING_CONSTANTS } from '../../constants';

export interface IBankTransaction extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  bankAccount: Types.ObjectId;
  amount: number; // Positive = deposit, negative = withdrawal
  date: Date;
  description: string;
  category?: string;
  suggestedCategory?: string;
  status: string;
  matchedTransaction?: Types.ObjectId;
  matchConfidence?: number; // 0-100
  importedAt: Date;
  importBatchId: string;
  rawData?: Record<string, unknown>;
  externalId?: string;
  checksum: string; // MD5 hash for deduplication
  reconciledBy?: Types.ObjectId;
  reconciledAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBankTransactionModel extends Model<IBankTransaction> {
  findUnmatched(organizationId: Types.ObjectId, bankAccountId?: Types.ObjectId): Promise<IBankTransaction[]>;
  findByChecksum(organizationId: Types.ObjectId, checksum: string): Promise<IBankTransaction | null>;
}

const bankTransactionSchema = new Schema<IBankTransaction>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    bankAccount: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    },
    category: {
      type: String,
      trim: true,
    },
    suggestedCategory: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: BankTransactionStatus.UNMATCHED,
      enum: Object.values(BankTransactionStatus),
      index: true,
    },
    matchedTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    matchConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    importedAt: {
      type: Date,
      required: true,
    },
    importBatchId: {
      type: String,
      required: true,
      index: true,
    },
    rawData: {
      type: Schema.Types.Mixed,
    },
    externalId: {
      type: String,
      trim: true,
    },
    checksum: {
      type: String,
      required: true,
      index: true,
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reconciledAt: Date,
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
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.rawData; // Don't expose raw data in JSON
        return ret;
      },
    },
  }
);

// Indexes for efficient queries
bankTransactionSchema.index({ organization: 1, checksum: 1 }, { unique: true });
bankTransactionSchema.index({ organization: 1, bankAccount: 1, date: -1 });
bankTransactionSchema.index({ organization: 1, status: 1, date: -1 });
bankTransactionSchema.index({ bankAccount: 1, status: 1 });

// Static methods
bankTransactionSchema.statics.findUnmatched = function (
  organizationId: Types.ObjectId,
  bankAccountId?: Types.ObjectId
) {
  const filter: Record<string, unknown> = {
    organization: organizationId,
    status: BankTransactionStatus.UNMATCHED,
  };

  if (bankAccountId) {
    filter.bankAccount = bankAccountId;
  }

  return this.find(filter)
    .populate('bankAccount', 'name bankName')
    .sort({ date: -1 });
};

bankTransactionSchema.statics.findByChecksum = function (
  organizationId: Types.ObjectId,
  checksum: string
) {
  return this.findOne({ organization: organizationId, checksum });
};

export const BankTransaction = mongoose.model<IBankTransaction, IBankTransactionModel>(
  'BankTransaction',
  bankTransactionSchema
);
export default BankTransaction;
