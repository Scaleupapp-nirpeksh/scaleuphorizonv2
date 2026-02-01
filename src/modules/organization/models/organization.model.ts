import { model, Document, Types, Schema } from 'mongoose';
import { createBaseSchema } from '@/core/database';

/**
 * Organization settings interface
 */
export interface IOrganizationSettings {
  fiscalYearStart: number; // Month (1-12)
  currency: string;
  timezone: string;
  dateFormat: string;
}

/**
 * Organization document interface
 */
export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  foundedYear?: number;
  settings: IOrganizationSettings;
  owner: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default organization settings
 */
const defaultSettings: IOrganizationSettings = {
  fiscalYearStart: 1, // January
  currency: 'USD',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
};

/**
 * Organization schema definition
 */
const organizationSchemaDefinition = {
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  logo: {
    type: String,
  },
  website: {
    type: String,
  },
  industry: {
    type: String,
    enum: [
      'technology',
      'healthcare',
      'finance',
      'education',
      'retail',
      'manufacturing',
      'services',
      'media',
      'real_estate',
      'other',
    ],
  },
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
    default: 'startup',
  },
  foundedYear: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear(),
  },
  settings: {
    fiscalYearStart: {
      type: Number,
      min: 1,
      max: 12,
      default: 1,
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'],
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
      enum: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY'],
    },
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
};

const organizationSchema = createBaseSchema(organizationSchemaDefinition);

/**
 * Pre-validate hook to generate slug from name
 */
organizationSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    // Generate slug from name
    this.slug = (this.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Add random suffix to ensure uniqueness
    this.slug += '-' + Math.random().toString(36).substring(2, 8);
  }
  next();
});

/**
 * Pre-save hook to set default settings
 */
organizationSchema.pre('save', function (next) {
  // Set default settings if not provided
  if (!this.settings) {
    this.settings = defaultSettings;
  }
  next();
});

/**
 * Static method to find by slug
 */
organizationSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug, isActive: true });
};

/**
 * Static method to find by owner
 */
organizationSchema.statics.findByOwner = function (ownerId: Types.ObjectId) {
  return this.find({ owner: ownerId, isActive: true });
};

/**
 * Index for owner lookup
 */
organizationSchema.index({ owner: 1, isActive: 1 });

export const Organization = model<IOrganization>('Organization', organizationSchema);

export default Organization;
