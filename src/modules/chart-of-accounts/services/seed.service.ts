import { Types } from 'mongoose';
import { Account, IAccount } from '../models';
import { DEFAULT_CHART_OF_ACCOUNTS, DefaultAccountDefinition, AccountType } from '../constants';
import { ConflictError } from '@/core/errors';

/**
 * Seed Service
 * Handles seeding default chart of accounts for new organizations
 */
export class SeedService {
  /**
   * Seed the default chart of accounts for an organization
   */
  async seedDefaultChart(
    organizationId: Types.ObjectId,
    createdBy: Types.ObjectId,
    overwrite: boolean = false
  ): Promise<{ created: number }> {
    // Check if chart already exists
    const existingCount = await Account.countDocuments({ organization: organizationId });

    if (existingCount > 0) {
      if (!overwrite) {
        throw new ConflictError(
          'Chart of accounts already exists. Set overwrite=true to replace.'
        );
      }

      // Delete existing accounts
      await Account.deleteMany({ organization: organizationId });
    }

    let created = 0;

    // Process each root account and its children recursively
    for (const rootDef of DEFAULT_CHART_OF_ACCOUNTS) {
      created += await this.createAccountRecursive(
        organizationId,
        createdBy,
        rootDef,
        null,
        rootDef.type
      );
    }

    return { created };
  }

  /**
   * Recursively create accounts from definition
   */
  private async createAccountRecursive(
    organizationId: Types.ObjectId,
    createdBy: Types.ObjectId,
    definition: DefaultAccountDefinition | Omit<DefaultAccountDefinition, 'type'>,
    parentId: Types.ObjectId | null,
    type: AccountType
  ): Promise<number> {
    // Create the account
    const account = new Account({
      organization: organizationId,
      code: definition.code,
      name: definition.name,
      description: definition.description,
      type: type,
      subtype: definition.subtype,
      parent: parentId,
      isSystem: true, // Default accounts are system accounts
      createdBy: createdBy,
    });

    await account.save();
    let count = 1;

    // Create children
    if (definition.children && definition.children.length > 0) {
      for (const childDef of definition.children) {
        count += await this.createAccountRecursive(
          organizationId,
          createdBy,
          childDef,
          account._id,
          type
        );
      }
    }

    return count;
  }

  /**
   * Seed minimal chart of accounts (just the top-level categories)
   */
  async seedMinimalChart(
    organizationId: Types.ObjectId,
    createdBy: Types.ObjectId
  ): Promise<{ created: number }> {
    const existingCount = await Account.countDocuments({ organization: organizationId });

    if (existingCount > 0) {
      throw new ConflictError('Chart of accounts already exists');
    }

    const minimalAccounts = [
      { code: '1000', name: 'Assets', type: 'asset', subtype: 'other_assets' },
      { code: '2000', name: 'Liabilities', type: 'liability', subtype: 'other_liabilities' },
      { code: '3000', name: 'Equity', type: 'equity', subtype: 'owners_equity' },
      { code: '4000', name: 'Revenue', type: 'revenue', subtype: 'operating_revenue' },
      { code: '5000', name: 'Expenses', type: 'expense', subtype: 'other_expenses' },
    ];

    for (const def of minimalAccounts) {
      const account = new Account({
        organization: organizationId,
        code: def.code,
        name: def.name,
        type: def.type,
        subtype: def.subtype,
        isSystem: true,
        createdBy: createdBy,
      });
      await account.save();
    }

    return { created: minimalAccounts.length };
  }

  /**
   * Add specific default accounts (e.g., when adding a new integration)
   */
  async addDefaultAccounts(
    organizationId: Types.ObjectId,
    createdBy: Types.ObjectId,
    accounts: Array<{
      code: string;
      name: string;
      type: AccountType;
      subtype: string;
      parentCode?: string;
    }>
  ): Promise<IAccount[]> {
    const created: IAccount[] = [];

    for (const def of accounts) {
      // Check if already exists
      const existing = await Account.findByCode(organizationId, def.code);
      if (existing) {
        continue;
      }

      // Find parent if specified
      let parentId: Types.ObjectId | undefined;
      if (def.parentCode) {
        const parent = await Account.findByCode(organizationId, def.parentCode);
        if (parent) {
          parentId = parent._id;
        }
      }

      const account = new Account({
        organization: organizationId,
        code: def.code,
        name: def.name,
        type: def.type,
        subtype: def.subtype,
        parent: parentId,
        isSystem: false,
        createdBy: createdBy,
      });

      await account.save();
      created.push(account);
    }

    return created;
  }
}

// Export singleton instance
export const seedService = new SeedService();
