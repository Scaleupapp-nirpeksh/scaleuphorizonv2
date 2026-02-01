import { Types } from 'mongoose';
import { Account, IAccount, IAccountTreeNode } from '../models';
import { CreateAccountInput, UpdateAccountInput, AccountQueryInput } from '../schemas';
import { AccountType, AccountSubtype, SubtypeToType } from '../constants';
import { NotFoundError, BadRequestError, ConflictError } from '@/core/errors';

/**
 * Account Service
 * Handles all chart of accounts business logic
 */
export class AccountService {
  /**
   * Create a new account
   */
  async createAccount(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateAccountInput
  ): Promise<IAccount> {
    const { code, name, description, type, subtype, parentId } = input;

    // Validate subtype matches type
    const expectedType = SubtypeToType[subtype as AccountSubtype];
    if (expectedType !== type) {
      throw new BadRequestError(
        `Subtype '${subtype}' is not valid for account type '${type}'. Expected type: '${expectedType}'`
      );
    }

    // Generate code if not provided
    let accountCode = code;
    if (!accountCode) {
      accountCode = await Account.getNextCode(organizationId, type as AccountType);
    } else {
      // Check if code already exists
      const existing = await Account.findByCode(organizationId, accountCode);
      if (existing) {
        throw new ConflictError(`Account with code '${accountCode}' already exists`);
      }
    }

    // Validate parent if provided
    let parent: Types.ObjectId | undefined;
    if (parentId) {
      const parentAccount = await Account.findOne({
        _id: new Types.ObjectId(parentId),
        organization: organizationId,
      });

      if (!parentAccount) {
        throw new NotFoundError('Parent account not found');
      }

      if (parentAccount.type !== type) {
        throw new BadRequestError(
          `Parent account type '${parentAccount.type}' does not match '${type}'`
        );
      }

      if (parentAccount.depth >= 5) {
        throw new BadRequestError('Maximum account nesting depth (5) exceeded');
      }

      parent = parentAccount._id;
    }

    const account = new Account({
      organization: organizationId,
      code: accountCode,
      name,
      description,
      type,
      subtype,
      parent,
      isSystem: false,
      createdBy: userId,
    });

    await account.save();
    return account;
  }

  /**
   * Get all accounts for an organization
   */
  async getAccounts(
    organizationId: Types.ObjectId,
    filters?: AccountQueryInput
  ): Promise<IAccount[]> {
    const query: Record<string, unknown> = {
      organization: organizationId,
    };

    if (filters) {
      if (filters.type) {
        query.type = filters.type;
      }
      if (filters.subtype) {
        query.subtype = filters.subtype;
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.parentId !== undefined) {
        query.parent = filters.parentId ? new Types.ObjectId(filters.parentId) : null;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { code: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }
    }

    return Account.find(query).sort({ code: 1 });
  }

  /**
   * Get account by ID
   */
  async getAccountById(
    organizationId: Types.ObjectId,
    accountId: string
  ): Promise<IAccount> {
    const account = await Account.findOne({
      _id: new Types.ObjectId(accountId),
      organization: organizationId,
    }).populate('parent', 'code name type');

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return account;
  }

  /**
   * Update an account
   */
  async updateAccount(
    organizationId: Types.ObjectId,
    accountId: string,
    userId: Types.ObjectId,
    input: UpdateAccountInput
  ): Promise<IAccount> {
    const account = await Account.findOne({
      _id: new Types.ObjectId(accountId),
      organization: organizationId,
    });

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Cannot modify system accounts (only deactivate)
    if (account.isSystem && (input.name || input.subtype || input.parentId !== undefined)) {
      throw new BadRequestError('Cannot modify system account properties. You can only deactivate it.');
    }

    // Validate subtype if provided
    if (input.subtype) {
      const expectedType = SubtypeToType[input.subtype as AccountSubtype];
      if (expectedType !== account.type) {
        throw new BadRequestError(
          `Subtype '${input.subtype}' is not valid for account type '${account.type}'`
        );
      }
    }

    // Handle parent change
    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        account.parent = undefined;
      } else {
        // Cannot set self as parent
        if (input.parentId === accountId) {
          throw new BadRequestError('Account cannot be its own parent');
        }

        const parentAccount = await Account.findOne({
          _id: new Types.ObjectId(input.parentId),
          organization: organizationId,
        });

        if (!parentAccount) {
          throw new NotFoundError('Parent account not found');
        }

        if (parentAccount.type !== account.type) {
          throw new BadRequestError('Parent account must be of the same type');
        }

        // Check for circular reference
        if (parentAccount.path.includes(accountId)) {
          throw new BadRequestError('Circular parent reference detected');
        }

        account.parent = parentAccount._id;
      }
    }

    // Update fields
    if (input.name) account.name = input.name;
    if (input.description !== undefined) account.description = input.description || undefined;
    if (input.subtype) account.subtype = input.subtype as AccountSubtype;
    if (input.isActive !== undefined) account.isActive = input.isActive;
    account.updatedBy = userId;

    await account.save();
    return account;
  }

  /**
   * Archive (soft delete) an account
   */
  async archiveAccount(
    organizationId: Types.ObjectId,
    accountId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const account = await Account.findOne({
      _id: new Types.ObjectId(accountId),
      organization: organizationId,
    });

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Check if account has children
    const childCount = await Account.countDocuments({
      organization: organizationId,
      parent: account._id,
      isActive: true,
    });

    if (childCount > 0) {
      throw new BadRequestError(
        `Cannot archive account with ${childCount} active child account(s). Archive children first.`
      );
    }

    // TODO: Check if account has transactions (when tracking module is built)
    // For now, just archive

    account.isActive = false;
    account.updatedBy = userId;
    await account.save();
  }

  /**
   * Get hierarchical tree of accounts
   */
  async getAccountTree(organizationId: Types.ObjectId): Promise<IAccountTreeNode[]> {
    return Account.getTree(organizationId);
  }

  /**
   * Get accounts by type (for dropdowns)
   */
  async getAccountsByType(
    organizationId: Types.ObjectId,
    type: AccountType
  ): Promise<IAccount[]> {
    return Account.find({
      organization: organizationId,
      type,
      isActive: true,
    }).sort({ code: 1 });
  }

  /**
   * Get leaf accounts (accounts with no children - these can have transactions)
   */
  async getLeafAccounts(organizationId: Types.ObjectId): Promise<IAccount[]> {
    const allAccounts = await Account.find({
      organization: organizationId,
      isActive: true,
    });

    const parentIds = new Set(
      allAccounts.filter((a) => a.parent).map((a) => a.parent!.toString())
    );

    return allAccounts.filter((a) => !parentIds.has(a._id.toString()));
  }

  /**
   * Check if chart of accounts exists for organization
   */
  async hasChartOfAccounts(organizationId: Types.ObjectId): Promise<boolean> {
    const count = await Account.countDocuments({ organization: organizationId });
    return count > 0;
  }

  /**
   * Get account count by type
   */
  async getAccountCountByType(
    organizationId: Types.ObjectId
  ): Promise<Record<string, number>> {
    const result = await Account.aggregate([
      { $match: { organization: organizationId, isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const r of result) {
      counts[r._id] = r.count;
    }
    return counts;
  }
}

// Export singleton instance
export const accountService = new AccountService();
