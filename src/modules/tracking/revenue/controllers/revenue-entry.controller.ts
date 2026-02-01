import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { revenueEntryService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import {
  CreateRevenueEntryInput,
  UpdateRevenueEntryInput,
  ReceiveRevenueEntryInput,
  CancelRevenueEntryInput,
  RevenueEntryQueryInput,
} from '../schemas';

class RevenueEntryController {
  /**
   * Create a new revenue entry
   * POST /tracking/revenue
   */
  createRevenueEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const entry = await revenueEntryService.createRevenueEntry(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateRevenueEntryInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: entry,
    });
  });

  /**
   * Get revenue entries with filtering
   * GET /tracking/revenue
   */
  getRevenueEntries = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await revenueEntryService.getRevenueEntries(
      organizationId,
      req.query as unknown as RevenueEntryQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get revenue entry by ID
   * GET /tracking/revenue/:id
   */
  getRevenueEntryById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const entry = await revenueEntryService.getRevenueEntryById(
      organizationId,
      req.params.id
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: entry,
    });
  });

  /**
   * Update revenue entry
   * PUT /tracking/revenue/:id
   */
  updateRevenueEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const entry = await revenueEntryService.updateRevenueEntry(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateRevenueEntryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: entry,
    });
  });

  /**
   * Archive revenue entry
   * DELETE /tracking/revenue/:id
   */
  archiveRevenueEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    await revenueEntryService.archiveRevenueEntry(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Revenue entry archived successfully',
    });
  });

  /**
   * Mark revenue entry as received
   * POST /tracking/revenue/:id/receive
   */
  receiveRevenueEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const entry = await revenueEntryService.markAsReceived(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as ReceiveRevenueEntryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: entry,
    });
  });

  /**
   * Cancel revenue entry
   * POST /tracking/revenue/:id/cancel
   */
  cancelRevenueEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const entry = await revenueEntryService.cancelRevenueEntry(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as CancelRevenueEntryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: entry,
    });
  });

  /**
   * Get MRR/ARR metrics
   * GET /tracking/revenue/mrr
   */
  getMRRMetrics = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const metrics = await revenueEntryService.getMRRMetrics(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: metrics,
    });
  });

  /**
   * Get revenue by category
   * GET /tracking/revenue/by-category
   */
  getRevenueByCategory = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const data = await revenueEntryService.getRevenueByCategory(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });

  /**
   * Get revenue by customer
   * GET /tracking/revenue/by-customer
   */
  getRevenueByCustomer = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const data = await revenueEntryService.getRevenueByCustomer(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });

  /**
   * Get revenue by type
   * GET /tracking/revenue/by-type
   */
  getRevenueByType = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const data = await revenueEntryService.getRevenueByType(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });

  /**
   * Get revenue summary
   * GET /tracking/revenue/summary
   */
  getRevenueSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const data = await revenueEntryService.getRevenueSummary(
      organizationId,
      startDate,
      endDate
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });
}

export const revenueEntryController = new RevenueEntryController();
