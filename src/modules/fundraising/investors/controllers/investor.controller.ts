/**
 * Investor Controller
 *
 * Handles HTTP requests for investor management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { investorService } from '../services';
import {
  CreateInvestorInput,
  UpdateInvestorInput,
  InvestorQueryInput,
  CreateTrancheInput,
  UpdateTrancheInput,
  ReceiveTrancheInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class InvestorController {
  // ============ Investor CRUD ============

  /**
   * Create a new investor
   * POST /fundraising/investors
   */
  createInvestor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create investors');
    }

    const input = req.body as CreateInvestorInput;
    const investor = await investorService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: investor,
      message: 'Investor created successfully',
    });
  });

  /**
   * Get all investors
   * GET /fundraising/investors
   */
  getInvestors = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as InvestorQueryInput;
    const result = await investorService.findAll(organizationId, {
      status: query.status,
      type: query.type,
      roundId: query.roundId,
      search: query.search,
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
   * Get investor by ID
   * GET /fundraising/investors/:id
   */
  getInvestorById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const investor = await investorService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: investor,
    });
  });

  /**
   * Update investor
   * PUT /fundraising/investors/:id
   */
  updateInvestor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update investors');
    }

    const input = req.body as UpdateInvestorInput;
    const investor = await investorService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: investor,
      message: 'Investor updated successfully',
    });
  });

  /**
   * Delete investor
   * DELETE /fundraising/investors/:id
   */
  deleteInvestor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete investors');
    }

    await investorService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Investor deleted successfully',
    });
  });

  // ============ Tranche Management ============

  /**
   * Add tranche to investor
   * POST /fundraising/investors/:id/tranches
   */
  addTranche = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can add tranches');
    }

    const input = req.body as CreateTrancheInput;
    const investor = await investorService.addTranche(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: investor,
      message: 'Tranche added successfully',
    });
  });

  /**
   * Update tranche
   * PUT /fundraising/investors/:id/tranches/:trancheId
   */
  updateTranche = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, trancheId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update tranches');
    }

    const input = req.body as UpdateTrancheInput;
    const investor = await investorService.updateTranche(
      organizationId,
      id,
      trancheId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: investor,
      message: 'Tranche updated successfully',
    });
  });

  /**
   * Receive tranche (mark as paid)
   * POST /fundraising/investors/:id/tranches/:trancheId/receive
   */
  receiveTranche = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, trancheId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can receive tranches');
    }

    const input = (req.body || {}) as ReceiveTrancheInput;
    const investor = await investorService.receiveTranche(
      organizationId,
      id,
      trancheId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: investor,
      message: 'Tranche received successfully',
    });
  });

  /**
   * Cancel tranche
   * POST /fundraising/investors/:id/tranches/:trancheId/cancel
   */
  cancelTranche = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, trancheId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can cancel tranches');
    }

    const investor = await investorService.cancelTranche(
      organizationId,
      id,
      trancheId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: investor,
      message: 'Tranche cancelled successfully',
    });
  });

  /**
   * Delete tranche
   * DELETE /fundraising/investors/:id/tranches/:trancheId
   */
  deleteTranche = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, trancheId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete tranches');
    }

    const investor = await investorService.deleteTranche(
      organizationId,
      id,
      trancheId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: investor,
      message: 'Tranche deleted successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Get top investors
   * GET /fundraising/investors/top
   */
  getTopInvestors = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const limit = parseInt(req.query.limit as string, 10) || 10;
    const investors = await investorService.getTopInvestors(organizationId, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: investors,
    });
  });
}

export const investorController = new InvestorController();
