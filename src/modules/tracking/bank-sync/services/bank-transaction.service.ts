import { Types, FilterQuery } from 'mongoose';
import { randomUUID } from 'crypto';
import { BankAccount, BankTransaction, IBankTransaction } from '../models';
import { Transaction } from '../../transactions/models';
import { NotFoundError, BadRequestError } from '@/core/errors';
import {
  UpdateBankTransactionInput,
  MatchTransactionInput,
  BankTransactionQueryInput,
  CSVImportInput,
} from '../schemas';
import { PaginatedResult, ImportResult } from '../../types';
import { parseCSV, generateChecksum, parseAmount, parseDate } from '../../utils/csv-parser';
import { BankTransactionStatus, TRACKING_CONSTANTS } from '../../constants';
import { bankAccountService } from './bank-account.service';

export class BankTransactionService {
  /**
   * Get bank transactions with filtering and pagination
   */
  async getBankTransactions(
    organizationId: Types.ObjectId,
    query: BankTransactionQueryInput
  ): Promise<PaginatedResult<IBankTransaction>> {
    const filter: FilterQuery<IBankTransaction> = {
      organization: organizationId,
    };

    if (query.bankAccountId) {
      filter.bankAccount = new Types.ObjectId(query.bankAccountId);
    }

    if (query.status) {
      filter.status = query.status;
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

    if (query.category) {
      filter.category = query.category;
    }

    if (query.importBatchId) {
      filter.importBatchId = query.importBatchId;
    }

    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: 'i' } },
        { category: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortField = query.sortBy || 'date';

    const [transactions, totalCount] = await Promise.all([
      BankTransaction.find(filter)
        .populate('bankAccount', 'name bankName')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      BankTransaction.countDocuments(filter),
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
   * Get bank transaction by ID
   */
  async getBankTransactionById(
    organizationId: Types.ObjectId,
    transactionId: string
  ): Promise<IBankTransaction> {
    const transaction = await BankTransaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
    }).populate('bankAccount', 'name bankName');

    if (!transaction) {
      throw new NotFoundError('Bank transaction not found');
    }

    return transaction;
  }

  /**
   * Update bank transaction
   */
  async updateBankTransaction(
    organizationId: Types.ObjectId,
    transactionId: string,
    userId: Types.ObjectId,
    input: UpdateBankTransactionInput
  ): Promise<IBankTransaction> {
    const transaction = await BankTransaction.findOne({
      _id: new Types.ObjectId(transactionId),
      organization: organizationId,
    });

    if (!transaction) {
      throw new NotFoundError('Bank transaction not found');
    }

    if (input.category !== undefined) transaction.category = input.category || undefined;

    transaction.updatedBy = userId;
    await transaction.save();

    return transaction.populate('bankAccount', 'name bankName');
  }

  /**
   * Match bank transaction with an existing transaction
   */
  async matchTransaction(
    organizationId: Types.ObjectId,
    bankTransactionId: string,
    userId: Types.ObjectId,
    input: MatchTransactionInput
  ): Promise<IBankTransaction> {
    const bankTransaction = await BankTransaction.findOne({
      _id: new Types.ObjectId(bankTransactionId),
      organization: organizationId,
    });

    if (!bankTransaction) {
      throw new NotFoundError('Bank transaction not found');
    }

    if (bankTransaction.status === BankTransactionStatus.RECONCILED) {
      throw new BadRequestError('Bank transaction is already reconciled');
    }

    // Verify the transaction exists
    const transaction = await Transaction.findOne({
      _id: new Types.ObjectId(input.transactionId),
      organization: organizationId,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    bankTransaction.status = BankTransactionStatus.MATCHED;
    bankTransaction.matchedTransaction = transaction._id;
    bankTransaction.matchConfidence = 100; // Manual match = 100% confidence
    bankTransaction.updatedBy = userId;

    await bankTransaction.save();

    return bankTransaction.populate('bankAccount', 'name bankName');
  }

  /**
   * Unmatch a bank transaction
   */
  async unmatchTransaction(
    organizationId: Types.ObjectId,
    bankTransactionId: string,
    userId: Types.ObjectId
  ): Promise<IBankTransaction> {
    const bankTransaction = await BankTransaction.findOne({
      _id: new Types.ObjectId(bankTransactionId),
      organization: organizationId,
    });

    if (!bankTransaction) {
      throw new NotFoundError('Bank transaction not found');
    }

    if (bankTransaction.status === BankTransactionStatus.RECONCILED) {
      throw new BadRequestError('Cannot unmatch a reconciled transaction');
    }

    if (bankTransaction.status !== BankTransactionStatus.MATCHED) {
      throw new BadRequestError('Bank transaction is not matched');
    }

    bankTransaction.status = BankTransactionStatus.UNMATCHED;
    bankTransaction.matchedTransaction = undefined;
    bankTransaction.matchConfidence = undefined;
    bankTransaction.updatedBy = userId;

    await bankTransaction.save();

    return bankTransaction.populate('bankAccount', 'name bankName');
  }

  /**
   * Reconcile a matched bank transaction
   */
  async reconcileTransaction(
    organizationId: Types.ObjectId,
    bankTransactionId: string,
    userId: Types.ObjectId
  ): Promise<IBankTransaction> {
    const bankTransaction = await BankTransaction.findOne({
      _id: new Types.ObjectId(bankTransactionId),
      organization: organizationId,
    });

    if (!bankTransaction) {
      throw new NotFoundError('Bank transaction not found');
    }

    if (bankTransaction.status === BankTransactionStatus.RECONCILED) {
      throw new BadRequestError('Bank transaction is already reconciled');
    }

    if (bankTransaction.status !== BankTransactionStatus.MATCHED) {
      throw new BadRequestError('Bank transaction must be matched before reconciliation');
    }

    bankTransaction.status = BankTransactionStatus.RECONCILED;
    bankTransaction.reconciledBy = userId;
    bankTransaction.reconciledAt = new Date();
    bankTransaction.updatedBy = userId;

    await bankTransaction.save();

    return bankTransaction.populate('bankAccount', 'name bankName');
  }

  /**
   * Mark bank transaction as ignored
   */
  async ignoreTransaction(
    organizationId: Types.ObjectId,
    bankTransactionId: string,
    userId: Types.ObjectId
  ): Promise<IBankTransaction> {
    const bankTransaction = await BankTransaction.findOne({
      _id: new Types.ObjectId(bankTransactionId),
      organization: organizationId,
    });

    if (!bankTransaction) {
      throw new NotFoundError('Bank transaction not found');
    }

    if (bankTransaction.status === BankTransactionStatus.RECONCILED) {
      throw new BadRequestError('Cannot ignore a reconciled transaction');
    }

    bankTransaction.status = BankTransactionStatus.IGNORED;
    bankTransaction.updatedBy = userId;

    await bankTransaction.save();

    return bankTransaction.populate('bankAccount', 'name bankName');
  }

  /**
   * Get unmatched transactions
   */
  async getUnmatchedTransactions(
    organizationId: Types.ObjectId,
    bankAccountId?: string
  ): Promise<IBankTransaction[]> {
    return BankTransaction.findUnmatched(
      organizationId,
      bankAccountId ? new Types.ObjectId(bankAccountId) : undefined
    );
  }

  /**
   * Import transactions from CSV
   */
  async importFromCSV(
    organizationId: Types.ObjectId,
    bankAccountId: string,
    userId: Types.ObjectId,
    input: CSVImportInput
  ): Promise<ImportResult> {
    // Verify bank account exists
    const bankAccount = await BankAccount.findOne({
      _id: new Types.ObjectId(bankAccountId),
      organization: organizationId,
    });

    if (!bankAccount) {
      throw new NotFoundError('Bank account not found');
    }

    // Parse CSV
    const skipRows = input.skipRows || 0;
    const rows = parseCSV(input.csvData, skipRows);

    if (rows.length > TRACKING_CONSTANTS.MAX_CSV_ROWS) {
      throw new BadRequestError(`Maximum ${TRACKING_CONSTANTS.MAX_CSV_ROWS} rows allowed per import`);
    }

    const importBatchId = randomUUID();
    const importedAt = new Date();
    const result: ImportResult = {
      success: true,
      importBatchId,
      totalRows: rows.length,
      importedCount: 0,
      skippedDuplicates: 0,
      errors: [],
    };

    let latestBalance: number | undefined;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1 + (input.skipRows || 0) + (input.hasHeader ? 1 : 0);

      try {
        // Parse row data
        const dateStr = row[input.columnMapping.date];
        const description = row[input.columnMapping.description];
        let amount: number | null;

        // Handle separate debit/credit columns or single amount column
        if (input.columnMapping.debit && input.columnMapping.credit) {
          const debit = parseAmount(row[input.columnMapping.debit]) || 0;
          const credit = parseAmount(row[input.columnMapping.credit]) || 0;
          amount = credit - debit;
        } else {
          amount = parseAmount(row[input.columnMapping.amount]);
        }

        const date = parseDate(dateStr, input.dateFormat);

        if (!date) {
          result.errors.push({ row: rowNumber, message: 'Invalid date format' });
          continue;
        }

        if (!description) {
          result.errors.push({ row: rowNumber, message: 'Missing description' });
          continue;
        }

        if (amount === null || isNaN(amount)) {
          result.errors.push({ row: rowNumber, message: 'Invalid amount' });
          continue;
        }

        // Generate checksum for deduplication
        const checksum = generateChecksum(date, amount, description);

        // Check for duplicate
        const existing = await BankTransaction.findByChecksum(organizationId, checksum);
        if (existing) {
          result.skippedDuplicates++;
          continue;
        }

        // Parse balance if available
        if (input.columnMapping.balance) {
          const parsedBalance = parseAmount(row[input.columnMapping.balance]);
          if (parsedBalance !== null) {
            latestBalance = parsedBalance;
          }
        }

        // Create bank transaction
        const bankTransaction = new BankTransaction({
          organization: organizationId,
          bankAccount: new Types.ObjectId(bankAccountId),
          amount,
          date,
          description: description.trim(),
          status: BankTransactionStatus.UNMATCHED,
          importedAt,
          importBatchId,
          checksum,
          externalId: input.columnMapping.reference ? row[input.columnMapping.reference] : undefined,
          rawData: row,
          createdBy: userId,
        });

        await bankTransaction.save();
        result.importedCount++;
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Set success based on whether any transactions were imported
    result.success = result.importedCount > 0 || result.errors.length === 0;

    // Update bank account balance if we have a latest balance
    if (latestBalance !== undefined) {
      await bankAccountService.updateBalanceAfterImport(
        organizationId,
        bankAccountId,
        latestBalance,
        importedAt
      );
    }

    return result;
  }

  /**
   * Auto-match bank transactions with existing transactions
   */
  async autoMatchTransactions(
    organizationId: Types.ObjectId,
    bankAccountId?: string
  ): Promise<{
    processed: number;
    matched: number;
    unmatched: number;
    matches: Array<{ bankTransactionId: string; transactionId: string; confidence: number }>;
  }> {
    // Get unmatched bank transactions
    const unmatchedBankTxns = await this.getUnmatchedTransactions(organizationId, bankAccountId);

    const result = {
      processed: unmatchedBankTxns.length,
      matched: 0,
      unmatched: 0,
      matches: [] as Array<{ bankTransactionId: string; transactionId: string; confidence: number }>,
    };

    for (const bankTxn of unmatchedBankTxns) {
      // Look for potential matches in transactions
      // Match criteria: same date (± 7 days), same amount
      const dateStart = new Date(bankTxn.date);
      dateStart.setDate(dateStart.getDate() - TRACKING_CONSTANTS.MATCH_DATE_RANGE_DAYS);
      const dateEnd = new Date(bankTxn.date);
      dateEnd.setDate(dateEnd.getDate() + TRACKING_CONSTANTS.MATCH_DATE_RANGE_DAYS);

      const potentialMatches = await Transaction.find({
        organization: organizationId,
        amount: Math.abs(bankTxn.amount),
        date: { $gte: dateStart, $lte: dateEnd },
        // Not already linked
        'linkedEntities.entityType': { $ne: 'bank_transaction' },
      });

      if (potentialMatches.length === 1) {
        // Single match - high confidence
        const match = potentialMatches[0];
        const confidence = this.calculateMatchConfidence(bankTxn, match);

        if (confidence >= TRACKING_CONSTANTS.AUTO_MATCH_MIN_CONFIDENCE) {
          bankTxn.status = BankTransactionStatus.MATCHED;
          bankTxn.matchedTransaction = match._id;
          bankTxn.matchConfidence = confidence;
          await bankTxn.save();

          result.matched++;
          result.matches.push({
            bankTransactionId: bankTxn._id.toString(),
            transactionId: match._id.toString(),
            confidence,
          });
          continue;
        }
      } else if (potentialMatches.length > 1) {
        // Multiple matches - suggest the best one
        let bestMatch = potentialMatches[0];
        let bestConfidence = this.calculateMatchConfidence(bankTxn, bestMatch);

        for (let i = 1; i < potentialMatches.length; i++) {
          const confidence = this.calculateMatchConfidence(bankTxn, potentialMatches[i]);
          if (confidence > bestConfidence) {
            bestMatch = potentialMatches[i];
            bestConfidence = confidence;
          }
        }

        bankTxn.suggestedCategory = bestMatch.category;
        await bankTxn.save();
      }

      result.unmatched++;
    }

    return result;
  }

  /**
   * Calculate match confidence between bank transaction and transaction
   */
  private calculateMatchConfidence(
    bankTxn: IBankTransaction,
    transaction: InstanceType<typeof Transaction>
  ): number {
    let confidence = 0;

    // Exact amount match
    if (Math.abs(bankTxn.amount) === transaction.amount) {
      confidence += 50;
    }

    // Date proximity (closer = higher confidence)
    const daysDiff = Math.abs(
      Math.floor(
        (bankTxn.date.getTime() - transaction.date.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    if (daysDiff === 0) {
      confidence += 30;
    } else if (daysDiff <= 1) {
      confidence += 20;
    } else if (daysDiff <= 3) {
      confidence += 10;
    }

    // Description similarity (simple contains check)
    const bankDesc = bankTxn.description.toLowerCase();
    const txnDesc = transaction.description.toLowerCase();
    if (bankDesc.includes(txnDesc) || txnDesc.includes(bankDesc)) {
      confidence += 20;
    }

    return Math.min(confidence, 100);
  }
}

export const bankTransactionService = new BankTransactionService();
