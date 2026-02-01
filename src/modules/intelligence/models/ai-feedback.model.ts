/**
 * AI Feedback Model
 *
 * Stores user feedback on AI suggestions for learning and improvement
 */

import mongoose, { Schema } from 'mongoose';
import { IAIFeedbackData } from '../types';

const aiFeedbackSchema = new Schema<IAIFeedbackData>(
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
    },
    feature: {
      type: String,
      required: true,
      enum: ['copilot', 'categorization', 'document_parser', 'report_generator', 'meeting_intel'],
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      index: true,
    },
    referenceType: {
      type: String,
      required: true,
      enum: ['transaction', 'expense', 'revenue', 'bank_transaction', 'document', 'report', 'meeting'],
    },
    suggestedValue: {
      type: String,
      required: true,
    },
    actualValue: {
      type: String,
      required: true,
    },
    wasCorrect: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for analytics
aiFeedbackSchema.index({ organization: 1, feature: 1, wasCorrect: 1 });
aiFeedbackSchema.index({ feature: 1, createdAt: -1 });

// Virtual for accuracy tracking
aiFeedbackSchema.statics.getAccuracyStats = async function (
  organizationId: string,
  feature?: string
) {
  const match: Record<string, unknown> = { organization: organizationId };
  if (feature) match.feature = feature;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$feature',
        total: { $sum: 1 },
        correct: { $sum: { $cond: ['$wasCorrect', 1, 0] } },
      },
    },
    {
      $project: {
        feature: '$_id',
        total: 1,
        correct: 1,
        accuracy: { $divide: ['$correct', '$total'] },
      },
    },
  ]);

  return stats;
};

export const AIFeedback = mongoose.model<IAIFeedbackData>('AIFeedback', aiFeedbackSchema);
