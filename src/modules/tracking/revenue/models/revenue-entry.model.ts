import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  RevenueEntryStatus,
  RevenueType,
  PaymentMethod,
  TRACKING_CONSTANTS,
} from '../../constants';

export interface IRevenueEntry extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  account: Types.ObjectId;
  customer?: Types.ObjectId;
  amount: number;
  date: Date;
  description: string;
  category: string;
  invoiceNumber?: string;
  revenueType: string;
  status: string;
  receivedAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  revenueStream?: Types.ObjectId;
  transaction?: Types.ObjectId;
  subscriptionPeriodStart?: Date;
  subscriptionPeriodEnd?: Date;
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

export interface IRevenueEntryModel extends Model<IRevenueEntry> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IRevenueEntry[]>;
  findByCustomer(organizationId: Types.ObjectId, customerId: Types.ObjectId): Promise<IRevenueEntry[]>;
}

const revenueEntrySchema = new Schema<IRevenueEntry>(
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
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
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
    category: {
      type: String,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: TRACKING_CONSTANTS.INVOICE_NUMBER_MAX_LENGTH,
    },
    revenueType: {
      type: String,
      required: true,
      enum: Object.values(RevenueType),
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(RevenueEntryStatus),
      default: RevenueEntryStatus.PENDING,
      index: true,
    },
    receivedAt: Date,
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: TRACKING_CONSTANTS.REFERENCE_MAX_LENGTH,
    },
    revenueStream: {
      type: Schema.Types.ObjectId,
      ref: 'RevenueStream',
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    subscriptionPeriodStart: Date,
    subscriptionPeriodEnd: Date,
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

// Compound indexes
revenueEntrySchema.index({ organization: 1, date: -1 });
revenueEntrySchema.index({ organization: 1, customer: 1 });
revenueEntrySchema.index({ organization: 1, revenueType: 1 });
revenueEntrySchema.index({ organization: 1, status: 1 });
revenueEntrySchema.index({ organization: 1, invoiceNumber: 1 });
revenueEntrySchema.index({ organization: 1, category: 1 });

// Static methods
revenueEntrySchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isArchived: false }).sort({ date: -1 });
};

revenueEntrySchema.statics.findByCustomer = function (
  organizationId: Types.ObjectId,
  customerId: Types.ObjectId
) {
  return this.find({
    organization: organizationId,
    customer: customerId,
    isArchived: false,
  }).sort({ date: -1 });
};

export const RevenueEntry = mongoose.model<IRevenueEntry, IRevenueEntryModel>(
  'RevenueEntry',
  revenueEntrySchema
);

export default RevenueEntry;
