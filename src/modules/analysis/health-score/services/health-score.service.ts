/**
 * Health Score Service
 *
 * Calculates overall financial health score with category breakdowns
 * and actionable recommendations
 */

import { Types } from 'mongoose';
import { BankAccount } from '@/modules/tracking/bank-sync/models/bank-account.model';
import { Expense } from '@/modules/tracking/expenses/models/expense.model';
import { RevenueEntry } from '@/modules/tracking/revenue/models/revenue-entry.model';
import { RunwaySnapshot } from '@/modules/projection/runway/models/runway-snapshot.model';
import { HealthScore, IHealthScore } from '../models/health-score.model';
import { unitEconomicsService } from '../../unit-economics/services/unit-economics.service';
import { trendsService } from '../../trends/services/trends.service';
import {
  HealthCategory,
  HealthStatus,
  HealthCategoryType,
  RecommendationPriority,
  RecommendationCategory,
  TrendDirection,
  getHealthStatus,
  ANALYSIS_CONSTANTS,
} from '../../constants';
import {
  HealthScoreResult,
  HealthScoreCategory,
  HealthMetricDetail,
  HealthRecommendation,
  HealthScoreHistory,
  HealthScoreBreakdown,
} from '../../types';
import { HealthScoreQueryInput, HistoryQueryInput, BreakdownQueryInput } from '../schemas';

export class HealthScoreService {
  // ============ Main Health Score ============

  /**
   * Calculate current health score
   */
  async calculateHealthScore(
    organizationId: Types.ObjectId,
    query: HealthScoreQueryInput
  ): Promise<HealthScoreResult> {
    const categories: HealthScoreCategory[] = [];
    const allRecommendations: HealthRecommendation[] = [];

    // Calculate each category score in parallel
    const [
      runwayScore,
      burnRateScore,
      revenueGrowthScore,
      grossMarginScore,
      liquidityScore,
      efficiencyScore,
      unitEconomicsScore,
    ] = await Promise.all([
      this.calculateRunwayScore(organizationId),
      this.calculateBurnRateScore(organizationId),
      this.calculateRevenueGrowthScore(organizationId),
      this.calculateGrossMarginScore(organizationId),
      this.calculateLiquidityScore(organizationId),
      this.calculateEfficiencyScore(organizationId),
      this.calculateUnitEconomicsScore(organizationId),
    ]);

    categories.push(
      runwayScore,
      burnRateScore,
      revenueGrowthScore,
      grossMarginScore,
      liquidityScore,
      efficiencyScore,
      unitEconomicsScore
    );

    // Collect all recommendations
    for (const category of categories) {
      if (category.recommendations) {
        allRecommendations.push(...category.recommendations);
      }
    }

    // Calculate overall score
    const overallScore = categories.reduce((sum, c) => sum + c.weightedScore, 0);
    const overallStatus = getHealthStatus(overallScore);

    // Get previous score for comparison
    const previousHealthScore = await HealthScore.findOne({
      organization: organizationId,
      isArchived: false,
      calculatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // At least 1 day old
    }).sort({ calculatedAt: -1 });

    const previousScore = previousHealthScore?.overallScore;
    const scoreChange = previousScore ? overallScore - previousScore : undefined;

    // Sort recommendations by priority
    const topRecommendations = allRecommendations
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      })
      .slice(0, 5);

    // Save the health score
    await this.saveHealthScore(organizationId, overallScore, overallStatus, categories, topRecommendations);

    // Build result
    const result: HealthScoreResult = {
      calculatedAt: new Date(),
      overallScore: Math.round(overallScore * 10) / 10,
      overallStatus,
      previousScore,
      scoreChange: scoreChange ? Math.round(scoreChange * 10) / 10 : undefined,
      categories,
      topRecommendations,
    };

    // Include history if requested
    if (query.includeHistory) {
      result.historicalScores = await this.getHistoricalScores(
        organizationId,
        query.historyMonths || 6
      );
    }

    return result;
  }

  /**
   * Get health score history
   */
  async getHistory(
    organizationId: Types.ObjectId,
    query: HistoryQueryInput
  ): Promise<HealthScoreHistory[]> {
    return this.getHistoricalScores(organizationId, query.months || 12, query.limit || 30);
  }

  /**
   * Get detailed breakdown for a specific category
   */
  async getCategoryBreakdown(
    organizationId: Types.ObjectId,
    query: BreakdownQueryInput
  ): Promise<HealthScoreBreakdown[]> {
    const breakdowns: HealthScoreBreakdown[] = [];
    const categoriesToAnalyze = query.category
      ? [query.category]
      : Object.values(HealthCategory);

    for (const category of categoriesToAnalyze) {
      let categoryScore: HealthScoreCategory;

      switch (category) {
        case HealthCategory.RUNWAY:
          categoryScore = await this.calculateRunwayScore(organizationId);
          break;
        case HealthCategory.BURN_RATE:
          categoryScore = await this.calculateBurnRateScore(organizationId);
          break;
        case HealthCategory.REVENUE_GROWTH:
          categoryScore = await this.calculateRevenueGrowthScore(organizationId);
          break;
        case HealthCategory.GROSS_MARGIN:
          categoryScore = await this.calculateGrossMarginScore(organizationId);
          break;
        case HealthCategory.LIQUIDITY:
          categoryScore = await this.calculateLiquidityScore(organizationId);
          break;
        case HealthCategory.EFFICIENCY:
          categoryScore = await this.calculateEfficiencyScore(organizationId);
          break;
        case HealthCategory.UNIT_ECONOMICS:
          categoryScore = await this.calculateUnitEconomicsScore(organizationId);
          break;
        default:
          continue;
      }

      // Get previous score
      const previousHealth = await HealthScore.findOne({
        organization: organizationId,
        isArchived: false,
        calculatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).sort({ calculatedAt: -1 });

      const previousCategoryScore = previousHealth?.categoryScores.find(
        (c) => c.category === category
      )?.score;

      // Determine positive and negative factors
      const factors = this.getFactorsForCategory(categoryScore);

      breakdowns.push({
        category,
        currentScore: categoryScore.score,
        previousScore: previousCategoryScore,
        change: previousCategoryScore ? categoryScore.score - previousCategoryScore : undefined,
        status: categoryScore.status,
        factors,
      });
    }

    return breakdowns;
  }

  // ============ Category Score Calculations ============

  private async calculateRunwayScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.runway;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    // Get latest runway
    const runwaySnapshot = await RunwaySnapshot.findOne({
      organization: organizationId,
      isArchived: false,
    }).sort({ calculatedAt: -1 });

    let score = 50; // Default
    let runwayMonths = 0;

    if (runwaySnapshot) {
      runwayMonths = runwaySnapshot.runwayMonths;

      // Score based on runway months
      if (runwayMonths >= 24) score = 100;
      else if (runwayMonths >= 18) score = 90;
      else if (runwayMonths >= 12) score = 75;
      else if (runwayMonths >= 6) score = 50;
      else if (runwayMonths >= 3) score = 25;
      else score = 10;

      metrics.push({
        name: 'Runway Months',
        value: runwayMonths,
        unit: 'months',
        benchmark: 18,
        score,
        trend: TrendDirection.STABLE,
        description: 'Months of runway based on current burn rate',
      });

      // Add recommendations if needed
      if (runwayMonths < 12) {
        recommendations.push({
          category: RecommendationCategory.CASH_MANAGEMENT,
          priority: runwayMonths < 6 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
          title: 'Extend Runway',
          description: `Current runway of ${runwayMonths} months is below the recommended 12-18 months.`,
          potentialImpact: 'Reduce risk of running out of cash',
          actionItems: [
            'Review and reduce non-essential expenses',
            'Accelerate revenue collection',
            'Consider raising additional funding',
          ],
        });
      }
    }

    const weightedScore = (score * weight) / 100;
    const status = getHealthStatus(score);

    return {
      category: HealthCategory.RUNWAY,
      score: Math.round(score),
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      status,
      metrics,
      recommendations,
    };
  }

  private async calculateBurnRateScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.burn_rate;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    // Get burn rate trend
    const expenseTrend = await trendsService.getTrend(organizationId, {
      type: 'burn_rate',
      periodType: 'monthly',
      months: 6,
    });

    let score = 50;
    const monthlyBurn = expenseTrend.averageValue;
    const burnTrend = expenseTrend.direction;

    // Score based on burn trend
    if (burnTrend === TrendDirection.DECREASING) score = 85;
    else if (burnTrend === TrendDirection.STABLE) score = 70;
    else if (burnTrend === TrendDirection.INCREASING) score = 40;
    else score = 30; // Volatile

    metrics.push({
      name: 'Monthly Burn Rate',
      value: monthlyBurn,
      unit: 'currency',
      score,
      trend: burnTrend,
      description: 'Average monthly net cash outflow',
    });

    // Recommendations
    if (burnTrend === TrendDirection.INCREASING) {
      recommendations.push({
        category: RecommendationCategory.COST_REDUCTION,
        priority: RecommendationPriority.HIGH,
        title: 'Address Increasing Burn Rate',
        description: `Burn rate is increasing. Review expense categories to identify areas for optimization.`,
        actionItems: [
          'Audit vendor contracts for renegotiation opportunities',
          'Review headcount growth vs revenue growth',
          'Identify and eliminate redundant tools/services',
        ],
      });
    }

    const weightedScore = (score * weight) / 100;
    const status = getHealthStatus(score);

    return {
      category: HealthCategory.BURN_RATE,
      score: Math.round(score),
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      status,
      metrics,
      recommendations,
    };
  }

  private async calculateRevenueGrowthScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.revenue_growth;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    const revenueTrend = await trendsService.getTrend(organizationId, {
      type: 'revenue',
      periodType: 'monthly',
      months: 6,
    });

    let score = 50;
    const growthRate = revenueTrend.growthRate;

    // Score based on monthly growth rate
    if (growthRate >= 20) score = 100;
    else if (growthRate >= 10) score = 85;
    else if (growthRate >= 5) score = 70;
    else if (growthRate >= 0) score = 50;
    else if (growthRate >= -5) score = 30;
    else score = 10;

    metrics.push({
      name: 'Monthly Revenue Growth',
      value: growthRate,
      unit: '%',
      benchmark: 10,
      score,
      trend: revenueTrend.direction,
      description: 'Compound monthly growth rate of revenue',
    });

    // Recommendations
    if (growthRate < 5) {
      recommendations.push({
        category: RecommendationCategory.REVENUE_GROWTH,
        priority: growthRate < 0 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
        title: 'Accelerate Revenue Growth',
        description: `Current growth rate of ${growthRate.toFixed(1)}% is below healthy levels.`,
        actionItems: [
          'Review and optimize sales funnel conversion',
          'Identify upsell opportunities with existing customers',
          'Evaluate pricing strategy',
        ],
      });
    }

    const weightedScore = (score * weight) / 100;
    const status = getHealthStatus(score);

    return {
      category: HealthCategory.REVENUE_GROWTH,
      score: Math.round(score),
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      status,
      metrics,
      recommendations,
    };
  }

  private async calculateGrossMarginScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.gross_margin;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    const marginTrend = await trendsService.getTrend(organizationId, {
      type: 'gross_margin',
      periodType: 'monthly',
      months: 6,
    });

    const grossMargin = marginTrend.averageValue;
    let score = 50;

    // Score based on gross margin (SaaS benchmark is 70%+)
    if (grossMargin >= 80) score = 100;
    else if (grossMargin >= 70) score = 85;
    else if (grossMargin >= 60) score = 70;
    else if (grossMargin >= 50) score = 50;
    else if (grossMargin >= 40) score = 30;
    else score = 10;

    metrics.push({
      name: 'Gross Margin',
      value: grossMargin,
      unit: '%',
      benchmark: ANALYSIS_CONSTANTS.BENCHMARKS.grossMargin * 100,
      score,
      trend: marginTrend.direction,
      description: 'Revenue minus cost of goods sold as percentage of revenue',
    });

    // Recommendations
    if (grossMargin < 70) {
      recommendations.push({
        category: RecommendationCategory.OPERATIONAL_EFFICIENCY,
        priority: grossMargin < 50 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
        title: 'Improve Gross Margin',
        description: `Gross margin of ${grossMargin.toFixed(1)}% is below industry benchmark of 70%.`,
        actionItems: [
          'Review infrastructure costs for optimization',
          'Evaluate pricing to improve margins',
          'Automate manual processes to reduce COGS',
        ],
      });
    }

    const weightedScore = (score * weight) / 100;
    const status = getHealthStatus(score);

    return {
      category: HealthCategory.GROSS_MARGIN,
      score: Math.round(score),
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      status,
      metrics,
      recommendations,
    };
  }

  private async calculateLiquidityScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.liquidity;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    // Get cash balance
    const bankAccounts = await BankAccount.find({
      organization: organizationId,
      isActive: true,
    });

    const cashBalance = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Get monthly expenses for quick ratio approximation
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: lastMonth, $lt: thisMonth },
          status: { $in: ['approved', 'paid'] },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const monthlySpend = monthlyExpenses[0]?.total || 1;
    const cashRatio = cashBalance / monthlySpend;

    let score = 50;

    // Score based on months of cash
    if (cashRatio >= 12) score = 100;
    else if (cashRatio >= 6) score = 80;
    else if (cashRatio >= 3) score = 60;
    else if (cashRatio >= 1) score = 30;
    else score = 10;

    metrics.push({
      name: 'Cash Ratio',
      value: Math.round(cashRatio * 10) / 10,
      unit: 'months',
      benchmark: 6,
      score,
      trend: TrendDirection.STABLE,
      description: 'Cash balance divided by monthly expenses',
    });

    // Recommendations
    if (cashRatio < 3) {
      recommendations.push({
        category: RecommendationCategory.CASH_MANAGEMENT,
        priority: RecommendationPriority.HIGH,
        title: 'Improve Liquidity',
        description: `Cash reserves of ${cashRatio.toFixed(1)} months of expenses is critically low.`,
        actionItems: [
          'Accelerate accounts receivable collection',
          'Negotiate extended payment terms with vendors',
          'Consider bridge financing options',
        ],
      });
    }

    const weightedScore = (score * weight) / 100;
    const status = getHealthStatus(score);

    return {
      category: HealthCategory.LIQUIDITY,
      score: Math.round(score),
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      status,
      metrics,
      recommendations,
    };
  }

  private async calculateEfficiencyScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.efficiency;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    // Get revenue and expenses
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [revenueResult, expenseResult] = await Promise.all([
      RevenueEntry.aggregate([
        {
          $match: {
            organization: organizationId,
            date: { $gte: lastMonth, $lt: thisMonth },
            status: 'received',
            isArchived: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            organization: organizationId,
            date: { $gte: lastMonth, $lt: thisMonth },
            status: { $in: ['approved', 'paid'] },
            isArchived: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const expenses = expenseResult[0]?.total || 1;
    const efficiencyRatio = revenue / expenses;

    let score = 50;

    // Score based on revenue/expense ratio
    if (efficiencyRatio >= 1.5) score = 100;
    else if (efficiencyRatio >= 1.0) score = 80;
    else if (efficiencyRatio >= 0.75) score = 60;
    else if (efficiencyRatio >= 0.5) score = 40;
    else score = 20;

    metrics.push({
      name: 'Efficiency Ratio',
      value: Math.round(efficiencyRatio * 100) / 100,
      unit: 'ratio',
      benchmark: 1.0,
      score,
      trend: TrendDirection.STABLE,
      description: 'Revenue divided by total expenses',
    });

    // Recommendations
    if (efficiencyRatio < 1.0) {
      recommendations.push({
        category: RecommendationCategory.OPERATIONAL_EFFICIENCY,
        priority: efficiencyRatio < 0.5 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
        title: 'Improve Operational Efficiency',
        description: `Spending more than earning. Revenue/expense ratio of ${efficiencyRatio.toFixed(2)}.`,
        actionItems: [
          'Review all expense categories for optimization',
          'Identify and eliminate low-ROI activities',
          'Automate repetitive processes',
        ],
      });
    }

    const weightedScore = (score * weight) / 100;
    const status = getHealthStatus(score);

    return {
      category: HealthCategory.EFFICIENCY,
      score: Math.round(score),
      weight,
      weightedScore: Math.round(weightedScore * 10) / 10,
      status,
      metrics,
      recommendations,
    };
  }

  private async calculateUnitEconomicsScore(organizationId: Types.ObjectId): Promise<HealthScoreCategory> {
    const weight = ANALYSIS_CONSTANTS.HEALTH_WEIGHTS.unit_economics;
    const metrics: HealthMetricDetail[] = [];
    const recommendations: HealthRecommendation[] = [];

    try {
      const unitEcon = await unitEconomicsService.getAllMetrics(organizationId, {
        includeBenchmarks: true,
      });

      let score = 50;
      let scoreCount = 0;

      // Average scores from key unit economics metrics
      for (const metric of unitEcon.metrics) {
        if (metric.benchmarkComparison === 'above') {
          score += 10;
          scoreCount++;
        } else if (metric.benchmarkComparison === 'below') {
          score -= 10;
          scoreCount++;
        }

        metrics.push({
          name: metric.metric.toUpperCase().replace(/_/g, ' '),
          value: metric.value,
          unit: this.getMetricUnit(metric.metric),
          benchmark: metric.benchmark,
          score: metric.benchmarkComparison === 'above' ? 80 : metric.benchmarkComparison === 'at' ? 70 : 50,
          trend: metric.trend,
        });
      }

      score = Math.max(0, Math.min(100, score));

      // Find metrics needing improvement
      const belowBenchmark = unitEcon.metrics.filter((m) => m.benchmarkComparison === 'below');
      if (belowBenchmark.length > 0) {
        const metricNames = belowBenchmark.map((m) => m.metric).join(', ');
        recommendations.push({
          category: RecommendationCategory.REVENUE_GROWTH,
          priority: belowBenchmark.length > 2 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
          title: 'Improve Unit Economics',
          description: `The following metrics are below benchmark: ${metricNames}`,
          actionItems: [
            'Review customer acquisition channels for efficiency',
            'Analyze churn causes and implement retention programs',
            'Optimize pricing and packaging',
          ],
        });
      }

      const weightedScore = (score * weight) / 100;
      const status = getHealthStatus(score);

      return {
        category: HealthCategory.UNIT_ECONOMICS,
        score: Math.round(score),
        weight,
        weightedScore: Math.round(weightedScore * 10) / 10,
        status,
        metrics,
        recommendations,
      };
    } catch {
      // If unit economics calculation fails, return neutral score
      return {
        category: HealthCategory.UNIT_ECONOMICS,
        score: 50,
        weight,
        weightedScore: (50 * weight) / 100,
        status: HealthStatus.FAIR,
        metrics: [],
        recommendations: [],
      };
    }
  }

  // ============ Helper Methods ============

  private async saveHealthScore(
    organizationId: Types.ObjectId,
    overallScore: number,
    overallStatus: string,
    categories: HealthScoreCategory[],
    recommendations: HealthRecommendation[]
  ): Promise<void> {
    const healthScore = new HealthScore({
      organization: organizationId,
      calculatedAt: new Date(),
      overallScore,
      overallStatus,
      categoryScores: categories.map((c) => ({
        category: c.category,
        score: c.score,
        weight: c.weight,
        weightedScore: c.weightedScore,
        status: c.status,
      })),
      recommendations,
    });

    await healthScore.save();
  }

  private async getHistoricalScores(
    organizationId: Types.ObjectId,
    months: number,
    limit = 30
  ): Promise<HealthScoreHistory[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const scores = await HealthScore.find({
      organization: organizationId,
      calculatedAt: { $gte: startDate },
      isArchived: false,
    })
      .sort({ calculatedAt: -1 })
      .limit(limit)
      .lean() as unknown as IHealthScore[];

    return scores.map((s) => ({
      date: s.calculatedAt,
      overallScore: s.overallScore,
      status: s.overallStatus as any,
      categoryScores: s.categoryScores.map((c) => ({
        category: c.category as HealthCategoryType,
        score: c.score,
      })),
    }));
  }

  private getFactorsForCategory(
    category: HealthScoreCategory
  ): { positive: string[]; negative: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];

    for (const metric of category.metrics || []) {
      if (metric.benchmark && metric.value >= metric.benchmark) {
        positive.push(`${metric.name} is at or above benchmark`);
      } else if (metric.benchmark && metric.value < metric.benchmark) {
        negative.push(`${metric.name} is below benchmark`);
      }

      if (metric.trend === TrendDirection.INCREASING) {
        positive.push(`${metric.name} is trending upward`);
      } else if (metric.trend === TrendDirection.DECREASING) {
        negative.push(`${metric.name} is trending downward`);
      }
    }

    return { positive, negative };
  }

  private getMetricUnit(metric: string): string {
    switch (metric) {
      case 'cac':
      case 'ltv':
      case 'mrr':
      case 'arr':
      case 'arpu':
        return 'currency';
      case 'ltv_cac_ratio':
        return 'ratio';
      case 'payback_period':
        return 'months';
      case 'churn_rate':
      case 'retention_rate':
      case 'gross_margin':
      case 'net_revenue_retention':
        return '%';
      case 'burn_multiple':
        return 'x';
      default:
        return '';
    }
  }
}

export const healthScoreService = new HealthScoreService();
