/**
 * Dashboard Model
 *
 * Mongoose schema for customizable dashboards with widgets
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  DashboardType,
  DashboardTypeType,
  WidgetType,
  WidgetTypeType,
  WidgetDataSource,
  WidgetDataSourceType,
  RefreshInterval,
  RefreshIntervalType,
} from '../../constants';

// ============ Widget Subdocument Interface ============

export interface IWidgetPosition {
  row: number;
  column: number;
  width: number;
  height: number;
}

export interface ITimeRange {
  type: 'relative' | 'absolute';
  relativeValue?: number;
  relativeUnit?: 'days' | 'weeks' | 'months' | 'quarters' | 'years';
  startDate?: Date;
  endDate?: Date;
}

export interface IWidgetConfig {
  title?: string;
  subtitle?: string;
  timeRange?: ITimeRange;
  comparison?: {
    enabled: boolean;
    type: 'previous_period' | 'same_period_last_year' | 'budget' | 'target';
    showPercentChange: boolean;
  };
  visualization?: {
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
    colors?: string[];
    stacked?: boolean;
  };
  customQuery?: string;
  aggregation?: {
    groupBy?: string;
    aggregateFunction: 'sum' | 'avg' | 'count' | 'min' | 'max';
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
  };
  formatting?: {
    numberFormat?: 'currency' | 'percentage' | 'number' | 'compact';
    currency?: string;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
}

export interface IWidgetFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
}

export interface IWidget extends Document {
  name: string;
  type: WidgetTypeType;
  dataSource: WidgetDataSourceType;
  position: IWidgetPosition;
  config: IWidgetConfig;
  filters?: IWidgetFilter[];
  isVisible: boolean;
  createdAt: Date;
}

// ============ Dashboard Interface ============

export interface IDashboardLayout {
  columns: number;
  rows: number;
  gridGap: number;
}

export interface IDashboard extends Document {
  organization: Types.ObjectId;
  name: string;
  description?: string;
  type: DashboardTypeType;
  isDefault: boolean;
  isPublic: boolean;
  layout: IDashboardLayout;
  widgets: Types.DocumentArray<IWidget>;
  refreshInterval: RefreshIntervalType;
  lastRefreshedAt?: Date;
  sharedWith?: Types.ObjectId[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Widget Schema ============

const WidgetPositionSchema = new Schema<IWidgetPosition>(
  {
    row: { type: Number, required: true, min: 0 },
    column: { type: Number, required: true, min: 0 },
    width: { type: Number, required: true, min: 1, max: 12 },
    height: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const TimeRangeSchema = new Schema<ITimeRange>(
  {
    type: { type: String, enum: ['relative', 'absolute'], required: true },
    relativeValue: Number,
    relativeUnit: { type: String, enum: ['days', 'weeks', 'months', 'quarters', 'years'] },
    startDate: Date,
    endDate: Date,
  },
  { _id: false }
);

const WidgetConfigSchema = new Schema<IWidgetConfig>(
  {
    title: String,
    subtitle: String,
    timeRange: TimeRangeSchema,
    comparison: {
      enabled: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ['previous_period', 'same_period_last_year', 'budget', 'target'],
      },
      showPercentChange: { type: Boolean, default: true },
    },
    visualization: {
      showLegend: { type: Boolean, default: true },
      showGrid: { type: Boolean, default: true },
      showLabels: { type: Boolean, default: true },
      colors: [String],
      stacked: { type: Boolean, default: false },
    },
    customQuery: String,
    aggregation: {
      groupBy: String,
      aggregateFunction: {
        type: String,
        enum: ['sum', 'avg', 'count', 'min', 'max'],
        default: 'sum',
      },
      orderBy: String,
      orderDirection: { type: String, enum: ['asc', 'desc'], default: 'desc' },
      limit: Number,
    },
    formatting: {
      numberFormat: { type: String, enum: ['currency', 'percentage', 'number', 'compact'] },
      currency: { type: String, default: 'USD' },
      decimals: { type: Number, default: 2 },
      prefix: String,
      suffix: String,
    },
  },
  { _id: false }
);

const WidgetFilterSchema = new Schema<IWidgetFilter>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains'],
      required: true,
    },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const WidgetSchema = new Schema<IWidget>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: Object.values(WidgetType),
      required: true,
    },
    dataSource: {
      type: String,
      enum: Object.values(WidgetDataSource),
      required: true,
    },
    position: { type: WidgetPositionSchema, required: true },
    config: { type: WidgetConfigSchema, default: {} },
    filters: [WidgetFilterSchema],
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ============ Dashboard Schema ============

const DashboardLayoutSchema = new Schema<IDashboardLayout>(
  {
    columns: { type: Number, default: 12, min: 1, max: 24 },
    rows: { type: Number, default: 12, min: 1 },
    gridGap: { type: Number, default: 16, min: 0 },
  },
  { _id: false }
);

const DashboardSchema = new Schema<IDashboard>(
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
      enum: Object.values(DashboardType),
      default: DashboardType.CUSTOM,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    layout: {
      type: DashboardLayoutSchema,
      default: { columns: 12, rows: 12, gridGap: 16 },
    },
    widgets: [WidgetSchema],
    refreshInterval: {
      type: String,
      enum: Object.values(RefreshInterval),
      default: RefreshInterval.DAILY,
    },
    lastRefreshedAt: Date,
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

DashboardSchema.index({ organization: 1, type: 1 });
DashboardSchema.index({ organization: 1, isDefault: 1 });
DashboardSchema.index({ organization: 1, createdBy: 1 });

// ============ Pre-save Middleware ============

DashboardSchema.pre('save', async function (next) {
  // If setting as default, unset other defaults of same type
  if (this.isDefault && this.isModified('isDefault')) {
    await Dashboard.updateMany(
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

export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);
