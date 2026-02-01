/**
 * Milestone Controller
 *
 * Handles HTTP requests for milestone management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { milestoneService } from '../services';
import {
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneQueryInput,
  UpdateStatusInput,
  UpdateProgressInput,
  AddKeyResultInput,
  UpdateKeyResultInput,
  LinkTasksInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class MilestoneController {
  // ============ Milestone CRUD ============

  /**
   * Create a new milestone
   * POST /operations/milestones
   */
  createMilestone = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create milestones');
    }

    const input = req.body as CreateMilestoneInput;
    const milestone = await milestoneService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: milestone,
      message: 'Milestone created successfully',
    });
  });

  /**
   * Get all milestones
   * GET /operations/milestones
   */
  getMilestones = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as MilestoneQueryInput;
    const result = await milestoneService.findAll(organizationId, {
      ...query,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'targetDate',
      sortOrder: query.sortOrder || 'asc',
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get milestone by ID
   * GET /operations/milestones/:id
   */
  getMilestoneById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const milestone = await milestoneService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
    });
  });

  /**
   * Update milestone
   * PUT /operations/milestones/:id
   */
  updateMilestone = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update milestones');
    }

    const input = req.body as UpdateMilestoneInput;
    const milestone = await milestoneService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Milestone updated successfully',
    });
  });

  /**
   * Delete milestone
   * DELETE /operations/milestones/:id
   */
  deleteMilestone = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete milestones');
    }

    await milestoneService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Milestone deleted successfully',
    });
  });

  /**
   * Archive milestone
   * POST /operations/milestones/:id/archive
   */
  archiveMilestone = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const milestone = await milestoneService.archive(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Milestone archived successfully',
    });
  });

  // ============ Status and Progress ============

  /**
   * Update milestone status
   * PUT /operations/milestones/:id/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateStatusInput;
    const milestone = await milestoneService.updateStatus(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Milestone status updated successfully',
    });
  });

  /**
   * Update milestone progress
   * PUT /operations/milestones/:id/progress
   */
  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateProgressInput;
    const milestone = await milestoneService.updateProgress(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Milestone progress updated successfully',
    });
  });

  // ============ Key Results ============

  /**
   * Add key result to milestone
   * POST /operations/milestones/:id/key-results
   */
  addKeyResult = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as AddKeyResultInput;
    const milestone = await milestoneService.addKeyResult(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: milestone,
      message: 'Key result added successfully',
    });
  });

  /**
   * Update key result
   * PUT /operations/milestones/:id/key-results/:krId
   */
  updateKeyResult = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, krId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateKeyResultInput;
    const milestone = await milestoneService.updateKeyResult(
      organizationId,
      id,
      krId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Key result updated successfully',
    });
  });

  /**
   * Delete key result
   * DELETE /operations/milestones/:id/key-results/:krId
   */
  deleteKeyResult = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, krId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const milestone = await milestoneService.deleteKeyResult(
      organizationId,
      id,
      krId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Key result deleted successfully',
    });
  });

  // ============ Task Linking ============

  /**
   * Link tasks to milestone
   * POST /operations/milestones/:id/tasks
   */
  linkTasks = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as LinkTasksInput;
    const milestone = await milestoneService.linkTasks(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Tasks linked successfully',
    });
  });

  /**
   * Unlink task from milestone
   * DELETE /operations/milestones/:id/tasks/:taskId
   */
  unlinkTask = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, taskId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const milestone = await milestoneService.unlinkTask(
      organizationId,
      id,
      taskId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: milestone,
      message: 'Task unlinked successfully',
    });
  });

  // ============ Roadmap & Stats ============

  /**
   * Get roadmap view
   * GET /operations/milestones/roadmap
   */
  getRoadmap = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const roadmap = await milestoneService.getRoadmap(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: roadmap,
    });
  });

  /**
   * Get milestone statistics
   * GET /operations/milestones/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const stats = await milestoneService.getStats(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: stats,
    });
  });
}

export const milestoneController = new MilestoneController();
