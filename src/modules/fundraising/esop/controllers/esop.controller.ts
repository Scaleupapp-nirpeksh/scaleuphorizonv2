/**
 * ESOP Controller
 *
 * Handles HTTP requests for ESOP pool and grant management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { esopService } from '../services';
import {
  CreatePoolInput,
  UpdatePoolInput,
  CreateGrantInput,
  UpdateGrantInput,
  ApproveGrantInput,
  ExerciseGrantInput,
  CancelGrantInput,
  GrantQueryInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class ESOPController {
  // ============ Pool Management ============

  /**
   * Create ESOP pool
   * POST /fundraising/esop/pool
   */
  createPool = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can create ESOP pools');
    }

    const input = req.body as CreatePoolInput;
    const pool = await esopService.createPool(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: pool,
      message: 'ESOP pool created successfully',
    });
  });

  /**
   * Get ESOP pool
   * GET /fundraising/esop/pool
   */
  getPool = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const pool = await esopService.getPool(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: pool,
    });
  });

  /**
   * Update ESOP pool
   * PUT /fundraising/esop/pool
   */
  updatePool = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can update ESOP pools');
    }

    const input = req.body as UpdatePoolInput;
    const pool = await esopService.updatePool(organizationId, input);

    res.status(HttpStatus.OK).json({
      success: true,
      data: pool,
      message: 'ESOP pool updated successfully',
    });
  });

  // ============ Grant Management ============

  /**
   * Create grant
   * POST /fundraising/esop/grants
   */
  createGrant = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create grants');
    }

    const input = req.body as CreateGrantInput;
    const grant = await esopService.createGrant(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: grant,
      message: 'Grant created successfully',
    });
  });

  /**
   * Get all grants
   * GET /fundraising/esop/grants
   */
  getGrants = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as GrantQueryInput;
    const result = await esopService.getGrants(organizationId, query);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get grant by ID
   * GET /fundraising/esop/grants/:id
   */
  getGrantById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const grant = await esopService.getGrantById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: grant,
    });
  });

  /**
   * Update grant
   * PUT /fundraising/esop/grants/:id
   */
  updateGrant = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update grants');
    }

    const input = req.body as UpdateGrantInput;
    const grant = await esopService.updateGrant(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: grant,
      message: 'Grant updated successfully',
    });
  });

  /**
   * Delete grant
   * DELETE /fundraising/esop/grants/:id
   */
  deleteGrant = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete grants');
    }

    await esopService.deleteGrant(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Grant deleted successfully',
    });
  });

  // ============ Grant Workflow ============

  /**
   * Approve grant
   * POST /fundraising/esop/grants/:id/approve
   */
  approveGrant = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can approve grants');
    }

    const input = (req.body || {}) as ApproveGrantInput;
    const grant = await esopService.approveGrant(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: grant,
      message: 'Grant approved successfully',
    });
  });

  /**
   * Activate grant
   * POST /fundraising/esop/grants/:id/activate
   */
  activateGrant = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can activate grants');
    }

    const grant = await esopService.activateGrant(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: grant,
      message: 'Grant activated successfully',
    });
  });

  /**
   * Exercise shares
   * POST /fundraising/esop/grants/:id/exercise
   */
  exerciseShares = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can exercise grants');
    }

    const input = req.body as ExerciseGrantInput;
    const grant = await esopService.exerciseShares(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: grant,
      message: 'Shares exercised successfully',
    });
  });

  /**
   * Cancel grant
   * POST /fundraising/esop/grants/:id/cancel
   */
  cancelGrant = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can cancel grants');
    }

    const input = (req.body || {}) as CancelGrantInput;
    const grant = await esopService.cancelGrant(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input.reason
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: grant,
      message: 'Grant cancelled successfully',
    });
  });

  // ============ Vesting & Analytics ============

  /**
   * Get vesting schedule
   * GET /fundraising/esop/grants/:id/vesting
   */
  getVestingSchedule = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const schedule = await esopService.getVestingSchedule(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: schedule,
    });
  });

  /**
   * Get ESOP summary
   * GET /fundraising/esop/summary
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const summary = await esopService.getSummary(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });
}

export const esopController = new ESOPController();
