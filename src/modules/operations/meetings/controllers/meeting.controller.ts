/**
 * Meeting Controller
 *
 * Handles HTTP requests for investor meeting management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { meetingService } from '../services';
import {
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingQueryInput,
  CompleteMeetingInput,
  AddActionItemInput,
  UpdateActionItemInput,
  RescheduleInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class MeetingController {
  // ============ Meeting CRUD ============

  /**
   * Create a new meeting
   * POST /operations/meetings
   */
  createMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CreateMeetingInput;
    const meeting = await meetingService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: meeting,
      message: 'Meeting scheduled successfully',
    });
  });

  /**
   * Get all meetings
   * GET /operations/meetings
   */
  getMeetings = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as MeetingQueryInput;
    const result = await meetingService.findAll(organizationId, {
      ...query,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'startTime',
      sortOrder: query.sortOrder || 'desc',
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get meeting by ID
   * GET /operations/meetings/:id
   */
  getMeetingById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const meeting = await meetingService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
    });
  });

  /**
   * Update meeting
   * PUT /operations/meetings/:id
   */
  updateMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateMeetingInput;
    const meeting = await meetingService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Meeting updated successfully',
    });
  });

  /**
   * Delete meeting
   * DELETE /operations/meetings/:id
   */
  deleteMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete meetings');
    }

    await meetingService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  });

  // ============ Meeting Workflow ============

  /**
   * Complete meeting with outcome
   * POST /operations/meetings/:id/complete
   */
  completeMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CompleteMeetingInput;
    const meeting = await meetingService.complete(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Meeting completed successfully',
    });
  });

  /**
   * Cancel meeting
   * POST /operations/meetings/:id/cancel
   */
  cancelMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const meeting = await meetingService.cancel(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Meeting cancelled',
    });
  });

  /**
   * Reschedule meeting
   * POST /operations/meetings/:id/reschedule
   */
  rescheduleMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as RescheduleInput;
    const meeting = await meetingService.reschedule(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Meeting rescheduled successfully',
    });
  });

  /**
   * Archive meeting
   * POST /operations/meetings/:id/archive
   */
  archiveMeeting = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const meeting = await meetingService.archive(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Meeting archived successfully',
    });
  });

  // ============ Action Items ============

  /**
   * Add action item to meeting
   * POST /operations/meetings/:id/actions
   */
  addActionItem = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as AddActionItemInput;
    const meeting = await meetingService.addActionItem(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: meeting,
      message: 'Action item added successfully',
    });
  });

  /**
   * Update action item
   * PUT /operations/meetings/:id/actions/:actionId
   */
  updateActionItem = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, actionId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateActionItemInput;
    const meeting = await meetingService.updateActionItem(
      organizationId,
      id,
      actionId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Action item updated successfully',
    });
  });

  /**
   * Delete action item
   * DELETE /operations/meetings/:id/actions/:actionId
   */
  deleteActionItem = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, actionId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const meeting = await meetingService.deleteActionItem(
      organizationId,
      id,
      actionId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: meeting,
      message: 'Action item deleted successfully',
    });
  });

  // ============ Specialized Views ============

  /**
   * Get upcoming meetings
   * GET /operations/meetings/upcoming
   */
  getUpcoming = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const upcoming = await meetingService.getUpcoming(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: upcoming,
    });
  });

  /**
   * Get meetings with an investor
   * GET /operations/meetings/investor/:investorId
   */
  getByInvestor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { investorId } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const meetings = await meetingService.getByInvestor(organizationId, investorId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: meetings,
    });
  });

  /**
   * Get meeting statistics
   * GET /operations/meetings/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const stats = await meetingService.getStats(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: stats,
    });
  });
}

export const meetingController = new MeetingController();
