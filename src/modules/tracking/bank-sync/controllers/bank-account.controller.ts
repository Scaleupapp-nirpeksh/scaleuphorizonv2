import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { bankAccountService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import { CreateBankAccountInput, UpdateBankAccountInput, BankAccountQueryInput } from '../schemas';

class BankAccountController {
  /**
   * Create a new bank account
   * POST /tracking/bank-accounts
   */
  createBankAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const account = await bankAccountService.createBankAccount(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateBankAccountInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: account,
    });
  });

  /**
   * Get bank accounts with filtering
   * GET /tracking/bank-accounts
   */
  getBankAccounts = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await bankAccountService.getBankAccounts(
      organizationId,
      req.query as unknown as BankAccountQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get bank account by ID
   * GET /tracking/bank-accounts/:id
   */
  getBankAccountById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const account = await bankAccountService.getBankAccountById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: account,
    });
  });

  /**
   * Update bank account
   * PUT /tracking/bank-accounts/:id
   */
  updateBankAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const account = await bankAccountService.updateBankAccount(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateBankAccountInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: account,
    });
  });

  /**
   * Archive bank account
   * DELETE /tracking/bank-accounts/:id
   */
  archiveBankAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    await bankAccountService.archiveBankAccount(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Bank account archived successfully',
    });
  });
}

export const bankAccountController = new BankAccountController();
