import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { revenuePlanService } from '../services';
import {
  CreateRevenuePlanInput,
  UpdateRevenuePlanInput,
  CreateRevenueStreamInput,
  UpdateRevenueStreamInput,
  RevenuePlanQueryInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

/**
 * Revenue Plan Controller
 * Handles HTTP requests for revenue planning
 */
class RevenuePlanController {
  // ============ Revenue Plan CRUD ============

  /**
   * Create a new revenue plan
   * POST /planning/revenue
   */
  createRevenuePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create revenue plans');
    }

    const input = req.body as CreateRevenuePlanInput;
    const plan = await revenuePlanService.createRevenuePlan(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: plan,
      message: 'Revenue plan created successfully',
    });
  });

  /**
   * Get all revenue plans
   * GET /planning/revenue
   */
  getRevenuePlans = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const filters = req.query as unknown as RevenuePlanQueryInput;
    const plans = await revenuePlanService.getRevenuePlans(organizationId, filters);

    res.status(HttpStatus.OK).json({
      success: true,
      data: plans,
    });
  });

  /**
   * Get revenue plan by ID
   * GET /planning/revenue/:id
   */
  getRevenuePlanById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const plan = await revenuePlanService.getRevenuePlanById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
    });
  });

  /**
   * Update revenue plan
   * PUT /planning/revenue/:id
   */
  updateRevenuePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update revenue plans');
    }

    const input = req.body as UpdateRevenuePlanInput;
    const plan = await revenuePlanService.updateRevenuePlan(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
      message: 'Revenue plan updated successfully',
    });
  });

  /**
   * Archive revenue plan
   * DELETE /planning/revenue/:id
   */
  archiveRevenuePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive revenue plans');
    }

    await revenuePlanService.archiveRevenuePlan(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Revenue plan archived successfully',
    });
  });

  // ============ Revenue Plan Workflow ============

  /**
   * Submit revenue plan for approval
   * POST /planning/revenue/:id/submit
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
      throw new ForbiddenError('Only owners and admins can submit revenue plans');
    }

    const plan = await revenuePlanService.submitForApproval(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
      message: 'Revenue plan submitted for approval',
    });
  });

  /**
   * Approve revenue plan
   * POST /planning/revenue/:id/approve
   */
  approveRevenuePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can approve revenue plans');
    }

    const plan = await revenuePlanService.approveRevenuePlan(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
      message: 'Revenue plan approved successfully',
    });
  });

  /**
   * Reject revenue plan
   * POST /planning/revenue/:id/reject
   */
  rejectRevenuePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can reject revenue plans');
    }

    const plan = await revenuePlanService.rejectRevenuePlan(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
      message: 'Revenue plan rejected',
    });
  });

  /**
   * Activate revenue plan
   * POST /planning/revenue/:id/activate
   */
  activateRevenuePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can activate revenue plans');
    }

    const plan = await revenuePlanService.activateRevenuePlan(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: plan,
      message: 'Revenue plan activated successfully',
    });
  });

  // ============ Revenue Streams ============

  /**
   * Get revenue streams
   * GET /planning/revenue/:id/streams
   */
  getRevenueStreams = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const streams = await revenuePlanService.getRevenueStreams(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: streams,
    });
  });

  /**
   * Add revenue stream
   * POST /planning/revenue/:id/streams
   */
  addRevenueStream = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can add revenue streams');
    }

    const input = req.body as CreateRevenueStreamInput;
    const stream = await revenuePlanService.addRevenueStream(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: stream,
      message: 'Revenue stream added successfully',
    });
  });

  /**
   * Update revenue stream
   * PUT /planning/revenue/:id/streams/:streamId
   */
  updateRevenueStream = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, streamId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update revenue streams');
    }

    const input = req.body as UpdateRevenueStreamInput;
    const stream = await revenuePlanService.updateRevenueStream(
      organizationId,
      id,
      streamId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: stream,
      message: 'Revenue stream updated successfully',
    });
  });

  /**
   * Delete revenue stream
   * DELETE /planning/revenue/:id/streams/:streamId
   */
  deleteRevenueStream = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, streamId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete revenue streams');
    }

    await revenuePlanService.deleteRevenueStream(
      organizationId,
      id,
      streamId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Revenue stream deleted successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Get revenue plan summary
   * GET /planning/revenue/:id/summary
   */
  getRevenuePlanSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const summary = await revenuePlanService.getRevenuePlanSummary(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  /**
   * Get monthly projections
   * GET /planning/revenue/:id/projections
   */
  getMonthlyProjections = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const projections = await revenuePlanService.getMonthlyProjections(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: projections,
    });
  });

  /**
   * Get MRR metrics
   * GET /planning/revenue/:id/mrr-metrics
   */
  getMRRMetrics = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const metrics = await revenuePlanService.getMRRMetrics(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: metrics,
    });
  });
}

export const revenuePlanController = new RevenuePlanController();
