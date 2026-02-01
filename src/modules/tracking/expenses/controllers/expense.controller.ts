import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { expenseService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  ApproveExpenseInput,
  RejectExpenseInput,
  PayExpenseInput,
  ExpenseQueryInput,
} from '../schemas';

class ExpenseController {
  /**
   * Create a new expense
   * POST /tracking/expenses
   */
  createExpense = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.createExpense(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateExpenseInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Get expenses with filtering
   * GET /tracking/expenses
   */
  getExpenses = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await expenseService.getExpenses(
      organizationId,
      req.query as unknown as ExpenseQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get expense by ID
   * GET /tracking/expenses/:id
   */
  getExpenseById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.getExpenseById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Update expense
   * PUT /tracking/expenses/:id
   */
  updateExpense = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.updateExpense(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateExpenseInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Archive expense
   * DELETE /tracking/expenses/:id
   */
  archiveExpense = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    await expenseService.archiveExpense(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Expense archived successfully',
    });
  });

  /**
   * Submit expense for approval
   * POST /tracking/expenses/:id/submit
   */
  submitForApproval = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.submitForApproval(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Approve expense
   * POST /tracking/expenses/:id/approve
   */
  approveExpense = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.approveExpense(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as ApproveExpenseInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Reject expense
   * POST /tracking/expenses/:id/reject
   */
  rejectExpense = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.rejectExpense(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as RejectExpenseInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Mark expense as paid
   * POST /tracking/expenses/:id/pay
   */
  markAsPaid = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const expense = await expenseService.markAsPaid(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as PayExpenseInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: expense,
    });
  });

  /**
   * Get pending approvals
   * GET /tracking/expenses/pending-approvals
   */
  getPendingApprovals = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const expenses = await expenseService.getPendingApprovals(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: expenses,
    });
  });

  /**
   * Get recurring expenses
   * GET /tracking/expenses/recurring
   */
  getRecurringExpenses = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const expenses = await expenseService.getRecurringExpenses(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: expenses,
    });
  });

  /**
   * Get expense summary
   * GET /tracking/expenses/summary
   */
  getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const summary = await expenseService.getExpenseSummary(
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
   * Get expenses by category
   * GET /tracking/expenses/by-category
   */
  getExpensesByCategory = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const data = await expenseService.getExpensesByCategory(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });

  /**
   * Get expenses by vendor
   * GET /tracking/expenses/by-vendor
   */
  getExpensesByVendor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const data = await expenseService.getExpensesByVendor(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });
}

export const expenseController = new ExpenseController();
