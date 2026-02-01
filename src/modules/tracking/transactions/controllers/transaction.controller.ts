import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { transactionService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
  BulkCategorizeInput,
} from '../schemas';

class TransactionController {
  /**
   * Create a new transaction
   * POST /tracking/transactions
   */
  createTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await transactionService.createTransaction(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateTransactionInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Get transactions with filtering
   * GET /tracking/transactions
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await transactionService.getTransactions(
      organizationId,
      req.query as unknown as TransactionQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get transaction by ID
   * GET /tracking/transactions/:id
   */
  getTransactionById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const transaction = await transactionService.getTransactionById(
      organizationId,
      req.params.id
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Update transaction
   * PUT /tracking/transactions/:id
   */
  updateTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await transactionService.updateTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateTransactionInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Archive transaction
   * DELETE /tracking/transactions/:id
   */
  archiveTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    await transactionService.archiveTransaction(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Transaction archived successfully',
    });
  });

  /**
   * Bulk create transactions
   * POST /tracking/transactions/bulk
   */
  bulkCreateTransactions = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const result = await transactionService.bulkCreateTransactions(
      organizationId,
      new Types.ObjectId(userId),
      req.body.transactions as CreateTransactionInput[]
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  });

  /**
   * Bulk categorize transactions
   * POST /tracking/transactions/categorize
   */
  bulkCategorize = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const result = await transactionService.bulkCategorize(
      organizationId,
      new Types.ObjectId(userId),
      req.body as BulkCategorizeInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  });

  /**
   * Clear transaction
   * POST /tracking/transactions/:id/clear
   */
  clearTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await transactionService.clearTransaction(
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
   * Reconcile transaction
   * POST /tracking/transactions/:id/reconcile
   */
  reconcileTransaction = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const transaction = await transactionService.reconcileTransaction(
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
   * Get transaction summary
   * GET /tracking/transactions/summary
   */
  getTransactionSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const summary = await transactionService.getTransactionSummary(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  /**
   * Get transactions by category
   * GET /tracking/transactions/by-category
   */
  getTransactionsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const categories = await transactionService.getTransactionsByCategory(
      organizationId,
      startDate,
      endDate,
      req.query.type as string | undefined
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: categories,
    });
  });
}

export const transactionController = new TransactionController();
