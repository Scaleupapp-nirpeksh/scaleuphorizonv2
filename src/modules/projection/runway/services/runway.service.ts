import { Types } from 'mongoose';
import { RunwaySnapshot, IRunwaySnapshot, IRunwayProjection, IRunwayAssumptions } from '../models';
import {
  CreateRunwaySnapshotInput,
  UpdateRunwaySnapshotInput,
  WhatIfAnalysisInput,
  RunwayQueryInput,
} from '../schemas';
import { RunwayScenario, getRunwayStatus, RunwayStatusType } from '../../constants';
import { NotFoundError } from '@/core/errors';
import { Transaction } from '@/modules/tracking/transactions/models';
import { BankAccount } from '@/modules/tracking/bank-sync/models';

/**
 * Runway Calculation Result
 */
interface RunwayCalculation {
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  netBurnRate: number;
  runwayMonths: number;
  runwayEndDate: Date;
  status: RunwayStatusType;
}

/**
 * What-If Analysis Result
 */
interface WhatIfResult {
  baseRunway: RunwayCalculation;
  adjustedRunway: RunwayCalculation;
  impactMonths: number;
  recommendation?: string;
}

/**
 * Runway Service
 *
 * Handles runway calculations with:
 * - Snapshot creation and management
 * - Multiple scenario support
 * - What-if analysis
 * - Integration with tracking module for actuals
 */
export class RunwayService {
  // ============ Runway CRUD ============

  /**
   * Create a new runway snapshot
   */
  async createSnapshot(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateRunwaySnapshotInput
  ): Promise<IRunwaySnapshot> {
    const netBurnRate = input.monthlyBurnRate - input.monthlyRevenue;
    const runwayMonths = this.calculateRunwayMonths(input.currentCash, netBurnRate);
    const runwayEndDate = this.calculateRunwayEndDate(runwayMonths);
    const status = getRunwayStatus(runwayMonths);

    const assumptions: IRunwayAssumptions = input.assumptions || {
      revenueGrowthRate: 0,
      expenseGrowthRate: 0,
    };

    // Generate projections
    const projections = this.generateProjections(
      input.currentCash,
      input.monthlyBurnRate,
      input.monthlyRevenue,
      assumptions,
      Math.min(runwayMonths + 6, 60) // Project to runway end + 6 months, max 5 years
    );

    const snapshot = new RunwaySnapshot({
      organization: organizationId,
      name: input.name,
      description: input.description,
      snapshotDate: new Date(),
      scenario: input.scenario || RunwayScenario.CURRENT,
      currentCash: input.currentCash,
      monthlyBurnRate: input.monthlyBurnRate,
      monthlyRevenue: input.monthlyRevenue,
      netBurnRate,
      runwayMonths,
      runwayEndDate,
      status,
      assumptions,
      projections,
      linkedBankAccounts: input.linkedBankAccountIds?.map((id) => new Types.ObjectId(id)),
      linkedBudget: input.linkedBudgetId ? new Types.ObjectId(input.linkedBudgetId) : undefined,
      notes: input.notes,
      createdBy: userId,
    });

    await snapshot.save();
    return snapshot;
  }

  /**
   * Get runway snapshots with filtering
   */
  async getSnapshots(
    organizationId: Types.ObjectId,
    query: RunwayQueryInput
  ): Promise<{
    data: IRunwaySnapshot[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { scenario, status, startDate, endDate, page = 1, limit = 20, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (scenario) filter.scenario = scenario;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.snapshotDate = {};
      if (startDate) (filter.snapshotDate as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (filter.snapshotDate as Record<string, unknown>).$lte = new Date(endDate);
    }

    const total = await RunwaySnapshot.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const snapshots = await RunwaySnapshot.find(filter)
      .sort({ [sortBy || 'snapshotDate']: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: snapshots as unknown as IRunwaySnapshot[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get runway snapshot by ID
   */
  async getSnapshotById(
    organizationId: Types.ObjectId,
    snapshotId: string
  ): Promise<IRunwaySnapshot> {
    const snapshot = await RunwaySnapshot.findOne({
      _id: new Types.ObjectId(snapshotId),
      organization: organizationId,
      isArchived: false,
    });

    if (!snapshot) {
      throw new NotFoundError('Runway snapshot not found');
    }

    return snapshot;
  }

  /**
   * Update runway snapshot
   */
  async updateSnapshot(
    organizationId: Types.ObjectId,
    snapshotId: string,
    userId: Types.ObjectId,
    input: UpdateRunwaySnapshotInput
  ): Promise<IRunwaySnapshot> {
    const snapshot = await this.getSnapshotById(organizationId, snapshotId);

    if (input.name) snapshot.name = input.name;
    if (input.description !== undefined) snapshot.description = input.description;
    if (input.notes !== undefined) snapshot.notes = input.notes;

    if (input.assumptions) {
      snapshot.assumptions = { ...snapshot.assumptions, ...input.assumptions };

      // Recalculate projections with new assumptions
      const projections = this.generateProjections(
        snapshot.currentCash,
        snapshot.monthlyBurnRate,
        snapshot.monthlyRevenue,
        snapshot.assumptions,
        Math.min(snapshot.runwayMonths + 6, 60)
      );
      snapshot.projections = projections;
    }

    snapshot.updatedBy = userId;
    await snapshot.save();

    return snapshot;
  }

  /**
   * Archive runway snapshot
   */
  async archiveSnapshot(
    organizationId: Types.ObjectId,
    snapshotId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const snapshot = await this.getSnapshotById(organizationId, snapshotId);

    snapshot.isArchived = true;
    snapshot.updatedBy = userId;

    await snapshot.save();
  }

  // ============ Current Runway Calculation ============

  /**
   * Get current runway based on actual data
   */
  async getCurrentRunway(organizationId: Types.ObjectId): Promise<RunwayCalculation> {
    // Get current cash from bank accounts
    const bankAccounts = await BankAccount.find({
      organization: organizationId,
      isActive: true,
    });

    const currentCash = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Calculate monthly burn rate from last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await Transaction.find({
      organization: organizationId,
      date: { $gte: threeMonthsAgo },
      isArchived: false,
    });

    let totalExpenses = 0;
    let totalRevenue = 0;

    for (const txn of transactions) {
      if (txn.type === 'expense') {
        totalExpenses += txn.amount;
      } else {
        totalRevenue += txn.amount;
      }
    }

    // Calculate monthly averages
    const monthlyBurnRate = totalExpenses / 3;
    const monthlyRevenue = totalRevenue / 3;
    const netBurnRate = monthlyBurnRate - monthlyRevenue;
    const runwayMonths = this.calculateRunwayMonths(currentCash, netBurnRate);
    const runwayEndDate = this.calculateRunwayEndDate(runwayMonths);
    const status = getRunwayStatus(runwayMonths);

    return {
      currentCash,
      monthlyBurnRate: Math.round(monthlyBurnRate * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      netBurnRate: Math.round(netBurnRate * 100) / 100,
      runwayMonths: Math.round(runwayMonths * 10) / 10,
      runwayEndDate,
      status,
    };
  }

  // ============ Runway History ============

  /**
   * Get runway history over time
   */
  async getRunwayHistory(
    organizationId: Types.ObjectId,
    months: number = 12
  ): Promise<Array<{ date: Date; runwayMonths: number; status: RunwayStatusType }>> {
    const snapshots = await RunwaySnapshot.find({
      organization: organizationId,
      isArchived: false,
      scenario: RunwayScenario.CURRENT,
    })
      .sort({ snapshotDate: -1 })
      .limit(months)
      .lean();

    return snapshots.map((s) => ({
      date: s.snapshotDate,
      runwayMonths: s.runwayMonths,
      status: s.status as RunwayStatusType,
    }));
  }

  // ============ Scenario Comparison ============

  /**
   * Get runway for different scenarios
   */
  async getScenarioComparison(
    organizationId: Types.ObjectId
  ): Promise<Record<string, RunwayCalculation>> {
    const current = await this.getCurrentRunway(organizationId);

    // Generate different scenarios
    const scenarios: Record<string, RunwayCalculation> = {
      current: current,
    };

    // Best case: 20% more revenue, 10% less expenses
    const bestCase = this.calculateScenario(
      current.currentCash,
      current.monthlyBurnRate * 0.9,
      current.monthlyRevenue * 1.2
    );
    scenarios.best_case = bestCase;

    // Worst case: 10% less revenue, 20% more expenses
    const worstCase = this.calculateScenario(
      current.currentCash,
      current.monthlyBurnRate * 1.2,
      current.monthlyRevenue * 0.9
    );
    scenarios.worst_case = worstCase;

    // No growth: Current state with 0% growth
    const noGrowth = this.calculateScenario(
      current.currentCash,
      current.monthlyBurnRate,
      current.monthlyRevenue
    );
    scenarios.no_growth = noGrowth;

    return scenarios;
  }

  // ============ What-If Analysis ============

  /**
   * Perform what-if analysis
   */
  async whatIfAnalysis(
    organizationId: Types.ObjectId,
    input: WhatIfAnalysisInput
  ): Promise<WhatIfResult> {
    const current = await this.getCurrentRunway(organizationId);

    // Apply adjustments
    const adjustedCash = input.currentCash ?? current.currentCash;
    let adjustedBurn = input.monthlyBurnRate ?? current.monthlyBurnRate;
    let adjustedRevenue = input.monthlyRevenue ?? current.monthlyRevenue;

    // Apply growth rates for future projections
    if (input.revenueGrowthRate) {
      adjustedRevenue *= 1 + input.revenueGrowthRate / 100;
    }
    if (input.expenseGrowthRate) {
      adjustedBurn *= 1 + input.expenseGrowthRate / 100;
    }

    // Apply one-time adjustments
    let effectiveCash = adjustedCash;
    if (input.oneTimeInflows) {
      effectiveCash += input.oneTimeInflows;
    }
    if (input.oneTimeOutflows) {
      effectiveCash -= input.oneTimeOutflows;
    }

    // Apply hiring costs
    if (input.newHiringCost) {
      adjustedBurn += input.newHiringCost;
    }

    const adjustedRunway = this.calculateScenario(effectiveCash, adjustedBurn, adjustedRevenue);

    const impactMonths = adjustedRunway.runwayMonths - current.runwayMonths;

    // Generate recommendation
    let recommendation: string | undefined;
    if (impactMonths < -3) {
      recommendation =
        'This change significantly reduces runway. Consider reducing expenses or increasing revenue.';
    } else if (impactMonths < 0) {
      recommendation =
        'This change reduces runway. Monitor closely and consider offsetting measures.';
    } else if (impactMonths > 6) {
      recommendation = 'This change significantly extends runway. Consider investing in growth.';
    } else if (impactMonths > 0) {
      recommendation = 'This change improves runway health.';
    }

    return {
      baseRunway: current,
      adjustedRunway,
      impactMonths: Math.round(impactMonths * 10) / 10,
      recommendation,
    };
  }

  // ============ Helper Methods ============

  /**
   * Calculate runway months from cash and net burn rate
   */
  private calculateRunwayMonths(cash: number, netBurnRate: number): number {
    if (netBurnRate <= 0) {
      // If net burn is 0 or negative (profitable), runway is infinite
      return 999; // Use 999 as "infinite"
    }
    return cash / netBurnRate;
  }

  /**
   * Calculate runway end date
   */
  private calculateRunwayEndDate(runwayMonths: number): Date {
    const endDate = new Date();
    if (runwayMonths >= 999) {
      endDate.setFullYear(endDate.getFullYear() + 100); // Effectively infinite
    } else {
      endDate.setMonth(endDate.getMonth() + Math.floor(runwayMonths));
    }
    return endDate;
  }

  /**
   * Calculate runway for a scenario
   */
  private calculateScenario(
    cash: number,
    monthlyBurn: number,
    monthlyRevenue: number
  ): RunwayCalculation {
    const netBurnRate = monthlyBurn - monthlyRevenue;
    const runwayMonths = this.calculateRunwayMonths(cash, netBurnRate);
    const runwayEndDate = this.calculateRunwayEndDate(runwayMonths);
    const status = getRunwayStatus(runwayMonths);

    return {
      currentCash: Math.round(cash * 100) / 100,
      monthlyBurnRate: Math.round(monthlyBurn * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      netBurnRate: Math.round(netBurnRate * 100) / 100,
      runwayMonths: Math.round(runwayMonths * 10) / 10,
      runwayEndDate,
      status,
    };
  }

  /**
   * Generate monthly projections
   */
  private generateProjections(
    startingCash: number,
    monthlyBurn: number,
    monthlyRevenue: number,
    assumptions: IRunwayAssumptions,
    months: number
  ): IRunwayProjection[] {
    const projections: IRunwayProjection[] = [];
    let cash = startingCash;
    let currentBurn = monthlyBurn;
    let currentRevenue = monthlyRevenue;
    let cumulativeMonths = 0;

    // Apply one-time adjustments to first month
    let oneTimeInflowApplied = false;
    let oneTimeOutflowApplied = false;

    for (let i = 0; i < months; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() + i);
      month.setDate(1);
      month.setHours(0, 0, 0, 0);

      const startingCashForMonth = cash;

      // Apply growth rates
      if (i > 0) {
        currentRevenue *= 1 + (assumptions.revenueGrowthRate || 0) / 100;
        currentBurn *= 1 + (assumptions.expenseGrowthRate || 0) / 100;
      }

      // Apply one-time adjustments in first month
      let periodRevenue = currentRevenue;
      let periodExpenses = currentBurn;

      if (!oneTimeInflowApplied && assumptions.oneTimeInflows) {
        periodRevenue += assumptions.oneTimeInflows;
        oneTimeInflowApplied = true;
      }

      if (!oneTimeOutflowApplied && assumptions.oneTimeOutflows) {
        periodExpenses += assumptions.oneTimeOutflows;
        oneTimeOutflowApplied = true;
      }

      // Add hiring costs
      if (assumptions.newHiringCost) {
        periodExpenses += assumptions.newHiringCost;
      }

      const netCashFlow = periodRevenue - periodExpenses;
      cash += netCashFlow;

      // Calculate cumulative months of runway at this point
      if (cash > 0 && periodExpenses > periodRevenue) {
        cumulativeMonths = i + 1 + cash / (periodExpenses - periodRevenue);
      } else if (cash > 0) {
        cumulativeMonths = 999;
      } else {
        cumulativeMonths = i + 1;
      }

      projections.push({
        month,
        startingCash: Math.round(startingCashForMonth * 100) / 100,
        projectedRevenue: Math.round(periodRevenue * 100) / 100,
        projectedExpenses: Math.round(periodExpenses * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        endingCash: Math.round(cash * 100) / 100,
        cumulativeMonths: Math.round(cumulativeMonths * 10) / 10,
      });

      // Stop projections if cash runs out
      if (cash <= 0) break;
    }

    return projections;
  }
}

export const runwayService = new RunwayService();
