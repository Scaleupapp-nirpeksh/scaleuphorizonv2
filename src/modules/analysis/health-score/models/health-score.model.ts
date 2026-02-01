/**
 * Health Score Model
 *
 * Stores historical health score snapshots for tracking over time
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import {
  HealthCategory,
  HealthStatus,
  RecommendationPriority,
  RecommendationCategory,
  ANALYSIS_CONSTANTS,
} from '../../constants';

export interface IHealthCategoryScore {
  category: string;
  score: number;
  weight: number;
  weightedScore: number;
  status: string;
}

export interface IHealthRecommendation {
  category: string;
  priority: string;
  title: string;
  description: string;
  potentialImpact?: string;
  actionItems?: string[];
}

export interface IHealthScore extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  calculatedAt: Date;
  overallScore: number;
  overallStatus: string;
  categoryScores: IHealthCategoryScore[];
  recommendations: IHealthRecommendation[];
  metadata?: {
    calculationVersion: string;
    dataPointsUsed: number;
    confidenceLevel: number;
  };
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHealthScoreModel extends Model<IHealthScore> {
  findLatest(organizationId: Types.ObjectId): Promise<IHealthScore | null>;
  findHistory(organizationId: Types.ObjectId, limit: number): Promise<IHealthScore[]>;
}

const healthCategoryScoreSchema = new Schema<IHealthCategoryScore>(
  {
    category: {
      type: String,
      required: true,
      enum: Object.values(HealthCategory),
    },
    score: {
      type: Number,
      required: true,
      min: ANALYSIS_CONSTANTS.MIN_SCORE,
      max: ANALYSIS_CONSTANTS.MAX_SCORE,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    weightedScore: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(HealthStatus),
    },
  },
  { _id: false }
);

const healthRecommendationSchema = new Schema<IHealthRecommendation>(
  {
    category: {
      type: String,
      required: true,
      enum: Object.values(RecommendationCategory),
    },
    priority: {
      type: String,
      required: true,
      enum: Object.values(RecommendationPriority),
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    potentialImpact: {
      type: String,
      maxlength: 500,
    },
    actionItems: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const healthScoreSchema = new Schema<IHealthScore>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    overallScore: {
      type: Number,
      required: true,
      min: ANALYSIS_CONSTANTS.MIN_SCORE,
      max: ANALYSIS_CONSTANTS.MAX_SCORE,
    },
    overallStatus: {
      type: String,
      required: true,
      enum: Object.values(HealthStatus),
    },
    categoryScores: {
      type: [healthCategoryScoreSchema],
      required: true,
    },
    recommendations: {
      type: [healthRecommendationSchema],
      default: [],
    },
    metadata: {
      calculationVersion: {
        type: String,
        default: '1.0',
      },
      dataPointsUsed: {
        type: Number,
        default: 0,
      },
      confidenceLevel: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
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
healthScoreSchema.index({ organization: 1, calculatedAt: -1 });
healthScoreSchema.index({ organization: 1, overallScore: 1 });

// Static methods
healthScoreSchema.statics.findLatest = function (
  organizationId: Types.ObjectId
): Promise<IHealthScore | null> {
  return this.findOne({
    organization: organizationId,
    isArchived: false,
  }).sort({ calculatedAt: -1 });
};

healthScoreSchema.statics.findHistory = function (
  organizationId: Types.ObjectId,
  limit: number
): Promise<IHealthScore[]> {
  return this.find({
    organization: organizationId,
    isArchived: false,
  })
    .sort({ calculatedAt: -1 })
    .limit(limit);
};

export const HealthScore = mongoose.model<IHealthScore, IHealthScoreModel>(
  'HealthScore',
  healthScoreSchema
);

export default HealthScore;
