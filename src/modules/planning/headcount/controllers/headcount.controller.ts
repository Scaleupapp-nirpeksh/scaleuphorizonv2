import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { headcountService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class HeadcountController {
  // ============ Plan CRUD ============

  createPlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can create headcount plans');
    }

    const plan = await headcountService.createPlan(
      organizationId,
      new Types.ObjectId(userId),
      req.body
    );

    res.status(HttpStatus.CREATED).json({ success: true, data: plan });
  });

  getPlans = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const plans = await headcountService.getPlans(organizationId, req.query as any);
    res.status(HttpStatus.OK).json({ success: true, data: plans });
  });

  getPlanById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const plan = await headcountService.getPlanById(organizationId, req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: plan });
  });

  updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update headcount plans');
    }

    const plan = await headcountService.updatePlan(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body
    );

    res.status(HttpStatus.OK).json({ success: true, data: plan });
  });

  archivePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can archive headcount plans');
    }

    await headcountService.archivePlan(organizationId, req.params.id, new Types.ObjectId(userId));
    res.status(HttpStatus.OK).json({ success: true, message: 'Plan archived successfully' });
  });

  approvePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (role !== 'owner') throw new ForbiddenError('Only owners can approve headcount plans');

    const plan = await headcountService.approvePlan(organizationId, req.params.id, new Types.ObjectId(userId));
    res.status(HttpStatus.OK).json({ success: true, data: plan });
  });

  // ============ Planned Roles ============

  getRoles = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const roles = await headcountService.getRoles(organizationId, req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: roles });
  });

  addRole = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can add roles');
    }

    const newRole = await headcountService.addRole(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body
    );

    res.status(HttpStatus.CREATED).json({ success: true, data: newRole });
  });

  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can update roles');
    }

    const updatedRole = await headcountService.updateRole(
      organizationId,
      req.params.id,
      req.params.roleId,
      new Types.ObjectId(userId),
      req.body
    );

    res.status(HttpStatus.OK).json({ success: true, data: updatedRole });
  });

  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete roles');
    }

    await headcountService.deleteRole(
      organizationId,
      req.params.id,
      req.params.roleId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({ success: true, message: 'Role deleted successfully' });
  });

  fillRole = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can mark roles as filled');
    }

    const filledRole = await headcountService.fillRole(
      organizationId,
      req.params.id,
      req.params.roleId,
      new Types.ObjectId(userId),
      req.body
    );

    res.status(HttpStatus.OK).json({ success: true, data: filledRole });
  });

  // ============ Analytics ============

  getPlanSummary = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const summary = await headcountService.getPlanSummary(organizationId, req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: summary });
  });

  getTimeline = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const timeline = await headcountService.getTimeline(organizationId, req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: timeline });
  });

  getCostProjection = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const projection = await headcountService.getCostProjection(organizationId, req.params.id);
    res.status(HttpStatus.OK).json({ success: true, data: projection });
  });
}

export const headcountController = new HeadcountController();
