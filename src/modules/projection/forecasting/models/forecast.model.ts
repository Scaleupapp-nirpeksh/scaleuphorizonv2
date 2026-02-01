import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  ForecastType,
  ForecastMethod,
  ForecastConfidence,
  ForecastStatus,
  ForecastTypeType,
  ForecastMethodType,
  ForecastConfidenceType,
  ForecastStatusType,
} from '../../constants';

/**
 * Forecast Data Point Interface
 */
export interface IForecastDataPoint {
  period: Date;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: ForecastConfidenceType;
}

/**
 * Forecast Document Interface
 */
export interface IForecast extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  type: ForecastTypeType;
  method: ForecastMethodType;
  status: ForecastStatusType;
  // Period configuration
  historicalMonths: number;
  forecastMonths: number;
  startDate: Date;
  endDate: Date;
  // Optional account filter
  account?: Types.ObjectId;
  accountName?: string;
  // Data points
  dataPoints: IForecastDataPoint[];
  // Accuracy metrics
  accuracy?: number; // R-squared or similar
  mape?: number; // Mean Absolute Percentage Error
  rmse?: number; // Root Mean Square Error
  // Trend analysis
  trend: 'increasing' | 'decreasing' | 'stable';
  trendSlope?: number;
  seasonality?: 'detected' | 'not_detected';
  seasonalPattern?: string;
  // Summary values
  totalHistorical: number;
  totalForecast: number;
  averageGrowthRate: number;
  // Custom assumptions
  customAssumptions?: Record<string, number>;
  // Metadata
  lastTrainedAt?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Forecast Model Interface
 */
export interface IForecastModel extends Model<IForecast> {
  findByOrganization(organizationId: Types.ObjectId, type?: ForecastTypeType): Promise<IForecast[]>;
  findActiveForecast(
    organizationId: Types.ObjectId,
    type: ForecastTypeType
  ): Promise<IForecast | null>;
}

/**
 * Forecast Data Point Schema
 */
const forecastDataPointSchema = new Schema<IForecastDataPoint>(
  {
    period: { type: Date, required: true },
    actual: { type: Number },
    predicted: { type: Number, required: true },
    lowerBound: { type: Number, required: true },
    upperBound: { type: Number, required: true },
    confidence: {
      type: String,
      enum: Object.values(ForecastConfidence),
      required: true,
    },
  },
  { _id: false }
);

/**
 * Forecast Schema
 */
const forecastSchema = new Schema<IForecast>(
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
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: Object.values(ForecastType),
      required: true,
    },
    method: {
      type: String,
      enum: Object.values(ForecastMethod),
      required: true,
      default: ForecastMethod.LINEAR,
    },
    status: {
      type: String,
      enum: Object.values(ForecastStatus),
      default: ForecastStatus.DRAFT,
    },
    historicalMonths: {
      type: Number,
      required: true,
      min: 3,
      max: 60,
    },
    forecastMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 36,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    accountName: String,
    dataPoints: [forecastDataPointSchema],
    accuracy: { type: Number, min: 0, max: 100 },
    mape: { type: Number, min: 0 },
    rmse: { type: Number, min: 0 },
    trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      required: true,
    },
    trendSlope: Number,
    seasonality: {
      type: String,
      enum: ['detected', 'not_detected'],
    },
    seasonalPattern: String,
    totalHistorical: { type: Number, default: 0 },
    totalForecast: { type: Number, default: 0 },
    averageGrowthRate: { type: Number, default: 0 },
    customAssumptions: {
      type: Map,
      of: Number,
    },
    lastTrainedAt: Date,
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
forecastSchema.index({ organization: 1, type: 1 });
forecastSchema.index({ organization: 1, status: 1 });
forecastSchema.index({ organization: 1, isArchived: 1 });

// Static methods
forecastSchema.statics.findByOrganization = function (
  organizationId: Types.ObjectId,
  type?: ForecastTypeType
) {
  const query: Record<string, unknown> = {
    organization: organizationId,
    isArchived: false,
  };
  if (type) {
    query.type = type;
  }
  return this.find(query).sort({ createdAt: -1 });
};

forecastSchema.statics.findActiveForecast = function (
  organizationId: Types.ObjectId,
  type: ForecastTypeType
) {
  return this.findOne({
    organization: organizationId,
    type,
    status: ForecastStatus.ACTIVE,
    isArchived: false,
  });
};

export const Forecast = mongoose.model<IForecast, IForecastModel>('Forecast', forecastSchema);
