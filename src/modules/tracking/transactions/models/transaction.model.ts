import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  TransactionType,
  TransactionStatus,
  TransactionSource,
  PaymentMethod,
  LinkedEntityType,
  TRACKING_CONSTANTS,
} from '../../constants';

export interface ILinkedEntity {
  entityType: string;
  entityId: Types.ObjectId;
}

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  account: Types.ObjectId;
  type: string;
  amount: number;
  date: Date;
  description: string;
  reference?: string;
  category: string;
  paymentMethod?: string;
  status: string;
  source: string;
  linkedEntities: ILinkedEntity[];
  reconciliationDate?: Date;
  reconciledBy?: Types.ObjectId;
  tags?: string[];
  notes?: string;
  attachments?: string[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionModel extends Model<ITransaction> {
  findByOrganization(organizationId: Types.ObjectId): Promise<ITransaction[]>;
  findByAccount(organizationId: Types.ObjectId, accountId: Types.ObjectId): Promise<ITransaction[]>;
}

const linkedEntitySchema = new Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: Object.values(LinkedEntityType),
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false }
);

const transactionSchema = new Schema<ITransaction>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(TransactionType),
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
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
    reference: {
      type: String,
      trim: true,
      maxlength: TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    source: {
      type: String,
      required: true,
      enum: Object.values(TransactionSource),
      default: TransactionSource.MANUAL,
    },
    linkedEntities: [linkedEntitySchema],
    reconciliationDate: Date,
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= TRACKING_CONSTANTS.MAX_TAGS;
        },
        message: `Maximum ${TRACKING_CONSTANTS.MAX_TAGS} tags allowed`,
      },
    },
    notes: {
      type: String,
      maxlength: TRACKING_CONSTANTS.NOTES_MAX_LENGTH,
    },
    attachments: {
      type: [String],
      default: [],
      validate: {
        validator: function (attachments: string[]) {
          return attachments.length <= TRACKING_CONSTANTS.MAX_ATTACHMENTS;
        },
        message: `Maximum ${TRACKING_CONSTANTS.MAX_ATTACHMENTS} attachments allowed`,
      },
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
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    archivedBy: {
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
        return ret;
      },
    },
  }
);

// Compound indexes for common queries
transactionSchema.index({ organization: 1, date: -1 });
transactionSchema.index({ organization: 1, account: 1 });
transactionSchema.index({ organization: 1, type: 1 });
transactionSchema.index({ organization: 1, status: 1 });
transactionSchema.index({ organization: 1, category: 1 });
transactionSchema.index({ organization: 1, source: 1 });
transactionSchema.index({ 'linkedEntities.entityType': 1, 'linkedEntities.entityId': 1 });

// Static methods
transactionSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isArchived: false }).sort({ date: -1 });
};

transactionSchema.statics.findByAccount = function (
  organizationId: Types.ObjectId,
  accountId: Types.ObjectId
) {
  return this.find({
    organization: organizationId,
    account: accountId,
    isArchived: false,
  }).sort({ date: -1 });
};

export const Transaction = mongoose.model<ITransaction, ITransactionModel>(
  'Transaction',
  transactionSchema
);

export default Transaction;
