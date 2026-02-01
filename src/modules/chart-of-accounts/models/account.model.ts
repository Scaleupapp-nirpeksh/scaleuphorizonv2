import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { AccountType, AccountSubtype, AccountTypes, AccountSubtypes } from '../constants';

/**
 * Account document interface
 */
export interface IAccount extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  subtype: AccountSubtype;
  parent?: Types.ObjectId;
  isSystem: boolean;
  isActive: boolean;
  depth: number;
  path: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Account with populated parent
 */
export interface IAccountPopulated extends Omit<IAccount, 'parent'> {
  parent?: IAccount;
}

/**
 * Account tree node for hierarchical representation
 */
export interface IAccountTreeNode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  subtype: AccountSubtype;
  isSystem: boolean;
  isActive: boolean;
  depth: number;
  children: IAccountTreeNode[];
}

/**
 * Account model static methods
 */
export interface IAccountModel extends Model<IAccount> {
  findByOrganization(organizationId: Types.ObjectId): Promise<IAccount[]>;
  findByCode(organizationId: Types.ObjectId, code: string): Promise<IAccount | null>;
  getTree(organizationId: Types.ObjectId): Promise<IAccountTreeNode[]>;
  getNextCode(organizationId: Types.ObjectId, type: AccountType): Promise<string>;
}

const accountSchema = new Schema<IAccount>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Account code is required'],
      trim: true,
      maxlength: [20, 'Account code cannot exceed 20 characters'],
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [100, 'Account name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      required: [true, 'Account type is required'],
      enum: {
        values: Object.values(AccountTypes),
        message: 'Invalid account type: {VALUE}',
      },
    },
    subtype: {
      type: String,
      required: [true, 'Account subtype is required'],
      enum: {
        values: Object.values(AccountSubtypes),
        message: 'Invalid account subtype: {VALUE}',
      },
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    depth: {
      type: Number,
      default: 0,
      min: [0, 'Depth cannot be negative'],
      max: [5, 'Maximum depth of 5 levels allowed'],
    },
    path: {
      type: String,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy is required'],
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
    toObject: {
      virtuals: true,
    },
  }
);

// Compound index for unique code per organization
accountSchema.index({ organization: 1, code: 1 }, { unique: true });

// Index for tree queries
accountSchema.index({ organization: 1, parent: 1 });
accountSchema.index({ organization: 1, type: 1 });
accountSchema.index({ organization: 1, path: 1 });

/**
 * Pre-save hook to calculate depth and path
 */
accountSchema.pre('save', async function (next) {
  if (this.isModified('parent') || this.isNew) {
    if (this.parent) {
      const parentAccount = await mongoose
        .model<IAccount>('Account')
        .findById(this.parent);
      if (parentAccount) {
        this.depth = parentAccount.depth + 1;
        this.path = parentAccount.path
          ? `${parentAccount.path}.${parentAccount._id}`
          : parentAccount._id.toString();
      }
    } else {
      this.depth = 0;
      this.path = '';
    }
  }
  next();
});

/**
 * Static method: Find all accounts for an organization
 */
accountSchema.statics.findByOrganization = function (
  organizationId: Types.ObjectId
): Promise<IAccount[]> {
  return this.find({ organization: organizationId, isActive: true }).sort({ code: 1 });
};

/**
 * Static method: Find account by code within organization
 */
accountSchema.statics.findByCode = function (
  organizationId: Types.ObjectId,
  code: string
): Promise<IAccount | null> {
  return this.findOne({ organization: organizationId, code });
};

/**
 * Static method: Get hierarchical tree of accounts
 */
accountSchema.statics.getTree = async function (
  organizationId: Types.ObjectId
): Promise<IAccountTreeNode[]> {
  const accounts = await this.find({
    organization: organizationId,
    isActive: true,
  }).sort({ code: 1 });

  // Build tree from flat list
  const accountMap = new Map<string, IAccountTreeNode>();
  const roots: IAccountTreeNode[] = [];

  // First pass: create nodes
  for (const account of accounts) {
    const node: IAccountTreeNode = {
      id: account._id.toString(),
      code: account.code,
      name: account.name,
      description: account.description,
      type: account.type,
      subtype: account.subtype,
      isSystem: account.isSystem,
      isActive: account.isActive,
      depth: account.depth,
      children: [],
    };
    accountMap.set(account._id.toString(), node);
  }

  // Second pass: build tree
  for (const account of accounts) {
    const node = accountMap.get(account._id.toString())!;
    if (account.parent) {
      const parentNode = accountMap.get(account.parent.toString());
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
};

/**
 * Static method: Get next available code for account type
 */
accountSchema.statics.getNextCode = async function (
  organizationId: Types.ObjectId,
  type: AccountType
): Promise<string> {
  const { AccountCodeRanges } = await import('../constants');
  const range = AccountCodeRanges[type];

  // Find the highest code in this range
  const lastAccount = await this.findOne({
    organization: organizationId,
    code: { $gte: range.start.toString(), $lte: range.end.toString() },
  })
    .sort({ code: -1 })
    .select('code');

  if (!lastAccount) {
    return range.start.toString();
  }

  const lastCode = parseInt(lastAccount.code, 10);
  const nextCode = lastCode + 10; // Increment by 10 for flexibility

  if (nextCode > range.end) {
    throw new Error(`No more codes available for account type: ${type}`);
  }

  return nextCode.toString();
};

export const Account = mongoose.model<IAccount, IAccountModel>('Account', accountSchema);

export default Account;
