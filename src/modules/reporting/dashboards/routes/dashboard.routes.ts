/**
 * Dashboard Routes
 *
 * Express routes for dashboard management
 */

import { Router } from 'express';
import { dashboardController } from '../controllers';
import { validate } from '@/core/middleware';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import {
  createDashboardSchema,
  updateDashboardSchema,
  createWidgetSchema,
  updateWidgetSchema,
  dashboardQuerySchema,
} from '../schemas';

const router = Router();

// All routes require authentication and organization
router.use(protect, requireOrganization);

// ============ Dashboard Routes ============

/**
 * @route   POST /api/v1/reporting/dashboards
 * @desc    Create a new dashboard
 * @access  Private
 */
router.post('/', validate(createDashboardSchema), dashboardController.create);

/**
 * @route   GET /api/v1/reporting/dashboards
 * @desc    Get all dashboards
 * @access  Private
 */
router.get('/', validate(dashboardQuerySchema), dashboardController.findAll);

/**
 * @route   GET /api/v1/reporting/dashboards/executive
 * @desc    Get executive dashboard
 * @access  Private
 */
router.get('/executive', dashboardController.getExecutive);

/**
 * @route   GET /api/v1/reporting/dashboards/finance
 * @desc    Get finance dashboard
 * @access  Private
 */
router.get('/finance', dashboardController.getFinance);

/**
 * @route   GET /api/v1/reporting/dashboards/:id
 * @desc    Get dashboard by ID
 * @access  Private
 */
router.get('/:id', dashboardController.findById);

/**
 * @route   PUT /api/v1/reporting/dashboards/:id
 * @desc    Update a dashboard
 * @access  Private
 */
router.put('/:id', validate(updateDashboardSchema), dashboardController.update);

/**
 * @route   DELETE /api/v1/reporting/dashboards/:id
 * @desc    Delete a dashboard
 * @access  Private
 */
router.delete('/:id', dashboardController.delete);

/**
 * @route   POST /api/v1/reporting/dashboards/:id/clone
 * @desc    Clone a dashboard
 * @access  Private
 */
router.post('/:id/clone', dashboardController.clone);

// ============ Widget Routes ============

/**
 * @route   POST /api/v1/reporting/dashboards/:id/widgets
 * @desc    Add widget to dashboard
 * @access  Private
 */
router.post('/:id/widgets', validate(createWidgetSchema), dashboardController.addWidget);

/**
 * @route   PUT /api/v1/reporting/dashboards/:id/widgets/reorder
 * @desc    Reorder widgets
 * @access  Private
 */
router.put('/:id/widgets/reorder', dashboardController.reorderWidgets);

/**
 * @route   PUT /api/v1/reporting/dashboards/:id/widgets/:widgetId
 * @desc    Update widget
 * @access  Private
 */
router.put('/:id/widgets/:widgetId', validate(updateWidgetSchema), dashboardController.updateWidget);

/**
 * @route   DELETE /api/v1/reporting/dashboards/:id/widgets/:widgetId
 * @desc    Delete widget
 * @access  Private
 */
router.delete('/:id/widgets/:widgetId', dashboardController.deleteWidget);

export default router;
