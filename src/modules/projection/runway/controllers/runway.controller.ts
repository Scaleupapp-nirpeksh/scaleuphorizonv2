import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { runwayService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateRunwaySnapshotInput,
  UpdateRunwaySnapshotInput,
  WhatIfAnalysisInput,
  RunwayQueryInput,
} from '../schemas';

/**
 * Runway Controller
 *
 * Handles HTTP requests for runway calculations
 */
class RunwayController {
  // ============ Runway CRUD ============

  /**
   * Create a new runway snapshot
   * POST /projection/runway
   */
  createSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create snapshots');
    }

    const snapshot = await runwayService.createSnapshot(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateRunwaySnapshotInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: snapshot,
      message: 'Runway snapshot created successfully',
    });
  });

  /**
   * Get runway snapshots with filtering
   * GET /projection/runway
   */
  getSnapshots = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const result = await runwayService.getSnapshots(
      organizationId,
      req.query as unknown as RunwayQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get runway snapshot by ID
   * GET /projection/runway/:id
   */
  getSnapshotById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const snapshot = await runwayService.getSnapshotById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: snapshot,
    });
  });

  /**
   * Update runway snapshot
   * PUT /projection/runway/:id
   */
  updateSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update snapshots');
    }

    const snapshot = await runwayService.updateSnapshot(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateRunwaySnapshotInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: snapshot,
      message: 'Runway snapshot updated successfully',
    });
  });

  /**
   * Archive runway snapshot
   * DELETE /projection/runway/:id
   */
  archiveSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive snapshots');
    }

    await runwayService.archiveSnapshot(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Runway snapshot archived successfully',
    });
  });

  // ============ Current Runway ============

  /**
   * Get current runway calculation
   * GET /projection/runway/current
   */
  getCurrentRunway = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const runway = await runwayService.getCurrentRunway(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: runway,
    });
  });

  // ============ Runway History ============

  /**
   * Get runway history over time
   * GET /projection/runway/history
   */
  getRunwayHistory = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const history = await runwayService.getRunwayHistory(organizationId, months);

    res.status(HttpStatus.OK).json({
      success: true,
      data: history,
    });
  });

  // ============ Scenario Comparison ============

  /**
   * Get runway for different scenarios
   * GET /projection/runway/scenarios
   */
  getScenarioComparison = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const scenarios = await runwayService.getScenarioComparison(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: scenarios,
    });
  });

  // ============ What-If Analysis ============

  /**
   * Perform what-if analysis
   * POST /projection/runway/what-if
   */
  whatIfAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const result = await runwayService.whatIfAnalysis(
      organizationId,
      req.body as WhatIfAnalysisInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  });
}

export const runwayController = new RunwayController();
