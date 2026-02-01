import { Types } from 'mongoose';
import { Budget, IBudget, BudgetItem, IBudgetItem } from '../models';
import {
  CreateBudgetInput,
  UpdateBudgetInput,
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
  ApproveBudgetInput,
  RejectBudgetInput,
  CloneBudgetInput,
  BudgetQueryInput,
} from '../schemas';
import { BudgetStatus, AllocationMethod } from '../../constants';
import { validateAccountReference } from '../../utils';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { BudgetSummary, MonthlyBreakdown, CategoryBreakdown } from '../../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Budget Service
 * Handles budget planning business logic
 */
export class BudgetService {
  // ============ Budget CRUD ============

  /**
   * Create a new budget
   */
  async createBudget(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateBudgetInput
  ): Promise<IBudget> {
    const { name, fiscalYear, type, startDate, endDate, ...rest } = input;

    // Check for duplicate name in same fiscal year
    const existing = await Budget.findOne({
      organization: organizationId,
      name,
      fiscalYear,
      isArchived: false,
    });

    if (existing) {
      throw new BadRequestError(
        `Budget "${name}" already exists for fiscal year ${fiscalYear}`
      );
    }

    const budget = new Budget({
      organization: organizationId,
      name,
      fiscalYear,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...rest,
      status: BudgetStatus.DRAFT,
      version: 1,
      totalAmount: 0,
      createdBy: userId,
    });

    await budget.save();
    return budget;
  }

  /**
   * Get all budgets for an organization
   */
  async getBudgets(
    organizationId: Types.ObjectId,
    filters?: BudgetQueryInput
  ): Promise<IBudget[]> {
    const query: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (filters) {
      if (filters.fiscalYear) query.fiscalYear = filters.fiscalYear;
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }
    }

    return Budget.find(query).sort({ fiscalYear: -1, createdAt: -1 });
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(
    organizationId: Types.ObjectId,
    budgetId: string
  ): Promise<IBudget> {
    const budget = await Budget.findOne({
      _id: new Types.ObjectId(budgetId),
      organization: organizationId,
    });

    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    return budget;
  }

  /**
   * Update a budget
   */
  async updateBudget(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId,
    input: UpdateBudgetInput
  ): Promise<IBudget> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    // Cannot update approved/active budgets
    if (
      budget.status === BudgetStatus.APPROVED ||
      budget.status === BudgetStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot update approved or active budgets');
    }

    // Update fields
    if (input.name !== undefined) budget.name = input.name;
    if (input.description !== undefined)
      budget.description = input.description || undefined;
    if (input.startDate) budget.startDate = new Date(input.startDate);
    if (input.endDate) budget.endDate = new Date(input.endDate);
    if (input.currency) budget.currency = input.currency;
    if (input.tags !== undefined) budget.tags = input.tags;
    if (input.notes !== undefined) budget.notes = input.notes || undefined;

    budget.updatedBy = userId;
    await budget.save();

    return budget;
  }

  /**
   * Archive a budget
   */
  async archiveBudget(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (budget.status === BudgetStatus.ACTIVE) {
      throw new BadRequestError('Cannot archive an active budget');
    }

    budget.isArchived = true;
    budget.archivedAt = new Date();
    budget.archivedBy = userId;
    budget.updatedBy = userId;
    await budget.save();

    // Archive all budget items
    await BudgetItem.updateMany(
      { budget: budget._id },
      { isArchived: true, updatedBy: userId }
    );
  }

  // ============ Budget Workflow ============

  /**
   * Submit budget for approval
   */
  async submitForApproval(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId
  ): Promise<IBudget> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (budget.status !== BudgetStatus.DRAFT) {
      throw new BadRequestError('Only draft budgets can be submitted for approval');
    }

    // Check if budget has items
    const itemCount = await BudgetItem.countDocuments({
      budget: budget._id,
      isArchived: false,
    });

    if (itemCount === 0) {
      throw new BadRequestError('Cannot submit empty budget for approval');
    }

    budget.status = BudgetStatus.PENDING;
    budget.submittedBy = userId;
    budget.submittedAt = new Date();
    budget.updatedBy = userId;
    await budget.save();

    return budget;
  }

  /**
   * Approve a budget
   */
  async approveBudget(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId,
    input: ApproveBudgetInput
  ): Promise<IBudget> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (budget.status !== BudgetStatus.PENDING) {
      throw new BadRequestError('Only pending budgets can be approved');
    }

    budget.status = BudgetStatus.APPROVED;
    budget.approvedBy = userId;
    budget.approvedAt = new Date();
    if (input.notes) budget.approvalNotes = input.notes;
    budget.updatedBy = userId;
    await budget.save();

    return budget;
  }

  /**
   * Reject a budget
   */
  async rejectBudget(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId,
    input: RejectBudgetInput
  ): Promise<IBudget> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (budget.status !== BudgetStatus.PENDING) {
      throw new BadRequestError('Only pending budgets can be rejected');
    }

    budget.status = BudgetStatus.DRAFT;
    budget.rejectedBy = userId;
    budget.rejectedAt = new Date();
    budget.rejectionReason = input.reason;
    budget.updatedBy = userId;
    await budget.save();

    return budget;
  }

  /**
   * Activate an approved budget
   */
  async activateBudget(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId
  ): Promise<IBudget> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (budget.status !== BudgetStatus.APPROVED) {
      throw new BadRequestError('Only approved budgets can be activated');
    }

    // Deactivate any other active budget of same type/year
    await Budget.updateMany(
      {
        organization: organizationId,
        fiscalYear: budget.fiscalYear,
        type: budget.type,
        status: BudgetStatus.ACTIVE,
        _id: { $ne: budget._id },
      },
      { status: BudgetStatus.ARCHIVED }
    );

    budget.status = BudgetStatus.ACTIVE;
    budget.updatedBy = userId;
    await budget.save();

    return budget;
  }

  /**
   * Clone a budget
   */
  async cloneBudget(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId,
    input: CloneBudgetInput
  ): Promise<IBudget> {
    const sourceBudget = await this.getBudgetById(organizationId, budgetId);
    const sourceItems = await BudgetItem.findByBudget(sourceBudget._id);

    const fiscalYear = input.fiscalYear || sourceBudget.fiscalYear;
    const version = await Budget.getNextVersion(organizationId, input.name);

    // Calculate new dates if fiscal year changed
    let startDate = sourceBudget.startDate;
    let endDate = sourceBudget.endDate;

    if (fiscalYear !== sourceBudget.fiscalYear) {
      const yearDiff = fiscalYear - sourceBudget.fiscalYear;
      startDate = new Date(startDate);
      startDate.setFullYear(startDate.getFullYear() + yearDiff);
      endDate = new Date(endDate);
      endDate.setFullYear(endDate.getFullYear() + yearDiff);
    }

    // Create new budget
    const newBudget = new Budget({
      organization: organizationId,
      name: input.name,
      description: sourceBudget.description,
      fiscalYear,
      type: sourceBudget.type,
      quarter: sourceBudget.quarter,
      month: sourceBudget.month,
      status: BudgetStatus.DRAFT,
      startDate,
      endDate,
      totalAmount: sourceBudget.totalAmount,
      currency: sourceBudget.currency,
      version,
      sourceClone: sourceBudget._id,
      tags: sourceBudget.tags,
      notes: sourceBudget.notes,
      createdBy: userId,
    });

    await newBudget.save();

    // Clone budget items
    for (const item of sourceItems) {
      const newItem = new BudgetItem({
        organization: organizationId,
        budget: newBudget._id,
        account: item.account,
        category: item.category,
        name: item.name,
        description: item.description,
        annualAmount: item.annualAmount,
        monthlyBreakdown: item.monthlyBreakdown,
        allocationMethod: item.allocationMethod,
        vendor: item.vendor,
        department: item.department,
        costCenter: item.costCenter,
        isRecurring: item.isRecurring,
        recurringFrequency: item.recurringFrequency,
        startMonth: item.startMonth,
        endMonth: item.endMonth,
        assumptions: item.assumptions,
        priority: item.priority,
        tags: item.tags,
        createdBy: userId,
      });

      await newItem.save();
    }

    return newBudget;
  }

  // ============ Budget Items ============

  /**
   * Add budget item
   */
  async addBudgetItem(
    organizationId: Types.ObjectId,
    budgetId: string,
    userId: Types.ObjectId,
    input: CreateBudgetItemInput
  ): Promise<IBudgetItem> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    // Cannot add items to approved/active budgets
    if (
      budget.status === BudgetStatus.APPROVED ||
      budget.status === BudgetStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot add items to approved or active budgets');
    }

    // Validate account reference (must be expense type)
    const account = await validateAccountReference(
      organizationId,
      input.accountId,
      'expense'
    );

    const item = new BudgetItem({
      organization: organizationId,
      budget: budget._id,
      account: account._id,
      category: account.subtype,
      name: input.name,
      description: input.description,
      annualAmount: input.annualAmount,
      monthlyBreakdown: input.monthlyBreakdown,
      allocationMethod: input.allocationMethod || AllocationMethod.EVEN,
      vendor: input.vendor,
      department: input.department,
      costCenter: input.costCenter,
      isRecurring: input.isRecurring ?? true,
      recurringFrequency: input.recurringFrequency,
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      assumptions: input.assumptions,
      priority: input.priority,
      tags: input.tags,
      createdBy: userId,
    });

    await item.save();
    await this.recalculateBudgetTotal(budget._id);

    return item.populate('account', 'code name type subtype');
  }

  /**
   * Update budget item
   */
  async updateBudgetItem(
    organizationId: Types.ObjectId,
    budgetId: string,
    itemId: string,
    userId: Types.ObjectId,
    input: UpdateBudgetItemInput
  ): Promise<IBudgetItem> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (
      budget.status === BudgetStatus.APPROVED ||
      budget.status === BudgetStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot update items in approved or active budgets');
    }

    const item = await BudgetItem.findOne({
      _id: new Types.ObjectId(itemId),
      budget: budget._id,
      isArchived: false,
    });

    if (!item) {
      throw new NotFoundError('Budget item not found');
    }

    // Update fields
    if (input.name !== undefined) item.name = input.name;
    if (input.description !== undefined)
      item.description = input.description || undefined;
    if (input.annualAmount !== undefined) item.annualAmount = input.annualAmount;
    if (input.monthlyBreakdown !== undefined)
      item.monthlyBreakdown = input.monthlyBreakdown;
    if (input.allocationMethod !== undefined)
      item.allocationMethod = input.allocationMethod as typeof item.allocationMethod;
    if (input.vendor !== undefined) item.vendor = input.vendor || undefined;
    if (input.department !== undefined)
      item.department = input.department || undefined;
    if (input.costCenter !== undefined)
      item.costCenter = input.costCenter || undefined;
    if (input.isRecurring !== undefined) item.isRecurring = input.isRecurring;
    if (input.recurringFrequency !== undefined)
      item.recurringFrequency = input.recurringFrequency || undefined;
    if (input.startMonth !== undefined)
      item.startMonth = input.startMonth || undefined;
    if (input.endMonth !== undefined) item.endMonth = input.endMonth || undefined;
    if (input.assumptions !== undefined)
      item.assumptions = input.assumptions || undefined;
    if (input.priority !== undefined) item.priority = input.priority as typeof item.priority;
    if (input.tags !== undefined) item.tags = input.tags;

    item.updatedBy = userId;
    await item.save();
    await this.recalculateBudgetTotal(budget._id);

    return item.populate('account', 'code name type subtype');
  }

  /**
   * Delete budget item
   */
  async deleteBudgetItem(
    organizationId: Types.ObjectId,
    budgetId: string,
    itemId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const budget = await this.getBudgetById(organizationId, budgetId);

    if (
      budget.status === BudgetStatus.APPROVED ||
      budget.status === BudgetStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot delete items from approved or active budgets');
    }

    const item = await BudgetItem.findOne({
      _id: new Types.ObjectId(itemId),
      budget: budget._id,
      isArchived: false,
    });

    if (!item) {
      throw new NotFoundError('Budget item not found');
    }

    item.isArchived = true;
    item.updatedBy = userId;
    await item.save();
    await this.recalculateBudgetTotal(budget._id);
  }

  /**
   * Get budget items
   */
  async getBudgetItems(
    organizationId: Types.ObjectId,
    budgetId: string
  ): Promise<IBudgetItem[]> {
    const budget = await this.getBudgetById(organizationId, budgetId);
    return BudgetItem.findByBudget(budget._id);
  }

  // ============ Analytics ============

  /**
   * Get budget summary
   */
  async getBudgetSummary(
    organizationId: Types.ObjectId,
    budgetId: string
  ): Promise<BudgetSummary> {
    const budget = await this.getBudgetById(organizationId, budgetId);
    const items = await BudgetItem.findByBudget(budget._id);
    const byCategory = await BudgetItem.getTotalByCategory(budget._id);

    return {
      id: budget._id.toString(),
      name: budget.name,
      fiscalYear: budget.fiscalYear,
      type: budget.type,
      status: budget.status,
      totalAmount: budget.totalAmount,
      itemCount: items.length,
      currency: budget.currency,
      byCategory,
      createdAt: budget.createdAt.toISOString(),
    };
  }

  /**
   * Get monthly breakdown
   */
  async getMonthlyBreakdown(
    organizationId: Types.ObjectId,
    budgetId: string
  ): Promise<MonthlyBreakdown[]> {
    const budget = await this.getBudgetById(organizationId, budgetId);
    const items = await BudgetItem.findByBudget(budget._id);

    const breakdown: MonthlyBreakdown[] = [];

    for (let month = 1; month <= 12; month++) {
      const byCategory: Record<string, number> = {};
      let totalAmount = 0;

      for (const item of items) {
        const monthData = item.monthlyBreakdown.find((m) => m.month === month);
        const amount = monthData?.amount || 0;

        if (!byCategory[item.category]) {
          byCategory[item.category] = 0;
        }
        byCategory[item.category] += amount;
        totalAmount += amount;
      }

      breakdown.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        totalAmount: Math.round(totalAmount * 100) / 100,
        byCategory,
      });
    }

    return breakdown;
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(
    organizationId: Types.ObjectId,
    budgetId: string
  ): Promise<CategoryBreakdown[]> {
    const budget = await this.getBudgetById(organizationId, budgetId);
    const items = await BudgetItem.findByBudget(budget._id);

    const categoryMap = new Map<string, CategoryBreakdown>();

    for (const item of items) {
      const existing = categoryMap.get(item.category);
      const monthlyAmounts = item.monthlyBreakdown.map((m) => m.amount);

      if (existing) {
        existing.annualAmount += item.annualAmount;
        existing.itemCount += 1;
        for (let i = 0; i < 12; i++) {
          existing.monthlyAmounts[i] += monthlyAmounts[i] || 0;
        }
      } else {
        const accountData = item.account as unknown as {
          code: string;
          name: string;
        };
        categoryMap.set(item.category, {
          category: item.category,
          accountCode: accountData?.code || '',
          accountName: accountData?.name || item.category,
          annualAmount: item.annualAmount,
          monthlyAmounts: monthlyAmounts.length === 12 ? monthlyAmounts : Array(12).fill(0),
          itemCount: 1,
          priority: item.priority,
        });
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.annualAmount - a.annualAmount);
  }

  // ============ Helpers ============

  /**
   * Recalculate budget total from items
   */
  private async recalculateBudgetTotal(budgetId: Types.ObjectId): Promise<void> {
    const result = await BudgetItem.aggregate([
      { $match: { budget: budgetId, isArchived: false } },
      { $group: { _id: null, total: { $sum: '$annualAmount' } } },
    ]);

    const total = result[0]?.total || 0;

    await Budget.findByIdAndUpdate(budgetId, {
      totalAmount: Math.round(total * 100) / 100,
    });
  }
}

// Export singleton instance
export const budgetService = new BudgetService();
