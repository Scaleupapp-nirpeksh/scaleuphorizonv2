/**
 * Investor Report Routes
 *
 * Express routes for investor report management
 */

import { Router } from 'express';
import { investorReportController } from '../controllers';
import { validate } from '@/core/middleware';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import {
  createReportSchema,
  updateReportSchema,
  addSectionSchema,
  updateSectionSchema,
  reportQuerySchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '../schemas';

const router = Router();

// All routes require authentication and organization
router.use(protect, requireOrganization);

// ============ Template Routes (must be before :id routes) ============

/**
 * @route   POST /api/v1/reporting/investor-reports/templates
 * @desc    Create a report template
 * @access  Private
 */
router.post('/templates', validate(createTemplateSchema), investorReportController.createTemplate);

/**
 * @route   GET /api/v1/reporting/investor-reports/templates
 * @desc    Get all templates
 * @access  Private
 */
router.get('/templates', investorReportController.getTemplates);

/**
 * @route   GET /api/v1/reporting/investor-reports/templates/:templateId
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/templates/:templateId', investorReportController.getTemplateById);

/**
 * @route   PUT /api/v1/reporting/investor-reports/templates/:templateId
 * @desc    Update template
 * @access  Private
 */
router.put(
  '/templates/:templateId',
  validate(updateTemplateSchema),
  investorReportController.updateTemplate
);

/**
 * @route   DELETE /api/v1/reporting/investor-reports/templates/:templateId
 * @desc    Delete template
 * @access  Private
 */
router.delete('/templates/:templateId', investorReportController.deleteTemplate);

/**
 * @route   POST /api/v1/reporting/investor-reports/from-template/:templateId
 * @desc    Create report from template
 * @access  Private
 */
router.post('/from-template/:templateId', investorReportController.createFromTemplate);

// ============ Report CRUD Routes ============

/**
 * @route   POST /api/v1/reporting/investor-reports
 * @desc    Create a new report
 * @access  Private
 */
router.post('/', validate(createReportSchema), investorReportController.create);

/**
 * @route   GET /api/v1/reporting/investor-reports
 * @desc    Get all reports
 * @access  Private
 */
router.get('/', validate(reportQuerySchema), investorReportController.findAll);

/**
 * @route   GET /api/v1/reporting/investor-reports/:id
 * @desc    Get report by ID
 * @access  Private
 */
router.get('/:id', investorReportController.findById);

/**
 * @route   PUT /api/v1/reporting/investor-reports/:id
 * @desc    Update a report
 * @access  Private
 */
router.put('/:id', validate(updateReportSchema), investorReportController.update);

/**
 * @route   DELETE /api/v1/reporting/investor-reports/:id
 * @desc    Delete a report
 * @access  Private
 */
router.delete('/:id', investorReportController.delete);

// ============ Workflow Routes ============

/**
 * @route   POST /api/v1/reporting/investor-reports/:id/submit
 * @desc    Submit report for review
 * @access  Private
 */
router.post('/:id/submit', investorReportController.submitForReview);

/**
 * @route   POST /api/v1/reporting/investor-reports/:id/approve
 * @desc    Approve a report
 * @access  Private
 */
router.post('/:id/approve', investorReportController.approve);

/**
 * @route   POST /api/v1/reporting/investor-reports/:id/reject
 * @desc    Reject a report
 * @access  Private
 */
router.post('/:id/reject', investorReportController.reject);

/**
 * @route   POST /api/v1/reporting/investor-reports/:id/send
 * @desc    Send report to recipients
 * @access  Private
 */
router.post('/:id/send', investorReportController.send);

/**
 * @route   POST /api/v1/reporting/investor-reports/:id/archive
 * @desc    Archive a report
 * @access  Private
 */
router.post('/:id/archive', investorReportController.archive);

// ============ Section Routes ============

/**
 * @route   POST /api/v1/reporting/investor-reports/:id/sections
 * @desc    Add section to report
 * @access  Private
 */
router.post('/:id/sections', validate(addSectionSchema), investorReportController.addSection);

/**
 * @route   PUT /api/v1/reporting/investor-reports/:id/sections/reorder
 * @desc    Reorder sections
 * @access  Private
 */
router.put('/:id/sections/reorder', investorReportController.reorderSections);

/**
 * @route   PUT /api/v1/reporting/investor-reports/:id/sections/:sectionId
 * @desc    Update section
 * @access  Private
 */
router.put(
  '/:id/sections/:sectionId',
  validate(updateSectionSchema),
  investorReportController.updateSection
);

/**
 * @route   DELETE /api/v1/reporting/investor-reports/:id/sections/:sectionId
 * @desc    Delete section
 * @access  Private
 */
router.delete('/:id/sections/:sectionId', investorReportController.deleteSection);

export default router;
