import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { financialModelService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateFinancialModelInput,
  UpdateFinancialModelInput,
  FinancialModelQueryInput,
} from '../schemas';

/**
 * Financial Model Controller
 *
 * Handles HTTP requests for 3-statement financial models
 */
class FinancialModelController {
  // ============ Financial Model CRUD ============

  /**
   * Create a new financial model
   * POST /projection/financial-model
   */
  createModel = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create financial models');
    }

    const model = await financialModelService.createModel(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateFinancialModelInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: model,
      message: 'Financial model created successfully',
    });
  });

  /**
   * Get financial models with filtering
   * GET /projection/financial-model
   */
  getModels = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const result = await financialModelService.getModels(
      organizationId,
      req.query as unknown as FinancialModelQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get financial model by ID
   * GET /projection/financial-model/:id
   */
  getModelById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const model = await financialModelService.getModelById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: model,
    });
  });

  /**
   * Update financial model
   * PUT /projection/financial-model/:id
   */
  updateModel = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update financial models');
    }

    const model = await financialModelService.updateModel(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateFinancialModelInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: model,
      message: 'Financial model updated successfully',
    });
  });

  /**
   * Archive financial model
   * DELETE /projection/financial-model/:id
   */
  archiveModel = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive financial models');
    }

    await financialModelService.archiveModel(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Financial model archived successfully',
    });
  });

  // ============ Status Management ============

  /**
   * Activate a financial model
   * POST /projection/financial-model/:id/activate
   */
  activateModel = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can activate models');
    }

    const model = await financialModelService.activateModel(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: model,
      message: 'Financial model activated successfully',
    });
  });

  // ============ Recalculation ============

  /**
   * Recalculate model with latest data
   * POST /projection/financial-model/:id/recalculate
   */
  recalculateModel = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const model = await financialModelService.recalculateModel(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: model,
      message: 'Financial model recalculated successfully',
    });
  });

  // ============ Statement Access ============

  /**
   * Get income statement
   * GET /projection/financial-model/:id/income-statement
   */
  getIncomeStatement = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const statement = await financialModelService.getIncomeStatement(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: statement,
    });
  });

  /**
   * Get balance sheet
   * GET /projection/financial-model/:id/balance-sheet
   */
  getBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const statement = await financialModelService.getBalanceSheet(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: statement,
    });
  });

  /**
   * Get cash flow statement
   * GET /projection/financial-model/:id/cash-flow-statement
   */
  getCashFlowStatement = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const statement = await financialModelService.getCashFlowStatement(
      organizationId,
      req.params.id
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: statement,
    });
  });

  /**
   * Get key metrics
   * GET /projection/financial-model/:id/metrics
   */
  getKeyMetrics = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const metrics = await financialModelService.getKeyMetrics(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: metrics,
    });
  });
}

export const financialModelController = new FinancialModelController();
