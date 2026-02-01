/**
 * AI Query Model
 *
 * Stores history of AI queries for analytics and conversation continuity
 */

import mongoose, { Schema } from 'mongoose';
import { IAIQueryData } from '../types';

const aiQuerySchema = new Schema<IAIQueryData>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      enum: ['copilot', 'categorization', 'document_parser', 'report_generator', 'meeting_intel'],
      index: true,
    },
    queryType: {
      type: String,
      enum: [
        'financial_metric',
        'comparison',
        'trend_analysis',
        'what_if',
        'explanation',
        'recommendation',
        'general',
        // Meeting intelligence types
        'summary',
        'prep_brief',
        'action_items',
        'follow_up',
        'research',
        // Document parser types
        'parse',
        'detect',
        // Report types
        'report',
      ],
    },
    input: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
    },
    processingTimeMs: {
      type: Number,
      required: true,
      default: 0,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      wasHelpful: Boolean,
    },
    conversationId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
aiQuerySchema.index({ organization: 1, createdAt: -1 });
aiQuerySchema.index({ organization: 1, feature: 1, createdAt: -1 });
aiQuerySchema.index({ conversationId: 1, createdAt: 1 });

// TTL index to auto-delete old queries after 90 days
aiQuerySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AIQuery = mongoose.model<IAIQueryData>('AIQuery', aiQuerySchema);
