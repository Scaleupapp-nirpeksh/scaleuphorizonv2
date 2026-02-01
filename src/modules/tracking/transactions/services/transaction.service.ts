import { Types, FilterQuery } from 'mongoose';
import { Transaction, ITransaction } from '../models';
import { Account } from '@/modules/chart-of-accounts';
import { NotFoundError, BadRequestError } from '@/core/errors';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
  BulkCategorizeInput,
} from '../schemas';
import { TransactionStatus, TransactionSource, TransactionType } from '../../constants';
import { TransactionSummary, CategorySummary, PaginatedResult } from '../../types';
import { validateAccountReference } from '../../utils';

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTransactionInput
  ): Promise<ITransaction> {
    // Validate account reference
    const account = await validateAccountReference(organizationId, input.accountId);

    // Validate account is a leaf node (no children)
    const childCount = await Account.countDocuments({
      parent: account._id,
      isActive: true,
    });

    if (childCount > 0) {
      throw new BadRequestError(
        'Transactions can only be assigned to leaf accounts (accounts with no sub-accounts)'
      );
    }

    // Validate account type matches transaction type
    if (input.type === TransactionType.INCOME && account.type !== 'revenue') {
      throw new BadRequestError('Income transactions require a revenue-type account');
    }
    if (input.type === TransactionType.EXPENSE && account.type !== 'expense') {
      throw new BadRequestError('Expense transactions require an expense-type account');
    }

    const transaction = new Transaction({
      organization: organizationId,
      account: account._id,
      type: input.type,
      amount: input.amount,
      date: new Date(input.date),
      description: input.description,
      reference: input.reference,
      category: account.subtype, // Auto-derive from account
      paymentMethod: input.paymentMethod,
      status: input.status || TransactionStatus.PENDING,
      source: input.source || TransactionSource.MANUAL,
      linkedEntities: input.linkedEntities?.map((e) => ({
        entityType: e.entityType,
        entityId: new Types.ObjectId(e.entityId),
      })),
      tags: input.tags,
      notes: input.notes,
      attachments: input.attachments,
      createdBy: userId,
    });

    await transaction.save();
    return transaction;
  }

  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(
    organizationId: Types.ObjectId,
    query: TransactionQueryInput
  ): Promise<PaginatedResult<ITransaction>> {
    const filter: FilterQuery<ITransaction> = {
      organization: organizationId,
      isArchived: query.isArchived ?? false,
    };

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.accountId) filter.account = new Types.ObjectId(query.accountId);
    if (query.category) filter.category = query.category;
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

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
        { reference: { $regex: query.search, $options: 'i' } },
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

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .populate('account', 'code name type subtype')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: transactions,
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
   * Get a single transaction by ID
   */
  async getTransactionById(
    organizationId: Types.ObjectId,
    transactionId: string
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
    }).populate('account', 'code name type subtype');

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  /**
   * Update a transaction
   */
  async updateTransaction(
    organizationId: Types.ObjectId,
    transactionId: string,
    userId: Types.ObjectId,
    input: UpdateTransactionInput
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
      isArchived: false,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Cannot modify reconciled transactions
    if (transaction.status === TransactionStatus.RECONCILED) {
      throw new BadRequestError('Cannot modify reconciled transactions');
    }

    // If changing account, validate new account
    if (input.accountId) {
      const account = await validateAccountReference(organizationId, input.accountId);

      const childCount = await Account.countDocuments({
        parent: account._id,
        isActive: true,
      });

      if (childCount > 0) {
        throw new BadRequestError('Transactions can only use leaf accounts');
      }

      const transactionType = input.type || transaction.type;
      if (transactionType === TransactionType.INCOME && account.type !== 'revenue') {
        throw new BadRequestError('Income transactions require a revenue-type account');
      }
      if (transactionType === TransactionType.EXPENSE && account.type !== 'expense') {
        throw new BadRequestError('Expense transactions require an expense-type account');
      }

      transaction.account = account._id;
      transaction.category = account.subtype;
    }

    // Update fields
    if (input.type !== undefined) transaction.type = input.type;
    if (input.amount !== undefined) transaction.amount = input.amount;
    if (input.date !== undefined) transaction.date = new Date(input.date);
    if (input.description !== undefined) transaction.description = input.description;
    if (input.reference !== undefined) transaction.reference = input.reference || undefined;
    if (input.paymentMethod !== undefined)
      transaction.paymentMethod = input.paymentMethod || undefined;
    if (input.status !== undefined) transaction.status = input.status;
    if (input.tags !== undefined) transaction.tags = input.tags;
    if (input.notes !== undefined) transaction.notes = input.notes || undefined;
    if (input.attachments !== undefined) transaction.attachments = input.attachments;

    transaction.updatedBy = userId;
    await transaction.save();

    return transaction;
  }

  /**
   * Archive a transaction
   */
  async archiveTransaction(
    organizationId: Types.ObjectId,
    transactionId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
      isArchived: false,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status === TransactionStatus.RECONCILED) {
      throw new BadRequestError('Cannot archive reconciled transactions');
    }

    transaction.isArchived = true;
    transaction.archivedAt = new Date();
    transaction.archivedBy = userId;
    await transaction.save();
  }

  /**
   * Bulk create transactions
   */
  async bulkCreateTransactions(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    inputs: CreateTransactionInput[]
  ): Promise<{ created: number; errors: string[] }> {
    const results = { created: 0, errors: [] as string[] };

    for (let i = 0; i < inputs.length; i++) {
      try {
        await this.createTransaction(organizationId, userId, inputs[i]);
        results.created++;
      } catch (error) {
        results.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Bulk categorize transactions
   */
  async bulkCategorize(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: BulkCategorizeInput
  ): Promise<{ updated: number }> {
    // Validate new account
    const account = await validateAccountReference(organizationId, input.accountId);

    const childCount = await Account.countDocuments({
      parent: account._id,
      isActive: true,
    });

    if (childCount > 0) {
      throw new BadRequestError('Can only categorize to leaf accounts');
    }

    const objectIds = input.transactionIds.map((id) => new Types.ObjectId(id));

    // Find all transactions and validate
    const transactions = await Transaction.find({
      _id: { $in: objectIds },
      organization: organizationId,
      isArchived: false,
      status: { $ne: TransactionStatus.RECONCILED },
    });

    // Validate account type matches transaction types
    for (const t of transactions) {
      if (t.type === TransactionType.INCOME && account.type !== 'revenue') {
        throw new BadRequestError(
          `Transaction ${t._id} is income type but target account is not revenue type`
        );
      }
      if (t.type === TransactionType.EXPENSE && account.type !== 'expense') {
        throw new BadRequestError(
          `Transaction ${t._id} is expense type but target account is not expense type`
        );
      }
    }

    // Update all matching transactions
    const result = await Transaction.updateMany(
      {
        _id: { $in: objectIds },
        organization: organizationId,
        isArchived: false,
        status: { $ne: TransactionStatus.RECONCILED },
      },
      {
        $set: {
          account: account._id,
          category: account.subtype,
          updatedBy: userId,
        },
      }
    );

    return { updated: result.modifiedCount };
  }

  /**
   * Clear a transaction (mark as cleared)
   */
  async clearTransaction(
    organizationId: Types.ObjectId,
    transactionId: string,
    userId: Types.ObjectId
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
      isArchived: false,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status === TransactionStatus.RECONCILED) {
      throw new BadRequestError('Transaction is already reconciled');
    }

    transaction.status = TransactionStatus.CLEARED;
    transaction.updatedBy = userId;
    await transaction.save();

    return transaction;
  }

  /**
   * Reconcile a transaction
   */
  async reconcileTransaction(
    organizationId: Types.ObjectId,
    transactionId: string,
    userId: Types.ObjectId
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
      isArchived: false,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status === TransactionStatus.RECONCILED) {
      throw new BadRequestError('Transaction is already reconciled');
    }

    transaction.status = TransactionStatus.RECONCILED;
    transaction.reconciliationDate = new Date();
    transaction.reconciledBy = userId;
    transaction.updatedBy = userId;
    await transaction.save();

    return transaction;
  }

  /**
   * Link an entity to a transaction
   */
  async linkEntity(
    organizationId: Types.ObjectId,
    transactionId: string,
    entityType: string,
    entityId: string
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
      isArchived: false,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Check if already linked
    const alreadyLinked = transaction.linkedEntities?.some(
      (e) => e.entityType === entityType && e.entityId.toString() === entityId
    );

    if (alreadyLinked) {
      throw new BadRequestError('Entity is already linked to this transaction');
    }

    transaction.linkedEntities = transaction.linkedEntities || [];
    transaction.linkedEntities.push({
      entityType,
      entityId: new Types.ObjectId(entityId),
    });

    await transaction.save();
    return transaction;
  }

  /**
   * Unlink an entity from a transaction
   */
  async unlinkEntity(
    organizationId: Types.ObjectId,
    transactionId: string,
    entityType: string,
    entityId: string
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
      isArchived: false,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    transaction.linkedEntities = (transaction.linkedEntities || []).filter(
      (e) => !(e.entityType === entityType && e.entityId.toString() === entityId)
    );

    await transaction.save();
    return transaction;
  }

  /**
   * Get transaction summary for a date range
   */
  async getTransactionSummary(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionSummary> {
    const filter: FilterQuery<ITransaction> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const transactions = await Transaction.find(filter);

    const summary: TransactionSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
      transactionCount: transactions.length,
      byCategory: {},
      byPaymentMethod: {},
      byStatus: {},
    };

    for (const t of transactions) {
      if (t.type === TransactionType.INCOME) {
        summary.totalIncome += t.amount;
      } else {
        summary.totalExpenses += t.amount;
      }

      summary.byCategory[t.category] = (summary.byCategory[t.category] || 0) + t.amount;

      if (t.paymentMethod) {
        summary.byPaymentMethod[t.paymentMethod] =
          (summary.byPaymentMethod[t.paymentMethod] || 0) + t.amount;
      }

      summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + t.amount;
    }

    summary.netAmount = summary.totalIncome - summary.totalExpenses;

    return summary;
  }

  /**
   * Get transactions grouped by category
   */
  async getTransactionsByCategory(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date,
    type?: string
  ): Promise<CategorySummary[]> {
    const filter: FilterQuery<ITransaction> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    if (type) {
      filter.type = type;
    }

    const result = await Transaction.aggregate([
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
}

export const transactionService = new TransactionService();
