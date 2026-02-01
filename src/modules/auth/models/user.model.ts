import { model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { createBaseSchema } from '@/core/database';

/**
 * User document interface
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;

  // Virtual
  fullName: string;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  changedPasswordAfter(timestamp: number): boolean;
}

/**
 * User schema definition
 */
const userSchemaDefinition = {
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  avatar: {
    type: String,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastLoginAt: {
    type: Date,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  emailVerificationToken: {
    type: String,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    select: false,
  },
  refreshTokens: {
    type: [String],
    select: false,
    default: [],
  },
};

const userSchema = createBaseSchema(userSchemaDefinition);

/**
 * Virtual for full name
 */
userSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Pre-save hook to hash password
 */
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) {
    return next();
  }

  // Hash password with cost of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password as string, salt);

  // Update passwordChangedAt if not a new document
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000); // 1 second in the past
  }

  next();
});

/**
 * Instance method to compare password
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance method to check if password was changed after token was issued
 */
userSchema.methods.changedPasswordAfter = function (
  this: IUser,
  timestamp: number
): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(
      this.passwordChangedAt.getTime() / 1000
    );
    return timestamp < changedTimestamp;
  }
  return false;
};

/**
 * Static method to find by email (includes password for auth)
 */
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Index for email verification token lookup
 */
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });

/**
 * Index for password reset token lookup
 */
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

export const User = model<IUser>('User', userSchema);

export default User;
