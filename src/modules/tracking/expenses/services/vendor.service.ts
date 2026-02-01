import { Types, FilterQuery } from 'mongoose';
import { Vendor, IVendor, Expense } from '../models';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { CreateVendorInput, UpdateVendorInput, VendorQueryInput } from '../schemas';
import { PaginatedResult } from '../../types';
import { validateAccountReference } from '../../utils';

export class VendorService {
  /**
   * Create a new vendor
   */
  async createVendor(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateVendorInput
  ): Promise<IVendor> {
    // Check for duplicate vendor name
    const existingVendor = await Vendor.findOne({
      organization: organizationId,
      name: { $regex: new RegExp(`^${input.name}$`, 'i') },
    });

    if (existingVendor) {
      throw new BadRequestError('A vendor with this name already exists');
    }

    // Validate default account if provided
    if (input.defaultAccountId) {
      await validateAccountReference(organizationId, input.defaultAccountId, 'expense');
    }

    const vendor = new Vendor({
      organization: organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      taxId: input.taxId,
      paymentTerms: input.paymentTerms,
      defaultAccount: input.defaultAccountId ? new Types.ObjectId(input.defaultAccountId) : undefined,
      contactName: input.contactName,
      website: input.website,
      notes: input.notes,
      tags: input.tags,
      createdBy: userId,
    });

    await vendor.save();
    return vendor;
  }

  /**
   * Get vendors with filtering and pagination
   */
  async getVendors(
    organizationId: Types.ObjectId,
    query: VendorQueryInput
  ): Promise<PaginatedResult<IVendor>> {
    const filter: FilterQuery<IVendor> = {
      organization: organizationId,
    };

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.hasDefaultAccount !== undefined) {
      if (query.hasDefaultAccount) {
        filter.defaultAccount = { $exists: true, $ne: null };
      } else {
        filter.defaultAccount = { $exists: false };
      }
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
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

    const [vendors, totalCount] = await Promise.all([
      Vendor.find(filter)
        .populate('defaultAccount', 'code name')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Vendor.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: vendors,
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
   * Get vendor by ID
   */
  async getVendorById(organizationId: Types.ObjectId, vendorId: string): Promise<IVendor> {
    const vendor = await Vendor.findOne({
      _id: new Types.ObjectId(vendorId),
      organization: organizationId,
    }).populate('defaultAccount', 'code name');

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    return vendor;
  }

  /**
   * Update vendor
   */
  async updateVendor(
    organizationId: Types.ObjectId,
    vendorId: string,
    userId: Types.ObjectId,
    input: UpdateVendorInput
  ): Promise<IVendor> {
    const vendor = await Vendor.findOne({
      _id: new Types.ObjectId(vendorId),
      organization: organizationId,
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== vendor.name) {
      const existingVendor = await Vendor.findOne({
        organization: organizationId,
        name: { $regex: new RegExp(`^${input.name}$`, 'i') },
        _id: { $ne: vendor._id },
      });

      if (existingVendor) {
        throw new BadRequestError('A vendor with this name already exists');
      }
    }

    // Validate default account if provided
    if (input.defaultAccountId) {
      await validateAccountReference(organizationId, input.defaultAccountId, 'expense');
    }

    // Update fields
    if (input.name !== undefined) vendor.name = input.name;
    if (input.email !== undefined) vendor.email = input.email || undefined;
    if (input.phone !== undefined) vendor.phone = input.phone || undefined;
    if (input.address !== undefined) vendor.address = input.address || undefined;
    if (input.taxId !== undefined) vendor.taxId = input.taxId || undefined;
    if (input.paymentTerms !== undefined) vendor.paymentTerms = input.paymentTerms || undefined;
    if (input.defaultAccountId !== undefined) {
      vendor.defaultAccount = input.defaultAccountId
        ? new Types.ObjectId(input.defaultAccountId)
        : undefined;
    }
    if (input.contactName !== undefined) vendor.contactName = input.contactName || undefined;
    if (input.website !== undefined) vendor.website = input.website || undefined;
    if (input.notes !== undefined) vendor.notes = input.notes || undefined;
    if (input.tags !== undefined) vendor.tags = input.tags;
    if (input.isActive !== undefined) vendor.isActive = input.isActive;

    vendor.updatedBy = userId;
    await vendor.save();

    return vendor;
  }

  /**
   * Archive vendor (soft delete)
   */
  async archiveVendor(
    organizationId: Types.ObjectId,
    vendorId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const vendor = await Vendor.findOne({
      _id: new Types.ObjectId(vendorId),
      organization: organizationId,
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    vendor.isActive = false;
    vendor.updatedBy = userId;
    await vendor.save();
  }

  /**
   * Recalculate vendor totals
   */
  async recalculateVendorTotals(
    organizationId: Types.ObjectId,
    vendorId: string
  ): Promise<IVendor> {
    const vendor = await Vendor.findOne({
      _id: new Types.ObjectId(vendorId),
      organization: organizationId,
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    const result = await Expense.aggregate([
      {
        $match: {
          organization: organizationId,
          vendor: vendor._id,
          isArchived: false,
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          expenseCount: { $sum: 1 },
          lastExpenseDate: { $max: '$date' },
        },
      },
    ]);

    if (result.length > 0) {
      vendor.totalSpent = result[0].totalSpent;
      vendor.expenseCount = result[0].expenseCount;
      vendor.lastExpenseDate = result[0].lastExpenseDate;
    } else {
      vendor.totalSpent = 0;
      vendor.expenseCount = 0;
      vendor.lastExpenseDate = undefined;
    }

    await vendor.save();
    return vendor;
  }

  /**
   * Get top vendors by spend
   */
  async getTopVendors(
    organizationId: Types.ObjectId,
    limit: number = 10
  ): Promise<IVendor[]> {
    return Vendor.find({
      organization: organizationId,
      isActive: true,
      totalSpent: { $gt: 0 },
    })
      .sort({ totalSpent: -1 })
      .limit(limit);
  }
}

export const vendorService = new VendorService();
