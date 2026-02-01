/**
 * Round Controller
 *
 * Handles HTTP requests for funding round management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { roundService } from '../services';
import {
  CreateRoundInput,
  UpdateRoundInput,
  RoundQueryInput,
  OpenRoundInput,
  CloseRoundInput,
  AddDocumentInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class RoundController {
  // ============ Round CRUD ============

  /**
   * Create a new funding round
   * POST /fundraising/rounds
   */
  createRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create funding rounds');
    }

    const input = req.body as CreateRoundInput;
    const round = await roundService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: round,
      message: 'Funding round created successfully',
    });
  });

  /**
   * Get all funding rounds
   * GET /fundraising/rounds
   */
  getRounds = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as RoundQueryInput;
    const result = await roundService.findAll(organizationId, {
      status: query.status,
      type: query.type,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get round by ID
   * GET /fundraising/rounds/:id
   */
  getRoundById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const round = await roundService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: round,
    });
  });

  /**
   * Update round
   * PUT /fundraising/rounds/:id
   */
  updateRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update funding rounds');
    }

    const input = req.body as UpdateRoundInput;
    const round = await roundService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: round,
      message: 'Funding round updated successfully',
    });
  });

  /**
   * Delete round
   * DELETE /fundraising/rounds/:id
   */
  deleteRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete funding rounds');
    }

    await roundService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Funding round deleted successfully',
    });
  });

  // ============ Round Workflow ============

  /**
   * Open round (start accepting investments)
   * POST /fundraising/rounds/:id/open
   */
  openRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can open funding rounds');
    }

    const input = (req.body || {}) as OpenRoundInput;
    const round = await roundService.openRound(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: round,
      message: 'Funding round opened successfully',
    });
  });

  /**
   * Close round
   * POST /fundraising/rounds/:id/close
   */
  closeRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can close funding rounds');
    }

    const input = (req.body || {}) as CloseRoundInput;
    const round = await roundService.closeRound(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: round,
      message: 'Funding round closed successfully',
    });
  });

  /**
   * Cancel round
   * POST /fundraising/rounds/:id/cancel
   */
  cancelRound = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (role !== 'owner') {
      throw new ForbiddenError('Only owners can cancel funding rounds');
    }

    const round = await roundService.cancelRound(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: round,
      message: 'Funding round cancelled',
    });
  });

  // ============ Documents ============

  /**
   * Add document to round
   * POST /fundraising/rounds/:id/documents
   */
  addDocument = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can add documents');
    }

    const input = req.body as AddDocumentInput;
    const round = await roundService.addDocument(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: round,
      message: 'Document added successfully',
    });
  });

  /**
   * Remove document from round
   * DELETE /fundraising/rounds/:id/documents/:docIndex
   */
  removeDocument = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, docIndex } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can remove documents');
    }

    const round = await roundService.removeDocument(
      organizationId,
      id,
      parseInt(docIndex, 10),
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: round,
      message: 'Document removed successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Get round summary with investor details
   * GET /fundraising/rounds/:id/summary
   */
  getRoundSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const summary = await roundService.getRoundSummary(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });
}

export const roundController = new RoundController();
