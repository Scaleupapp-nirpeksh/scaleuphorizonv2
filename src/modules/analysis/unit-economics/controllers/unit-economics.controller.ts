/**
 * Unit Economics Controller
 *
 * HTTP request handlers for unit economics endpoints
 */

import { Request, Response } from 'express';
import { unitEconomicsService } from '../services/unit-economics.service';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import {
  UnitEconomicsQueryInput,
  CACQueryInput,
  LTVQueryInput,
  CohortQueryInput,
  PaybackQueryInput,
} from '../schemas';

export class UnitEconomicsController {
  /**
   * Get all unit economics metrics
   * GET /api/v1/analysis/unit-economics
   */
  getAllMetrics = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as UnitEconomicsQueryInput;
    const result = await unitEconomicsService.getAllMetrics(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get Customer Acquisition Cost
   * GET /api/v1/analysis/unit-economics/cac
   */
  getCAC = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as CACQueryInput;
    const result = await unitEconomicsService.getCAC(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get Lifetime Value
   * GET /api/v1/analysis/unit-economics/ltv
   */
  getLTV = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as LTVQueryInput;
    const result = await unitEconomicsService.getLTV(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get payback period
   * GET /api/v1/analysis/unit-economics/payback
   */
  getPaybackPeriod = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as PaybackQueryInput;
    const result = await unitEconomicsService.getPaybackPeriod(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get cohort analysis
   * GET /api/v1/analysis/unit-economics/cohorts
   */
  getCohortAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as CohortQueryInput;
    const result = await unitEconomicsService.getCohortAnalysis(organizationId, query);

    res.json({
      success: true,
      data: result,
    });
  });
}

export const unitEconomicsController = new UnitEconomicsController();
