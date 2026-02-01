import { Types, FilterQuery } from 'mongoose';
import { Expense, IExpense, Vendor } from '../models';
import { Transaction } from '../../transactions/models';
import { NotFoundError, BadRequestError } from '@/core/errors';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryInput,
  ApproveExpenseInput,
  RejectExpenseInput,
  PayExpenseInput,
} from '../schemas';
import { ExpenseStatus, TransactionType, TransactionSource, TransactionStatus } from '../../constants';
import { ExpenseSummary, CategoryExpenseSummary, VendorExpenseSummary, PaginatedResult } from '../../types';
import { validateAccountReference } from '../../utils';
import { vendorService } from './vendor.service';

export class ExpenseService {
  /**
   * Create a new expense
   */
  async createExpense(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateExpenseInput
  ): Promise<IExpense> {
    // Validate account reference (must be expense type)
    const account = await validateAccountReference(organizationId, input.accountId, 'expense');

    // Validate vendor if provided
    if (input.vendorId) {
      const vendor = await Vendor.findOne({
        _id: new Types.ObjectId(input.vendorId),
        organization: organizationId,
        isActive: true,
      });

      if (!vendor) {
        throw new NotFoundError('Vendor not found');
      }
    }

    const expense = new Expense({
      organization: organizationId,
      account: account._id,
      vendor: input.vendorId ? new Types.ObjectId(input.vendorId) : undefined,
      amount: input.amount,
      date: new Date(input.date),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      description: input.description,
      category: account.subtype, // Auto-derive from account
      status: input.status || ExpenseStatus.DRAFT,
      isRecurring: input.isRecurring || false,
      recurringFrequency: input.recurringFrequency,
      recurringEndDate: input.recurringEndDate ? new Date(input.recurringEndDate) : undefined,
      receipt: input.receipt,
      attachments: input.attachments,
      department: input.department,
      costCenter: input.costCenter,
      tags: input.tags,
      notes: input.notes,
      createdBy: userId,
    });

    await expense.save();

    // Update vendor totals if vendor is assigned
    if (expense.vendor) {
      await vendorService.recalculateVendorTotals(organizationId, expense.vendor.toString());
    }

    return expense;
  }

  /**
   * Get expenses with filtering and pagination
   */
  async getExpenses(
    organizationId: Types.ObjectId,
    query: ExpenseQueryInput
  ): Promise<PaginatedResult<IExpense>> {
    const filter: FilterQuery<IExpense> = {
      organization: organizationId,
      isArchived: query.isArchived ?? false,
    };

    if (query.status) filter.status = query.status;
    if (query.vendorId) filter.vendor = new Types.ObjectId(query.vendorId);
    if (query.accountId) filter.account = new Types.ObjectId(query.accountId);
    if (query.category) filter.category = query.category;
    if (query.isRecurring !== undefined) filter.isRecurring = query.isRecurring;
    if (query.department) filter.department = query.department;
    if (query.costCenter) filter.costCenter = query.costCenter;

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) filter.date.$gte = new Date(query.startDate);
      if (query.endDate) filter.date.$lte = new Date(query.endDate);
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      filter.amount = {};
      if (query.minAmount !== undefined) filter.amount.$gte = query.minAmount;
      if (query.maxAmount !== undefined) filter.amount.$lte = query.maxAmount;
    }

    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: 'i' } },
        { notes: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.tags) {
      const tagsArray = query.tags.split(',').map((t) => t.trim());
      filter.tags = { $in: tagsArray };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortField = query.sortBy || 'date';

    const [expenses, totalCount] = await Promise.all([
      Expense.find(filter)
        .populate('account', 'code name type subtype')
        .populate('vendor', 'name')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: expenses,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(organizationId: Types.ObjectId, expenseId: string): Promise<IExpense> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
    })
      .populate('account', 'code name type subtype')
      .populate('vendor', 'name');

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    return expense;
  }

  /**
   * Update expense (only draft expenses can be fully updated)
   */
  async updateExpense(
    organizationId: Types.ObjectId,
    expenseId: string,
    userId: Types.ObjectId,
    input: UpdateExpenseInput
  ): Promise<IExpense> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
      isArchived: false,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    // Only draft expenses can be fully updated
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestError('Only draft expenses can be updated. Submit changes for re-approval.');
    }

    const oldVendorId = expense.vendor?.toString();

    // Validate account if being changed
    if (input.accountId) {
      const account = await validateAccountReference(organizationId, input.accountId, 'expense');
      expense.account = account._id;
      expense.category = account.subtype;
    }

    // Validate vendor if being changed
    if (input.vendorId) {
      const vendor = await Vendor.findOne({
        _id: new Types.ObjectId(input.vendorId),
        organization: organizationId,
        isActive: true,
      });

      if (!vendor) {
        throw new NotFoundError('Vendor not found');
      }

      expense.vendor = vendor._id;
    } else if (input.vendorId === null) {
      expense.vendor = undefined;
    }

    // Update fields
    if (input.amount !== undefined) expense.amount = input.amount;
    if (input.date !== undefined) expense.date = new Date(input.date);
    if (input.dueDate !== undefined) expense.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
    if (input.description !== undefined) expense.description = input.description;
    if (input.isRecurring !== undefined) expense.isRecurring = input.isRecurring;
    if (input.recurringFrequency !== undefined) expense.recurringFrequency = input.recurringFrequency || undefined;
    if (input.recurringEndDate !== undefined) expense.recurringEndDate = input.recurringEndDate ? new Date(input.recurringEndDate) : undefined;
    if (input.receipt !== undefined) expense.receipt = input.receipt || undefined;
    if (input.attachments !== undefined) expense.attachments = input.attachments;
    if (input.department !== undefined) expense.department = input.department || undefined;
    if (input.costCenter !== undefined) expense.costCenter = input.costCenter || undefined;
    if (input.tags !== undefined) expense.tags = input.tags;
    if (input.notes !== undefined) expense.notes = input.notes || undefined;

    expense.updatedBy = userId;
    await expense.save();

    // Update vendor totals if vendor changed
    if (oldVendorId && oldVendorId !== expense.vendor?.toString()) {
      await vendorService.recalculateVendorTotals(organizationId, oldVendorId);
    }
    if (expense.vendor) {
      await vendorService.recalculateVendorTotals(organizationId, expense.vendor.toString());
    }

    return expense;
  }

  /**
   * Archive expense
   */
  async archiveExpense(
    organizationId: Types.ObjectId,
    expenseId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
      isArchived: false,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    // Cannot archive paid expenses
    if (expense.status === ExpenseStatus.PAID) {
      throw new BadRequestError('Cannot archive paid expenses');
    }

    expense.isArchived = true;
    expense.archivedAt = new Date();
    expense.archivedBy = userId;
    await expense.save();

    // Update vendor totals
    if (expense.vendor) {
      await vendorService.recalculateVendorTotals(organizationId, expense.vendor.toString());
    }
  }

  /**
   * Submit expense for approval
   */
  async submitForApproval(
    organizationId: Types.ObjectId,
    expenseId: string,
    userId: Types.ObjectId
  ): Promise<IExpense> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
      isArchived: false,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestError('Only draft expenses can be submitted for approval');
    }

    expense.status = ExpenseStatus.PENDING_APPROVAL;
    expense.submittedBy = userId;
    expense.submittedAt = new Date();
    expense.updatedBy = userId;
    await expense.save();

    return expense;
  }

  /**
   * Approve expense
   */
  async approveExpense(
    organizationId: Types.ObjectId,
    expenseId: string,
    userId: Types.ObjectId,
    input?: ApproveExpenseInput
  ): Promise<IExpense> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
      isArchived: false,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== ExpenseStatus.PENDING_APPROVAL) {
      throw new BadRequestError('Only pending expenses can be approved');
    }

    expense.status = ExpenseStatus.APPROVED;
    expense.approvedBy = userId;
    expense.approvedAt = new Date();
    expense.approvalNotes = input?.notes;
    expense.updatedBy = userId;
    await expense.save();

    return expense;
  }

  /**
   * Reject expense
   */
  async rejectExpense(
    organizationId: Types.ObjectId,
    expenseId: string,
    userId: Types.ObjectId,
    input: RejectExpenseInput
  ): Promise<IExpense> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
      isArchived: false,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== ExpenseStatus.PENDING_APPROVAL) {
      throw new BadRequestError('Only pending expenses can be rejected');
    }

    expense.status = ExpenseStatus.DRAFT; // Return to draft for editing
    expense.rejectedBy = userId;
    expense.rejectedAt = new Date();
    expense.rejectionReason = input.reason;
    expense.updatedBy = userId;
    await expense.save();

    return expense;
  }

  /**
   * Mark expense as paid
   */
  async markAsPaid(
    organizationId: Types.ObjectId,
    expenseId: string,
    userId: Types.ObjectId,
    input: PayExpenseInput
  ): Promise<IExpense> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      organization: organizationId,
      isArchived: false,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.status !== ExpenseStatus.APPROVED) {
      throw new BadRequestError('Only approved expenses can be marked as paid');
    }

    expense.status = ExpenseStatus.PAID;
    expense.paymentMethod = input.paymentMethod;
    expense.paymentReference = input.paymentReference;
    expense.paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    expense.updatedBy = userId;

    // Create a transaction for the paid expense
    const transaction = new Transaction({
      organization: organizationId,
      account: expense.account,
      type: TransactionType.EXPENSE,
      amount: expense.amount,
      date: expense.paidAt,
      description: expense.description,
      reference: expense.paymentReference,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      status: TransactionStatus.CLEARED,
      source: TransactionSource.EXPENSE,
      linkedEntities: [
        {
          entityType: 'expense',
          entityId: expense._id,
        },
      ],
      createdBy: userId,
    });

    await transaction.save();
    expense.transaction = transaction._id;

    await expense.save();

    // Update vendor totals
    if (expense.vendor) {
      await vendorService.recalculateVendorTotals(organizationId, expense.vendor.toString());
    }

    return expense;
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(organizationId: Types.ObjectId): Promise<IExpense[]> {
    return Expense.findPendingApprovals(organizationId);
  }

  /**
   * Get recurring expenses
   */
  async getRecurringExpenses(organizationId: Types.ObjectId): Promise<IExpense[]> {
    return Expense.findRecurring(organizationId);
  }

  /**
   * Get expense summary
   */
  async getExpenseSummary(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExpenseSummary> {
    const filter: FilterQuery<IExpense> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const expenses = await Expense.find(filter).populate('vendor', 'name');

    const summary: ExpenseSummary = {
      totalAmount: 0,
      expenseCount: expenses.length,
      byCategory: {},
      byVendor: {},
      byStatus: {},
      pendingApprovals: 0,
      recurringTotal: 0,
    };

    for (const e of expenses) {
      summary.totalAmount += e.amount;
      summary.byCategory[e.category] = (summary.byCategory[e.category] || 0) + e.amount;
      summary.byStatus[e.status] = (summary.byStatus[e.status] || 0) + e.amount;

      if (e.vendor) {
        const vendorKey = e.vendor.toString();
        summary.byVendor[vendorKey] = (summary.byVendor[vendorKey] || 0) + e.amount;
      }

      if (e.status === ExpenseStatus.PENDING_APPROVAL) {
        summary.pendingApprovals++;
      }

      if (e.isRecurring && !e.parentExpense) {
        summary.recurringTotal += e.amount;
      }
    }

    return summary;
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryExpenseSummary[]> {
    const filter: FilterQuery<IExpense> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const result = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((sum, r) => sum + r.total, 0);

    return result.map((r) => ({
      category: r._id,
      total: r.total,
      count: r.count,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 10000) / 100 : 0,
    }));
  }

  /**
   * Get expenses by vendor
   */
  async getExpensesByVendor(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<VendorExpenseSummary[]> {
    const filter: FilterQuery<IExpense> = {
      organization: organizationId,
      isArchived: false,
      vendor: { $exists: true, $ne: null },
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const result = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$vendor',
          totalSpent: { $sum: '$amount' },
          expenseCount: { $sum: 1 },
          lastExpenseDate: { $max: '$date' },
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo',
        },
      },
      { $unwind: '$vendorInfo' },
      { $sort: { totalSpent: -1 } },
    ]);

    return result.map((r) => ({
      vendorId: r._id.toString(),
      vendorName: r.vendorInfo.name,
      totalSpent: r.totalSpent,
      expenseCount: r.expenseCount,
      lastExpenseDate: r.lastExpenseDate,
    }));
  }
}

export const expenseService = new ExpenseService();
