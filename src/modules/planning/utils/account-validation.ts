import { Types } from 'mongoose';
import { Account, IAccount } from '@/modules/chart-of-accounts';
import { NotFoundError, BadRequestError } from '@/core/errors';

/**
 * Validate that an account exists and is active
 * Optionally check that account is of expected type
 */
export async function validateAccountReference(
  organizationId: Types.ObjectId,
  accountId: string,
  expectedType?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
): Promise<IAccount> {
  const account = await Account.findOne({
    _id: new Types.ObjectId(accountId),
    organization: organizationId,
    isActive: true,
  });

  if (!account) {
    throw new NotFoundError('Account not found in Chart of Accounts');
  }

  if (expectedType && account.type !== expectedType) {
    throw new BadRequestError(
      `Account must be of type '${expectedType}', found '${account.type}'`
    );
  }

  return account;
}

/**
 * Validate multiple account references
 * Returns a map of accountId -> account
 */
export async function validateAccountReferences(
  organizationId: Types.ObjectId,
  accountIds: string[],
  expectedType?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
): Promise<Map<string, IAccount>> {
  const uniqueIds = [...new Set(accountIds)];
  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

  const accounts = await Account.find({
    _id: { $in: objectIds },
    organization: organizationId,
    isActive: true,
  });

  const accountMap = new Map<string, IAccount>();
  for (const account of accounts) {
    if (expectedType && account.type !== expectedType) {
      throw new BadRequestError(
        `Account '${account.code} - ${account.name}' must be of type '${expectedType}', found '${account.type}'`
      );
    }
    accountMap.set(account._id.toString(), account);
  }

  // Check if all requested accounts were found
  for (const id of uniqueIds) {
    if (!accountMap.has(id)) {
      throw new NotFoundError(`Account with ID '${id}' not found`);
    }
  }

  return accountMap;
}

/**
 * Get account details for display
 */
export interface AccountDetails {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  fullPath: string;
}

export async function getAccountDetails(
  organizationId: Types.ObjectId,
  accountId: string
): Promise<AccountDetails | null> {
  const account = await Account.findOne({
    _id: new Types.ObjectId(accountId),
    organization: organizationId,
  });

  if (!account) {
    return null;
  }

  return {
    id: account._id.toString(),
    code: account.code,
    name: account.name,
    type: account.type,
    subtype: account.subtype,
    fullPath: `${account.code} - ${account.name}`,
  };
}

/**
 * Get multiple account details for display
 */
export async function getAccountsDetails(
  organizationId: Types.ObjectId,
  accountIds: string[]
): Promise<Map<string, AccountDetails>> {
  const uniqueIds = [...new Set(accountIds)];
  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

  const accounts = await Account.find({
    _id: { $in: objectIds },
    organization: organizationId,
  });

  const detailsMap = new Map<string, AccountDetails>();
  for (const account of accounts) {
    detailsMap.set(account._id.toString(), {
      id: account._id.toString(),
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
      fullPath: `${account.code} - ${account.name}`,
    });
  }

  return detailsMap;
}

/**
 * Check if chart of accounts is set up for organization
 */
export async function ensureChartOfAccountsExists(
  organizationId: Types.ObjectId
): Promise<void> {
  const count = await Account.countDocuments({ organization: organizationId });
  if (count === 0) {
    throw new BadRequestError(
      'Chart of accounts not configured. Please seed default accounts first.'
    );
  }
}

/**
 * Get accounts for dropdown selection
 */
export async function getAccountsForDropdown(
  organizationId: Types.ObjectId,
  type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
): Promise<AccountDetails[]> {
  const query: Record<string, unknown> = {
    organization: organizationId,
    isActive: true,
  };

  if (type) {
    query.type = type;
  }

  const accounts = await Account.find(query).sort({ code: 1 });

  return accounts.map((account) => ({
    id: account._id.toString(),
    code: account.code,
    name: account.name,
    type: account.type,
    subtype: account.subtype,
    fullPath: `${account.code} - ${account.name}`,
  }));
}
