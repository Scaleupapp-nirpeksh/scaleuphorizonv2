import { Types } from 'mongoose';
import { AccountType, AccountSubtype } from '../constants';

/**
 * Seed options for chart of accounts
 */
export interface SeedOptions {
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  overwrite?: boolean;
}

/**
 * Account summary for dropdowns
 */
export interface AccountSummary {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  fullPath: string;
}

/**
 * Account with balance (used in reports)
 */
export interface AccountWithBalance {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  balance: number;
  debit: number;
  credit: number;
}
