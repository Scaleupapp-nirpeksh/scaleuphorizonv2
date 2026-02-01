import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { cashFlowService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateCashFlowForecastInput,
  UpdateCashFlowForecastInput,
  AddProjectionItemsInput,
  CashFlowQueryInput,
} from '../schemas';

/**
 * Cash Flow Controller
 *
 * Handles HTTP requests for cash flow forecasting
 */
class CashFlowController {
  // ============ Cash Flow CRUD ============

  /**
   * Create a new cash flow forecast
   * POST /projection/cash-flow
   */
  createForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create forecasts');
    }

    const forecast = await cashFlowService.createForecast(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateCashFlowForecastInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: forecast,
      message: 'Cash flow forecast created successfully',
    });
  });

  /**
   * Get cash flow forecasts with filtering
   * GET /projection/cash-flow
   */
  getForecasts = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const result = await cashFlowService.getForecasts(
      organizationId,
      req.query as unknown as CashFlowQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get cash flow forecast by ID
   * GET /projection/cash-flow/:id
   */
  getForecastById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const forecast = await cashFlowService.getForecastById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
    });
  });

  /**
   * Update cash flow forecast
   * PUT /projection/cash-flow/:id
   */
  updateForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update forecasts');
    }

    const forecast = await cashFlowService.updateForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateCashFlowForecastInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Cash flow forecast updated successfully',
    });
  });

  /**
   * Archive cash flow forecast
   * DELETE /projection/cash-flow/:id
   */
  archiveForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive forecasts');
    }

    await cashFlowService.archiveForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Cash flow forecast archived successfully',
    });
  });

  // ============ Projection Management ============

  /**
   * Add items to a period projection
   * POST /projection/cash-flow/:id/items
   */
  addProjectionItems = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can modify projections');
    }

    const forecast = await cashFlowService.addProjectionItems(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as AddProjectionItemsInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Projection items added successfully',
    });
  });

  // ============ Status Management ============

  /**
   * Activate a cash flow forecast
   * POST /projection/cash-flow/:id/activate
   */
  activateForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can activate forecasts');
    }

    const forecast = await cashFlowService.activateForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Cash flow forecast activated successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Get cash flow summary
   * GET /projection/cash-flow/:id/summary
   */
  getCashFlowSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const summary = await cashFlowService.getCashFlowSummary(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  /**
   * Get daily projections for a month
   * GET /projection/cash-flow/:id/daily?month=2024-01
   */
  getDailyProjections = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const monthParam = req.query.month as string;
    if (!monthParam) {
      throw new ForbiddenError('Month parameter required (format: YYYY-MM)');
    }

    const month = new Date(monthParam + '-01');
    const projections = await cashFlowService.getDailyProjections(
      organizationId,
      req.params.id,
      month
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: projections,
    });
  });

  /**
   * Get weekly projections
   * GET /projection/cash-flow/:id/weekly
   */
  getWeeklyProjections = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const projections = await cashFlowService.getWeeklyProjections(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: projections,
    });
  });

  /**
   * Recalculate with actual transaction data
   * POST /projection/cash-flow/:id/recalculate
   */
  recalculateWithActuals = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const forecast = await cashFlowService.recalculateWithActuals(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Forecast recalculated with actual data',
    });
  });
}

export const cashFlowController = new CashFlowController();
