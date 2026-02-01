/**
 * Variance Controller
 *
 * HTTP request handlers for variance analysis endpoints
 */

import { Request, Response } from 'express';
import { varianceService } from '../services/variance.service';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { VarianceQueryInput, MonthlyVarianceQueryInput, CategoryVarianceQueryInput } from '../schemas';

export class VarianceController {
  /**
   * Get budget vs actual variance
   * GET /api/v1/analysis/variance/budget
   */
  getBudgetVariance = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as VarianceQueryInput;
    const result = await varianceService.getBudgetVariance(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get revenue plan vs actual variance
   * GET /api/v1/analysis/variance/revenue
   */
  getRevenueVariance = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as VarianceQueryInput;
    const result = await varianceService.getRevenueVariance(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get headcount plan vs actual variance
   * GET /api/v1/analysis/variance/headcount
   */
  getHeadcountVariance = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as VarianceQueryInput;
    const result = await varianceService.getHeadcountVariance(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get variance by category
   * GET /api/v1/analysis/variance/by-category
   */
  getCategoryVariance = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as CategoryVarianceQueryInput;
    const result = await varianceService.getCategoryVariance(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get monthly budget variance breakdown
   * GET /api/v1/analysis/variance/by-month
   */
  getMonthlyVariance = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as MonthlyVarianceQueryInput;
    const result = await varianceService.getMonthlyBudgetVariance(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });
}

export const varianceController = new VarianceController();
