/**
 * Cap Table Controller
 *
 * Handles HTTP requests for cap table management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { capTableService } from '../services';
import {
  CreateShareClassInput,
  UpdateShareClassInput,
  CreateCapTableEntryInput,
  UpdateCapTableEntryInput,
  CapTableQueryInput,
  SimulateRoundInput,
  WaterfallInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class CapTableController {
  // ============ Share Class Management ============

  /**
   * Create a new share class
   * POST /fundraising/cap-table/share-classes
   */
  createShareClass = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create share classes');
    }

    const input = req.body as CreateShareClassInput;
    const shareClass = await capTableService.createShareClass(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: shareClass,
      message: 'Share class created successfully',
    });
  });

  /**
   * Get all share classes
   * GET /fundraising/cap-table/share-classes
   */
  getShareClasses = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const shareClasses = await capTableService.getShareClasses(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: shareClasses,
    });
  });

  /**
   * Get share class by ID
   * GET /fundraising/cap-table/share-classes/:id
   */
  getShareClassById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const shareClass = await capTableService.getShareClassById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: shareClass,
    });
  });

  /**
   * Update share class
   * PUT /fundraising/cap-table/share-classes/:id
   */
  updateShareClass = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update share classes');
    }

    const input = req.body as UpdateShareClassInput;
    const shareClass = await capTableService.updateShareClass(
      organizationId,
      id,
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: shareClass,
      message: 'Share class updated successfully',
    });
  });

  // ============ Cap Table Entries ============

  /**
   * Create cap table entry
   * POST /fundraising/cap-table/entries
   */
  createEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create cap table entries');
    }

    const input = req.body as CreateCapTableEntryInput;
    const entry = await capTableService.createEntry(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: entry,
      message: 'Cap table entry created successfully',
    });
  });

  /**
   * Get all cap table entries
   * GET /fundraising/cap-table/entries
   */
  getEntries = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as CapTableQueryInput;
    const entries = await capTableService.getEntries(organizationId, query);

    res.status(HttpStatus.OK).json({
      success: true,
      data: entries,
    });
  });

  /**
   * Get entry by ID
   * GET /fundraising/cap-table/entries/:id
   */
  getEntryById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const entry = await capTableService.getEntryById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: entry,
    });
  });

  /**
   * Update entry
   * PUT /fundraising/cap-table/entries/:id
   */
  updateEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update cap table entries');
    }

    const input = req.body as UpdateCapTableEntryInput;
    const entry = await capTableService.updateEntry(
      organizationId,
      id,
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: entry,
      message: 'Cap table entry updated successfully',
    });
  });

  /**
   * Delete entry
   * DELETE /fundraising/cap-table/entries/:id
   */
  deleteEntry = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete cap table entries');
    }

    await capTableService.deleteEntry(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Cap table entry deleted successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Get cap table summary
   * GET /fundraising/cap-table/summary
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const asOfDate = req.query.asOfDate
      ? new Date(req.query.asOfDate as string)
      : undefined;

    const summary = await capTableService.getSummary(organizationId, asOfDate);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  /**
   * Get waterfall analysis
   * POST /fundraising/cap-table/waterfall
   */
  getWaterfall = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as WaterfallInput;
    const waterfall = await capTableService.getWaterfall(organizationId, input);

    res.status(HttpStatus.OK).json({
      success: true,
      data: waterfall,
    });
  });

  /**
   * Simulate a new funding round
   * POST /fundraising/cap-table/simulate
   */
  simulateRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as SimulateRoundInput;
    const simulation = await capTableService.simulateRound(organizationId, input);

    res.status(HttpStatus.OK).json({
      success: true,
      data: simulation,
    });
  });
}

export const capTableController = new CapTableController();
