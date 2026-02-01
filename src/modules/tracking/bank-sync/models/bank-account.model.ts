import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { BankAccountType, TRACKING_CONSTANTS } from '../../constants';

export interface IBankAccount extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  bankName: string;
  accountNumber: string; // Last 4 digits only for security
  accountType: string;
  currency: string;
  currentBalance: number;
  lastImportDate?: Date;
  lastImportedBalance?: number;
  linkedAccount?: Types.ObjectId; // Link to CoA asset account
  description?: string;
  notes?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBankAccountModel extends Model<IBankAccount> {
  findActive(organizationId: Types.ObjectId): Promise<IBankAccount[]>;
}

const bankAccountSchema = new Schema<IBankAccount>(
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
    bankName: {
      type: String,
      required: true,
      trim: true,
      maxlength: TRACKING_CONSTANTS.NAME_MAX_LENGTH,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: TRACKING_CONSTANTS.ACCOUNT_NUMBER_DISPLAY_DIGITS,
    },
    accountType: {
      type: String,
      required: true,
      enum: Object.values(BankAccountType),
    },
    currency: {
      type: String,
      default: TRACKING_CONSTANTS.DEFAULT_CURRENCY,
      uppercase: true,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    lastImportDate: Date,
    lastImportedBalance: Number,
    linkedAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    description: {
      type: String,
      maxlength: TRACKING_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    },
    notes: {
      type: String,
      maxlength: TRACKING_CONSTANTS.NOTES_MAX_LENGTH,
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

// Indexes
bankAccountSchema.index({ organization: 1, name: 1 }, { unique: true });
bankAccountSchema.index({ organization: 1, isActive: 1 });

// Static methods
bankAccountSchema.statics.findActive = function (organizationId: Types.ObjectId) {
  return this.find({ organization: organizationId, isActive: true }).sort({ name: 1 });
};

export const BankAccount = mongoose.model<IBankAccount, IBankAccountModel>(
  'BankAccount',
  bankAccountSchema
);
export default BankAccount;
