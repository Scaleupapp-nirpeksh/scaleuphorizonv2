import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { bankTransactionService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  UpdateBankTransactionInput,
  MatchTransactionInput,
  BankTransactionQueryInput,
  CSVImportInput,
} from '../schemas';

class BankTransactionController {
  /**
   * Get bank transactions with filtering
   * GET /tracking/bank-transactions
   */
  getBankTransactions = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await bankTransactionService.getBankTransactions(
      organizationId,
      req.query as unknown as BankTransactionQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get bank transaction by ID
   * GET /tracking/bank-transactions/:id
   */
  getBankTransactionById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const transaction = await bankTransactionService.getBankTransactionById(
      organizationId,
      req.params.id
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Update bank transaction
   * PUT /tracking/bank-transactions/:id
   */
  updateBankTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await bankTransactionService.updateBankTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateBankTransactionInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Match bank transaction with an existing transaction
   * POST /tracking/bank-transactions/:id/match
   */
  matchTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await bankTransactionService.matchTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as MatchTransactionInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Unmatch a bank transaction
   * POST /tracking/bank-transactions/:id/unmatch
   */
  unmatchTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await bankTransactionService.unmatchTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Reconcile a matched bank transaction
   * POST /tracking/bank-transactions/:id/reconcile
   */
  reconcileTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await bankTransactionService.reconcileTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Mark bank transaction as ignored
   * POST /tracking/bank-transactions/:id/ignore
   */
  ignoreTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await bankTransactionService.ignoreTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Get unmatched transactions
   * GET /tracking/bank-transactions/unmatched
   */
  getUnmatchedTransactions = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const transactions = await bankTransactionService.getUnmatchedTransactions(
      organizationId,
      req.query.bankAccountId as string | undefined
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transactions,
    });
  });

  /**
   * Import transactions from CSV
   * POST /tracking/bank-accounts/:id/import
   */
  importFromCSV = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const result = await bankTransactionService.importFromCSV(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as CSVImportInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  });

  /**
   * Auto-match bank transactions
   * POST /tracking/bank-transactions/auto-match
   */
  autoMatchTransactions = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await bankTransactionService.autoMatchTransactions(
      organizationId,
      req.query.bankAccountId as string | undefined
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  });
}

export const bankTransactionController = new BankTransactionController();
