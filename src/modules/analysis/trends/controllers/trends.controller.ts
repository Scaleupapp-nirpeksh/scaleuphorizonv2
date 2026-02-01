/**
 * Trends Controller
 *
 * HTTP request handlers for trend analysis endpoints
 */

import { Request, Response } from 'express';
import { trendsService } from '../services/trends.service';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { TrendQueryInput, MultiTrendQueryInput, ComparisonQueryInput } from '../schemas';

export class TrendsController {
  /**
   * Get expense trends
   * GET /api/v1/analysis/trends/expenses
   */
  getExpenseTrends = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = { ...req.query, type: 'expense' } as unknown as TrendQueryInput;
    const result = await trendsService.getTrend(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get revenue trends
   * GET /api/v1/analysis/trends/revenue
   */
  getRevenueTrends = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = { ...req.query, type: 'revenue' } as unknown as TrendQueryInput;
    const result = await trendsService.getTrend(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get burn rate trends
   * GET /api/v1/analysis/trends/burn-rate
   */
  getBurnRateTrends = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = { ...req.query, type: 'burn_rate' } as unknown as TrendQueryInput;
    const result = await trendsService.getTrend(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get custom trend
   * GET /api/v1/analysis/trends/custom
   */
  getCustomTrend = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as TrendQueryInput;
    const result = await trendsService.getTrend(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get multiple trends at once
   * GET /api/v1/analysis/trends/multiple
   */
  getMultipleTrends = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as MultiTrendQueryInput;
    const result = await trendsService.getMultipleTrends(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get trend comparison (current vs previous period)
   * GET /api/v1/analysis/trends/comparison
   */
  getTrendComparison = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as ComparisonQueryInput;
    const result = await trendsService.getTrendComparison(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });
}

export const trendsController = new TrendsController();
