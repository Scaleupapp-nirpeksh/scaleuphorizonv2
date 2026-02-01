/**
 * Investor Report Controller
 *
 * HTTP request handlers for investor report endpoints
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { investorReportService } from '../services';
import {
  CreateReportInput,
  UpdateReportInput,
  AddSectionInput,
  UpdateSectionInput,
  ReportQueryInput,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../schemas';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

export class InvestorReportController {
  // ============ Report CRUD ============

  /**
   * Create a new report
   * POST /api/v1/reporting/investor-reports
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CreateReportInput;
    const report = await investorReportService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Report created successfully',
      data: report,
    });
  });

  /**
   * Get all reports
   * GET /api/v1/reporting/investor-reports
   */
  findAll = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as ReportQueryInput;
    const result = await investorReportService.findAll(organizationId, query);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get report by ID
   * GET /api/v1/reporting/investor-reports/:id
   */
  findById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const report = await investorReportService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: report,
    });
  });

  /**
   * Update a report
   * PUT /api/v1/reporting/investor-reports/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const input = req.body as UpdateReportInput;
    const report = await investorReportService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report updated successfully',
      data: report,
    });
  });

  /**
   * Delete a report
   * DELETE /api/v1/reporting/investor-reports/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    await investorReportService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report deleted successfully',
    });
  });

  // ============ Workflow ============

  /**
   * Submit report for review
   * POST /api/v1/reporting/investor-reports/:id/submit
   */
  submitForReview = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const report = await investorReportService.submitForReview(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report submitted for review',
      data: report,
    });
  });

  /**
   * Approve a report
   * POST /api/v1/reporting/investor-reports/:id/approve
   */
  approve = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const report = await investorReportService.approve(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report approved',
      data: report,
    });
  });

  /**
   * Reject a report
   * POST /api/v1/reporting/investor-reports/:id/reject
   */
  reject = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const { reason } = req.body;
    const report = await investorReportService.reject(
      organizationId,
      id,
      new Types.ObjectId(userId),
      reason
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report rejected and returned to draft',
      data: report,
    });
  });

  /**
   * Send report to recipients
   * POST /api/v1/reporting/investor-reports/:id/send
   */
  send = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const report = await investorReportService.send(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report sent to recipients',
      data: report,
    });
  });

  /**
   * Archive a report
   * POST /api/v1/reporting/investor-reports/:id/archive
   */
  archive = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const report = await investorReportService.archive(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Report archived',
      data: report,
    });
  });

  // ============ Section Management ============

  /**
   * Add section to report
   * POST /api/v1/reporting/investor-reports/:id/sections
   */
  addSection = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const input = req.body as AddSectionInput;
    const report = await investorReportService.addSection(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Section added',
      data: report,
    });
  });

  /**
   * Update section
   * PUT /api/v1/reporting/investor-reports/:id/sections/:sectionId
   */
  updateSection = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id, sectionId } = req.params;
    const input = req.body as UpdateSectionInput;
    const report = await investorReportService.updateSection(
      organizationId,
      id,
      sectionId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Section updated',
      data: report,
    });
  });

  /**
   * Delete section
   * DELETE /api/v1/reporting/investor-reports/:id/sections/:sectionId
   */
  deleteSection = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id, sectionId } = req.params;
    const report = await investorReportService.deleteSection(
      organizationId,
      id,
      sectionId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Section deleted',
      data: report,
    });
  });

  /**
   * Reorder sections
   * PUT /api/v1/reporting/investor-reports/:id/sections/reorder
   */
  reorderSections = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { id } = req.params;
    const { orders } = req.body;
    const report = await investorReportService.reorderSections(
      organizationId,
      id,
      new Types.ObjectId(userId),
      orders
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Sections reordered',
      data: report,
    });
  });

  // ============ Templates ============

  /**
   * Create template
   * POST /api/v1/reporting/investor-reports/templates
   */
  createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CreateTemplateInput;
    const template = await investorReportService.createTemplate(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Template created',
      data: template,
    });
  });

  /**
   * Get all templates
   * GET /api/v1/reporting/investor-reports/templates
   */
  getTemplates = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const templates = await investorReportService.getTemplates(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: templates,
    });
  });

  /**
   * Get template by ID
   * GET /api/v1/reporting/investor-reports/templates/:templateId
   */
  getTemplateById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { templateId } = req.params;
    const template = await investorReportService.getTemplateById(organizationId, templateId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: template,
    });
  });

  /**
   * Update template
   * PUT /api/v1/reporting/investor-reports/templates/:templateId
   */
  updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { templateId } = req.params;
    const input = req.body as UpdateTemplateInput;
    const template = await investorReportService.updateTemplate(
      organizationId,
      templateId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Template updated',
      data: template,
    });
  });

  /**
   * Delete template
   * DELETE /api/v1/reporting/investor-reports/templates/:templateId
   */
  deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const { templateId } = req.params;
    await investorReportService.deleteTemplate(organizationId, templateId);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Template deleted',
    });
  });

  /**
   * Create report from template
   * POST /api/v1/reporting/investor-reports/from-template/:templateId
   */
  createFromTemplate = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const { templateId } = req.params;
    const { title, reportingPeriod } = req.body;
    const report = await investorReportService.createFromTemplate(
      organizationId,
      templateId,
      new Types.ObjectId(userId),
      { title, reportingPeriod }
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Report created from template',
      data: report,
    });
  });
}

export const investorReportController = new InvestorReportController();
