import { Schema, Types, SchemaOptions, Document } from 'mongoose';

/**
 * Base schema options applied to all schemas
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
  },
};

/**
 * Organization reference field - adds multi-tenancy support
 */
export const organizationField = {
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
};

/**
 * Created by field - tracks who created the document
 */
export const createdByField = {
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
};

/**
 * Updated by field - tracks who last updated the document
 */
export const updatedByField = {
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
};

/**
 * Soft delete fields
 */
export const softDeleteFields = {
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  archivedAt: {
    type: Date,
  },
  archivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
};

/**
 * Status field with common statuses
 */
export const statusField = (defaultStatus: string = 'active') => ({
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'archived'],
    default: defaultStatus,
    index: true,
  },
});

/**
 * Add common fields to a schema
 */
export const addCommonFields = (schema: Schema): void => {
  schema.add(organizationField);
  schema.add(createdByField);
  schema.add(updatedByField);
  schema.add(softDeleteFields);
};

/**
 * Add organization scope query helper
 */
export const addOrganizationScope = <T extends Document>(
  schema: Schema<T>
): void => {
  // Add a pre-find hook that filters by organization
  schema.pre('find', function (next) {
    // Only add filter if not already present
    const query = this.getQuery();
    if (!query.organization) {
      // If no organization filter, we might want to throw an error
      // For now, we'll just let it through
    }
    next();
  });
};

/**
 * Add soft delete methods to schema
 */
export const addSoftDelete = <T extends Document>(
  schema: Schema<T>
): void => {
  // Add archive method
  schema.methods.archive = async function (userId: Types.ObjectId) {
    this.isArchived = true;
    this.archivedAt = new Date();
    this.archivedBy = userId;
    await this.save();
  };

  // Add restore method
  schema.methods.restore = async function () {
    this.isArchived = false;
    this.archivedAt = undefined;
    this.archivedBy = undefined;
    await this.save();
  };

  // Add static method to find non-archived documents
  schema.statics.findActive = function (query = {}) {
    return this.find({ ...query, isArchived: false });
  };
};

/**
 * Create base schema with common configuration
 */
export const createBaseSchema = (
  definition: Record<string, unknown>,
  options: SchemaOptions = {}
): Schema => {
  const schema = new Schema(definition, {
    ...baseSchemaOptions,
    ...options,
  });

  return schema;
};

/**
 * Create organization-scoped schema
 */
export const createOrgScopedSchema = (
  definition: Record<string, unknown>,
  options: SchemaOptions = {}
): Schema => {
  const schema = createBaseSchema(
    {
      ...definition,
      ...organizationField,
      ...createdByField,
      ...updatedByField,
      ...softDeleteFields,
    },
    options
  );

  addSoftDelete(schema as Schema<Document>);

  return schema;
};

export default {
  baseSchemaOptions,
  organizationField,
  createdByField,
  updatedByField,
  softDeleteFields,
  statusField,
  addCommonFields,
  addOrganizationScope,
  addSoftDelete,
  createBaseSchema,
  createOrgScopedSchema,
};
