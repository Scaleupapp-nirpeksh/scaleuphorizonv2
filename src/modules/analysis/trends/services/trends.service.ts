/**
 * Trends Service
 *
 * Analyzes historical trends in financial data
 */

import { Types } from 'mongoose';
import { Expense } from '@/modules/tracking/expenses/models/expense.model';
import { RevenueEntry } from '@/modules/tracking/revenue/models/revenue-entry.model';
import { Transaction } from '@/modules/tracking/transactions/models/transaction.model';
import { BankAccount } from '@/modules/tracking/bank-sync/models/bank-account.model';
import { PlannedRole } from '@/modules/planning/headcount/models/planned-role.model';
import {
  TrendType,
  TrendPeriod,
  TrendTypeType,
  TrendPeriodType,
  getTrendDirection,
  calculateCMGR,
} from '../../constants';
import {
  TrendAnalysis,
  TrendDataPoint,
  TrendComparison,
  MultipleTrendAnalysis,
  TrendCorrelation,
} from '../../types';

// Internal query interface for flexibility
interface TrendQueryParams {
  type: string;
  periodType?: string;
  months?: number;
  startDate?: string;
  endDate?: string;
  includeMovingAverage?: boolean;
  movingAveragePeriods?: number;
  category?: string;
}

export class TrendsService {
  // ============ Single Trend Analysis ============

  /**
   * Get trend analysis for a specific metric type
   */
  async getTrend(
    organizationId: Types.ObjectId,
    query: TrendQueryParams
  ): Promise<TrendAnalysis> {
    const { type, periodType = TrendPeriod.MONTHLY, months = 12 } = query;
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth() - months, 1);

    let dataPoints: TrendDataPoint[];

    switch (type) {
      case TrendType.EXPENSE:
        dataPoints = await this.getExpenseTrend(organizationId, startDate, endDate, periodType, query.category);
        break;
      case TrendType.REVENUE:
        dataPoints = await this.getRevenueTrend(organizationId, startDate, endDate, periodType);
        break;
      case TrendType.BURN_RATE:
        dataPoints = await this.getBurnRateTrend(organizationId, startDate, endDate, periodType);
        break;
      case TrendType.HEADCOUNT:
        dataPoints = await this.getHeadcountTrend(organizationId, startDate, endDate, periodType);
        break;
      case TrendType.CASH_BALANCE:
        dataPoints = await this.getCashBalanceTrend(organizationId, startDate, endDate, periodType);
        break;
      case TrendType.NET_INCOME:
        dataPoints = await this.getNetIncomeTrend(organizationId, startDate, endDate, periodType);
        break;
      case TrendType.GROSS_MARGIN:
        dataPoints = await this.getGrossMarginTrend(organizationId, startDate, endDate, periodType);
        break;
      default:
        dataPoints = [];
    }

    // Add moving average if requested
    if (query.includeMovingAverage !== false && dataPoints.length >= (query.movingAveragePeriods || 3)) {
      dataPoints = this.addMovingAverage(dataPoints, query.movingAveragePeriods || 3);
    }

    // Calculate period-over-period changes
    dataPoints = this.addPeriodChanges(dataPoints);

    return this.buildTrendAnalysis(type as TrendTypeType, periodType as TrendPeriodType, startDate, endDate, dataPoints);
  }

  /**
   * Get multiple trends at once
   */
  async getMultipleTrends(
    organizationId: Types.ObjectId,
    query: { types: string[]; periodType?: string; months?: number; includeCorrelations?: boolean }
  ): Promise<MultipleTrendAnalysis> {
    const types = query.types;

    const trends: TrendAnalysis[] = [];
    for (const type of types) {
      const trend = await this.getTrend(organizationId, {
        type,
        periodType: query.periodType,
        months: query.months,
      });
      trends.push(trend);
    }

    const result: MultipleTrendAnalysis = { trends };

    // Calculate correlations if requested
    if (query.includeCorrelations && trends.length >= 2) {
      result.correlations = this.calculateCorrelations(trends);
    }

    return result;
  }

  /**
   * Get trend comparison between current and previous period
   */
  async getTrendComparison(
    organizationId: Types.ObjectId,
    query: { type: string; periodType?: string; currentPeriodMonths?: number }
  ): Promise<TrendComparison> {
    const { type, periodType = TrendPeriod.MONTHLY, currentPeriodMonths = 6 } = query;

    const now = new Date();
    const currentEndDate = now;
    const currentStartDate = new Date(now.getFullYear(), now.getMonth() - currentPeriodMonths, 1);
    const previousEndDate = new Date(currentStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate.getFullYear(), previousEndDate.getMonth() - currentPeriodMonths + 1, 1);

    const currentPeriod = await this.getTrend(organizationId, {
      type,
      periodType,
      startDate: currentStartDate.toISOString(),
      endDate: currentEndDate.toISOString(),
    });

    const previousPeriod = await this.getTrend(organizationId, {
      type,
      periodType,
      startDate: previousStartDate.toISOString(),
      endDate: previousEndDate.toISOString(),
    });

    const periodOverPeriodChange = currentPeriod.averageValue - previousPeriod.averageValue;
    const periodOverPeriodPercent = previousPeriod.averageValue !== 0
      ? (periodOverPeriodChange / previousPeriod.averageValue) * 100
      : 0;

    return {
      currentPeriod,
      previousPeriod,
      periodOverPeriodChange: Math.round(periodOverPeriodChange * 100) / 100,
      periodOverPeriodPercent: Math.round(periodOverPeriodPercent * 100) / 100,
    };
  }

  // ============ Specific Trend Methods ============

  private async getExpenseTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string,
    category?: string
  ): Promise<TrendDataPoint[]> {
    const groupBy = this.getGroupByExpression(periodType);

    const aggregation = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'paid'] },
          isArchived: false,
          ...(category && { category }),
        },
      },
      {
        $group: {
          _id: groupBy,
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
    ]);

    return this.mapAggregationToDataPoints(aggregation, startDate, endDate, periodType);
  }

  private async getRevenueTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string
  ): Promise<TrendDataPoint[]> {
    const groupBy = this.getGroupByExpression(periodType);

    const aggregation = await RevenueEntry.aggregate([
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
          _id: groupBy,
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
    ]);

    return this.mapAggregationToDataPoints(aggregation, startDate, endDate, periodType);
  }

  private async getBurnRateTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string
  ): Promise<TrendDataPoint[]> {
    const expenses = await this.getExpenseTrend(organizationId, startDate, endDate, periodType);
    const revenue = await this.getRevenueTrend(organizationId, startDate, endDate, periodType);

    const revenueMap = new Map(revenue.map((r) => [r.period.toString(), r.value]));

    return expenses.map((exp) => ({
      period: exp.period,
      value: exp.value - (revenueMap.get(exp.period.toString()) || 0),
    }));
  }

  private async getHeadcountTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string
  ): Promise<TrendDataPoint[]> {
    const filledRoles = await PlannedRole.find({
      organization: organizationId,
      status: 'filled',
      plannedStartDate: { $lte: endDate },
      isArchived: false,
    }).select('plannedStartDate');

    const periods = this.generatePeriods(startDate, endDate, periodType);

    return periods.map((period) => {
      const count = filledRoles.filter(
        (role) => role.plannedStartDate <= period
      ).length;

      return {
        period,
        value: count,
      };
    });
  }

  private async getCashBalanceTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string
  ): Promise<TrendDataPoint[]> {
    const bankAccounts = await BankAccount.find({
      organization: organizationId,
      isActive: true,
    });
    const currentBalance = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    const transactions = await Transaction.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: this.getGroupByExpression(periodType),
          inflow: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          },
          outflow: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const periods = this.generatePeriods(startDate, endDate, periodType);
    const dataPoints: TrendDataPoint[] = [];
    let runningBalance = currentBalance;

    for (let i = periods.length - 1; i >= 0; i--) {
      const period = periods[i];
      const txnData = transactions.find((t) => {
        const txnPeriod = this.getDateFromGroupId(t._id, periodType);
        return txnPeriod.getTime() === period.getTime();
      });

      if (txnData) {
        runningBalance -= (txnData.inflow - txnData.outflow);
      }

      dataPoints.unshift({
        period,
        value: Math.round(runningBalance * 100) / 100,
      });
    }

    return dataPoints;
  }

  private async getNetIncomeTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string
  ): Promise<TrendDataPoint[]> {
    const revenue = await this.getRevenueTrend(organizationId, startDate, endDate, periodType);
    const expenses = await this.getExpenseTrend(organizationId, startDate, endDate, periodType);

    const expenseMap = new Map(expenses.map((e) => [e.period.toString(), e.value]));

    return revenue.map((rev) => ({
      period: rev.period,
      value: rev.value - (expenseMap.get(rev.period.toString()) || 0),
    }));
  }

  private async getGrossMarginTrend(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    periodType: string
  ): Promise<TrendDataPoint[]> {
    const revenue = await this.getRevenueTrend(organizationId, startDate, endDate, periodType);

    const groupBy = this.getGroupByExpression(periodType);
    const cogs = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
          category: { $in: ['cogs', 'cost_of_goods', 'cost_of_sales', 'direct_costs'] },
          status: { $in: ['approved', 'paid'] },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: groupBy,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const cogsMap = new Map(
      cogs.map((c) => [this.getDateFromGroupId(c._id, periodType).toString(), c.total])
    );

    return revenue.map((rev) => {
      const cogValue = cogsMap.get(rev.period.toString()) || 0;
      const grossProfit = rev.value - cogValue;
      const grossMargin = rev.value !== 0 ? (grossProfit / rev.value) * 100 : 0;

      return {
        period: rev.period,
        value: Math.round(grossMargin * 100) / 100,
      };
    });
  }

  // ============ Helper Methods ============

  private getGroupByExpression(periodType: string): Record<string, unknown> {
    switch (periodType) {
      case TrendPeriod.DAILY:
        return {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' },
        };
      case TrendPeriod.WEEKLY:
        return {
          year: { $year: '$date' },
          week: { $week: '$date' },
        };
      case TrendPeriod.QUARTERLY:
        return {
          year: { $year: '$date' },
          quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
        };
      case TrendPeriod.MONTHLY:
      default:
        return {
          year: { $year: '$date' },
          month: { $month: '$date' },
        };
    }
  }

  private generatePeriods(startDate: Date, endDate: Date, periodType: string): Date[] {
    const periods: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      periods.push(new Date(current));

      switch (periodType) {
        case TrendPeriod.DAILY:
          current.setDate(current.getDate() + 1);
          break;
        case TrendPeriod.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;
        case TrendPeriod.QUARTERLY:
          current.setMonth(current.getMonth() + 3);
          break;
        case TrendPeriod.MONTHLY:
        default:
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return periods;
  }

  private getDateFromGroupId(groupId: any, periodType: string): Date {
    switch (periodType) {
      case TrendPeriod.DAILY:
        return new Date(groupId.year, groupId.month - 1, groupId.day);
      case TrendPeriod.WEEKLY:
        const weekDate = new Date(groupId.year, 0, 1);
        weekDate.setDate(weekDate.getDate() + (groupId.week - 1) * 7);
        return weekDate;
      case TrendPeriod.QUARTERLY:
        return new Date(groupId.year, (groupId.quarter - 1) * 3, 1);
      case TrendPeriod.MONTHLY:
      default:
        return new Date(groupId.year, groupId.month - 1, 1);
    }
  }

  private mapAggregationToDataPoints(
    aggregation: any[],
    startDate: Date,
    endDate: Date,
    periodType: string
  ): TrendDataPoint[] {
    const periods = this.generatePeriods(startDate, endDate, periodType);
    const dataMap = new Map(
      aggregation.map((a) => [this.getDateFromGroupId(a._id, periodType).getTime(), a.total])
    );

    return periods.map((period) => ({
      period,
      value: dataMap.get(period.getTime()) || 0,
    }));
  }

  private addMovingAverage(dataPoints: TrendDataPoint[], periods: number): TrendDataPoint[] {
    return dataPoints.map((point, index) => {
      if (index < periods - 1) {
        return point;
      }

      const windowStart = Math.max(0, index - periods + 1);
      const window = dataPoints.slice(windowStart, index + 1);
      const average = window.reduce((sum, p) => sum + p.value, 0) / window.length;

      return {
        ...point,
        movingAverage: Math.round(average * 100) / 100,
      };
    });
  }

  private addPeriodChanges(dataPoints: TrendDataPoint[]): TrendDataPoint[] {
    return dataPoints.map((point, index) => {
      if (index === 0) {
        return point;
      }

      const previousValue = dataPoints[index - 1].value;
      const changePercent = previousValue !== 0
        ? ((point.value - previousValue) / previousValue) * 100
        : 0;

      return {
        ...point,
        previousValue,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    });
  }

  private buildTrendAnalysis(
    type: TrendTypeType,
    periodType: TrendPeriodType,
    startDate: Date,
    endDate: Date,
    dataPoints: TrendDataPoint[]
  ): TrendAnalysis {
    const values = dataPoints.map((d) => d.value);
    const averageValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const totalChange = values.length > 0 ? values[values.length - 1] - values[0] : 0;
    const totalChangePercent = values[0] !== 0 ? (totalChange / values[0]) * 100 : 0;

    const variance = values.length > 0
      ? values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const volatility = averageValue !== 0 ? (stdDev / averageValue) * 100 : 0;

    const growthRate = values.length > 1 && values[0] > 0 && values[values.length - 1] > 0
      ? calculateCMGR(values[0], values[values.length - 1], values.length - 1)
      : 0;

    return {
      type,
      periodType,
      startDate,
      endDate,
      dataPoints,
      direction: getTrendDirection(values),
      averageValue: Math.round(averageValue * 100) / 100,
      minValue: Math.round(minValue * 100) / 100,
      maxValue: Math.round(maxValue * 100) / 100,
      totalChange: Math.round(totalChange * 100) / 100,
      totalChangePercent: Math.round(totalChangePercent * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
    };
  }

  private calculateCorrelations(trends: TrendAnalysis[]): TrendCorrelation[] {
    const correlations: TrendCorrelation[] = [];

    for (let i = 0; i < trends.length; i++) {
      for (let j = i + 1; j < trends.length; j++) {
        const trend1 = trends[i];
        const trend2 = trends[j];

        const values1 = trend1.dataPoints.map((d) => d.value);
        const values2 = trend2.dataPoints.map((d) => d.value);

        const minLength = Math.min(values1.length, values2.length);
        const v1 = values1.slice(0, minLength);
        const v2 = values2.slice(0, minLength);

        const correlation = this.pearsonCorrelation(v1, v2);
        const interpretation = this.interpretCorrelation(correlation);

        correlations.push({
          type1: trend1.type,
          type2: trend2.type,
          correlationCoefficient: Math.round(correlation * 1000) / 1000,
          interpretation,
        });
      }
    }

    return correlations;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private interpretCorrelation(r: number): string {
    if (r >= 0.7) return 'Strong positive correlation';
    if (r >= 0.3) return 'Moderate positive correlation';
    if (r >= -0.3) return 'Weak or no correlation';
    if (r >= -0.7) return 'Moderate negative correlation';
    return 'Strong negative correlation';
  }
}

export const trendsService = new TrendsService();
