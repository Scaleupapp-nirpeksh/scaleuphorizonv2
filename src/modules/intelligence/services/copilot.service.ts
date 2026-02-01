/**
 * Copilot Service
 *
 * Financial AI assistant with natural language queries
 */

import { Types } from 'mongoose';
import crypto from 'crypto';
import { openaiService, ChatMessage } from './openai.service';
import { AIQuery } from '../models';
import {
  COPILOT_SYSTEM_PROMPT,
  COPILOT_QUERY_CLASSIFIER_PROMPT,
  buildPrompt,
} from '../prompts';
import { QueryType, AI_LIMITS, QueryTypeValue } from '../constants';
import {
  CopilotQuery,
  CopilotResponse,
  CopilotContext,
  ConversationMessage,
  FinancialContext,
  CopilotSource,
} from '../types';
import { BadRequestError } from '@/core/errors';

// Import services from other modules for context gathering
import { Expense } from '@/modules/tracking/expenses/models';
import { RevenueEntry } from '@/modules/tracking/revenue/models';
import { Round } from '@/modules/fundraising/rounds/models';
import { Investor } from '@/modules/fundraising/investors/models';
import { Milestone } from '@/modules/operations/milestones/models';

export class CopilotService {
  private conversationCache: Map<string, ConversationMessage[]> = new Map();

  /**
   * Process a natural language query
   */
  async query(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CopilotQuery
  ): Promise<CopilotResponse> {
    const startTime = Date.now();

    // Validate input
    if (!input.query || input.query.length > AI_LIMITS.MAX_QUERY_LENGTH) {
      throw new BadRequestError(
        `Query must be between 1 and ${AI_LIMITS.MAX_QUERY_LENGTH} characters`
      );
    }

    // Classify the query type
    const queryType = await this.classifyQuery(input.query);

    // Gather relevant context
    const financialContext = await this.gatherContext(organizationId, input.context);

    // Build the system prompt with context
    const systemPrompt = buildPrompt(COPILOT_SYSTEM_PROMPT, {
      context: JSON.stringify(financialContext, null, 2),
      date: new Date().toISOString().split('T')[0],
    });

    // Get or create conversation history
    const conversationId = input.conversationId || crypto.randomUUID();
    const conversationHistory = this.getConversationHistory(conversationId);

    // Build messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: input.query },
    ];

    // Get AI response
    const result = await openaiService.createCompletion(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Update conversation history
    this.updateConversationHistory(conversationId, [
      { role: 'user', content: input.query, timestamp: new Date() },
      { role: 'assistant', content: result.content, timestamp: new Date() },
    ]);

    // Store query in database
    await AIQuery.create({
      organization: organizationId,
      user: userId,
      feature: 'copilot',
      queryType,
      input: input.query,
      response: result.content,
      model: result.model,
      tokensUsed: result.usage.totalTokens,
      processingTimeMs: Date.now() - startTime,
      conversationId,
    });

    // Generate follow-up suggestions
    const suggestions = this.generateSuggestions(queryType, financialContext);

    return {
      answer: result.content,
      queryType,
      confidence: 0.85,
      sources: this.extractSources(financialContext),
      suggestions,
    };
  }

  /**
   * Classify the query type
   */
  private async classifyQuery(query: string): Promise<QueryTypeValue> {
    try {
      const prompt = buildPrompt(COPILOT_QUERY_CLASSIFIER_PROMPT, { query });
      const result = await openaiService.complete(prompt, {
        maxTokens: 50,
        temperature: 0.3,
      });

      const queryType = result.content.trim().toLowerCase();
      const validTypes = Object.values(QueryType) as QueryTypeValue[];
      if (validTypes.includes(queryType as QueryTypeValue)) {
        return queryType as QueryTypeValue;
      }
      return QueryType.GENERAL;
    } catch {
      return QueryType.GENERAL;
    }
  }

  /**
   * Gather financial context from various modules
   */
  private async gatherContext(
    organizationId: Types.ObjectId,
    options?: CopilotContext
  ): Promise<FinancialContext> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Date range for context
    const startDate = options?.dateRange?.start
      ? new Date(options.dateRange.start)
      : thirtyDaysAgo;
    const endDate = options?.dateRange?.end
      ? new Date(options.dateRange.end)
      : now;

    // Gather data in parallel
    const [
      recentExpenses,
      recentRevenue,
      previousPeriodExpenses,
      previousPeriodRevenue,
      activeRound,
      investors,
      milestones,
    ] = await Promise.all([
      // Recent expenses
      Expense.find({
        organization: organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid'] },
      }).lean(),

      // Recent revenue
      RevenueEntry.find({
        organization: organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: 'received',
      }).lean(),

      // Previous period expenses (for comparison)
      Expense.find({
        organization: organizationId,
        date: { $gte: sixtyDaysAgo, $lt: startDate },
        status: { $in: ['approved', 'paid'] },
      }).lean(),

      // Previous period revenue
      RevenueEntry.find({
        organization: organizationId,
        date: { $gte: sixtyDaysAgo, $lt: startDate },
        status: 'received',
      }).lean(),

      // Active funding round
      options?.includeFundraising !== false
        ? Round.findOne({
            organization: organizationId,
            status: 'active',
          }).lean()
        : null,

      // Investors
      options?.includeFundraising !== false
        ? Investor.find({
            organization: organizationId,
            status: { $in: ['committed', 'invested'] },
          }).lean()
        : [],

      // Milestones
      options?.includeMilestones !== false
        ? Milestone.find({
            organization: organizationId,
            isArchived: false,
          }).lean()
        : [],
    ]);

    // Calculate financials
    const totalRevenue = recentRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpenses = recentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalRevenue - totalExpenses;

    const previousRevenue = previousPeriodRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
    const previousExpenses = previousPeriodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate burn rate (monthly average)
    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const monthlyBurn = (totalExpenses / daysDiff) * 30;

    // Estimate runway (would need actual cash balance from bank accounts)
    const estimatedCash = 500000; // Placeholder - should come from bank sync
    const runway = monthlyBurn > 0 ? estimatedCash / monthlyBurn : 999;

    // Calculate trends
    const revenueGrowth = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
    const expenseGrowth = previousExpenses > 0
      ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
      : 0;

    // Top expense categories
    const expenseByCategory = new Map<string, number>();
    recentExpenses.forEach(e => {
      const cat = e.category || 'other';
      expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + (e.amount || 0));
    });
    const topExpenseCategories = Array.from(expenseByCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentOfTotal: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Revenue by type
    const revenueByStream = new Map<string, number>();
    recentRevenue.forEach(r => {
      const stream = r.revenueType || 'other';
      revenueByStream.set(stream, (revenueByStream.get(stream) || 0) + (r.amount || 0));
    });

    // Fundraising context
    const totalRaised = investors.reduce((sum, i) => sum + (i.totalInvested || 0), 0);

    // Milestone summary
    const milestoneSummary = {
      total: milestones.length,
      completed: milestones.filter(m => m.status === 'completed').length,
      inProgress: milestones.filter(m => m.status === 'in_progress').length,
      atRisk: milestones.filter(m => ['at_risk', 'delayed'].includes(m.status)).length,
    };

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        burnRate: monthlyBurn,
        runway: Math.round(runway * 10) / 10,
        cashBalance: estimatedCash,
      },
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      trends: {
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        expenseGrowth: Math.round(expenseGrowth * 10) / 10,
        burnRateChange: 0, // Would need historical data
      },
      topExpenseCategories,
      revenueByStream: Array.from(revenueByStream.entries()).map(([stream, amount]) => ({
        stream,
        amount,
        percentOfTotal: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      })),
      fundraising: activeRound
        ? {
            activeRound: {
              name: activeRound.name,
              targetAmount: activeRound.targetAmount,
              raisedAmount: activeRound.raisedAmount || 0,
              percentRaised: activeRound.targetAmount > 0
                ? ((activeRound.raisedAmount || 0) / activeRound.targetAmount) * 100
                : 0,
            },
            totalRaised,
            investorCount: investors.length,
          }
        : undefined,
      milestones: milestoneSummary,
    };
  }

  /**
   * Get conversation history
   */
  private getConversationHistory(conversationId: string): ConversationMessage[] {
    return this.conversationCache.get(conversationId) || [];
  }

  /**
   * Update conversation history
   */
  private updateConversationHistory(
    conversationId: string,
    newMessages: ConversationMessage[]
  ): void {
    const existing = this.conversationCache.get(conversationId) || [];
    const updated = [...existing, ...newMessages].slice(-AI_LIMITS.MAX_HISTORY_ITEMS);
    this.conversationCache.set(conversationId, updated);

    // Clean up old conversations after 1 hour
    setTimeout(() => {
      this.conversationCache.delete(conversationId);
    }, 60 * 60 * 1000);
  }

  /**
   * Extract sources from context
   */
  private extractSources(context: FinancialContext): CopilotSource[] {
    const sources: CopilotSource[] = [];

    sources.push({
      type: 'metric',
      description: 'Total Revenue',
      value: `$${context.summary.totalRevenue.toLocaleString()}`,
    });

    sources.push({
      type: 'metric',
      description: 'Monthly Burn Rate',
      value: `$${context.summary.burnRate.toLocaleString()}`,
    });

    sources.push({
      type: 'metric',
      description: 'Runway',
      value: `${context.summary.runway} months`,
    });

    if (context.fundraising?.activeRound) {
      sources.push({
        type: 'round',
        description: `Active Round: ${context.fundraising.activeRound.name}`,
        value: `${context.fundraising.activeRound.percentRaised.toFixed(1)}% raised`,
      });
    }

    return sources;
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(
    queryType: QueryTypeValue,
    context: FinancialContext
  ): string[] {
    const suggestions: string[] = [];

    switch (queryType) {
      case QueryType.FINANCIAL_METRIC:
        suggestions.push('How does this compare to last month?');
        suggestions.push('What are the top contributors to this?');
        break;
      case QueryType.TREND_ANALYSIS:
        suggestions.push('What factors are driving this trend?');
        suggestions.push('What would happen if this continues?');
        break;
      case QueryType.COMPARISON:
        suggestions.push('Which area has the biggest variance?');
        suggestions.push('What actions can improve this?');
        break;
      default:
        // General suggestions based on context
        if (context.summary.runway < 6) {
          suggestions.push('How can we extend our runway?');
        }
        if (context.fundraising?.activeRound) {
          suggestions.push('What is our fundraising status?');
        }
        suggestions.push('What are our key financial metrics?');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get conversation history for a user
   */
  async getQueryHistory(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    limit: number = 20
  ): Promise<Array<{ query: string; response: string; createdAt: Date }>> {
    const queries = await AIQuery.find({
      organization: organizationId,
      user: userId,
      feature: 'copilot',
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('input response createdAt')
      .lean();

    return queries.map(q => ({
      query: q.input,
      response: q.response,
      createdAt: q.createdAt,
    }));
  }

  /**
   * Submit feedback on a response
   */
  async submitFeedback(
    queryId: string,
    feedback: { rating?: number; comment?: string; wasHelpful?: boolean }
  ): Promise<void> {
    await AIQuery.findByIdAndUpdate(queryId, { feedback });
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId: string): void {
    this.conversationCache.delete(conversationId);
  }
}

export const copilotService = new CopilotService();
