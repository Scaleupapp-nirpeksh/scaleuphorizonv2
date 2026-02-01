/**
 * Investor Report Service
 *
 * Business logic for investor report management
 */

import { Types } from 'mongoose';
import { InvestorReport, IInvestorReport, IReportSection } from '../models/investor-report.model';
import { ReportTemplate, IReportTemplate } from '../models/report-template.model';
import {
  ReportStatus,
  REPORTING_CONSTANTS,
  isValidReportStatusTransition,
  getSuggestedSections,
} from '../../constants';
import {
  CreateReportInput,
  UpdateReportInput,
  AddSectionInput,
  UpdateSectionInput,
  ReportQueryInput,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';

export class InvestorReportService {
  // ============ Report CRUD ============

  /**
   * Create a new investor report
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateReportInput
  ): Promise<IInvestorReport> {
    // Check report limit
    const count = await InvestorReport.countDocuments({ organization: organizationId });
    if (count >= REPORTING_CONSTANTS.MAX_REPORTS_PER_ORG) {
      throw new BadRequestError(
        `Maximum of ${REPORTING_CONSTANTS.MAX_REPORTS_PER_ORG} reports allowed per organization`
      );
    }

    // If no sections provided, add suggested sections based on type
    let sections = input.sections;
    if (!sections || sections.length === 0) {
      const suggestedTypes = getSuggestedSections(input.type as Parameters<typeof getSuggestedSections>[0]);
      sections = suggestedTypes.map((type, index) => ({
        type,
        title: this.formatSectionTitle(type),
        order: index,
        content: '',
        isVisible: true,
      }));
    }

    const report = new InvestorReport({
      organization: organizationId,
      ...input,
      sections,
      status: ReportStatus.DRAFT,
      createdBy: userId,
    });

    await report.save();
    return report;
  }

  /**
   * Get all reports for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: ReportQueryInput
  ): Promise<{
    data: IInvestorReport[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { type, status, year, search, page, limit, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = { organization: organizationId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (year) filter['reportingPeriod.year'] = year;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await InvestorReport.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await InvestorReport.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .lean()
      .exec();

    return {
      data: data as unknown as IInvestorReport[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single report by ID
   */
  async findById(organizationId: Types.ObjectId, reportId: string): Promise<IInvestorReport> {
    const report = await InvestorReport.findOne({
      _id: new Types.ObjectId(reportId),
      organization: organizationId,
    })
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email');

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return report;
  }

  /**
   * Update a report
   */
  async update(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId,
    input: UpdateReportInput
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    // Only draft and review reports can be edited
    if (![ReportStatus.DRAFT, ReportStatus.REVIEW].includes(report.status as typeof ReportStatus.DRAFT)) {
      throw new BadRequestError('Only draft or review reports can be edited');
    }

    Object.assign(report, {
      ...input,
      updatedBy: userId,
    });

    await report.save();
    return report;
  }

  /**
   * Delete a report
   */
  async delete(organizationId: Types.ObjectId, reportId: string): Promise<void> {
    const report = await this.findById(organizationId, reportId);

    // Only draft reports can be deleted
    if (report.status !== ReportStatus.DRAFT) {
      throw new BadRequestError('Only draft reports can be deleted');
    }

    await InvestorReport.deleteOne({ _id: report._id });
  }

  // ============ Workflow ============

  /**
   * Submit report for review
   */
  async submitForReview(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    if (!isValidReportStatusTransition(report.status as Parameters<typeof isValidReportStatusTransition>[0], ReportStatus.REVIEW)) {
      throw new BadRequestError(`Cannot submit report from status '${report.status}'`);
    }

    // Validate report has required content
    if (!report.sections || report.sections.length === 0) {
      throw new BadRequestError('Report must have at least one section');
    }

    report.status = ReportStatus.REVIEW;
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  /**
   * Approve a report
   */
  async approve(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    if (!isValidReportStatusTransition(report.status as Parameters<typeof isValidReportStatusTransition>[0], ReportStatus.APPROVED)) {
      throw new BadRequestError(`Cannot approve report from status '${report.status}'`);
    }

    report.status = ReportStatus.APPROVED;
    report.approvedBy = userId;
    report.approvedAt = new Date();
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  /**
   * Reject report (return to draft)
   */
  async reject(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId,
    reason?: string
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    if (!isValidReportStatusTransition(report.status as Parameters<typeof isValidReportStatusTransition>[0], ReportStatus.DRAFT)) {
      throw new BadRequestError(`Cannot reject report from status '${report.status}'`);
    }

    report.status = ReportStatus.DRAFT;
    if (reason) {
      report.notes = reason;
    }
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  /**
   * Send report to recipients
   */
  async send(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    if (!isValidReportStatusTransition(report.status as Parameters<typeof isValidReportStatusTransition>[0], ReportStatus.SENT)) {
      throw new BadRequestError(`Cannot send report from status '${report.status}'`);
    }

    if (!report.recipients || report.recipients.length === 0) {
      throw new BadRequestError('Report must have at least one recipient');
    }

    report.status = ReportStatus.SENT;
    report.sentAt = new Date();
    report.sentBy = userId;
    report.updatedBy = userId;

    // Mark all recipients as sent
    report.recipients.forEach((recipient) => {
      recipient.sentAt = new Date();
    });

    await report.save();

    // TODO: Actually send emails here via email service

    return report;
  }

  /**
   * Archive a report
   */
  async archive(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    if (!isValidReportStatusTransition(report.status as Parameters<typeof isValidReportStatusTransition>[0], ReportStatus.ARCHIVED)) {
      throw new BadRequestError(`Cannot archive report from status '${report.status}'`);
    }

    report.status = ReportStatus.ARCHIVED;
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  // ============ Section Management ============

  /**
   * Add a section to a report
   */
  async addSection(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId,
    input: AddSectionInput
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    if (report.sections.length >= REPORTING_CONSTANTS.MAX_SECTIONS_PER_REPORT) {
      throw new BadRequestError(
        `Maximum of ${REPORTING_CONSTANTS.MAX_SECTIONS_PER_REPORT} sections allowed per report`
      );
    }

    report.sections.push(input as IReportSection);
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  /**
   * Update a section
   */
  async updateSection(
    organizationId: Types.ObjectId,
    reportId: string,
    sectionId: string,
    userId: Types.ObjectId,
    input: UpdateSectionInput
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    const section = report.sections.id(sectionId);
    if (!section) {
      throw new NotFoundError('Section not found');
    }

    Object.assign(section, input);
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  /**
   * Delete a section
   */
  async deleteSection(
    organizationId: Types.ObjectId,
    reportId: string,
    sectionId: string,
    userId: Types.ObjectId
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    const section = report.sections.id(sectionId);
    if (!section) {
      throw new NotFoundError('Section not found');
    }

    report.sections.pull(sectionId);
    report.updatedBy = userId;

    await report.save();
    return report;
  }

  /**
   * Reorder sections
   */
  async reorderSections(
    organizationId: Types.ObjectId,
    reportId: string,
    userId: Types.ObjectId,
    sectionOrders: { sectionId: string; order: number }[]
  ): Promise<IInvestorReport> {
    const report = await this.findById(organizationId, reportId);

    for (const { sectionId, order } of sectionOrders) {
      const section = report.sections.id(sectionId);
      if (section) {
        section.order = order;
      }
    }

    report.updatedBy = userId;
    await report.save();
    return report;
  }

  // ============ Template Management ============

  /**
   * Create a report template
   */
  async createTemplate(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTemplateInput
  ): Promise<IReportTemplate> {
    const template = new ReportTemplate({
      organization: organizationId,
      ...input,
      createdBy: userId,
    });

    await template.save();
    return template;
  }

  /**
   * Get all templates
   */
  async getTemplates(
    organizationId: Types.ObjectId
  ): Promise<IReportTemplate[]> {
    const templates = await ReportTemplate.find({
      organization: organizationId,
      isActive: true,
    })
      .sort({ isDefault: -1, name: 1 })
      .lean()
      .exec();

    return templates as unknown as IReportTemplate[];
  }

  /**
   * Get template by ID
   */
  async getTemplateById(
    organizationId: Types.ObjectId,
    templateId: string
  ): Promise<IReportTemplate> {
    const template = await ReportTemplate.findOne({
      _id: new Types.ObjectId(templateId),
      organization: organizationId,
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(
    organizationId: Types.ObjectId,
    templateId: string,
    userId: Types.ObjectId,
    input: UpdateTemplateInput
  ): Promise<IReportTemplate> {
    const template = await this.getTemplateById(organizationId, templateId);

    Object.assign(template, {
      ...input,
      updatedBy: userId,
    });

    await template.save();
    return template;
  }

  /**
   * Delete template
   */
  async deleteTemplate(
    organizationId: Types.ObjectId,
    templateId: string
  ): Promise<void> {
    const template = await this.getTemplateById(organizationId, templateId);
    await ReportTemplate.deleteOne({ _id: template._id });
  }

  /**
   * Create report from template
   */
  async createFromTemplate(
    organizationId: Types.ObjectId,
    templateId: string,
    userId: Types.ObjectId,
    input: { title: string; reportingPeriod: CreateReportInput['reportingPeriod'] }
  ): Promise<IInvestorReport> {
    const template = await this.getTemplateById(organizationId, templateId);

    const sections = template.sections.map((s) => ({
      type: s.type,
      title: s.title,
      order: s.order,
      content: s.defaultContent || '',
      isVisible: true,
    }));

    const report = new InvestorReport({
      organization: organizationId,
      title: input.title,
      type: template.type,
      reportingPeriod: input.reportingPeriod,
      sections,
      status: ReportStatus.DRAFT,
      createdBy: userId,
    });

    await report.save();
    return report;
  }

  // ============ Analytics ============

  /**
   * Record a report view
   */
  async recordView(
    organizationId: Types.ObjectId,
    reportId: string,
    viewerEmail?: string
  ): Promise<void> {
    const report = await this.findById(organizationId, reportId);

    report.viewCount += 1;
    report.lastViewedAt = new Date();

    // Update recipient view count if viewer is a recipient
    if (viewerEmail) {
      const recipient = report.recipients.find((r) => r.email === viewerEmail);
      if (recipient) {
        recipient.viewCount += 1;
        if (!recipient.viewedAt) {
          recipient.viewedAt = new Date();
        }
      }
    }

    await report.save();
  }

  // ============ Helpers ============

  /**
   * Format section type to title
   */
  private formatSectionTitle(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const investorReportService = new InvestorReportService();
