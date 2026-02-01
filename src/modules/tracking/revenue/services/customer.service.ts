import { Types, FilterQuery } from 'mongoose';
import { Customer, ICustomer, RevenueEntry } from '../models';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from '../schemas';
import { PaginatedResult } from '../../types';

export class CustomerService {
  /**
   * Create a new customer
   */
  async createCustomer(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateCustomerInput
  ): Promise<ICustomer> {
    // Check for duplicate customer name (case-insensitive)
    const existingCustomer = await Customer.findOne({
      organization: organizationId,
      name: { $regex: new RegExp(`^${input.name}$`, 'i') },
    });

    if (existingCustomer) {
      throw new BadRequestError('A customer with this name already exists');
    }

    const customer = new Customer({
      organization: organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      subscriptionStatus: input.subscriptionStatus,
      monthlyValue: input.monthlyValue || 0,
      subscriptionStartDate: input.subscriptionStartDate ? new Date(input.subscriptionStartDate) : undefined,
      subscriptionEndDate: input.subscriptionEndDate ? new Date(input.subscriptionEndDate) : undefined,
      address: input.address,
      contactName: input.contactName,
      notes: input.notes,
      tags: input.tags,
      createdBy: userId,
    });

    await customer.save();
    return customer;
  }

  /**
   * Get customers with filtering and pagination
   */
  async getCustomers(
    organizationId: Types.ObjectId,
    query: CustomerQueryInput
  ): Promise<PaginatedResult<ICustomer>> {
    const filter: FilterQuery<ICustomer> = {
      organization: organizationId,
    };

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.subscriptionStatus) {
      filter.subscriptionStatus = query.subscriptionStatus;
    }

    if (query.hasSubscription !== undefined) {
      if (query.hasSubscription) {
        filter.subscriptionStatus = { $exists: true, $ne: null };
      } else {
        filter.subscriptionStatus = { $exists: false };
      }
    }

    if (query.minMonthlyValue !== undefined) {
      filter.monthlyValue = { $gte: query.minMonthlyValue };
    }

    if (query.maxMonthlyValue !== undefined) {
      filter.monthlyValue = { ...filter.monthlyValue, $lte: query.maxMonthlyValue };
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { company: { $regex: query.search, $options: 'i' } },
        { contactName: { $regex: query.search, $options: 'i' } },
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
    const sortField = query.sortBy || 'name';

    const [customers, totalCount] = await Promise.all([
      Customer.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: customers,
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
   * Get customer by ID
   */
  async getCustomerById(organizationId: Types.ObjectId, customerId: string): Promise<ICustomer> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      organization: organizationId,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  /**
   * Update customer
   */
  async updateCustomer(
    organizationId: Types.ObjectId,
    customerId: string,
    userId: Types.ObjectId,
    input: UpdateCustomerInput
  ): Promise<ICustomer> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      organization: organizationId,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== customer.name) {
      const existingCustomer = await Customer.findOne({
        organization: organizationId,
        name: { $regex: new RegExp(`^${input.name}$`, 'i') },
        _id: { $ne: customer._id },
      });

      if (existingCustomer) {
        throw new BadRequestError('A customer with this name already exists');
      }
    }

    // Update fields
    if (input.name !== undefined) customer.name = input.name;
    if (input.email !== undefined) customer.email = input.email || undefined;
    if (input.phone !== undefined) customer.phone = input.phone || undefined;
    if (input.company !== undefined) customer.company = input.company || undefined;
    if (input.subscriptionStatus !== undefined) customer.subscriptionStatus = input.subscriptionStatus || undefined;
    if (input.monthlyValue !== undefined) customer.monthlyValue = input.monthlyValue;
    if (input.subscriptionStartDate !== undefined) {
      customer.subscriptionStartDate = input.subscriptionStartDate
        ? new Date(input.subscriptionStartDate)
        : undefined;
    }
    if (input.subscriptionEndDate !== undefined) {
      customer.subscriptionEndDate = input.subscriptionEndDate
        ? new Date(input.subscriptionEndDate)
        : undefined;
    }
    if (input.address !== undefined) customer.address = input.address || undefined;
    if (input.contactName !== undefined) customer.contactName = input.contactName || undefined;
    if (input.notes !== undefined) customer.notes = input.notes || undefined;
    if (input.tags !== undefined) customer.tags = input.tags;
    if (input.isActive !== undefined) customer.isActive = input.isActive;

    customer.updatedBy = userId;
    await customer.save();

    return customer;
  }

  /**
   * Archive customer (soft delete)
   */
  async archiveCustomer(
    organizationId: Types.ObjectId,
    customerId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      organization: organizationId,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    customer.isActive = false;
    customer.updatedBy = userId;
    await customer.save();
  }

  /**
   * Recalculate customer totals from revenue entries
   */
  async recalculateCustomerTotals(
    organizationId: Types.ObjectId,
    customerId: string
  ): Promise<ICustomer> {
    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      organization: organizationId,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const result = await RevenueEntry.aggregate([
      {
        $match: {
          organization: organizationId,
          customer: customer._id,
          isArchived: false,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          revenueEntryCount: { $sum: 1 },
          firstPurchaseDate: { $min: '$date' },
          lastPurchaseDate: { $max: '$date' },
        },
      },
    ]);

    if (result.length > 0) {
      customer.totalRevenue = result[0].totalRevenue;
      customer.revenueEntryCount = result[0].revenueEntryCount;
      customer.firstPurchaseDate = result[0].firstPurchaseDate;
      customer.lastPurchaseDate = result[0].lastPurchaseDate;
    } else {
      customer.totalRevenue = 0;
      customer.revenueEntryCount = 0;
      customer.firstPurchaseDate = undefined;
      customer.lastPurchaseDate = undefined;
    }

    await customer.save();
    return customer;
  }

  /**
   * Get active subscribers
   */
  async getActiveSubscribers(
    organizationId: Types.ObjectId,
    limit: number = 100
  ): Promise<ICustomer[]> {
    return Customer.find({
      organization: organizationId,
      isActive: true,
      subscriptionStatus: 'active',
    })
      .sort({ monthlyValue: -1 })
      .limit(limit);
  }

  /**
   * Get churned customers
   */
  async getChurnedCustomers(
    organizationId: Types.ObjectId,
    limit: number = 100
  ): Promise<ICustomer[]> {
    return Customer.find({
      organization: organizationId,
      subscriptionStatus: 'churned',
    })
      .sort({ subscriptionEndDate: -1 })
      .limit(limit);
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomers(
    organizationId: Types.ObjectId,
    limit: number = 10
  ): Promise<ICustomer[]> {
    return Customer.find({
      organization: organizationId,
      isActive: true,
      totalRevenue: { $gt: 0 },
    })
      .sort({ totalRevenue: -1 })
      .limit(limit);
  }
}

export const customerService = new CustomerService();
