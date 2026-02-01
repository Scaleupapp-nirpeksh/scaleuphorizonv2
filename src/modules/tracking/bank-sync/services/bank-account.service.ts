import { Types, FilterQuery } from 'mongoose';
import { BankAccount, IBankAccount } from '../models';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { CreateBankAccountInput, UpdateBankAccountInput, BankAccountQueryInput } from '../schemas';
import { PaginatedResult } from '../../types';
import { validateAccountReference } from '../../utils';

export class BankAccountService {
  /**
   * Create a new bank account
   */
  async createBankAccount(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateBankAccountInput
  ): Promise<IBankAccount> {
    // Check for duplicate account name
    const existingAccount = await BankAccount.findOne({
      organization: organizationId,
      name: { $regex: new RegExp(`^${input.name}$`, 'i') },
    });

    if (existingAccount) {
      throw new BadRequestError('A bank account with this name already exists');
    }

    // Validate linked account if provided (must be asset type)
    if (input.linkedAccountId) {
      await validateAccountReference(organizationId, input.linkedAccountId, 'asset');
    }

    const bankAccount = new BankAccount({
      organization: organizationId,
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountType: input.accountType,
      currency: input.currency || 'USD',
      currentBalance: input.currentBalance || 0,
      linkedAccount: input.linkedAccountId ? new Types.ObjectId(input.linkedAccountId) : undefined,
      description: input.description,
      notes: input.notes,
      createdBy: userId,
    });

    await bankAccount.save();
    return bankAccount;
  }

  /**
   * Get bank accounts with filtering and pagination
   */
  async getBankAccounts(
    organizationId: Types.ObjectId,
    query: BankAccountQueryInput
  ): Promise<PaginatedResult<IBankAccount>> {
    const filter: FilterQuery<IBankAccount> = {
      organization: organizationId,
    };

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.accountType) {
      filter.accountType = query.accountType;
    }

    if (query.hasLinkedAccount !== undefined) {
      if (query.hasLinkedAccount) {
        filter.linkedAccount = { $exists: true, $ne: null };
      } else {
        filter.linkedAccount = { $exists: false };
      }
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { bankName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortField = query.sortBy || 'name';

    const [accounts, totalCount] = await Promise.all([
      BankAccount.find(filter)
        .populate('linkedAccount', 'code name')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      BankAccount.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: accounts,
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
   * Get bank account by ID
   */
  async getBankAccountById(organizationId: Types.ObjectId, accountId: string): Promise<IBankAccount> {
    const account = await BankAccount.findOne({
      _id: new Types.ObjectId(accountId),
      organization: organizationId,
    }).populate('linkedAccount', 'code name');

    if (!account) {
      throw new NotFoundError('Bank account not found');
    }

    return account;
  }

  /**
   * Update bank account
   */
  async updateBankAccount(
    organizationId: Types.ObjectId,
    accountId: string,
    userId: Types.ObjectId,
    input: UpdateBankAccountInput
  ): Promise<IBankAccount> {
    const account = await BankAccount.findOne({
      _id: new Types.ObjectId(accountId),
      organization: organizationId,
    });

    if (!account) {
      throw new NotFoundError('Bank account not found');
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== account.name) {
      const existingAccount = await BankAccount.findOne({
        organization: organizationId,
        name: { $regex: new RegExp(`^${input.name}$`, 'i') },
        _id: { $ne: account._id },
      });

      if (existingAccount) {
        throw new BadRequestError('A bank account with this name already exists');
      }
    }

    // Validate linked account if provided
    if (input.linkedAccountId) {
      await validateAccountReference(organizationId, input.linkedAccountId, 'asset');
    }

    // Update fields
    if (input.name !== undefined) account.name = input.name;
    if (input.bankName !== undefined) account.bankName = input.bankName;
    if (input.accountNumber !== undefined) account.accountNumber = input.accountNumber;
    if (input.accountType !== undefined) account.accountType = input.accountType;
    if (input.currency !== undefined) account.currency = input.currency;
    if (input.currentBalance !== undefined) account.currentBalance = input.currentBalance;
    if (input.linkedAccountId !== undefined) {
      account.linkedAccount = input.linkedAccountId
        ? new Types.ObjectId(input.linkedAccountId)
        : undefined;
    }
    if (input.description !== undefined) account.description = input.description || undefined;
    if (input.notes !== undefined) account.notes = input.notes || undefined;
    if (input.isActive !== undefined) account.isActive = input.isActive;

    account.updatedBy = userId;
    await account.save();

    return account;
  }

  /**
   * Archive bank account (soft delete)
   */
  async archiveBankAccount(
    organizationId: Types.ObjectId,
    accountId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const account = await BankAccount.findOne({
      _id: new Types.ObjectId(accountId),
      organization: organizationId,
    });

    if (!account) {
      throw new NotFoundError('Bank account not found');
    }

    account.isActive = false;
    account.updatedBy = userId;
    await account.save();
  }

  /**
   * Update balance after import
   */
  async updateBalanceAfterImport(
    organizationId: Types.ObjectId,
    accountId: string,
    balance: number,
    importDate: Date
  ): Promise<void> {
    await BankAccount.updateOne(
      { _id: new Types.ObjectId(accountId), organization: organizationId },
      {
        currentBalance: balance,
        lastImportDate: importDate,
        lastImportedBalance: balance,
      }
    );
  }
}

export const bankAccountService = new BankAccountService();
