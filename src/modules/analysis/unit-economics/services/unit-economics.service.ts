/**
 * Unit Economics Service
 *
 * Calculates SaaS unit economics metrics:
 * - CAC (Customer Acquisition Cost)
 * - LTV (Lifetime Value)
 * - LTV:CAC Ratio
 * - Payback Period
 * - Churn Rate
 * - ARPU, MRR, ARR
 * - Cohort Analysis
 */

import { Types } from 'mongoose';
import { Expense } from '@/modules/tracking/expenses/models/expense.model';
import { RevenueEntry } from '@/modules/tracking/revenue/models/revenue-entry.model';
import { Customer } from '@/modules/tracking/revenue/models/customer.model';
import {
  MetricType,
  CohortPeriod,
  TrendDirection,
  TrendDirectionType,
  getHealthStatus,
  ANALYSIS_CONSTANTS,
} from '../../constants';
import {
  UnitEconomicsMetric,
  UnitEconomicsSummary,
  CohortData,
  CohortAnalysis,
  CohortRetention,
  CACBreakdown,
  LTVBreakdown,
} from '../../types';
import {
  UnitEconomicsQueryInput,
  CACQueryInput,
  LTVQueryInput,
  CohortQueryInput,
  PaybackQueryInput,
} from '../schemas';

export class UnitEconomicsService {
  // ============ All Metrics Summary ============

  /**
   * Get all unit economics metrics
   */
  async getAllMetrics(
    organizationId: Types.ObjectId,
    query: UnitEconomicsQueryInput
  ): Promise<UnitEconomicsSummary> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);

    const [
      cacData,
      ltvData,
      churnData,
      mrrData,
      grossMarginData,
    ] = await Promise.all([
      this.getCAC(organizationId, { months: 3, includeBreakdown: true }),
      this.getLTV(organizationId, { cohortMonths: 12, includeChurnAnalysis: true }),
      this.getChurnRate(organizationId, startDate, endDate),
      this.getMRR(organizationId),
      this.getGrossMargin(organizationId, startDate, endDate),
    ]);

    const metrics: UnitEconomicsMetric[] = [];

    // CAC
    metrics.push({
      metric: MetricType.CAC,
      value: cacData.cacPerCustomer,
      benchmark: query.includeBenchmarks ? undefined : undefined, // CAC varies widely
      trend: cacData.trend,
    });

    // LTV
    metrics.push({
      metric: MetricType.LTV,
      value: ltvData.averageLTV,
      benchmark: query.includeBenchmarks ? undefined : undefined,
      trend: TrendDirection.STABLE, // Calculate from historical if needed
    });

    // LTV:CAC Ratio
    const ltvCacRatio = cacData.cacPerCustomer > 0
      ? ltvData.averageLTV / cacData.cacPerCustomer
      : 0;
    const ltvCacBenchmark = ANALYSIS_CONSTANTS.BENCHMARKS.ltv_cac_ratio;
    metrics.push({
      metric: MetricType.LTV_CAC_RATIO,
      value: Math.round(ltvCacRatio * 100) / 100,
      benchmark: query.includeBenchmarks ? ltvCacBenchmark : undefined,
      benchmarkComparison: ltvCacRatio >= ltvCacBenchmark ? 'above' : 'below',
      trend: TrendDirection.STABLE,
    });

    // Payback Period
    const paybackMonths = this.calculatePaybackPeriod(
      cacData.cacPerCustomer,
      mrrData.averageRevenuePerCustomer,
      grossMarginData
    );
    metrics.push({
      metric: MetricType.PAYBACK_PERIOD,
      value: Math.round(paybackMonths * 10) / 10,
      benchmark: query.includeBenchmarks ? ANALYSIS_CONSTANTS.BENCHMARKS.payback_months : undefined,
      benchmarkComparison: paybackMonths <= 12 ? 'above' : 'below',
      trend: TrendDirection.STABLE,
    });

    // Churn Rate
    metrics.push({
      metric: MetricType.CHURN_RATE,
      value: Math.round(churnData.rate * 100) / 100,
      benchmark: query.includeBenchmarks ? ANALYSIS_CONSTANTS.BENCHMARKS.churn_rate * 100 : undefined,
      benchmarkComparison: churnData.rate <= 5 ? 'above' : 'below',
      trend: churnData.trend,
    });

    // MRR
    metrics.push({
      metric: MetricType.MRR,
      value: Math.round(mrrData.mrr * 100) / 100,
      previousValue: mrrData.previousMrr,
      changePercent: mrrData.mrrGrowth,
      trend: mrrData.mrrGrowth > 0 ? TrendDirection.INCREASING :
             mrrData.mrrGrowth < 0 ? TrendDirection.DECREASING : TrendDirection.STABLE,
    });

    // ARR
    metrics.push({
      metric: MetricType.ARR,
      value: Math.round(mrrData.mrr * 12 * 100) / 100,
      trend: mrrData.mrrGrowth > 0 ? TrendDirection.INCREASING :
             mrrData.mrrGrowth < 0 ? TrendDirection.DECREASING : TrendDirection.STABLE,
    });

    // ARPU
    metrics.push({
      metric: MetricType.ARPU,
      value: Math.round(mrrData.averageRevenuePerCustomer * 100) / 100,
      trend: TrendDirection.STABLE,
    });

    // Gross Margin
    metrics.push({
      metric: MetricType.GROSS_MARGIN,
      value: Math.round(grossMarginData * 100) / 100,
      benchmark: query.includeBenchmarks ? ANALYSIS_CONSTANTS.BENCHMARKS.grossMargin * 100 : undefined,
      benchmarkComparison: grossMarginData >= 70 ? 'above' : 'below',
      trend: TrendDirection.STABLE,
    });

    // Calculate overall health
    const healthScore = this.calculateOverallHealth(metrics);

    return {
      calculatedAt: new Date(),
      period: { startDate, endDate },
      metrics,
      overallHealth: getHealthStatus(healthScore),
    };
  }

  // ============ CAC Analysis ============

  /**
   * Get Customer Acquisition Cost
   */
  async getCAC(
    organizationId: Types.ObjectId,
    query: CACQueryInput
  ): Promise<CACBreakdown> {
    const months = query.months || 3;
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months, 1);

    // Get marketing and sales expenses
    const expenses = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
          category: { $in: ['marketing', 'advertising', 'sales', 'customer_acquisition', 'growth'] },
          status: { $in: ['approved', 'paid'] },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let marketing = 0;
    let sales = 0;
    let other = 0;

    for (const exp of expenses) {
      if (['marketing', 'advertising', 'growth'].includes(exp._id)) {
        marketing += exp.total;
      } else if (exp._id === 'sales') {
        sales += exp.total;
      } else {
        other += exp.total;
      }
    }

    const totalCAC = marketing + sales + other;

    // Get new customers in this period
    const newCustomers = await Customer.countDocuments({
      organization: organizationId,
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true,
    });

    const cacPerCustomer = newCustomers > 0 ? totalCAC / newCustomers : 0;

    // Calculate trend
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setMonth(previousStartDate.getMonth() - months);

    const previousExpenses = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: previousStartDate, $lte: previousEndDate },
          category: { $in: ['marketing', 'advertising', 'sales', 'customer_acquisition', 'growth'] },
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

    const previousNewCustomers = await Customer.countDocuments({
      organization: organizationId,
      createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      isActive: true,
    });

    const previousCAC = previousNewCustomers > 0
      ? (previousExpenses[0]?.total || 0) / previousNewCustomers
      : 0;

    let trend: TrendDirectionType;
    if (previousCAC === 0) {
      trend = TrendDirection.STABLE;
    } else {
      const changePercent = ((cacPerCustomer - previousCAC) / previousCAC) * 100;
      if (changePercent > 10) trend = TrendDirection.INCREASING;
      else if (changePercent < -10) trend = TrendDirection.DECREASING;
      else trend = TrendDirection.STABLE;
    }

    return {
      totalCAC: Math.round(totalCAC * 100) / 100,
      components: {
        marketing: Math.round(marketing * 100) / 100,
        sales: Math.round(sales * 100) / 100,
        other: Math.round(other * 100) / 100,
      },
      customerCount: newCustomers,
      cacPerCustomer: Math.round(cacPerCustomer * 100) / 100,
      trend,
    };
  }

  // ============ LTV Analysis ============

  /**
   * Get Lifetime Value
   */
  async getLTV(
    organizationId: Types.ObjectId,
    query: LTVQueryInput
  ): Promise<LTVBreakdown> {
    const cohortMonths = query.cohortMonths || 12;
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - cohortMonths, 1);

    // Get all customers
    const customers = await Customer.find({
      organization: organizationId,
      isActive: true,
    });

    if (customers.length === 0) {
      return {
        averageLTV: 0,
        averageLifespanMonths: 0,
        averageMonthlyRevenue: 0,
        churnRate: 0,
        grossMargin: 0,
      };
    }

    // Calculate average monthly revenue and lifespan
    let totalRevenue = 0;
    let totalMonths = 0;
    let customerCount = 0;

    for (const customer of customers) {
      totalRevenue += customer.totalRevenue || 0;

      // Calculate lifespan
      const firstPurchase = customer.firstPurchaseDate || customer.createdAt;
      const lastActivity = customer.lastPurchaseDate || new Date();
      const lifespan = Math.max(1,
        (lastActivity.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      totalMonths += lifespan;
      customerCount++;
    }

    const averageMonthlyRevenue = totalMonths > 0 ? totalRevenue / totalMonths : 0;
    const averageLifespanMonths = customerCount > 0 ? totalMonths / customerCount : 0;

    // Get churn rate and gross margin
    const churnData = await this.getChurnRate(organizationId, startDate, endDate);
    const grossMargin = await this.getGrossMargin(organizationId, startDate, endDate);

    // Calculate LTV = (ARPU * Gross Margin) / Churn Rate
    // Or simplified: ARPU * Average Lifespan * Gross Margin
    const averageLTV = averageMonthlyRevenue * averageLifespanMonths * (grossMargin / 100);

    return {
      averageLTV: Math.round(averageLTV * 100) / 100,
      averageLifespanMonths: Math.round(averageLifespanMonths * 10) / 10,
      averageMonthlyRevenue: Math.round(averageMonthlyRevenue * 100) / 100,
      churnRate: Math.round(churnData.rate * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
    };
  }

  // ============ Cohort Analysis ============

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(
    organizationId: Types.ObjectId,
    query: CohortQueryInput
  ): Promise<CohortAnalysis> {
    const periodType = query.periodType || CohortPeriod.MONTHLY;
    const cohortMonths = query.cohortMonths || 12;
    const retentionMonths = query.retentionMonths || 12;

    // Get or calculate cohorts
    const cohorts = await this.calculateCohorts(
      organizationId,
      periodType,
      cohortMonths,
      retentionMonths
    );

    // Calculate average retention by period
    const retentionByPeriod: Map<number, number[]> = new Map();
    for (const cohort of cohorts) {
      for (const retention of cohort.retention) {
        const rates = retentionByPeriod.get(retention.periodNumber) || [];
        rates.push(retention.retentionRate);
        retentionByPeriod.set(retention.periodNumber, rates);
      }
    }

    const averageRetentionByPeriod = Array.from(retentionByPeriod.entries())
      .map(([period, rates]) => ({
        period,
        rate: Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100,
      }))
      .sort((a, b) => a.period - b.period);

    // Calculate LTV metrics
    const ltvValues = cohorts.map((c) => c.averageLTV).filter((v) => v > 0);
    const averageLTV = ltvValues.length > 0
      ? ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length
      : 0;

    const sortedLTV = [...ltvValues].sort((a, b) => a - b);
    const medianLTV = sortedLTV.length > 0
      ? sortedLTV[Math.floor(sortedLTV.length / 2)]
      : 0;

    // Find best and worst cohorts
    let bestCohort, worstCohort;
    if (cohorts.length > 0) {
      const sortedCohorts = [...cohorts].sort((a, b) => b.averageLTV - a.averageLTV);
      if (sortedCohorts[0].averageLTV > 0) {
        bestCohort = {
          period: sortedCohorts[0].cohortPeriod,
          ltv: sortedCohorts[0].averageLTV,
        };
      }
      if (sortedCohorts[sortedCohorts.length - 1].averageLTV > 0) {
        worstCohort = {
          period: sortedCohorts[sortedCohorts.length - 1].cohortPeriod,
          ltv: sortedCohorts[sortedCohorts.length - 1].averageLTV,
        };
      }
    }

    return {
      periodType,
      cohorts,
      averageRetentionByPeriod,
      averageLTV: Math.round(averageLTV * 100) / 100,
      medianLTV: Math.round(medianLTV * 100) / 100,
      bestCohort,
      worstCohort,
    };
  }

  /**
   * Get payback period
   */
  async getPaybackPeriod(
    organizationId: Types.ObjectId,
    query: PaybackQueryInput
  ): Promise<{
    paybackMonths: number;
    cac: number;
    monthlyRevenuePerCustomer: number;
    grossMargin: number;
    isHealthy: boolean;
    trend: TrendDirectionType;
  }> {
    const cacData = await this.getCAC(organizationId, { months: query.months || 3, includeBreakdown: false });
    const mrrData = await this.getMRR(organizationId);
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
    const grossMargin = await this.getGrossMargin(organizationId, startDate, endDate);

    const paybackMonths = this.calculatePaybackPeriod(
      cacData.cacPerCustomer,
      mrrData.averageRevenuePerCustomer,
      grossMargin
    );

    return {
      paybackMonths: Math.round(paybackMonths * 10) / 10,
      cac: cacData.cacPerCustomer,
      monthlyRevenuePerCustomer: mrrData.averageRevenuePerCustomer,
      grossMargin,
      isHealthy: paybackMonths <= ANALYSIS_CONSTANTS.BENCHMARKS.payback_months,
      trend: cacData.trend,
    };
  }

  // ============ Helper Methods ============

  private async getChurnRate(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<{ rate: number; trend: TrendDirectionType }> {
    // Count churned customers in period
    const churnedCount = await Customer.countDocuments({
      organization: organizationId,
      subscriptionStatus: 'churned',
      subscriptionEndDate: { $gte: startDate, $lte: endDate },
    });

    // Count total customers at start of period
    const totalAtStart = await Customer.countDocuments({
      organization: organizationId,
      createdAt: { $lte: startDate },
      $or: [
        { subscriptionStatus: { $ne: 'churned' } },
        { subscriptionEndDate: { $gt: startDate } },
      ],
    });

    const rate = totalAtStart > 0 ? (churnedCount / totalAtStart) * 100 : 0;

    return {
      rate,
      trend: TrendDirection.STABLE, // Could calculate from historical data
    };
  }

  private async getMRR(organizationId: Types.ObjectId): Promise<{
    mrr: number;
    previousMrr: number;
    mrrGrowth: number;
    averageRevenuePerCustomer: number;
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentMonthStart);
    previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);

    // Current MRR from subscription customers
    const activeSubscribers = await Customer.find({
      organization: organizationId,
      subscriptionStatus: 'active',
      isActive: true,
    });

    const mrr = activeSubscribers.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);
    const customerCount = activeSubscribers.length;
    const averageRevenuePerCustomer = customerCount > 0 ? mrr / customerCount : 0;

    // Previous month MRR (from revenue entries)
    const previousRevenue = await RevenueEntry.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: previousMonthStart, $lte: previousMonthEnd },
          revenueType: 'subscription',
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
    ]);

    const previousMrr = previousRevenue[0]?.total || 0;
    const mrrGrowth = previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;

    return {
      mrr: Math.round(mrr * 100) / 100,
      previousMrr: Math.round(previousMrr * 100) / 100,
      mrrGrowth: Math.round(mrrGrowth * 100) / 100,
      averageRevenuePerCustomer: Math.round(averageRevenuePerCustomer * 100) / 100,
    };
  }

  private async getGrossMargin(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Get revenue
    const revenue = await RevenueEntry.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
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
    ]);

    // Get COGS
    const cogs = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
          category: { $in: ['cogs', 'cost_of_goods', 'cost_of_sales', 'direct_costs', 'hosting', 'infrastructure'] },
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

    const totalRevenue = revenue[0]?.total || 0;
    const totalCogs = cogs[0]?.total || 0;

    if (totalRevenue === 0) return 0;

    const grossProfit = totalRevenue - totalCogs;
    return (grossProfit / totalRevenue) * 100;
  }

  private calculatePaybackPeriod(
    cac: number,
    monthlyRevenue: number,
    grossMargin: number
  ): number {
    if (monthlyRevenue === 0 || grossMargin === 0) return 999;
    const monthlyGrossProfit = monthlyRevenue * (grossMargin / 100);
    if (monthlyGrossProfit <= 0) return 999;
    return cac / monthlyGrossProfit;
  }

  private async calculateCohorts(
    organizationId: Types.ObjectId,
    periodType: string,
    cohortMonths: number,
    retentionMonths: number
  ): Promise<CohortData[]> {
    const cohorts: CohortData[] = [];
    const now = new Date();

    for (let i = cohortMonths - 1; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + 1, 0);

      // Get customers acquired in this cohort period
      const customers = await Customer.find({
        organization: organizationId,
        createdAt: { $gte: cohortStart, $lte: cohortEnd },
      });

      if (customers.length === 0) continue;

      const customerIds = customers.map((c) => c._id);

      // Get initial revenue
      const initialRevenueResult = await RevenueEntry.aggregate([
        {
          $match: {
            organization: organizationId,
            customer: { $in: customerIds },
            date: { $gte: cohortStart, $lte: cohortEnd },
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
      ]);

      const initialRevenue = initialRevenueResult[0]?.total || 0;

      // Calculate retention for each subsequent period
      const retention: CohortRetention[] = [];
      let cumulativeRevenue = initialRevenue;

      for (let period = 0; period <= Math.min(retentionMonths, i); period++) {
        const periodStart = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + period, 1);
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);

        // Count active customers in this period
        const activeCustomers = await Customer.countDocuments({
          _id: { $in: customerIds },
          $or: [
            { subscriptionStatus: 'active' },
            { lastPurchaseDate: { $gte: periodStart } },
          ],
          $and: [
            {
              $or: [
                { subscriptionEndDate: { $exists: false } },
                { subscriptionEndDate: { $gte: periodEnd } },
              ],
            },
          ],
        });

        const retentionRate = customers.length > 0
          ? (activeCustomers / customers.length) * 100
          : 0;

        // Get revenue for this period
        const periodRevenueResult = await RevenueEntry.aggregate([
          {
            $match: {
              organization: organizationId,
              customer: { $in: customerIds },
              date: { $gte: periodStart, $lte: periodEnd },
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
        ]);

        const periodRevenue = periodRevenueResult[0]?.total || 0;
        cumulativeRevenue += period > 0 ? periodRevenue : 0;

        retention.push({
          periodNumber: period,
          activeCustomers,
          retentionRate: Math.round(retentionRate * 100) / 100,
          revenue: Math.round(periodRevenue * 100) / 100,
          averageRevenuePerCustomer: activeCustomers > 0
            ? Math.round((periodRevenue / activeCustomers) * 100) / 100
            : 0,
        });
      }

      const averageLTV = customers.length > 0 ? cumulativeRevenue / customers.length : 0;

      cohorts.push({
        cohortId: `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, '0')}`,
        cohortPeriod: cohortStart,
        periodType: periodType as any,
        customerCount: customers.length,
        initialRevenue: Math.round(initialRevenue * 100) / 100,
        retention,
        cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
        averageLTV: Math.round(averageLTV * 100) / 100,
      });
    }

    return cohorts;
  }

  private calculateOverallHealth(metrics: UnitEconomicsMetric[]): number {
    let score = 50; // Base score

    for (const metric of metrics) {
      switch (metric.metric) {
        case MetricType.LTV_CAC_RATIO:
          if (metric.value >= 3) score += 15;
          else if (metric.value >= 2) score += 10;
          else if (metric.value >= 1) score += 5;
          else score -= 10;
          break;
        case MetricType.PAYBACK_PERIOD:
          if (metric.value <= 6) score += 10;
          else if (metric.value <= 12) score += 5;
          else if (metric.value <= 18) score -= 5;
          else score -= 10;
          break;
        case MetricType.CHURN_RATE:
          if (metric.value <= 2) score += 10;
          else if (metric.value <= 5) score += 5;
          else if (metric.value <= 10) score -= 5;
          else score -= 10;
          break;
        case MetricType.GROSS_MARGIN:
          if (metric.value >= 80) score += 10;
          else if (metric.value >= 70) score += 5;
          else if (metric.value >= 50) score -= 5;
          else score -= 10;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}

export const unitEconomicsService = new UnitEconomicsService();
