/**
 * Report Template Model
 *
 * Mongoose schema for reusable report templates
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import { ReportType, ReportTypeType, ReportSection, ReportSectionType } from '../../constants';

// ============ Template Section ============

export interface ITemplateSection {
  type: ReportSectionType;
  title: string;
  order: number;
  defaultContent?: string;
  isRequired: boolean;
}

// ============ Template Interface ============

export interface IReportTemplate extends Document {
  organization: Types.ObjectId;
  name: string;
  description?: string;
  type: ReportTypeType;
  sections: ITemplateSection[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Schemas ============

const TemplateSectionSchema = new Schema<ITemplateSection>(
  {
    type: {
      type: String,
      enum: Object.values(ReportSection),
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    order: { type: Number, required: true },
    defaultContent: String,
    isRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const ReportTemplateSchema = new Schema<IReportTemplate>(
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
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
    },
    sections: [TemplateSectionSchema],
    isDefault: {
      type: Boolean,
      default: false,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============ Indexes ============

ReportTemplateSchema.index({ organization: 1, type: 1 });
ReportTemplateSchema.index({ organization: 1, isDefault: 1 });

// ============ Pre-save Middleware ============

ReportTemplateSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await ReportTemplate.updateMany(
      {
        organization: this.organization,
        type: this.type,
        _id: { $ne: this._id },
        isDefault: true,
      },
      { isDefault: false }
    );
  }
  next();
});

// ============ Export ============

export const ReportTemplate = mongoose.model<IReportTemplate>('ReportTemplate', ReportTemplateSchema);
