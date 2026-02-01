import { Router } from 'express';
import { headcountController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import {
  createHeadcountPlanSchema,
  updateHeadcountPlanSchema,
  createPlannedRoleSchema,
  updatePlannedRoleSchema,
  fillRoleSchema,
  headcountQuerySchema,
} from '../schemas';

const router = Router();

router.use(protect);
router.use(requireOrganization);

// Plan CRUD
router.get('/', validateQuery(headcountQuerySchema.shape.query), headcountController.getPlans);
router.post('/', validateBody(createHeadcountPlanSchema.shape.body), headcountController.createPlan);
router.get('/:id', headcountController.getPlanById);
router.put('/:id', validateBody(updateHeadcountPlanSchema.shape.body), headcountController.updatePlan);
router.delete('/:id', headcountController.archivePlan);

// Workflow
router.post('/:id/approve', headcountController.approvePlan);

// Analytics
router.get('/:id/summary', headcountController.getPlanSummary);
router.get('/:id/timeline', headcountController.getTimeline);
router.get('/:id/cost-projection', headcountController.getCostProjection);

// Planned Roles
router.get('/:id/roles', headcountController.getRoles);
router.post('/:id/roles', validateBody(createPlannedRoleSchema.shape.body), headcountController.addRole);
router.put('/:id/roles/:roleId', validateBody(updatePlannedRoleSchema.shape.body), headcountController.updateRole);
router.delete('/:id/roles/:roleId', headcountController.deleteRole);
router.post('/:id/roles/:roleId/fill', validateBody(fillRoleSchema.shape.body), headcountController.fillRole);

export default router;
