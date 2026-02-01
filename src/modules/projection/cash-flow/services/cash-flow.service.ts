import { Types } from 'mongoose';
import {
  CashFlowForecast,
  ICashFlowForecast,
  ICashFlowItem,
  ICashFlowPeriodProjection,
} from '../models';
import {
  CreateCashFlowForecastInput,
  UpdateCashFlowForecastInput,
  AddProjectionItemsInput,
  CashFlowQueryInput,
} from '../schemas';
import { CashFlowStatus, CashFlowPeriod, CashFlowPeriodType } from '../../constants';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { Transaction } from '@/modules/tracking/transactions/models';

/**
 * Cash Flow Forecast Service
 *
 * Handles cash flow projections with:
 * - CRUD operations for forecasts
 * - Period-based projections (daily/weekly/monthly/quarterly)
 * - Integration with tracking module for actuals
 * - Summary and analytics
 */
export class CashFlowService {
  // ============ Cash Flow CRUD ============

  /**
   * Create a new cash flow forecast
   */
  async createForecast(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateCashFlowForecastInput
  ): Promise<ICashFlowForecast> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate <= startDate) {
      throw new BadRequestError('End date must be after start date');
    }

    // Generate initial projections based on period type
    const projections = this.generateEmptyProjections(
      startDate,
      endDate,
      input.periodType as CashFlowPeriodType,
      input.startingBalance
    );

    const forecast = new CashFlowForecast({
      organization: organizationId,
      name: input.name,
      description: input.description,
      fiscalYear: input.fiscalYear,
      periodType: input.periodType,
      status: CashFlowStatus.DRAFT,
      startDate,
      endDate,
      startingBalance: input.startingBalance,
      projections,
      linkedBudget: input.linkedBudgetId ? new Types.ObjectId(input.linkedBudgetId) : undefined,
      linkedRevenuePlan: input.linkedRevenuePlanId
        ? new Types.ObjectId(input.linkedRevenuePlanId)
        : undefined,
      currency: input.currency || 'USD',
      notes: input.notes,
      createdBy: userId,
    });

    await forecast.save();
    return forecast;
  }

  /**
   * Get cash flow forecasts with filtering
   */
  async getForecasts(
    organizationId: Types.ObjectId,
    query: CashFlowQueryInput
  ): Promise<{
    data: ICashFlowForecast[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { fiscalYear, status, periodType, page = 1, limit = 20, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (status) filter.status = status;
    if (periodType) filter.periodType = periodType;

    const total = await CashFlowForecast.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const forecasts = await CashFlowForecast.find(filter)
      .sort({ [sortBy || 'createdAt']: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: forecasts as unknown as ICashFlowForecast[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get cash flow forecast by ID
   */
  async getForecastById(
    organizationId: Types.ObjectId,
    forecastId: string
  ): Promise<ICashFlowForecast> {
    const forecast = await CashFlowForecast.findOne({
      _id: new Types.ObjectId(forecastId),
      organization: organizationId,
      isArchived: false,
    });

    if (!forecast) {
      throw new NotFoundError('Cash flow forecast not found');
    }

    return forecast;
  }

  /**
   * Update cash flow forecast
   */
  async updateForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId,
    input: UpdateCashFlowForecastInput
  ): Promise<ICashFlowForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    if (forecast.status === CashFlowStatus.ARCHIVED) {
      throw new BadRequestError('Cannot update archived forecast');
    }

    if (input.name) forecast.name = input.name;
    if (input.description !== undefined) forecast.description = input.description;
    if (input.notes !== undefined) forecast.notes = input.notes;

    if (input.startingBalance !== undefined) {
      forecast.startingBalance = input.startingBalance;
      // Recalculate projections with new starting balance
      this.recalculateProjections(forecast);
    }

    if (input.linkedBudgetId !== undefined) {
      forecast.linkedBudget = input.linkedBudgetId
        ? new Types.ObjectId(input.linkedBudgetId)
        : undefined;
    }

    if (input.linkedRevenuePlanId !== undefined) {
      forecast.linkedRevenuePlan = input.linkedRevenuePlanId
        ? new Types.ObjectId(input.linkedRevenuePlanId)
        : undefined;
    }

    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  /**
   * Archive cash flow forecast
   */
  async archiveForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    forecast.isArchived = true;
    forecast.status = CashFlowStatus.ARCHIVED;
    forecast.updatedBy = userId;

    await forecast.save();
  }

  // ============ Projection Management ============

  /**
   * Add items to a specific period projection
   */
  async addProjectionItems(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId,
    input: AddProjectionItemsInput
  ): Promise<ICashFlowForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    if (forecast.status === CashFlowStatus.ARCHIVED) {
      throw new BadRequestError('Cannot modify archived forecast');
    }

    const periodDate = new Date(input.period);
    const projectionIndex = forecast.projections.findIndex(
      (p) => p.period.getTime() === periodDate.getTime()
    );

    if (projectionIndex === -1) {
      throw new BadRequestError('Period not found in forecast');
    }

    const projection = forecast.projections[projectionIndex];

    if (input.inflows) {
      projection.inflows.push(...(input.inflows as ICashFlowItem[]));
    }

    if (input.outflows) {
      projection.outflows.push(...(input.outflows as ICashFlowItem[]));
    }

    // Recalculate totals for this period and subsequent periods
    this.recalculateProjections(forecast, projectionIndex);

    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  /**
   * Clear all items from a specific period
   */
  async clearPeriodItems(
    organizationId: Types.ObjectId,
    forecastId: string,
    periodDate: Date,
    userId: Types.ObjectId
  ): Promise<ICashFlowForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    const projectionIndex = forecast.projections.findIndex(
      (p) => p.period.getTime() === periodDate.getTime()
    );

    if (projectionIndex === -1) {
      throw new BadRequestError('Period not found in forecast');
    }

    const projection = forecast.projections[projectionIndex];
    projection.inflows = [];
    projection.outflows = [];

    this.recalculateProjections(forecast, projectionIndex);

    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  // ============ Status Management ============

  /**
   * Activate a cash flow forecast
   */
  async activateForecast(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId
  ): Promise<ICashFlowForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    if (forecast.status !== CashFlowStatus.DRAFT) {
      throw new BadRequestError('Only draft forecasts can be activated');
    }

    // Deactivate other active forecasts for the same fiscal year
    await CashFlowForecast.updateMany(
      {
        organization: organizationId,
        fiscalYear: forecast.fiscalYear,
        status: CashFlowStatus.ACTIVE,
        _id: { $ne: forecast._id },
      },
      { status: CashFlowStatus.DRAFT }
    );

    forecast.status = CashFlowStatus.ACTIVE;
    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  // ============ Analytics ============

  /**
   * Get cash flow summary with projections
   */
  async getCashFlowSummary(
    organizationId: Types.ObjectId,
    forecastId: string
  ): Promise<{
    periodType: CashFlowPeriodType;
    startDate: Date;
    endDate: Date;
    projections: Array<{
      period: Date;
      openingBalance: number;
      totalInflows: number;
      totalOutflows: number;
      netCashFlow: number;
      closingBalance: number;
    }>;
    totalInflows: number;
    totalOutflows: number;
    netChange: number;
    endingBalance: number;
    lowestBalance: number;
    lowestBalanceDate: Date;
  }> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    return {
      periodType: forecast.periodType as CashFlowPeriodType,
      startDate: forecast.startDate,
      endDate: forecast.endDate,
      projections: forecast.projections.map((p) => ({
        period: p.period,
        openingBalance: p.openingBalance,
        totalInflows: p.totalInflows,
        totalOutflows: p.totalOutflows,
        netCashFlow: p.netCashFlow,
        closingBalance: p.closingBalance,
      })),
      totalInflows: forecast.totalInflows,
      totalOutflows: forecast.totalOutflows,
      netChange: forecast.netChange,
      endingBalance: forecast.endingBalance,
      lowestBalance: forecast.lowestBalance,
      lowestBalanceDate: forecast.lowestBalanceDate || forecast.startDate,
    };
  }

  /**
   * Get daily projections (for a monthly forecast, breaks down by day)
   */
  async getDailyProjections(
    organizationId: Types.ObjectId,
    forecastId: string,
    month: Date
  ): Promise<Array<{ date: Date; balance: number; inflows: number; outflows: number }>> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    // Find the monthly projection
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const projection = forecast.projections.find((p) => {
      const pMonth = new Date(p.period.getFullYear(), p.period.getMonth(), 1);
      return pMonth.getTime() === monthStart.getTime();
    });

    if (!projection) {
      throw new NotFoundError('Month not found in forecast');
    }

    // Break down into daily projections (simple linear distribution)
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const dailyInflow = projection.totalInflows / daysInMonth;
    const dailyOutflow = projection.totalOutflows / daysInMonth;

    const dailyProjections = [];
    let balance = projection.openingBalance;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      balance += dailyInflow - dailyOutflow;
      dailyProjections.push({
        date,
        balance: Math.round(balance * 100) / 100,
        inflows: Math.round(dailyInflow * 100) / 100,
        outflows: Math.round(dailyOutflow * 100) / 100,
      });
    }

    return dailyProjections;
  }

  /**
   * Get weekly projections
   */
  async getWeeklyProjections(
    organizationId: Types.ObjectId,
    forecastId: string
  ): Promise<Array<{ weekStart: Date; weekEnd: Date; balance: number; inflows: number; outflows: number }>> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    const weeklyProjections = [];
    let currentWeekStart = new Date(forecast.startDate);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of week (Sunday)

    let runningBalance = forecast.startingBalance;

    while (currentWeekStart < forecast.endDate) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Calculate inflows/outflows for this week from monthly projections
      let weekInflows = 0;
      let weekOutflows = 0;

      for (const projection of forecast.projections) {
        const projectionMonth = new Date(
          projection.period.getFullYear(),
          projection.period.getMonth(),
          1
        );
        const projectionMonthEnd = new Date(
          projection.period.getFullYear(),
          projection.period.getMonth() + 1,
          0
        );

        // Check if week overlaps with this month
        if (currentWeekStart <= projectionMonthEnd && weekEnd >= projectionMonth) {
          // Calculate overlap days
          const overlapStart = new Date(
            Math.max(currentWeekStart.getTime(), projectionMonth.getTime())
          );
          const overlapEnd = new Date(Math.min(weekEnd.getTime(), projectionMonthEnd.getTime()));
          const overlapDays =
            Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const daysInMonth = projectionMonthEnd.getDate();
          const ratio = overlapDays / daysInMonth;

          weekInflows += projection.totalInflows * ratio;
          weekOutflows += projection.totalOutflows * ratio;
        }
      }

      runningBalance += weekInflows - weekOutflows;

      weeklyProjections.push({
        weekStart: new Date(currentWeekStart),
        weekEnd: new Date(weekEnd),
        balance: Math.round(runningBalance * 100) / 100,
        inflows: Math.round(weekInflows * 100) / 100,
        outflows: Math.round(weekOutflows * 100) / 100,
      });

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeklyProjections;
  }

  /**
   * Recalculate forecast with actual data from transactions
   */
  async recalculateWithActuals(
    organizationId: Types.ObjectId,
    forecastId: string,
    userId: Types.ObjectId
  ): Promise<ICashFlowForecast> {
    const forecast = await this.getForecastById(organizationId, forecastId);

    const today = new Date();

    for (const projection of forecast.projections) {
      // Only update projections for past periods
      if (projection.period > today) continue;

      const periodStart = new Date(projection.period);
      const periodEnd = new Date(periodStart);

      // Set period end based on period type
      if (forecast.periodType === CashFlowPeriod.MONTHLY) {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (forecast.periodType === CashFlowPeriod.WEEKLY) {
        periodEnd.setDate(periodEnd.getDate() + 7);
      } else if (forecast.periodType === CashFlowPeriod.DAILY) {
        periodEnd.setDate(periodEnd.getDate() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 3);
      }

      // Get actual transactions for this period
      const transactions = await Transaction.find({
        organization: organizationId,
        date: { $gte: periodStart, $lt: periodEnd },
        isArchived: false,
      });

      let actualInflows = 0;
      let actualOutflows = 0;

      for (const txn of transactions) {
        if (txn.type === 'income') {
          actualInflows += txn.amount;
        } else {
          actualOutflows += txn.amount;
        }
      }

      // Replace projected items with actuals
      projection.inflows = [
        {
          category: 'operating' as const,
          description: 'Actual Income',
          amount: actualInflows,
          isActual: true,
        },
      ];

      projection.outflows = [
        {
          category: 'operating' as const,
          description: 'Actual Expenses',
          amount: actualOutflows,
          isActual: true,
        },
      ];
    }

    // Recalculate all projections
    this.recalculateProjections(forecast);

    forecast.lastRecalculatedAt = new Date();
    forecast.updatedBy = userId;
    await forecast.save();

    return forecast;
  }

  // ============ Helper Methods ============

  /**
   * Generate empty projections based on period type
   */
  private generateEmptyProjections(
    startDate: Date,
    endDate: Date,
    periodType: CashFlowPeriodType,
    startingBalance: number
  ): ICashFlowPeriodProjection[] {
    const projections: ICashFlowPeriodProjection[] = [];
    let currentDate = new Date(startDate);
    let balance = startingBalance;

    while (currentDate < endDate) {
      projections.push({
        period: new Date(currentDate),
        openingBalance: balance,
        inflows: [],
        outflows: [],
        totalInflows: 0,
        totalOutflows: 0,
        netCashFlow: 0,
        closingBalance: balance,
      });

      // Move to next period
      if (periodType === CashFlowPeriod.DAILY) {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (periodType === CashFlowPeriod.WEEKLY) {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (periodType === CashFlowPeriod.MONTHLY) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 3);
      }
    }

    return projections;
  }

  /**
   * Recalculate projection totals and balances
   */
  private recalculateProjections(
    forecast: ICashFlowForecast,
    startIndex: number = 0
  ): void {
    let previousBalance =
      startIndex > 0
        ? forecast.projections[startIndex - 1].closingBalance
        : forecast.startingBalance;

    for (let i = startIndex; i < forecast.projections.length; i++) {
      const projection = forecast.projections[i];

      projection.openingBalance = previousBalance;
      projection.totalInflows = projection.inflows.reduce((sum, item) => sum + item.amount, 0);
      projection.totalOutflows = projection.outflows.reduce((sum, item) => sum + item.amount, 0);
      projection.netCashFlow = projection.totalInflows - projection.totalOutflows;
      projection.closingBalance = projection.openingBalance + projection.netCashFlow;

      previousBalance = projection.closingBalance;
    }
  }
}

export const cashFlowService = new CashFlowService();
