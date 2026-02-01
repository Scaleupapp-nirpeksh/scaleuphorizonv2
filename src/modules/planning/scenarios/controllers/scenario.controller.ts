import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { scenarioService } from '../services';
import {
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateAdjustmentInput,
  UpdateAdjustmentInput,
  ScenarioQueryInput,
  CompareScenarioInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

/**
 * Scenario Controller
 * Handles HTTP requests for scenario planning
 */
class ScenarioController {
  // ============ Scenario CRUD ============

  /**
   * Create a new scenario
   * POST /planning/scenarios
   */
  createScenario = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create scenarios');
    }

    const input = req.body as CreateScenarioInput;
    const scenario = await scenarioService.createScenario(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: scenario,
      message: 'Scenario created successfully',
    });
  });

  /**
   * Get all scenarios
   * GET /planning/scenarios
   */
  getScenarios = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const filters = req.query as unknown as ScenarioQueryInput;
    const scenarios = await scenarioService.getScenarios(organizationId, filters);

    res.status(HttpStatus.OK).json({
      success: true,
      data: scenarios,
    });
  });

  /**
   * Get scenario by ID
   * GET /planning/scenarios/:id
   */
  getScenarioById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const scenario = await scenarioService.getScenarioById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: scenario,
    });
  });

  /**
   * Update scenario
   * PUT /planning/scenarios/:id
   */
  updateScenario = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update scenarios');
    }

    const input = req.body as UpdateScenarioInput;
    const scenario = await scenarioService.updateScenario(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: scenario,
      message: 'Scenario updated successfully',
    });
  });

  /**
   * Archive scenario
   * DELETE /planning/scenarios/:id
   */
  archiveScenario = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive scenarios');
    }

    await scenarioService.archiveScenario(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Scenario archived successfully',
    });
  });

  /**
   * Activate scenario
   * POST /planning/scenarios/:id/activate
   */
  activateScenario = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can activate scenarios');
    }

    const scenario = await scenarioService.activateScenario(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: scenario,
      message: 'Scenario activated successfully',
    });
  });

  /**
   * Clone scenario
   * POST /planning/scenarios/:id/clone
   */
  cloneScenario = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can clone scenarios');
    }

    const { name } = req.body as { name: string };
    const scenario = await scenarioService.cloneScenario(
      organizationId,
      id,
      new Types.ObjectId(userId),
      name
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: scenario,
      message: 'Scenario cloned successfully',
    });
  });

  // ============ Adjustments ============

  /**
   * Get adjustments
   * GET /planning/scenarios/:id/adjustments
   */
  getAdjustments = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const adjustments = await scenarioService.getAdjustments(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: adjustments,
    });
  });

  /**
   * Add adjustment
   * POST /planning/scenarios/:id/adjustments
   */
  addAdjustment = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can add adjustments');
    }

    const input = req.body as CreateAdjustmentInput;
    const adjustment = await scenarioService.addAdjustment(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: adjustment,
      message: 'Adjustment added successfully',
    });
  });

  /**
   * Update adjustment
   * PUT /planning/scenarios/:id/adjustments/:adjustmentId
   */
  updateAdjustment = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, adjustmentId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update adjustments');
    }

    const input = req.body as UpdateAdjustmentInput;
    const adjustment = await scenarioService.updateAdjustment(
      organizationId,
      id,
      adjustmentId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: adjustment,
      message: 'Adjustment updated successfully',
    });
  });

  /**
   * Delete adjustment
   * DELETE /planning/scenarios/:id/adjustments/:adjustmentId
   */
  deleteAdjustment = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, adjustmentId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete adjustments');
    }

    await scenarioService.deleteAdjustment(
      organizationId,
      id,
      adjustmentId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Adjustment deleted successfully',
    });
  });

  // ============ Analytics ============

  /**
   * Compare scenarios
   * POST /planning/scenarios/compare
   */
  compareScenarios = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CompareScenarioInput;
    const comparison = await scenarioService.compareScenarios(organizationId, input);

    res.status(HttpStatus.OK).json({
      success: true,
      data: comparison,
    });
  });

  /**
   * Get scenario impact
   * GET /planning/scenarios/:id/impact
   */
  getScenarioImpact = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const impact = await scenarioService.getScenarioImpact(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: impact,
    });
  });
}

export const scenarioController = new ScenarioController();
