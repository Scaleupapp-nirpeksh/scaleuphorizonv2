/**
 * Variance Service
 *
 * Calculates variance between planned (from Planning module)
 * and actual data (from Tracking module)
 */

import { Types } from 'mongoose';
import { Budget, IBudget } from '@/modules/planning/budget/models/budget.model';
import { BudgetItem, IBudgetItem } from '@/modules/planning/budget/models/budget-item.model';
import { RevenuePlan } from '@/modules/planning/revenue-plan/models/revenue-plan.model';
import { RevenueStream } from '@/modules/planning/revenue-plan/models/revenue-stream.model';
import { HeadcountPlan } from '@/modules/planning/headcount/models/headcount-plan.model';
import { PlannedRole } from '@/modules/planning/headcount/models/planned-role.model';
import { Expense } from '@/modules/tracking/expenses/models/expense.model';
import { RevenueEntry } from '@/modules/tracking/revenue/models/revenue-entry.model';
import { Transaction } from '@/modules/tracking/transactions/models/transaction.model';
import { NotFoundError } from '@/core/errors';
import {
  VarianceType,
  VariancePeriod,
  getVarianceStatus,
} from '../../constants';
import {
  VarianceItem,
  VarianceReport,
  CategoryVariance,
  MonthlyVariance,
} from '../../types';
import {
  VarianceQueryInput,
  MonthlyVarianceQueryInput,
  CategoryVarianceQueryInput,
} from '../schemas';

export class VarianceService {
  // ============ Budget Variance ============

  /**
   * Get budget vs actual variance report
   */
  async getBudgetVariance(
    organizationId: Types.ObjectId,
    query: VarianceQueryInput
  ): Promise<VarianceReport> {
    const fiscalYear = query.fiscalYear || new Date().getFullYear();
    const period = query.period || VariancePeriod.YEARLY;

    // Get active budget
    let budget: IBudget | null;
    if (query.budgetId) {
      budget = await Budget.findOne({
        _id: new Types.ObjectId(query.budgetId),
        organization: organizationId,
        isArchived: false,
      });
    } else {
      budget = await Budget.findOne({
        organization: organizationId,
        fiscalYear,
        status: { $in: ['active', 'approved'] },
        isArchived: false,
      });
    }

    if (!budget) {
      throw new NotFoundError('No active budget found for the specified period');
    }

    // Get budget items
    const budgetItems = await BudgetItem.find({
      budget: budget._id,
      isArchived: false,
    }).populate('account', 'code name type subtype');

    // Determine date range
    const { startDate, endDate } = this.getDateRange(fiscalYear, period, query.startDate, query.endDate);

    // Get actual expenses for the period
    const expenses = await Expense.find({
      organization: organizationId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] },
      isArchived: false,
    }).populate('account', 'code name type subtype');

    // Also get transactions for comprehensive view
    const transactions = await Transaction.find({
      organization: organizationId,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
      isArchived: false,
    });

    // Calculate variances
    const items: VarianceItem[] = [];
    const categoryTotals: Map<string, { planned: number; actual: number; count: number }> = new Map();

    let totalPlanned = 0;
    let totalActual = 0;

    for (const budgetItem of budgetItems) {
      // Calculate planned amount for the period
      const plannedAmount = this.getPlannedAmountForPeriod(budgetItem, startDate, endDate);
      totalPlanned += plannedAmount;

      // Calculate actual amount from expenses
      const actualAmount = this.getActualExpenseAmount(
        expenses,
        transactions,
        budgetItem.account.toString(),
        budgetItem.category
      );
      totalActual += actualAmount;

      const variance = actualAmount - plannedAmount;
      const variancePercent = plannedAmount !== 0 ? (variance / plannedAmount) * 100 : 0;
      const status = getVarianceStatus(variancePercent / 100, true);

      items.push({
        category: budgetItem.category,
        subcategory: budgetItem.department,
        accountId: budgetItem.account,
        name: budgetItem.name,
        planned: Math.round(plannedAmount * 100) / 100,
        actual: Math.round(actualAmount * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status,
      });

      // Aggregate by category
      const categoryData = categoryTotals.get(budgetItem.category) || {
        planned: 0,
        actual: 0,
        count: 0,
      };
      categoryData.planned += plannedAmount;
      categoryData.actual += actualAmount;
      categoryData.count++;
      categoryTotals.set(budgetItem.category, categoryData);
    }

    // Build category variance summary
    const byCategory: CategoryVariance[] = [];
    for (const [category, data] of categoryTotals) {
      const variance = data.actual - data.planned;
      const variancePercent = data.planned !== 0 ? (variance / data.planned) * 100 : 0;
      byCategory.push({
        category,
        planned: Math.round(data.planned * 100) / 100,
        actual: Math.round(data.actual * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: getVarianceStatus(variancePercent / 100, true),
        itemCount: data.count,
      });
    }

    const totalVariance = totalActual - totalPlanned;
    const totalVariancePercent = totalPlanned !== 0 ? (totalVariance / totalPlanned) * 100 : 0;

    return {
      type: VarianceType.BUDGET,
      period,
      startDate,
      endDate,
      fiscalYear,
      totalPlanned: Math.round(totalPlanned * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalVariance: Math.round(totalVariance * 100) / 100,
      totalVariancePercent: Math.round(totalVariancePercent * 100) / 100,
      overallStatus: getVarianceStatus(totalVariancePercent / 100, true),
      items,
      byCategory,
    };
  }

  /**
   * Get monthly budget variance breakdown
   */
  async getMonthlyBudgetVariance(
    organizationId: Types.ObjectId,
    query: MonthlyVarianceQueryInput
  ): Promise<MonthlyVariance[]> {
    const fiscalYear = query.fiscalYear;

    // Get budget
    let budget: IBudget | null;
    if (query.budgetId) {
      budget = await Budget.findOne({
        _id: new Types.ObjectId(query.budgetId),
        organization: organizationId,
        isArchived: false,
      });
    } else {
      budget = await Budget.findOne({
        organization: organizationId,
        fiscalYear,
        status: { $in: ['active', 'approved'] },
        isArchived: false,
      });
    }

    if (!budget) {
      throw new NotFoundError('No budget found for the specified period');
    }

    // Get budget items
    const budgetItems = await BudgetItem.find({
      budget: budget._id,
      isArchived: false,
      ...(query.category && { category: query.category }),
    });

    // Get monthly expense totals
    const expenseAggregation = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: {
            $gte: new Date(fiscalYear, 0, 1),
            $lte: new Date(fiscalYear, 11, 31, 23, 59, 59),
          },
          status: { $in: ['approved', 'paid'] },
          isArchived: false,
          ...(query.category && { category: query.category }),
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const actualByMonth: Map<number, number> = new Map();
    for (const entry of expenseAggregation) {
      actualByMonth.set(entry._id, entry.total);
    }

    // Calculate monthly variances
    const monthlyVariances: MonthlyVariance[] = [];
    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    for (let month = 1; month <= 12; month++) {
      // Calculate planned for this month
      let monthPlanned = 0;
      for (const item of budgetItems) {
        const monthlyBreakdown = item.monthlyBreakdown.find((m) => m.month === month);
        if (monthlyBreakdown) {
          monthPlanned += monthlyBreakdown.amount;
        }
      }

      const monthActual = actualByMonth.get(month) || 0;
      const variance = monthActual - monthPlanned;
      const variancePercent = monthPlanned !== 0 ? (variance / monthPlanned) * 100 : 0;

      cumulativePlanned += monthPlanned;
      cumulativeActual += monthActual;
      const cumulativeVariance = cumulativeActual - cumulativePlanned;

      monthlyVariances.push({
        month: new Date(fiscalYear, month - 1, 1),
        planned: Math.round(monthPlanned * 100) / 100,
        actual: Math.round(monthActual * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: getVarianceStatus(variancePercent / 100, true),
        cumulativePlanned: Math.round(cumulativePlanned * 100) / 100,
        cumulativeActual: Math.round(cumulativeActual * 100) / 100,
        cumulativeVariance: Math.round(cumulativeVariance * 100) / 100,
      });
    }

    return monthlyVariances;
  }

  // ============ Revenue Variance ============

  /**
   * Get revenue plan vs actual variance report
   */
  async getRevenueVariance(
    organizationId: Types.ObjectId,
    query: VarianceQueryInput
  ): Promise<VarianceReport> {
    const fiscalYear = query.fiscalYear || new Date().getFullYear();
    const period = query.period || VariancePeriod.YEARLY;

    // Get active revenue plan
    const revenuePlan = query.revenuePlanId
      ? await RevenuePlan.findOne({
          _id: new Types.ObjectId(query.revenuePlanId),
          organization: organizationId,
          isArchived: false,
        })
      : await RevenuePlan.findOne({
          organization: organizationId,
          fiscalYear,
          status: { $in: ['active', 'approved'] },
          isArchived: false,
        });

    if (!revenuePlan) {
      throw new NotFoundError('No active revenue plan found for the specified period');
    }

    // Get revenue streams
    const streams = await RevenueStream.find({
      revenuePlan: revenuePlan._id,
      isArchived: false,
    }).populate('account', 'code name type subtype');

    // Determine date range
    const { startDate, endDate } = this.getDateRange(fiscalYear, period, query.startDate, query.endDate);

    // Get actual revenue
    const revenueEntries = await RevenueEntry.find({
      organization: organizationId,
      date: { $gte: startDate, $lte: endDate },
      status: 'received',
      isArchived: false,
    });

    // Calculate variances
    const items: VarianceItem[] = [];
    const categoryTotals: Map<string, { planned: number; actual: number; count: number }> = new Map();

    let totalPlanned = 0;
    let totalActual = 0;

    for (const stream of streams) {
      // Calculate planned amount for the period
      const plannedAmount = this.getStreamPlannedAmount(stream, startDate, endDate);
      totalPlanned += plannedAmount;

      // Calculate actual amount
      const actualAmount = revenueEntries
        .filter((r) =>
          stream.account
            ? r.account.toString() === stream.account.toString()
            : r.revenueType === stream.streamType
        )
        .reduce((sum, r) => sum + r.amount, 0);
      totalActual += actualAmount;

      const variance = actualAmount - plannedAmount;
      const variancePercent = plannedAmount !== 0 ? (variance / plannedAmount) * 100 : 0;
      const status = getVarianceStatus(variancePercent / 100, false);

      items.push({
        category: stream.streamType,
        accountId: stream.account,
        name: stream.name,
        planned: Math.round(plannedAmount * 100) / 100,
        actual: Math.round(actualAmount * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status,
      });

      // Aggregate by stream type
      const categoryData = categoryTotals.get(stream.streamType) || {
        planned: 0,
        actual: 0,
        count: 0,
      };
      categoryData.planned += plannedAmount;
      categoryData.actual += actualAmount;
      categoryData.count++;
      categoryTotals.set(stream.streamType, categoryData);
    }

    // Build category variance summary
    const byCategory: CategoryVariance[] = [];
    for (const [category, data] of categoryTotals) {
      const variance = data.actual - data.planned;
      const variancePercent = data.planned !== 0 ? (variance / data.planned) * 100 : 0;
      byCategory.push({
        category,
        planned: Math.round(data.planned * 100) / 100,
        actual: Math.round(data.actual * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: getVarianceStatus(variancePercent / 100, false),
        itemCount: data.count,
      });
    }

    const totalVariance = totalActual - totalPlanned;
    const totalVariancePercent = totalPlanned !== 0 ? (totalVariance / totalPlanned) * 100 : 0;

    return {
      type: VarianceType.REVENUE,
      period,
      startDate,
      endDate,
      fiscalYear,
      totalPlanned: Math.round(totalPlanned * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalVariance: Math.round(totalVariance * 100) / 100,
      totalVariancePercent: Math.round(totalVariancePercent * 100) / 100,
      overallStatus: getVarianceStatus(totalVariancePercent / 100, false),
      items,
      byCategory,
    };
  }

  // ============ Headcount Variance ============

  /**
   * Get headcount plan vs actual variance
   */
  async getHeadcountVariance(
    organizationId: Types.ObjectId,
    query: VarianceQueryInput
  ): Promise<{
    type: string;
    period: string;
    startDate: Date;
    endDate: Date;
    fiscalYear: number;
    plannedHeadcount: number;
    actualHeadcount: number;
    headcountVariance: number;
    plannedCost: number;
    actualCost: number;
    costVariance: number;
    costVariancePercent: number;
    overallStatus: string;
    byDepartment: Array<{
      department: string;
      plannedHeadcount: number;
      actualHeadcount: number;
      headcountVariance: number;
      plannedCost: number;
      actualCost: number;
      costVariance: number;
      costVariancePercent: number;
      status: string;
    }>;
    byLevel: Array<{
      level: string;
      plannedHeadcount: number;
      actualHeadcount: number;
      headcountVariance: number;
    }>;
  }> {
    const fiscalYear = query.fiscalYear || new Date().getFullYear();
    const period = query.period || VariancePeriod.YEARLY;

    // Get headcount plan
    const headcountPlan = query.headcountPlanId
      ? await HeadcountPlan.findOne({
          _id: new Types.ObjectId(query.headcountPlanId),
          organization: organizationId,
          isArchived: false,
        })
      : await HeadcountPlan.findOne({
          organization: organizationId,
          fiscalYear,
          status: { $in: ['active', 'approved'] },
          isArchived: false,
        });

    if (!headcountPlan) {
      throw new NotFoundError('No active headcount plan found for the specified period');
    }

    // Get planned roles
    const plannedRoles = await PlannedRole.find({
      headcountPlan: headcountPlan._id,
      isArchived: false,
    });

    // Determine date range
    const { startDate, endDate } = this.getDateRange(fiscalYear, period, query.startDate, query.endDate);

    // Calculate planned metrics
    let plannedHeadcount = 0;
    let plannedCost = 0;
    const plannedByDepartment: Map<string, { headcount: number; cost: number }> = new Map();
    const plannedByLevel: Map<string, number> = new Map();

    for (const role of plannedRoles) {
      // Check if role is planned within the date range
      if (role.plannedStartDate <= endDate) {
        plannedHeadcount++;

        // Calculate cost for the period
        const roleCost = this.getRoleCostForPeriod(role, startDate, endDate);
        plannedCost += roleCost;

        // By department
        const deptData = plannedByDepartment.get(role.department) || { headcount: 0, cost: 0 };
        deptData.headcount++;
        deptData.cost += roleCost;
        plannedByDepartment.set(role.department, deptData);

        // By level
        const levelCount = plannedByLevel.get(role.level) || 0;
        plannedByLevel.set(role.level, levelCount + 1);
      }
    }

    // Get actual headcount from filled roles
    const filledRoles = plannedRoles.filter((r) => r.status === 'filled');
    const actualHeadcount = filledRoles.length;

    // Calculate actual costs from payroll/expense transactions
    const payrollExpenses = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          category: { $in: ['payroll', 'salaries', 'wages', 'compensation'] },
          date: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'paid'] },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: '$department',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let actualCost = 0;
    const actualByDepartment: Map<string, { headcount: number; cost: number }> = new Map();
    const actualByLevel: Map<string, number> = new Map();

    for (const role of filledRoles) {
      const deptData = actualByDepartment.get(role.department) || { headcount: 0, cost: 0 };
      deptData.headcount++;
      actualByDepartment.set(role.department, deptData);

      const levelCount = actualByLevel.get(role.level) || 0;
      actualByLevel.set(role.level, levelCount + 1);
    }

    for (const expense of payrollExpenses) {
      actualCost += expense.total;
      const deptData = actualByDepartment.get(expense._id) || { headcount: 0, cost: 0 };
      deptData.cost = expense.total;
      actualByDepartment.set(expense._id, deptData);
    }

    // Build department breakdown
    const allDepartments = new Set([...plannedByDepartment.keys(), ...actualByDepartment.keys()]);
    const byDepartment = [];
    for (const dept of allDepartments) {
      const planned = plannedByDepartment.get(dept) || { headcount: 0, cost: 0 };
      const actual = actualByDepartment.get(dept) || { headcount: 0, cost: 0 };
      const costVariance = actual.cost - planned.cost;
      const costVariancePercent = planned.cost !== 0 ? (costVariance / planned.cost) * 100 : 0;

      byDepartment.push({
        department: dept,
        plannedHeadcount: planned.headcount,
        actualHeadcount: actual.headcount,
        headcountVariance: actual.headcount - planned.headcount,
        plannedCost: Math.round(planned.cost * 100) / 100,
        actualCost: Math.round(actual.cost * 100) / 100,
        costVariance: Math.round(costVariance * 100) / 100,
        costVariancePercent: Math.round(costVariancePercent * 100) / 100,
        status: getVarianceStatus(costVariancePercent / 100, true),
      });
    }

    // Build level breakdown
    const allLevels = new Set([...plannedByLevel.keys(), ...actualByLevel.keys()]);
    const byLevel = [];
    for (const level of allLevels) {
      const planned = plannedByLevel.get(level) || 0;
      const actual = actualByLevel.get(level) || 0;
      byLevel.push({
        level,
        plannedHeadcount: planned,
        actualHeadcount: actual,
        headcountVariance: actual - planned,
      });
    }

    const headcountVariance = actualHeadcount - plannedHeadcount;
    const costVariance = actualCost - plannedCost;
    const costVariancePercent = plannedCost !== 0 ? (costVariance / plannedCost) * 100 : 0;

    return {
      type: VarianceType.HEADCOUNT,
      period,
      startDate,
      endDate,
      fiscalYear,
      plannedHeadcount,
      actualHeadcount,
      headcountVariance,
      plannedCost: Math.round(plannedCost * 100) / 100,
      actualCost: Math.round(actualCost * 100) / 100,
      costVariance: Math.round(costVariance * 100) / 100,
      costVariancePercent: Math.round(costVariancePercent * 100) / 100,
      overallStatus: getVarianceStatus(costVariancePercent / 100, true),
      byDepartment,
      byLevel,
    };
  }

  // ============ Category Variance ============

  /**
   * Get variance by category
   */
  async getCategoryVariance(
    organizationId: Types.ObjectId,
    query: CategoryVarianceQueryInput
  ): Promise<CategoryVariance[]> {
    const fiscalYear = query.fiscalYear || new Date().getFullYear();
    const type = query.type || VarianceType.BUDGET;

    const { startDate, endDate } = this.getDateRange(
      fiscalYear,
      VariancePeriod.YEARLY,
      query.startDate,
      query.endDate
    );

    if (type === VarianceType.BUDGET || type === VarianceType.EXPENSE) {
      return this.getExpenseCategoryVariance(organizationId, fiscalYear, startDate, endDate);
    } else if (type === VarianceType.REVENUE) {
      return this.getRevenueCategoryVariance(organizationId, fiscalYear, startDate, endDate);
    }

    return [];
  }

  // ============ Helper Methods ============

  private getDateRange(
    fiscalYear: number,
    period: string,
    startDateStr?: string,
    endDateStr?: string
  ): { startDate: Date; endDate: Date } {
    if (period === VariancePeriod.CUSTOM && startDateStr && endDateStr) {
      return {
        startDate: new Date(startDateStr),
        endDate: new Date(endDateStr),
      };
    }

    const now = new Date();

    switch (period) {
      case VariancePeriod.MONTHLY:
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      case VariancePeriod.QUARTERLY:
        const quarter = Math.floor(now.getMonth() / 3);
        return {
          startDate: new Date(fiscalYear, quarter * 3, 1),
          endDate: new Date(fiscalYear, quarter * 3 + 3, 0),
        };
      case VariancePeriod.YTD:
        return {
          startDate: new Date(fiscalYear, 0, 1),
          endDate: now,
        };
      case VariancePeriod.YEARLY:
      default:
        return {
          startDate: new Date(fiscalYear, 0, 1),
          endDate: new Date(fiscalYear, 11, 31, 23, 59, 59),
        };
    }
  }

  private getPlannedAmountForPeriod(
    budgetItem: IBudgetItem,
    startDate: Date,
    endDate: Date
  ): number {
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;

    let total = 0;
    for (const breakdown of budgetItem.monthlyBreakdown) {
      if (breakdown.month >= startMonth && breakdown.month <= endMonth) {
        total += breakdown.amount;
      }
    }

    return total;
  }

  private getActualExpenseAmount(
    expenses: any[],
    transactions: any[],
    accountId: string,
    category: string
  ): number {
    // Sum from expenses
    const expenseTotal = expenses
      .filter((e) => e.account?.toString() === accountId || e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);

    // Also check transactions that might not be in expenses
    const transactionTotal = transactions
      .filter(
        (t) =>
          t.account?.toString() === accountId &&
          !expenses.some((e) => e.transaction?.toString() === t._id.toString())
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return expenseTotal + transactionTotal;
  }

  private getStreamPlannedAmount(stream: any, startDate: Date, endDate: Date): number {
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;

    let total = 0;
    for (const projection of stream.monthlyProjections || []) {
      if (projection.month >= startMonth && projection.month <= endMonth) {
        total += projection.projected;
      }
    }

    return total;
  }

  private getRoleCostForPeriod(role: any, startDate: Date, endDate: Date): number {
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;

    let total = 0;
    for (const cost of role.monthlyCosts || []) {
      if (cost.month >= startMonth && cost.month <= endMonth) {
        total += cost.total;
      }
    }

    // If no monthly costs, estimate from annual
    if (total === 0 && role.baseSalary) {
      const monthsInRange = endMonth - startMonth + 1;
      const monthlySalary = role.baseSalary / 12;
      const monthlyBenefits = (monthlySalary * (role.benefitsPercentage || 0)) / 100;
      total = (monthlySalary + monthlyBenefits) * monthsInRange;
    }

    return total;
  }

  private async getExpenseCategoryVariance(
    organizationId: Types.ObjectId,
    fiscalYear: number,
    startDate: Date,
    endDate: Date
  ): Promise<CategoryVariance[]> {
    // Get budget items grouped by category
    const budget = await Budget.findOne({
      organization: organizationId,
      fiscalYear,
      status: { $in: ['active', 'approved'] },
      isArchived: false,
    });

    if (!budget) {
      return [];
    }

    const plannedByCategory = await BudgetItem.aggregate([
      {
        $match: {
          budget: budget._id,
          isArchived: false,
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$annualAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get actual expenses grouped by category
    const actualByCategory = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
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

    // Combine into variance report
    const plannedMap = new Map(plannedByCategory.map((p) => [p._id, { total: p.total, count: p.count }]));
    const actualMap = new Map(actualByCategory.map((a) => [a._id, a.total]));
    const allCategories = new Set([...plannedMap.keys(), ...actualMap.keys()]);

    const results: CategoryVariance[] = [];
    for (const category of allCategories) {
      const plannedData = plannedMap.get(category) || { total: 0, count: 0 };
      const actualTotal = actualMap.get(category) || 0;
      const variance = actualTotal - plannedData.total;
      const variancePercent = plannedData.total !== 0 ? (variance / plannedData.total) * 100 : 0;

      results.push({
        category,
        planned: Math.round(plannedData.total * 100) / 100,
        actual: Math.round(actualTotal * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: getVarianceStatus(variancePercent / 100, true),
        itemCount: plannedData.count,
      });
    }

    return results.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
  }

  private async getRevenueCategoryVariance(
    organizationId: Types.ObjectId,
    fiscalYear: number,
    startDate: Date,
    endDate: Date
  ): Promise<CategoryVariance[]> {
    // Get revenue plan streams grouped by type
    const revenuePlan = await RevenuePlan.findOne({
      organization: organizationId,
      fiscalYear,
      status: { $in: ['active', 'approved'] },
      isArchived: false,
    });

    if (!revenuePlan) {
      return [];
    }

    const streams = await RevenueStream.find({
      revenuePlan: revenuePlan._id,
      isArchived: false,
    });

    // Group planned by stream type
    const plannedByType: Map<string, { total: number; count: number }> = new Map();
    for (const stream of streams) {
      const data = plannedByType.get(stream.streamType) || { total: 0, count: 0 };
      data.total += stream.annualProjected || 0;
      data.count++;
      plannedByType.set(stream.streamType, data);
    }

    // Get actual revenue grouped by type
    const actualByType = await RevenueEntry.aggregate([
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
          _id: '$revenueType',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const actualMap = new Map(actualByType.map((a) => [a._id, a.total]));
    const allTypes = new Set([...plannedByType.keys(), ...actualMap.keys()]);

    const results: CategoryVariance[] = [];
    for (const type of allTypes) {
      const plannedData = plannedByType.get(type) || { total: 0, count: 0 };
      const actualTotal = actualMap.get(type) || 0;
      const variance = actualTotal - plannedData.total;
      const variancePercent = plannedData.total !== 0 ? (variance / plannedData.total) * 100 : 0;

      results.push({
        category: type,
        planned: Math.round(plannedData.total * 100) / 100,
        actual: Math.round(actualTotal * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: getVarianceStatus(variancePercent / 100, false),
        itemCount: plannedData.count,
      });
    }

    return results.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
  }
}

export const varianceService = new VarianceService();
