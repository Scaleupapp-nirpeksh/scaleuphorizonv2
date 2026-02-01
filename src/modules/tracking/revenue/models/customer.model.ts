import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { SubscriptionStatus, TRACKING_CONSTANTS } from '../../constants';

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  subscriptionStatus?: string;
  monthlyValue: number;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  totalRevenue: number;
  revenueEntryCount: number;
  firstPurchaseDate?: Date;
  lastPurchaseDate?: Date;
  address?: IAddress;
  contactName?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerModel extends Model<ICustomer> {
  findByOrganization(organizationId: Types.ObjectId): Promise<ICustomer[]>;
  findActiveSubscribers(organizationId: Types.ObjectId): Promise<ICustomer[]>;
}

const addressSchema = new Schema(
  {
    street: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    zipCode: { type: String, maxlength: 20 },
    country: { type: String, maxlength: 100 },
  },
  { _id: false }
);

const customerSchema = new Schema<ICustomer>(
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
      maxlength: TRACKING_CONSTANTS.NAME_MAX_LENGTH,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    subscriptionStatus: {
      type: String,
      enum: Object.values(SubscriptionStatus),
    },
    monthlyValue: {
      type: Number,
      default: 0,
    },
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    totalRevenue: {
      type: Number,
      default: 0,
    },
    revenueEntryCount: {
      type: Number,
      default: 0,
    },
    firstPurchaseDate: Date,
    lastPurchaseDate: Date,
    address: addressSchema,
    contactName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      maxlength: TRACKING_CONSTANTS.NOTES_MAX_LENGTH,
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
    isActive: {
      type: Boolean,
      default: true,
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
customerSchema.index({ organization: 1, name: 1 });
customerSchema.index({ organization: 1, email: 1 });
customerSchema.index({ organization: 1, isActive: 1 });
customerSchema.index({ organization: 1, subscriptionStatus: 1 });

// Static methods
customerSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId }).sort({ name: 1 });
};

customerSchema.statics.findActiveSubscribers = function (organizationId: Types.ObjectId) {
  return this.find({
    organization: organizationId,
    isActive: true,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
  }).sort({ monthlyValue: -1 });
};

export const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);

export default Customer;
