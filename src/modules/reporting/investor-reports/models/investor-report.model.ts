/**
 * Investor Report Model
 *
 * Mongoose schema for investor update reports
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  ReportType,
  ReportTypeType,
  ReportStatus,
  ReportStatusType,
  ReportSection,
  ReportSectionType,
} from '../../constants';

// ============ Section Subdocument ============

export interface ISectionMetric {
  name: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'currency' | 'percentage' | 'number';
}

export interface ISectionChart {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: { label: string; value: number; category?: string }[];
}

export interface IReportSection extends Document {
  type: ReportSectionType;
  title: string;
  order: number;
  content: string;
  metrics?: ISectionMetric[];
  charts?: ISectionChart[];
  isVisible: boolean;
}

// ============ Recipient Subdocument ============

export interface IReportRecipient {
  investorId?: Types.ObjectId;
  email: string;
  name: string;
  sentAt?: Date;
  viewedAt?: Date;
  viewCount: number;
}

// ============ Report Metrics ============

export interface IReportMetrics {
  mrr?: number;
  arr?: number;
  runway?: number;
  burnRate?: number;
  cashBalance?: number;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  headcount?: number;
  customers?: number;
  churnRate?: number;
  customMetrics?: Record<string, number | string>;
}

// ============ Reporting Period ============

export interface IReportingPeriod {
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  year: number;
  month?: number;
  quarter?: number;
  startDate?: Date;
  endDate?: Date;
}

// ============ Report Attachment ============

export interface IReportAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

// ============ Main Report Interface ============

export interface IInvestorReport extends Document {
  organization: Types.ObjectId;
  title: string;
  type: ReportTypeType;
  status: ReportStatusType;
  reportingPeriod: IReportingPeriod;
  sections: Types.DocumentArray<IReportSection>;
  recipients: IReportRecipient[];
  metrics: IReportMetrics;
  attachments?: IReportAttachment[];
  sentAt?: Date;
  sentBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Schemas ============

const SectionMetricSchema = new Schema<ISectionMetric>(
  {
    name: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    previousValue: Schema.Types.Mixed,
    change: Number,
    changeType: { type: String, enum: ['increase', 'decrease', 'neutral'] },
    format: { type: String, enum: ['currency', 'percentage', 'number'] },
  },
  { _id: false }
);

const SectionChartSchema = new Schema<ISectionChart>(
  {
    type: { type: String, enum: ['line', 'bar', 'pie', 'area'], required: true },
    title: { type: String, required: true },
    data: [
      {
        label: { type: String, required: true },
        value: { type: Number, required: true },
        category: String,
      },
    ],
  },
  { _id: false }
);

const ReportSectionSchema = new Schema<IReportSection>(
  {
    type: {
      type: String,
      enum: Object.values(ReportSection),
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    order: { type: Number, required: true },
    content: { type: String, default: '' },
    metrics: [SectionMetricSchema],
    charts: [SectionChartSchema],
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: false }
);

const ReportRecipientSchema = new Schema<IReportRecipient>(
  {
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor' },
    email: { type: String, required: true },
    name: { type: String, required: true },
    sentAt: Date,
    viewedAt: Date,
    viewCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ReportingPeriodSchema = new Schema<IReportingPeriod>(
  {
    type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'custom'],
      required: true,
    },
    year: { type: Number, required: true },
    month: { type: Number, min: 1, max: 12 },
    quarter: { type: Number, min: 1, max: 4 },
    startDate: Date,
    endDate: Date,
  },
  { _id: false }
);

const ReportAttachmentSchema = new Schema<IReportAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReportMetricsSchema = new Schema<IReportMetrics>(
  {
    mrr: Number,
    arr: Number,
    runway: Number,
    burnRate: Number,
    cashBalance: Number,
    revenue: Number,
    expenses: Number,
    netIncome: Number,
    headcount: Number,
    customers: Number,
    churnRate: Number,
    customMetrics: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: false }
);

// ============ Main Schema ============

const InvestorReportSchema = new Schema<IInvestorReport>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.DRAFT,
    },
    reportingPeriod: {
      type: ReportingPeriodSchema,
      required: true,
    },
    sections: [ReportSectionSchema],
    recipients: [ReportRecipientSchema],
    metrics: {
      type: ReportMetricsSchema,
      default: {},
    },
    attachments: [ReportAttachmentSchema],
    sentAt: Date,
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    viewCount: { type: Number, default: 0 },
    lastViewedAt: Date,
    notes: { type: String, maxlength: 2000 },
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

InvestorReportSchema.index({ organization: 1, type: 1 });
InvestorReportSchema.index({ organization: 1, status: 1 });
InvestorReportSchema.index({ organization: 1, 'reportingPeriod.year': 1, 'reportingPeriod.month': 1 });
InvestorReportSchema.index({ organization: 1, createdAt: -1 });

// ============ Export ============

export const InvestorReport = mongoose.model<IInvestorReport>('InvestorReport', InvestorReportSchema);
