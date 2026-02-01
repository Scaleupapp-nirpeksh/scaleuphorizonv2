import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { budgetService } from '../services';
import {
  CreateBudgetInput,
  UpdateBudgetInput,
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
  ApproveBudgetInput,
  RejectBudgetInput,
  CloneBudgetInput,
  BudgetQueryInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

/**
 * Budget Controller
 * Handles HTTP requests for budget management
 */
class BudgetController {
  // ============ Budget CRUD ============

  /**
   * Create a new budget
   * POST /planning/budgets
   */
  createBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create budgets');
    }

    const input = req.body as CreateBudgetInput;
    const budget = await budgetService.createBudget(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: budget,
      message: 'Budget created successfully',
    });
  });

  /**
   * Get all budgets
   * GET /planning/budgets
   */
  getBudgets = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const filters = req.query as unknown as BudgetQueryInput;
    const budgets = await budgetService.getBudgets(organizationId, filters);

    res.status(HttpStatus.OK).json({
      success: true,
      data: budgets,
    });
  });

  /**
   * Get budget by ID
   * GET /planning/budgets/:id
   */
  getBudgetById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const budget = await budgetService.getBudgetById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: budget,
    });
  });

  /**
   * Update budget
   * PUT /planning/budgets/:id
   */
  updateBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update budgets');
    }

    const input = req.body as UpdateBudgetInput;
    const budget = await budgetService.updateBudget(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: budget,
      message: 'Budget updated successfully',
    });
  });

  /**
   * Archive budget
   * DELETE /planning/budgets/:id
   */
  archiveBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive budgets');
    }

    await budgetService.archiveBudget(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Budget archived successfully',
    });
  });

  // ============ Budget Workflow ============

  /**
   * Submit budget for approval
   * POST /planning/budgets/:id/submit
   */
  submitForApproval = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can submit budgets');
    }

    const budget = await budgetService.submitForApproval(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: budget,
      message: 'Budget submitted for approval',
    });
  });

  /**
   * Approve budget
   * POST /planning/budgets/:id/approve
   */
  approveBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can approve budgets');
    }

    const input = req.body as ApproveBudgetInput;
    const budget = await budgetService.approveBudget(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: budget,
      message: 'Budget approved successfully',
    });
  });

  /**
   * Reject budget
   * POST /planning/budgets/:id/reject
   */
  rejectBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can reject budgets');
    }

    const input = req.body as RejectBudgetInput;
    const budget = await budgetService.rejectBudget(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: budget,
      message: 'Budget rejected',
    });
  });

  /**
   * Activate budget
   * POST /planning/budgets/:id/activate
   */
  activateBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can activate budgets');
    }

    const budget = await budgetService.activateBudget(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: budget,
      message: 'Budget activated successfully',
    });
  });

  /**
   * Clone budget
   * POST /planning/budgets/:id/clone
   */
  cloneBudget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can clone budgets');
    }

    const input = req.body as CloneBudgetInput;
    const budget = await budgetService.cloneBudget(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: budget,
      message: 'Budget cloned successfully',
    });
  });

  // ============ Budget Items ============

  /**
   * Get budget items
   * GET /planning/budgets/:id/items
   */
  getBudgetItems = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const items = await budgetService.getBudgetItems(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: items,
    });
  });

  /**
   * Add budget item
   * POST /planning/budgets/:id/items
   */
  addBudgetItem = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can add budget items');
    }

    const input = req.body as CreateBudgetItemInput;
    const item = await budgetService.addBudgetItem(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: item,
      message: 'Budget item added successfully',
    });
  });

  /**
   * Update budget item
   * PUT /planning/budgets/:id/items/:itemId
   */
  updateBudgetItem = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, itemId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update budget items');
    }

    const input = req.body as UpdateBudgetItemInput;
    const item = await budgetService.updateBudgetItem(
      organizationId,
      id,
      itemId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: item,
      message: 'Budget item updated successfully',
    });
  });

  /**
   * Delete budget item
   * DELETE /planning/budgets/:id/items/:itemId
   */
  deleteBudgetItem = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, itemId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete budget items');
    }

    await budgetService.deleteBudgetItem(
      organizationId,
      id,
      itemId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Budget item deleted successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Get budget summary
   * GET /planning/budgets/:id/summary
   */
  getBudgetSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const summary = await budgetService.getBudgetSummary(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  /**
   * Get monthly breakdown
   * GET /planning/budgets/:id/monthly
   */
  getMonthlyBreakdown = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const breakdown = await budgetService.getMonthlyBreakdown(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: breakdown,
    });
  });

  /**
   * Get category breakdown
   * GET /planning/budgets/:id/by-category
   */
  getCategoryBreakdown = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const breakdown = await budgetService.getCategoryBreakdown(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: breakdown,
    });
  });
}

export const budgetController = new BudgetController();
