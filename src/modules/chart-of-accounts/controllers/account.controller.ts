import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { accountService, seedService } from '../services';
import { CreateAccountInput, UpdateAccountInput, AccountQueryInput, SeedChartInput } from '../schemas';
import { asyncHandler } from '@/core/utils';
import { HttpStatus } from '@/core/constants';
import { ForbiddenError } from '@/core/errors';

/**
 * Account Controller
 * Handles HTTP requests for chart of accounts operations
 */
class AccountController {
  /**
   * Create a new account
   * POST /chart-of-accounts
   */
  createAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    // Check permission (owner, admin can create accounts)
    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create accounts');
    }

    const input = req.body as CreateAccountInput;
    const account = await accountService.createAccount(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: account,
      message: 'Account created successfully',
    });
  });

  /**
   * Get all accounts
   * GET /chart-of-accounts
   */
  getAccounts = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const filters = req.query as unknown as AccountQueryInput;
    const accounts = await accountService.getAccounts(organizationId, filters);

    res.status(HttpStatus.OK).json({
      success: true,
      data: accounts,
    });
  });

  /**
   * Get account tree (hierarchical)
   * GET /chart-of-accounts/tree
   */
  getAccountTree = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const tree = await accountService.getAccountTree(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: tree,
    });
  });

  /**
   * Get account by ID
   * GET /chart-of-accounts/:id
   */
  getAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const account = await accountService.getAccountById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: account,
    });
  });

  /**
   * Update account
   * PUT /chart-of-accounts/:id
   */
  updateAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    // Check permission
    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update accounts');
    }

    const input = req.body as UpdateAccountInput;
    const account = await accountService.updateAccount(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: account,
      message: 'Account updated successfully',
    });
  });

  /**
   * Archive (soft delete) account
   * DELETE /chart-of-accounts/:id
   */
  archiveAccount = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    // Check permission
    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive accounts');
    }

    await accountService.archiveAccount(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Account archived successfully',
    });
  });

  /**
   * Seed default chart of accounts
   * POST /chart-of-accounts/seed
   */
  seedChart = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    // Only owner can seed chart
    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only organization owner can seed chart of accounts');
    }

    const input = req.body as SeedChartInput;
    const result = await seedService.seedDefaultChart(
      organizationId,
      new Types.ObjectId(userId),
      input.overwrite
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: {
        created: result.created,
        message: 'Chart of accounts seeded successfully',
      },
    });
  });

  /**
   * Get accounts by type (for dropdowns)
   * GET /chart-of-accounts/by-type/:type
   */
  getAccountsByType = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { type } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const accounts = await accountService.getAccountsByType(
      organizationId,
      type as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: accounts,
    });
  });

  /**
   * Get leaf accounts (accounts that can have transactions)
   * GET /chart-of-accounts/leaf
   */
  getLeafAccounts = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const accounts = await accountService.getLeafAccounts(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: accounts,
    });
  });

  /**
   * Get account statistics
   * GET /chart-of-accounts/stats
   */
  getAccountStats = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const countByType = await accountService.getAccountCountByType(organizationId);
    const hasChart = await accountService.hasChartOfAccounts(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        hasChartOfAccounts: hasChart,
        totalAccounts: Object.values(countByType).reduce((a, b) => a + b, 0),
        byType: countByType,
      },
    });
  });
}

export const accountController = new AccountController();
