import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { TRACKING_CONSTANTS } from '../../constants';

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface IVendor extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: IAddress;
  taxId?: string;
  paymentTerms?: string;
  defaultAccount?: Types.ObjectId;
  totalSpent: number;
  expenseCount: number;
  lastExpenseDate?: Date;
  contactName?: string;
  website?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendorModel extends Model<IVendor> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IVendor[]>;
  findActiveByOrganization(organizationId: Types.ObjectId): Promise<IVendor[]>;
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

const vendorSchema = new Schema<IVendor>(
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
    address: addressSchema,
    taxId: {
      type: String,
      trim: true,
      maxlength: TRACKING_CONSTANTS.TAX_ID_MAX_LENGTH,
    },
    paymentTerms: {
      type: String,
      trim: true,
      maxlength: TRACKING_CONSTANTS.PAYMENT_TERMS_MAX_LENGTH,
    },
    defaultAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    expenseCount: {
      type: Number,
      default: 0,
    },
    lastExpenseDate: Date,
    contactName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200,
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
vendorSchema.index({ organization: 1, name: 1 }, { unique: true });
vendorSchema.index({ organization: 1, isActive: 1 });
vendorSchema.index({ organization: 1, email: 1 });

// Static methods
vendorSchema.statics.findByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId }).sort({ name: 1 });
};

vendorSchema.statics.findActiveByOrganization = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isActive: true }).sort({ name: 1 });
};

export const Vendor = mongoose.model<IVendor, IVendorModel>('Vendor', vendorSchema);

export default Vendor;
