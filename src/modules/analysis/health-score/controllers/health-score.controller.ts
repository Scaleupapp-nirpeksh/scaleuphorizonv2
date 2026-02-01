/**
 * Health Score Controller
 *
 * HTTP request handlers for health score endpoints
 */

import { Request, Response } from 'express';
import { healthScoreService } from '../services/health-score.service';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HealthScoreQueryInput, HistoryQueryInput, BreakdownQueryInput } from '../schemas';

export class HealthScoreController {
  /**
   * Get current health score
   * GET /api/v1/analysis/health-score
   */
  getHealthScore = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as HealthScoreQueryInput;
    const result = await healthScoreService.calculateHealthScore(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get health score history
   * GET /api/v1/analysis/health-score/history
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as HistoryQueryInput;
    const result = await healthScoreService.getHistory(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get category breakdown
   * GET /api/v1/analysis/health-score/breakdown
   */
  getBreakdown = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as BreakdownQueryInput;
    const result = await healthScoreService.getCategoryBreakdown(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });
}

export const healthScoreController = new HealthScoreController();
