import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { forecastService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateForecastInput,
  UpdateForecastInput,
  RetrainForecastInput,
  ForecastQueryInput,
} from '../schemas';

/**
 * Forecast Controller
 *
 * Handles HTTP requests for forecasting
 */
class ForecastController {
  // ============ Forecast CRUD ============

  /**
   * Create a new forecast
   * POST /projection/forecast
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

    const forecast = await forecastService.createForecast(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateForecastInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: forecast,
      message: 'Forecast created successfully',
    });
  });

  /**
   * Get forecasts with filtering
   * GET /projection/forecast
   */
  getForecasts = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const result = await forecastService.getForecasts(
      organizationId,
      req.query as unknown as ForecastQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get forecast by ID
   * GET /projection/forecast/:id
   */
  getForecastById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const forecast = await forecastService.getForecastById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
    });
  });

  /**
   * Update forecast
   * PUT /projection/forecast/:id
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

    const forecast = await forecastService.updateForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateForecastInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Forecast updated successfully',
    });
  });

  /**
   * Archive forecast
   * DELETE /projection/forecast/:id
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

    await forecastService.archiveForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Forecast archived successfully',
    });
  });

  // ============ Status Management ============

  /**
   * Activate a forecast
   * POST /projection/forecast/:id/activate
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

    const forecast = await forecastService.activateForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Forecast activated successfully',
    });
  });

  // ============ Retrain ============

  /**
   * Retrain forecast with new parameters
   * POST /projection/forecast/:id/retrain
   */
  retrainForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can retrain forecasts');
    }

    const forecast = await forecastService.retrainForecast(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as RetrainForecastInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
      message: 'Forecast retrained successfully',
    });
  });

  // ============ Summary & Quick Forecasts ============

  /**
   * Get forecast summary
   * GET /projection/forecast/summary
   */
  getForecastSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const summary = await forecastService.getForecastSummary(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  /**
   * Get revenue forecast
   * GET /projection/forecast/revenue
   */
  getRevenueForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const forecast = await forecastService.getRevenueForecast(organizationId, months);

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
    });
  });

  /**
   * Get expense forecast
   * GET /projection/forecast/expenses
   */
  getExpenseForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const forecast = await forecastService.getExpenseForecast(organizationId, months);

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
    });
  });

  /**
   * Get burn rate forecast
   * GET /projection/forecast/burn-rate
   */
  getBurnRateForecast = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const forecast = await forecastService.getBurnRateForecast(organizationId, months);

    res.status(HttpStatus.OK).json({
      success: true,
      data: forecast,
    });
  });
}

export const forecastController = new ForecastController();
