/**
 * Dashboard Controller
 *
 * HTTP request handlers for dashboard endpoints
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { dashboardService } from '../services';
import {
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateWidgetInput,
  UpdateWidgetInput,
  DashboardQueryInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

export class DashboardController {
  /**
   * Create a new dashboard
   * POST /api/v1/reporting/dashboards
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CreateDashboardInput;
    const dashboard = await dashboardService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Dashboard created successfully',
      data: dashboard,
    });
  });

  /**
   * Get all dashboards
   * GET /api/v1/reporting/dashboards
   */
  findAll = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as DashboardQueryInput;
    const result = await dashboardService.findAll(organizationId, query);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get dashboard by ID
   * GET /api/v1/reporting/dashboards/:id
   */
  findById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const dashboard = await dashboardService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: dashboard,
    });
  });

  /**
   * Update a dashboard
   * PUT /api/v1/reporting/dashboards/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const input = req.body as UpdateDashboardInput;
    const dashboard = await dashboardService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Dashboard updated successfully',
      data: dashboard,
    });
  });

  /**
   * Delete a dashboard
   * DELETE /api/v1/reporting/dashboards/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    await dashboardService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Dashboard deleted successfully',
    });
  });

  /**
   * Clone a dashboard
   * POST /api/v1/reporting/dashboards/:id/clone
   */
  clone = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const { name } = req.body;
    const dashboard = await dashboardService.clone(
      organizationId,
      id,
      new Types.ObjectId(userId),
      name
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Dashboard cloned successfully',
      data: dashboard,
    });
  });

  /**
   * Get executive dashboard
   * GET /api/v1/reporting/dashboards/executive
   */
  getExecutive = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const dashboard = await dashboardService.getExecutiveDashboard(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: dashboard,
    });
  });

  /**
   * Get finance dashboard
   * GET /api/v1/reporting/dashboards/finance
   */
  getFinance = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const dashboard = await dashboardService.getFinanceDashboard(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: dashboard,
    });
  });

  // ============ Widget Endpoints ============

  /**
   * Add widget to dashboard
   * POST /api/v1/reporting/dashboards/:id/widgets
   */
  addWidget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const input = req.body as CreateWidgetInput;
    const dashboard = await dashboardService.addWidget(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Widget added successfully',
      data: dashboard,
    });
  });

  /**
   * Update widget
   * PUT /api/v1/reporting/dashboards/:id/widgets/:widgetId
   */
  updateWidget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id, widgetId } = req.params;
    const input = req.body as UpdateWidgetInput;
    const dashboard = await dashboardService.updateWidget(
      organizationId,
      id,
      widgetId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Widget updated successfully',
      data: dashboard,
    });
  });

  /**
   * Delete widget
   * DELETE /api/v1/reporting/dashboards/:id/widgets/:widgetId
   */
  deleteWidget = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id, widgetId } = req.params;
    const dashboard = await dashboardService.deleteWidget(
      organizationId,
      id,
      widgetId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Widget deleted successfully',
      data: dashboard,
    });
  });

  /**
   * Reorder widgets
   * PUT /api/v1/reporting/dashboards/:id/widgets/reorder
   */
  reorderWidgets = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const { positions } = req.body;
    const dashboard = await dashboardService.reorderWidgets(
      organizationId,
      id,
      new Types.ObjectId(userId),
      positions
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Widgets reordered successfully',
      data: dashboard,
    });
  });
}

export const dashboardController = new DashboardController();
