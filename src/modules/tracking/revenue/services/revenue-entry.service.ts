import { Types, FilterQuery } from 'mongoose';
import { RevenueEntry, IRevenueEntry, Customer } from '../models';
import { Transaction } from '../../transactions/models';
import { NotFoundError, BadRequestError } from '@/core/errors';
import {
  CreateRevenueEntryInput,
  UpdateRevenueEntryInput,
  ReceiveRevenueEntryInput,
  CancelRevenueEntryInput,
  RevenueEntryQueryInput,
} from '../schemas';
import { PaginatedResult, MRRMetrics } from '../../types';
import { validateAccountReference } from '../../utils';
import {
  RevenueEntryStatus,
  TransactionType,
  TransactionStatus,
  TransactionSource,
  SubscriptionStatus,
} from '../../constants';
import { customerService } from './customer.service';

export class RevenueEntryService {
  /**
   * Create a new revenue entry
   */
  async createRevenueEntry(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateRevenueEntryInput
  ): Promise<IRevenueEntry> {
    // Validate account is revenue type
    const account = await validateAccountReference(organizationId, input.accountId, 'revenue');

    // Validate customer if provided
    if (input.customerId) {
      const customer = await Customer.findOne({
        _id: new Types.ObjectId(input.customerId),
        organization: organizationId,
      });
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
    }

    // Check for duplicate invoice number
    if (input.invoiceNumber) {
      const existingEntry = await RevenueEntry.findOne({
        organization: organizationId,
        invoiceNumber: input.invoiceNumber,
      });
      if (existingEntry) {
        throw new BadRequestError('A revenue entry with this invoice number already exists');
      }
    }

    const revenueEntry = new RevenueEntry({
      organization: organizationId,
      account: new Types.ObjectId(input.accountId),
      customer: input.customerId ? new Types.ObjectId(input.customerId) : undefined,
      amount: input.amount,
      date: new Date(input.date),
      description: input.description,
      category: account.subtype || 'revenue',
      invoiceNumber: input.invoiceNumber,
      revenueType: input.revenueType,
      status: input.status || RevenueEntryStatus.PENDING,
      revenueStream: input.revenueStreamId ? new Types.ObjectId(input.revenueStreamId) : undefined,
      subscriptionPeriodStart: input.subscriptionPeriodStart
        ? new Date(input.subscriptionPeriodStart)
        : undefined,
      subscriptionPeriodEnd: input.subscriptionPeriodEnd
        ? new Date(input.subscriptionPeriodEnd)
        : undefined,
      tags: input.tags,
      notes: input.notes,
      attachments: input.attachments,
      createdBy: userId,
    });

    await revenueEntry.save();

    // Update customer totals
    if (input.customerId) {
      await customerService.recalculateCustomerTotals(organizationId, input.customerId);
    }

    return revenueEntry.populate([
      { path: 'account', select: 'code name type subtype' },
      { path: 'customer', select: 'name company' },
    ]);
  }

  /**
   * Get revenue entries with filtering and pagination
   */
  async getRevenueEntries(
    organizationId: Types.ObjectId,
    query: RevenueEntryQueryInput
  ): Promise<PaginatedResult<IRevenueEntry>> {
    const filter: FilterQuery<IRevenueEntry> = {
      organization: organizationId,
      isArchived: query.isArchived ?? false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.revenueType) {
      filter.revenueType = query.revenueType;
    }

    if (query.customerId) {
      filter.customer = new Types.ObjectId(query.customerId);
    }

    if (query.accountId) {
      filter.account = new Types.ObjectId(query.accountId);
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.invoiceNumber) {
      filter.invoiceNumber = { $regex: query.invoiceNumber, $options: 'i' };
    }

    if (query.revenueStreamId) {
      filter.revenueStream = new Types.ObjectId(query.revenueStreamId);
    }

    if (query.startDate) {
      filter.date = { $gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      filter.date = { ...filter.date, $lte: new Date(query.endDate) };
    }

    if (query.minAmount !== undefined) {
      filter.amount = { $gte: query.minAmount };
    }

    if (query.maxAmount !== undefined) {
      filter.amount = { ...filter.amount, $lte: query.maxAmount };
    }

    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: 'i' } },
        { invoiceNumber: { $regex: query.search, $options: 'i' } },
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

    const [entries, totalCount] = await Promise.all([
      RevenueEntry.find(filter)
        .populate('account', 'code name type subtype')
        .populate('customer', 'name company')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      RevenueEntry.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: entries,
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
   * Get revenue entry by ID
   */
  async getRevenueEntryById(
    organizationId: Types.ObjectId,
    entryId: string
  ): Promise<IRevenueEntry> {
    const entry = await RevenueEntry.findOne({
      _id: new Types.ObjectId(entryId),
      organization: organizationId,
    })
      .populate('account', 'code name type subtype')
      .populate('customer', 'name company');

    if (!entry) {
      throw new NotFoundError('Revenue entry not found');
    }

    return entry;
  }

  /**
   * Update revenue entry
   */
  async updateRevenueEntry(
    organizationId: Types.ObjectId,
    entryId: string,
    userId: Types.ObjectId,
    input: UpdateRevenueEntryInput
  ): Promise<IRevenueEntry> {
    const entry = await RevenueEntry.findOne({
      _id: new Types.ObjectId(entryId),
      organization: organizationId,
    });

    if (!entry) {
      throw new NotFoundError('Revenue entry not found');
    }

    // Cannot update received or cancelled entries (except notes, tags, attachments)
    if (entry.status !== RevenueEntryStatus.PENDING) {
      const allowedFields = ['notes', 'tags', 'attachments'];
      const inputFields = Object.keys(input).filter(
        (k) => input[k as keyof UpdateRevenueEntryInput] !== undefined
      );
      const hasDisallowedFields = inputFields.some((f) => !allowedFields.includes(f));

      if (hasDisallowedFields) {
        throw new BadRequestError(
          `Cannot modify ${entry.status} revenue entries. Only notes, tags, and attachments can be updated.`
        );
      }
    }

    const oldCustomerId = entry.customer?.toString();

    // Validate account if provided
    if (input.accountId) {
      const account = await validateAccountReference(organizationId, input.accountId, 'revenue');
      entry.account = new Types.ObjectId(input.accountId);
      entry.category = account.subtype || 'revenue';
    }

    // Validate customer if provided
    if (input.customerId) {
      const customer = await Customer.findOne({
        _id: new Types.ObjectId(input.customerId),
        organization: organizationId,
      });
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
    }

    // Check for duplicate invoice number
    if (input.invoiceNumber && input.invoiceNumber !== entry.invoiceNumber) {
      const existingEntry = await RevenueEntry.findOne({
        organization: organizationId,
        invoiceNumber: input.invoiceNumber,
        _id: { $ne: entry._id },
      });
      if (existingEntry) {
        throw new BadRequestError('A revenue entry with this invoice number already exists');
      }
    }

    // Update fields
    if (input.customerId !== undefined) {
      entry.customer = input.customerId ? new Types.ObjectId(input.customerId) : undefined;
    }
    if (input.amount !== undefined) entry.amount = input.amount;
    if (input.date !== undefined) entry.date = new Date(input.date);
    if (input.description !== undefined) entry.description = input.description;
    if (input.invoiceNumber !== undefined) entry.invoiceNumber = input.invoiceNumber || undefined;
    if (input.revenueType !== undefined) entry.revenueType = input.revenueType;
    if (input.revenueStreamId !== undefined) {
      entry.revenueStream = input.revenueStreamId
        ? new Types.ObjectId(input.revenueStreamId)
        : undefined;
    }
    if (input.subscriptionPeriodStart !== undefined) {
      entry.subscriptionPeriodStart = input.subscriptionPeriodStart
        ? new Date(input.subscriptionPeriodStart)
        : undefined;
    }
    if (input.subscriptionPeriodEnd !== undefined) {
      entry.subscriptionPeriodEnd = input.subscriptionPeriodEnd
        ? new Date(input.subscriptionPeriodEnd)
        : undefined;
    }
    if (input.tags !== undefined) entry.tags = input.tags;
    if (input.notes !== undefined) entry.notes = input.notes || undefined;
    if (input.attachments !== undefined) entry.attachments = input.attachments;

    entry.updatedBy = userId;
    await entry.save();

    // Update customer totals if customer changed
    const newCustomerId = entry.customer?.toString();
    if (oldCustomerId !== newCustomerId) {
      if (oldCustomerId) {
        await customerService.recalculateCustomerTotals(organizationId, oldCustomerId);
      }
      if (newCustomerId) {
        await customerService.recalculateCustomerTotals(organizationId, newCustomerId);
      }
    }

    return entry.populate([
      { path: 'account', select: 'code name type subtype' },
      { path: 'customer', select: 'name company' },
    ]);
  }

  /**
   * Archive revenue entry (soft delete)
   */
  async archiveRevenueEntry(
    organizationId: Types.ObjectId,
    entryId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const entry = await RevenueEntry.findOne({
      _id: new Types.ObjectId(entryId),
      organization: organizationId,
    });

    if (!entry) {
      throw new NotFoundError('Revenue entry not found');
    }

    entry.isArchived = true;
    entry.updatedBy = userId;
    await entry.save();

    // Update customer totals
    if (entry.customer) {
      await customerService.recalculateCustomerTotals(organizationId, entry.customer.toString());
    }
  }

  /**
   * Mark revenue entry as received (creates transaction)
   */
  async markAsReceived(
    organizationId: Types.ObjectId,
    entryId: string,
    userId: Types.ObjectId,
    input: ReceiveRevenueEntryInput
  ): Promise<IRevenueEntry> {
    const entry = await RevenueEntry.findOne({
      _id: new Types.ObjectId(entryId),
      organization: organizationId,
    });

    if (!entry) {
      throw new NotFoundError('Revenue entry not found');
    }

    if (entry.status !== RevenueEntryStatus.PENDING) {
      throw new BadRequestError(`Cannot receive a revenue entry with status '${entry.status}'`);
    }

    // Update entry status
    entry.status = RevenueEntryStatus.RECEIVED;
    entry.receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
    entry.paymentMethod = input.paymentMethod;
    entry.paymentReference = input.paymentReference;
    entry.updatedBy = userId;

    // Create a transaction for the received revenue
    const transaction = new Transaction({
      organization: organizationId,
      account: entry.account,
      type: TransactionType.INCOME,
      amount: entry.amount,
      date: entry.receivedAt,
      description: entry.description,
      reference: entry.invoiceNumber || entry.paymentReference,
      category: entry.category,
      paymentMethod: input.paymentMethod,
      status: TransactionStatus.CLEARED,
      source: TransactionSource.REVENUE,
      linkedEntities: [{ entityType: 'revenue', entityId: entry._id }],
      createdBy: userId,
    });

    await transaction.save();
    entry.transaction = transaction._id;
    await entry.save();

    // Update customer totals
    if (entry.customer) {
      await customerService.recalculateCustomerTotals(organizationId, entry.customer.toString());
    }

    return entry.populate([
      { path: 'account', select: 'code name type subtype' },
      { path: 'customer', select: 'name company' },
    ]);
  }

  /**
   * Cancel revenue entry
   */
  async cancelRevenueEntry(
    organizationId: Types.ObjectId,
    entryId: string,
    userId: Types.ObjectId,
    input: CancelRevenueEntryInput
  ): Promise<IRevenueEntry> {
    const entry = await RevenueEntry.findOne({
      _id: new Types.ObjectId(entryId),
      organization: organizationId,
    });

    if (!entry) {
      throw new NotFoundError('Revenue entry not found');
    }

    if (entry.status === RevenueEntryStatus.RECEIVED) {
      throw new BadRequestError('Cannot cancel a received revenue entry');
    }

    if (entry.status === RevenueEntryStatus.CANCELLED) {
      throw new BadRequestError('Revenue entry is already cancelled');
    }

    entry.status = RevenueEntryStatus.CANCELLED;
    entry.notes = input.reason
      ? `${entry.notes ? entry.notes + '\n' : ''}Cancelled: ${input.reason}`
      : entry.notes;
    entry.updatedBy = userId;

    await entry.save();

    // Update customer totals
    if (entry.customer) {
      await customerService.recalculateCustomerTotals(organizationId, entry.customer.toString());
    }

    return entry.populate([
      { path: 'account', select: 'code name type subtype' },
      { path: 'customer', select: 'name company' },
    ]);
  }

  /**
   * Get MRR/ARR metrics
   */
  async getMRRMetrics(organizationId: Types.ObjectId): Promise<MRRMetrics> {
    // Get active subscribers and their monthly values
    const activeSubscribers = await Customer.find({
      organization: organizationId,
      isActive: true,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });

    const mrr = activeSubscribers.reduce((sum, c) => sum + c.monthlyValue, 0);

    // Get churned customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const churnedThisMonth = await Customer.find({
      organization: organizationId,
      subscriptionStatus: SubscriptionStatus.CHURNED,
      subscriptionEndDate: { $gte: startOfMonth, $lt: endOfMonth },
    });

    const churnedMRR = churnedThisMonth.reduce((sum, c) => sum + c.monthlyValue, 0);

    // Get new customers this month
    const newCustomersThisMonth = await Customer.find({
      organization: organizationId,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionStartDate: { $gte: startOfMonth, $lt: endOfMonth },
    });

    const newMRR = newCustomersThisMonth.reduce((sum, c) => sum + c.monthlyValue, 0);

    // Calculate expansion MRR (simplified - based on revenue entries exceeding customer MRR)
    const expansionRevenue = await RevenueEntry.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startOfMonth, $lt: endOfMonth },
          status: RevenueEntryStatus.RECEIVED,
          revenueType: 'subscription',
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $unwind: { path: '$customerData', preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          'customerData.subscriptionStartDate': { $lt: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$customer',
          totalRevenue: { $sum: '$amount' },
          expectedMRR: { $first: '$customerData.monthlyValue' },
        },
      },
      {
        $project: {
          expansion: {
            $max: [{ $subtract: ['$totalRevenue', '$expectedMRR'] }, 0],
          },
        },
      },
    ]);

    const expansionMRR = expansionRevenue.reduce((sum, e) => sum + (e.expansion || 0), 0);

    const netNewMRR = newMRR + expansionMRR - churnedMRR;

    // Calculate MRR change percentage (simplified - would need historical data for accurate calculation)
    const mrrChangePercentage = mrr > 0 ? (netNewMRR / mrr) * 100 : 0;

    return {
      currentMRR: mrr,
      previousMRR: mrr - netNewMRR, // Approximate previous MRR
      mrrChange: netNewMRR,
      mrrChangePercentage: Math.round(mrrChangePercentage * 100) / 100,
      newMRR,
      expansionMRR,
      churnedMRR,
      netNewMRR,
      activeSubscribers: activeSubscribers.length,
      avgRevenuePerAccount: activeSubscribers.length > 0 ? mrr / activeSubscribers.length : 0,
    };
  }

  /**
   * Get revenue summary by category
   */
  async getRevenueByCategory(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const match: FilterQuery<IRevenueEntry> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    const result = await RevenueEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.reduce(
      (acc, r) => {
        acc[r._id] = r.total;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Get revenue summary by customer
   */
  async getRevenueByCustomer(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ customerId: string; customerName: string; total: number }>> {
    const match: FilterQuery<IRevenueEntry> = {
      organization: organizationId,
      isArchived: false,
      customer: { $exists: true },
    };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    const result = await RevenueEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customer',
          total: { $sum: '$amount' },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          customerId: '$_id',
          customerName: '$customer.name',
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    return result;
  }

  /**
   * Get revenue summary by revenue type
   */
  async getRevenueByType(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const match: FilterQuery<IRevenueEntry> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    const result = await RevenueEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$revenueType',
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.reduce(
      (acc, r) => {
        acc[r._id] = r.total;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Get revenue summary with various breakdowns
   */
  async getRevenueSummary(
    organizationId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number;
    receivedRevenue: number;
    pendingRevenue: number;
    cancelledRevenue: number;
    revenueEntryCount: number;
    byCategory: Record<string, number>;
    byCustomer: Record<string, number>;
    byRevenueType: Record<string, number>;
    byMonth: Array<{ month: string; total: number; received: number; pending: number }>;
  }> {
    const match: FilterQuery<IRevenueEntry> = {
      organization: organizationId,
      isArchived: false,
    };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    const [totals, byCategory, byCustomer, byRevenueType, byMonth] = await Promise.all([
      RevenueEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            receivedRevenue: {
              $sum: { $cond: [{ $eq: ['$status', RevenueEntryStatus.RECEIVED] }, '$amount', 0] },
            },
            pendingRevenue: {
              $sum: { $cond: [{ $eq: ['$status', RevenueEntryStatus.PENDING] }, '$amount', 0] },
            },
            cancelledRevenue: {
              $sum: { $cond: [{ $eq: ['$status', RevenueEntryStatus.CANCELLED] }, '$amount', 0] },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.getRevenueByCategory(organizationId, startDate, endDate),
      RevenueEntry.aggregate([
        { $match: { ...match, customer: { $exists: true } } },
        {
          $group: {
            _id: '$customer',
            total: { $sum: '$amount' },
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
      ]),
      this.getRevenueByType(organizationId, startDate, endDate),
      RevenueEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: '$amount' },
            received: {
              $sum: { $cond: [{ $eq: ['$status', RevenueEntryStatus.RECEIVED] }, '$amount', 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', RevenueEntryStatus.PENDING] }, '$amount', 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            month: '$_id',
            total: 1,
            received: 1,
            pending: 1,
            _id: 0,
          },
        },
      ]),
    ]);

    const customerTotals = byCustomer.reduce(
      (acc, c) => {
        acc[c.customer.name] = c.total;
        return acc;
      },
      {} as Record<string, number>
    );

    const summary = totals[0] || {
      totalRevenue: 0,
      receivedRevenue: 0,
      pendingRevenue: 0,
      cancelledRevenue: 0,
      count: 0,
    };

    return {
      totalRevenue: summary.totalRevenue,
      receivedRevenue: summary.receivedRevenue,
      pendingRevenue: summary.pendingRevenue,
      cancelledRevenue: summary.cancelledRevenue,
      revenueEntryCount: summary.count,
      byCategory,
      byCustomer: customerTotals,
      byRevenueType,
      byMonth,
    };
  }
}

export const revenueEntryService = new RevenueEntryService();
