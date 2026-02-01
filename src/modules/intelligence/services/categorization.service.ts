/**
 * Categorization Service
 *
 * Smart transaction categorization using AI
 */

import { Types } from 'mongoose';
import { openaiService } from './openai.service';
import { AIQuery, AIFeedback } from '../models';
import {
  CATEGORIZATION_SYSTEM_PROMPT,
  CATEGORIZATION_PROMPT,
  BULK_CATEGORIZATION_PROMPT,
  buildPrompt,
} from '../prompts';
import { CategorizationConfidence, AI_LIMITS } from '../constants';
import {
  CategorizationRequest,
  CategorizationItem,
  CategorizationResult,
  CategorizationFeedback,
} from '../types';
import { BadRequestError } from '@/core/errors';

// Import Account model for category mapping
import { Account } from '@/modules/chart-of-accounts/models';

interface CategoryMapping {
  category: string;
  accountId?: string;
  accountName?: string;
}

export class CategorizationService {
  private categoryCache: Map<string, CategoryMapping[]> = new Map();

  /**
   * Categorize a single transaction
   */
  async categorize(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    item: CategorizationItem
  ): Promise<CategorizationResult> {
    const startTime = Date.now();

    // Build prompt
    const prompt = buildPrompt(CATEGORIZATION_PROMPT, {
      description: item.description,
      amount: item.amount,
      vendor: item.vendor,
      date: item.date,
    });

    // Get AI response
    const result = await openaiService.completeJSON<{
      category: string;
      subcategory?: string;
      confidence: string;
      reasoning: string;
      alternatives?: Array<{ category: string; confidence: string }>;
    }>(prompt, {
      systemPrompt: CATEGORIZATION_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    // Map to Chart of Accounts
    const accountMapping = await this.mapToAccount(
      organizationId,
      result.data.category,
      result.data.subcategory
    );

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'categorization',
      input: JSON.stringify(item),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      id: item.id,
      suggestedCategory: result.data.category,
      suggestedSubcategory: result.data.subcategory,
      suggestedAccountId: accountMapping?.accountId,
      confidence: this.normalizeConfidence(result.data.confidence),
      reasoning: result.data.reasoning,
      alternativeCategories: result.data.alternatives?.map(a => ({
        category: a.category,
        confidence: this.normalizeConfidence(a.confidence),
      })),
    };
  }

  /**
   * Categorize multiple transactions in batch
   */
  async categorizeBulk(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    request: CategorizationRequest
  ): Promise<CategorizationResult[]> {
    const startTime = Date.now();

    if (request.items.length > AI_LIMITS.MAX_BATCH_SIZE) {
      throw new BadRequestError(
        `Maximum batch size is ${AI_LIMITS.MAX_BATCH_SIZE} items`
      );
    }

    // For small batches, categorize individually for better accuracy
    if (request.items.length <= 5) {
      const results = await Promise.all(
        request.items.map(item => this.categorize(organizationId, userId, item))
      );
      return results;
    }

    // Build bulk prompt
    const prompt = buildPrompt(BULK_CATEGORIZATION_PROMPT, {
      transactions: request.items,
    });

    // Get AI response
    const result = await openaiService.completeJSON<Array<{
      index: number;
      category: string;
      subcategory?: string;
      confidence: string;
      reasoning: string;
    }>>(prompt, {
      systemPrompt: CATEGORIZATION_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 4000,
    });

    // Store query
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'categorization',
      input: JSON.stringify({ source: request.source, count: request.items.length }),
      response: JSON.stringify(result.data),
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
    });

    // Map results to items and include account mapping
    const results: CategorizationResult[] = [];
    for (const r of result.data) {
      const item = request.items[r.index];
      if (!item) continue;

      const accountMapping = await this.mapToAccount(
        organizationId,
        r.category,
        r.subcategory
      );

      results.push({
        id: item.id,
        suggestedCategory: r.category,
        suggestedSubcategory: r.subcategory,
        suggestedAccountId: accountMapping?.accountId,
        confidence: this.normalizeConfidence(r.confidence),
        reasoning: r.reasoning,
      });
    }

    return results;
  }

  /**
   * Get suggestions for a partial description (autocomplete)
   */
  async getSuggestions(
    organizationId: Types.ObjectId,
    description: string
  ): Promise<Array<{ category: string; confidence: number }>> {
    // First check feedback history for similar descriptions
    const historicalMatch = await this.findHistoricalMatch(organizationId, description);
    if (historicalMatch) {
      return [{ category: historicalMatch, confidence: 0.9 }];
    }

    // Get AI suggestion
    const prompt = `Based on this transaction description, suggest the most likely expense categories.

Description: "${description}"

Respond with JSON array of top 3 suggestions:
[{"category": "category_name", "confidence": 0.0-1.0}]`;

    try {
      const result = await openaiService.completeJSON<
        Array<{ category: string; confidence: number }>
      >(prompt, {
        systemPrompt: CATEGORIZATION_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 200,
      });

      return result.data;
    } catch {
      return [];
    }
  }

  /**
   * Submit feedback on categorization (for learning)
   */
  async submitFeedback(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    feedback: CategorizationFeedback
  ): Promise<void> {
    await AIFeedback.create({
      organization: organizationId,
      user: userId,
      feature: 'categorization',
      referenceId: feedback.itemId,
      referenceType: 'transaction',
      suggestedValue: feedback.suggestedCategory,
      actualValue: feedback.actualCategory,
      wasCorrect: feedback.wasCorrect,
    });
  }

  /**
   * Get categorization accuracy stats
   */
  async getAccuracyStats(
    organizationId: Types.ObjectId
  ): Promise<{
    total: number;
    correct: number;
    accuracy: number;
    byCategory: Array<{ category: string; total: number; correct: number; accuracy: number }>;
  }> {
    const stats = await AIFeedback.aggregate([
      {
        $match: {
          organization: new Types.ObjectId(organizationId),
          feature: 'categorization',
        },
      },
      {
        $group: {
          _id: '$actualValue',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$wasCorrect', 1, 0] } },
        },
      },
    ]);

    const byCategory = stats.map(s => ({
      category: s._id,
      total: s.total,
      correct: s.correct,
      accuracy: s.total > 0 ? s.correct / s.total : 0,
    }));

    const totalAll = byCategory.reduce((sum, c) => sum + c.total, 0);
    const correctAll = byCategory.reduce((sum, c) => sum + c.correct, 0);

    return {
      total: totalAll,
      correct: correctAll,
      accuracy: totalAll > 0 ? correctAll / totalAll : 0,
      byCategory,
    };
  }

  /**
   * Map category to Chart of Accounts
   */
  private async mapToAccount(
    organizationId: Types.ObjectId,
    category: string,
    subcategory?: string
  ): Promise<{ accountId: string; accountName: string } | null> {
    // Check cache
    const cacheKey = `${organizationId}:${category}:${subcategory || ''}`;
    const cached = this.categoryCache.get(cacheKey);
    if (cached && cached.length > 0) {
      return {
        accountId: cached[0].accountId!,
        accountName: cached[0].accountName!,
      };
    }

    // Search for matching account
    const searchTerms = [category];
    if (subcategory) searchTerms.push(subcategory);

    const account = await Account.findOne({
      organization: organizationId,
      isActive: true,
      $or: [
        { name: { $regex: category, $options: 'i' } },
        { subtype: { $regex: category, $options: 'i' } },
        ...(subcategory
          ? [
              { name: { $regex: subcategory, $options: 'i' } },
              { subtype: { $regex: subcategory, $options: 'i' } },
            ]
          : []),
      ],
    }).lean();

    if (account) {
      const mapping = {
        accountId: account._id.toString(),
        accountName: account.name,
      };
      this.categoryCache.set(cacheKey, [{ category, ...mapping }]);
      return mapping;
    }

    return null;
  }

  /**
   * Find historical match from feedback
   * TODO: Implement semantic search using embeddings for better matching
   */
  private async findHistoricalMatch(
    _organizationId: Types.ObjectId,
    _description: string
  ): Promise<string | null> {
    // In a production system, you'd use embeddings/vector search here
    // to find similar descriptions in feedback history
    return null;
  }

  /**
   * Normalize confidence level
   */
  private normalizeConfidence(
    confidence: string
  ): 'high' | 'medium' | 'low' {
    const lower = confidence.toLowerCase();
    if (lower === 'high' || lower === 'very high') {
      return CategorizationConfidence.HIGH;
    }
    if (lower === 'medium' || lower === 'moderate') {
      return CategorizationConfidence.MEDIUM;
    }
    return CategorizationConfidence.LOW;
  }
}

export const categorizationService = new CategorizationService();
