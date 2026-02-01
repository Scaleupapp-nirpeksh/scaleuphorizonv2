import { Types } from 'mongoose';
import { Forecast, IForecast, IForecastDataPoint } from '../models';
import {
  CreateForecastInput,
  UpdateForecastInput,
  RetrainForecastInput,
  ForecastQueryInput,
} from '../schemas';
import {
  ForecastType,
  ForecastMethod,
  ForecastStatus,
  ForecastConfidence,
  ForecastTypeType,
  ForecastMethodType,
  ForecastConfidenceType,
  getForecastConfidence,
} from '../../constants';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { Transaction } from '@/modules/tracking/transactions/models';
import { Account } from '@/modules/chart-of-accounts/models';

/**
 * Monthly Data Point for analysis
 */
interface MonthlyData {
  month: Date;
  value: number;
}

/**
 * Forecast Service
 *
 * Handles revenue/expense forecasting with:
 * - Multiple forecasting methods (linear, exponential, weighted average)
 * - Accuracy metrics (MAPE, RMSE)
 * - Trend and seasonality detection
 * - Integration with tracking module for historical data
 */
export class ForecastService {
  // ============ Forecast CRUD ============

  /**
   * Create a new forecast
   */
  async createForecast(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateForecastInput
  ): Promise<IForecast> {
    // Get historical data
    const historicalData = await this.getHistoricalData(
      organizationId,
      input.type as ForecastTypeType,
      input.historicalMonths,
      input.accountId
    );

    if (historicalData.length < 3) {
      throw new BadRequestError('Insufficient historical data for forecasting (minimum 3 months)');
    }

    // Generate forecast
    const {
      dataPoints,
      accuracy,
      mape,
      rmse,
      trend,
      trendSlope,
      seasonality,
      totalHistorical,
      totalForecast,
      averageGrowthRate,
    } = await this.generateForecast(
      historicalData,
      input.forecastMonths,
      input.method as ForecastMethodType,
      input.customAssumptions
    );

    // Get account name if specified
    let accountName: string | undefined;
    if (input.accountId) {
      const account = await Account.findById(input.accountId);
      accountName = account?.name;
    }

    const startDate = historicalData[0].month;
    const endDate = dataPoints[dataPoints.length - 1].period;

    const forecast = new Forecast({
      organization: organizationId,
      name: input.name,
      description: input.description,
      type: input.type,
      method: input.method,
      status: ForecastStatus.DRAFT,
      historicalMonths: input.historicalMonths,
      forecastMonths: input.forecastMonths,
      startDate,
      endDate,
      account: input.accountId ? new Types.ObjectId(input.accountId) : undefined,
      accountName,
      dataPoints,
      accuracy,
      mape,
      rmse,
      trend,
      trendSlope,
      seasonality,
      totalHistorical,
      totalForecast,
      averageGrowthRate,
      customAssumptions: input.customAssumptions,
      lastTrainedAt: new Date(),
      notes: input.notes,
      createdBy: userId,
    });

    await forecast.save();
    return forecast;
  }

  /**
   * Get forecasts with filtering
   */
  async getForecasts(
    organizationId: Types.ObjectId,
    query: ForecastQueryInput
  ): Promise<{
    data: IForecast[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { type, status, method, page = 1, limit = 20, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (method) filter.method = method;

    const total = await Forecast.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const forecasts = await Forecast.find(filter)
      .sort({ [sortBy || 'createdAt']: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: forecasts as unknown as IForecast[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get forecast by ID
   */
  async getForecastById(organizationId: Types.ObjectId, forecastId: string): Promise<IForecast> {
    const forecast = await Forecast.findOne({
      _id: new Types.ObjectId(forecastId),
      organization: organizationId,
      isArchived: false,
    });

    if (!forecast) {
      throw new NotFoundError('Forecast not found');
    }

    return forecast;
  }

  /**
   * Update forecast
   */
  async updateForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId,
    input: UpdateForecastInput
  ): Promise<IForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    if (input.name) forecast.name = input.name;
    if (input.description !== undefined) forecast.description = input.description;
    if (input.notes !== undefined) forecast.notes = input.notes;

    if (input.customAssumptions) {
      forecast.customAssumptions = input.customAssumptions;
    }

    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  /**
   * Archive forecast
   */
  async archiveForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    forecast.isArchived = true;
    forecast.status = ForecastStatus.ARCHIVED;
    forecast.updatedBy = userId;

    await forecast.save();
  }

  // ============ Status Management ============

  /**
   * Activate a forecast
   */
  async activateForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId
  ): Promise<IForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    if (forecast.status !== ForecastStatus.DRAFT) {
      throw new BadRequestError('Only draft forecasts can be activated');
    }

    // Deactivate other active forecasts of the same type
    await Forecast.updateMany(
      {
        organization: organizationId,
        type: forecast.type,
        status: ForecastStatus.ACTIVE,
        _id: { $ne: forecast._id },
      },
      { status: ForecastStatus.DRAFT }
    );

    forecast.status = ForecastStatus.ACTIVE;
    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  // ============ Retrain Forecast ============

  /**
   * Retrain forecast with new parameters
   */
  async retrainForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId,
    input: RetrainForecastInput
  ): Promise<IForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    const historicalMonths = input.historicalMonths || forecast.historicalMonths;
    const forecastMonths = input.forecastMonths || forecast.forecastMonths;
    const method = (input.method as ForecastMethodType) || (forecast.method as ForecastMethodType);

    // Get fresh historical data
    const historicalData = await this.getHistoricalData(
      organizationId,
      forecast.type as ForecastTypeType,
      historicalMonths,
      forecast.account?.toString()
    );

    if (historicalData.length < 3) {
      throw new BadRequestError('Insufficient historical data for retraining');
    }

    // Regenerate forecast
    const {
      dataPoints,
      accuracy,
      mape,
      rmse,
      trend,
      trendSlope,
      seasonality,
      totalHistorical,
      totalForecast,
      averageGrowthRate,
    } = await this.generateForecast(
      historicalData,
      forecastMonths,
      method,
      forecast.customAssumptions
    );

    forecast.historicalMonths = historicalMonths;
    forecast.forecastMonths = forecastMonths;
    forecast.method = method;
    forecast.startDate = historicalData[0].month;
    forecast.endDate = dataPoints[dataPoints.length - 1].period;
    forecast.dataPoints = dataPoints;
    forecast.accuracy = accuracy;
    forecast.mape = mape;
    forecast.rmse = rmse;
    forecast.trend = trend;
    forecast.trendSlope = trendSlope;
    forecast.seasonality = seasonality;
    forecast.totalHistorical = totalHistorical;
    forecast.totalForecast = totalForecast;
    forecast.averageGrowthRate = averageGrowthRate;
    forecast.lastTrainedAt = new Date();
    forecast.updatedBy = userId;

    await forecast.save();

    return forecast;
  }

  // ============ Forecast Summary ============

  /**
   * Get forecast summary for all types
   */
  async getForecastSummary(organizationId: Types.ObjectId): Promise<{
    revenue: { current: number; forecast: number; growthRate: number; trend: string };
    expenses: { current: number; forecast: number; growthRate: number; trend: string };
    burnRate: { current: number; forecast: number; trend: string };
  }> {
    // Get or create forecasts for each type
    const revenueForecast = await Forecast.findActiveForecast(
      organizationId,
      ForecastType.REVENUE as ForecastTypeType
    );
    const expenseForecast = await Forecast.findActiveForecast(
      organizationId,
      ForecastType.EXPENSE as ForecastTypeType
    );

    // Default values
    const defaultResult = { current: 0, forecast: 0, growthRate: 0, trend: 'stable' };

    const revenue = revenueForecast
      ? {
          current: revenueForecast.totalHistorical / revenueForecast.historicalMonths,
          forecast: revenueForecast.totalForecast / revenueForecast.forecastMonths,
          growthRate: revenueForecast.averageGrowthRate,
          trend: revenueForecast.trend,
        }
      : defaultResult;

    const expenses = expenseForecast
      ? {
          current: expenseForecast.totalHistorical / expenseForecast.historicalMonths,
          forecast: expenseForecast.totalForecast / expenseForecast.forecastMonths,
          growthRate: expenseForecast.averageGrowthRate,
          trend: expenseForecast.trend,
        }
      : defaultResult;

    const burnRate = {
      current: expenses.current - revenue.current,
      forecast: expenses.forecast - revenue.forecast,
      trend:
        expenses.forecast - revenue.forecast > expenses.current - revenue.current
          ? 'increasing'
          : expenses.forecast - revenue.forecast < expenses.current - revenue.current
            ? 'decreasing'
            : 'stable',
    };

    return { revenue, expenses, burnRate };
  }

  // ============ Quick Forecasts ============

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(
    organizationId: Types.ObjectId,
    months: number = 12
  ): Promise<IForecastDataPoint[]> {
    const historicalData = await this.getHistoricalData(
      organizationId,
      ForecastType.REVENUE as ForecastTypeType,
      12
    );

    if (historicalData.length < 3) {
      return [];
    }

    const { dataPoints } = await this.generateForecast(
      historicalData,
      months,
      ForecastMethod.LINEAR as ForecastMethodType
    );

    // Return only forecast points (not historical)
    return dataPoints.filter((dp) => dp.actual === undefined);
  }

  /**
   * Get expense forecast
   */
  async getExpenseForecast(
    organizationId: Types.ObjectId,
    months: number = 12
  ): Promise<IForecastDataPoint[]> {
    const historicalData = await this.getHistoricalData(
      organizationId,
      ForecastType.EXPENSE as ForecastTypeType,
      12
    );

    if (historicalData.length < 3) {
      return [];
    }

    const { dataPoints } = await this.generateForecast(
      historicalData,
      months,
      ForecastMethod.LINEAR as ForecastMethodType
    );

    return dataPoints.filter((dp) => dp.actual === undefined);
  }

  /**
   * Get burn rate forecast
   */
  async getBurnRateForecast(
    organizationId: Types.ObjectId,
    months: number = 12
  ): Promise<IForecastDataPoint[]> {
    const revenueData = await this.getHistoricalData(
      organizationId,
      ForecastType.REVENUE as ForecastTypeType,
      12
    );
    const expenseData = await this.getHistoricalData(
      organizationId,
      ForecastType.EXPENSE as ForecastTypeType,
      12
    );

    // Calculate burn rate (expense - revenue)
    const burnRateData: MonthlyData[] = [];
    for (let i = 0; i < Math.min(revenueData.length, expenseData.length); i++) {
      burnRateData.push({
        month: revenueData[i].month,
        value: expenseData[i].value - revenueData[i].value,
      });
    }

    if (burnRateData.length < 3) {
      return [];
    }

    const { dataPoints } = await this.generateForecast(
      burnRateData,
      months,
      ForecastMethod.LINEAR as ForecastMethodType
    );

    return dataPoints.filter((dp) => dp.actual === undefined);
  }

  // ============ Helper Methods ============

  /**
   * Get historical data from transactions
   */
  private async getHistoricalData(
    organizationId: Types.ObjectId,
    type: ForecastTypeType,
    months: number,
    accountId?: string
  ): Promise<MonthlyData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const matchStage: Record<string, unknown> = {
      organization: organizationId,
      date: { $gte: startDate },
      isArchived: false,
    };

    // Map forecast type to transaction type
    if (type === ForecastType.REVENUE) {
      matchStage.type = 'income';
    } else if (type === ForecastType.EXPENSE) {
      matchStage.type = 'expense';
    }

    if (accountId) {
      matchStage.account = new Types.ObjectId(accountId);
    }

    const aggregation = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return aggregation.map((item) => ({
      month: new Date(item._id.year, item._id.month - 1, 1),
      value: item.total,
    }));
  }

  /**
   * Generate forecast based on method
   */
  private async generateForecast(
    historicalData: MonthlyData[],
    forecastMonths: number,
    method: ForecastMethodType,
    customAssumptions?: Record<string, number>
  ): Promise<{
    dataPoints: IForecastDataPoint[];
    accuracy: number;
    mape: number;
    rmse: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendSlope: number;
    seasonality: 'detected' | 'not_detected';
    totalHistorical: number;
    totalForecast: number;
    averageGrowthRate: number;
  }> {
    const dataPoints: IForecastDataPoint[] = [];
    const values = historicalData.map((d) => d.value);

    // Calculate trend using linear regression
    const { slope, intercept } = this.linearRegression(values);
    const trend: 'increasing' | 'decreasing' | 'stable' =
      slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable';

    // Detect seasonality (simple check for 12-month pattern)
    const seasonality = historicalData.length >= 12 ? 'detected' : 'not_detected';

    // Add historical data points
    let totalHistorical = 0;
    for (const data of historicalData) {
      dataPoints.push({
        period: data.month,
        actual: data.value,
        predicted: data.value,
        lowerBound: data.value,
        upperBound: data.value,
        confidence: ForecastConfidence.HIGH as ForecastConfidenceType,
      });
      totalHistorical += data.value;
    }

    // Generate forecasts
    let totalForecast = 0;
    const lastMonth = historicalData[historicalData.length - 1].month;
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length
    );

    for (let i = 1; i <= forecastMonths; i++) {
      const forecastMonth = new Date(lastMonth);
      forecastMonth.setMonth(forecastMonth.getMonth() + i);

      let predicted: number;

      switch (method) {
        case ForecastMethod.LINEAR:
          predicted = intercept + slope * (values.length + i);
          break;

        case ForecastMethod.EXPONENTIAL:
          const growthRate = this.calculateGrowthRate(values);
          predicted = values[values.length - 1] * Math.pow(1 + growthRate, i);
          break;

        case ForecastMethod.WEIGHTED_AVERAGE:
          predicted = this.weightedMovingAverage(values, 3) * (1 + slope * i * 0.1);
          break;

        case ForecastMethod.SEASONAL:
          // Use same month from previous year if available
          const seasonalIndex = i % 12;
          const baseValue =
            historicalData.length > seasonalIndex
              ? historicalData[historicalData.length - 12 + seasonalIndex]?.value || avgValue
              : avgValue;
          predicted = baseValue * (1 + slope * 0.1);
          break;

        case ForecastMethod.MANUAL:
          // Use custom growth rate if provided
          const manualGrowth = customAssumptions?.growthRate || 0;
          predicted = values[values.length - 1] * Math.pow(1 + manualGrowth / 100, i);
          break;

        default:
          predicted = avgValue;
      }

      // Ensure non-negative predictions
      predicted = Math.max(0, predicted);

      // Calculate confidence intervals
      const confidenceMultiplier = 1 + i * 0.1; // Wider intervals for further predictions
      const lowerBound = Math.max(0, predicted - stdDev * confidenceMultiplier);
      const upperBound = predicted + stdDev * confidenceMultiplier;

      // Determine confidence level based on forecast distance
      const confidenceScore = Math.max(0, 100 - i * 5);
      const confidence = getForecastConfidence(confidenceScore);

      dataPoints.push({
        period: forecastMonth,
        predicted: Math.round(predicted * 100) / 100,
        lowerBound: Math.round(lowerBound * 100) / 100,
        upperBound: Math.round(upperBound * 100) / 100,
        confidence,
      });

      totalForecast += predicted;
    }

    // Calculate accuracy metrics using backtesting
    const { mape, rmse } = this.calculateAccuracyMetrics(values, intercept, slope);
    const accuracy = Math.max(0, 100 - mape);

    // Calculate average growth rate
    const averageGrowthRate = this.calculateGrowthRate(values) * 100;

    return {
      dataPoints,
      accuracy: Math.round(accuracy * 100) / 100,
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      trend,
      trendSlope: Math.round(slope * 1000) / 1000,
      seasonality,
      totalHistorical: Math.round(totalHistorical * 100) / 100,
      totalForecast: Math.round(totalForecast * 100) / 100,
      averageGrowthRate: Math.round(averageGrowthRate * 100) / 100,
    };
  }

  /**
   * Linear regression calculation
   */
  private linearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? 0 : intercept };
  }

  /**
   * Calculate growth rate from values
   */
  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) return 0;

    return (last - first) / first / (values.length - 1);
  }

  /**
   * Weighted moving average
   */
  private weightedMovingAverage(values: number[], periods: number): number {
    const n = Math.min(periods, values.length);
    const recentValues = values.slice(-n);

    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < recentValues.length; i++) {
      const weight = i + 1;
      weightedSum += recentValues[i] * weight;
      weightSum += weight;
    }

    return weightedSum / weightSum;
  }

  /**
   * Calculate accuracy metrics
   */
  private calculateAccuracyMetrics(
    values: number[],
    intercept: number,
    slope: number
  ): { mape: number; rmse: number } {
    let mapeSum = 0;
    let rmseSum = 0;

    for (let i = 0; i < values.length; i++) {
      const predicted = intercept + slope * i;
      const actual = values[i];

      if (actual !== 0) {
        mapeSum += Math.abs((actual - predicted) / actual);
      }
      rmseSum += Math.pow(actual - predicted, 2);
    }

    const mape = (mapeSum / values.length) * 100;
    const rmse = Math.sqrt(rmseSum / values.length);

    return { mape, rmse };
  }
}

export const forecastService = new ForecastService();
