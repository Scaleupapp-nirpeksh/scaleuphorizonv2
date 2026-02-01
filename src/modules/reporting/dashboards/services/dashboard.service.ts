/**
 * Dashboard Service
 *
 * Business logic for dashboard and widget management
 */

import { Types } from 'mongoose';
import { Dashboard, IDashboard, IWidget } from '../models/dashboard.model';
import { DashboardType, REPORTING_CONSTANTS } from '../../constants';
import {
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateWidgetInput,
  UpdateWidgetInput,
  DashboardQueryInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';

export class DashboardService {
  /**
   * Create a new dashboard
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateDashboardInput
  ): Promise<IDashboard> {
    // Check dashboard limit
    const count = await Dashboard.countDocuments({ organization: organizationId });
    if (count >= REPORTING_CONSTANTS.MAX_DASHBOARDS_PER_ORG) {
      throw new BadRequestError(
        `Maximum of ${REPORTING_CONSTANTS.MAX_DASHBOARDS_PER_ORG} dashboards allowed per organization`
      );
    }

    const dashboard = new Dashboard({
      organization: organizationId,
      ...input,
      createdBy: userId,
    });

    await dashboard.save();
    return dashboard;
  }

  /**
   * Get all dashboards for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: DashboardQueryInput
  ): Promise<{
    data: IDashboard[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { type, isDefault, search, page, limit, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = { organization: organizationId };
    if (type) filter.type = type;
    if (isDefault !== undefined) filter.isDefault = isDefault === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Dashboard.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await Dashboard.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email')
      .lean()
      .exec();

    return {
      data: data as unknown as IDashboard[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single dashboard by ID
   */
  async findById(organizationId: Types.ObjectId, dashboardId: string): Promise<IDashboard> {
    const dashboard = await Dashboard.findOne({
      _id: new Types.ObjectId(dashboardId),
      organization: organizationId,
    }).populate('createdBy', 'firstName lastName email');

    if (!dashboard) {
      throw new NotFoundError('Dashboard not found');
    }

    return dashboard;
  }

  /**
   * Update a dashboard
   */
  async update(
    organizationId: Types.ObjectId,
    dashboardId: string,
    userId: Types.ObjectId,
    input: UpdateDashboardInput
  ): Promise<IDashboard> {
    const dashboard = await this.findById(organizationId, dashboardId);

    Object.assign(dashboard, {
      ...input,
      updatedBy: userId,
    });

    await dashboard.save();
    return dashboard;
  }

  /**
   * Delete a dashboard
   */
  async delete(organizationId: Types.ObjectId, dashboardId: string): Promise<void> {
    const dashboard = await this.findById(organizationId, dashboardId);
    await Dashboard.deleteOne({ _id: dashboard._id });
  }

  /**
   * Get default dashboard by type
   */
  async getDefaultByType(
    organizationId: Types.ObjectId,
    type: string
  ): Promise<IDashboard | null> {
    return Dashboard.findOne({
      organization: organizationId,
      type,
      isDefault: true,
    });
  }

  /**
   * Get executive dashboard
   */
  async getExecutiveDashboard(organizationId: Types.ObjectId): Promise<IDashboard | null> {
    // Try to get default executive dashboard
    let dashboard = await this.getDefaultByType(organizationId, DashboardType.EXECUTIVE);

    // If not found, get any executive dashboard
    if (!dashboard) {
      dashboard = await Dashboard.findOne({
        organization: organizationId,
        type: DashboardType.EXECUTIVE,
      });
    }

    return dashboard;
  }

  /**
   * Get finance dashboard
   */
  async getFinanceDashboard(organizationId: Types.ObjectId): Promise<IDashboard | null> {
    let dashboard = await this.getDefaultByType(organizationId, DashboardType.FINANCE);

    if (!dashboard) {
      dashboard = await Dashboard.findOne({
        organization: organizationId,
        type: DashboardType.FINANCE,
      });
    }

    return dashboard;
  }

  /**
   * Clone a dashboard
   */
  async clone(
    organizationId: Types.ObjectId,
    dashboardId: string,
    userId: Types.ObjectId,
    newName: string
  ): Promise<IDashboard> {
    const source = await this.findById(organizationId, dashboardId);

    const clone = new Dashboard({
      organization: organizationId,
      name: newName,
      description: source.description,
      type: source.type,
      isDefault: false,
      isPublic: false,
      layout: source.layout,
      widgets: source.widgets.map((w) => ({
        name: w.name,
        type: w.type,
        dataSource: w.dataSource,
        position: w.position,
        config: w.config,
        filters: w.filters,
        isVisible: w.isVisible,
      })),
      refreshInterval: source.refreshInterval,
      createdBy: userId,
    });

    await clone.save();
    return clone;
  }

  // ============ Widget Management ============

  /**
   * Add a widget to a dashboard
   */
  async addWidget(
    organizationId: Types.ObjectId,
    dashboardId: string,
    userId: Types.ObjectId,
    input: CreateWidgetInput
  ): Promise<IDashboard> {
    const dashboard = await this.findById(organizationId, dashboardId);

    // Check widget limit
    if (dashboard.widgets.length >= REPORTING_CONSTANTS.MAX_WIDGETS_PER_DASHBOARD) {
      throw new BadRequestError(
        `Maximum of ${REPORTING_CONSTANTS.MAX_WIDGETS_PER_DASHBOARD} widgets allowed per dashboard`
      );
    }

    // Check for position collision
    const hasCollision = dashboard.widgets.some(
      (w) =>
        w.isVisible &&
        this.widgetsOverlap(w.position, input.position)
    );

    if (hasCollision) {
      throw new BadRequestError('Widget position overlaps with existing widget');
    }

    dashboard.widgets.push(input as IWidget);
    dashboard.updatedBy = userId;

    await dashboard.save();
    return dashboard;
  }

  /**
   * Update a widget
   */
  async updateWidget(
    organizationId: Types.ObjectId,
    dashboardId: string,
    widgetId: string,
    userId: Types.ObjectId,
    input: UpdateWidgetInput
  ): Promise<IDashboard> {
    const dashboard = await this.findById(organizationId, dashboardId);

    const widget = dashboard.widgets.id(widgetId);
    if (!widget) {
      throw new NotFoundError('Widget not found');
    }

    // Check position collision if position is being updated
    if (input.position) {
      const hasCollision = dashboard.widgets.some(
        (w) =>
          w._id.toString() !== widgetId &&
          w.isVisible &&
          this.widgetsOverlap(w.position, input.position!)
      );

      if (hasCollision) {
        throw new BadRequestError('Widget position overlaps with existing widget');
      }
    }

    Object.assign(widget, input);
    dashboard.updatedBy = userId;

    await dashboard.save();
    return dashboard;
  }

  /**
   * Delete a widget
   */
  async deleteWidget(
    organizationId: Types.ObjectId,
    dashboardId: string,
    widgetId: string,
    userId: Types.ObjectId
  ): Promise<IDashboard> {
    const dashboard = await this.findById(organizationId, dashboardId);

    const widget = dashboard.widgets.id(widgetId);
    if (!widget) {
      throw new NotFoundError('Widget not found');
    }

    dashboard.widgets.pull(widgetId);
    dashboard.updatedBy = userId;

    await dashboard.save();
    return dashboard;
  }

  /**
   * Reorder widgets (update multiple positions at once)
   */
  async reorderWidgets(
    organizationId: Types.ObjectId,
    dashboardId: string,
    userId: Types.ObjectId,
    positions: { widgetId: string; position: { row: number; column: number; width: number; height: number } }[]
  ): Promise<IDashboard> {
    const dashboard = await this.findById(organizationId, dashboardId);

    for (const { widgetId, position } of positions) {
      const widget = dashboard.widgets.id(widgetId);
      if (widget) {
        widget.position = position;
      }
    }

    dashboard.updatedBy = userId;
    await dashboard.save();
    return dashboard;
  }

  // ============ Helper Methods ============

  /**
   * Check if two widget positions overlap
   */
  private widgetsOverlap(
    pos1: { row: number; column: number; width: number; height: number },
    pos2: { row: number; column: number; width: number; height: number }
  ): boolean {
    const pos1Right = pos1.column + pos1.width;
    const pos1Bottom = pos1.row + pos1.height;
    const pos2Right = pos2.column + pos2.width;
    const pos2Bottom = pos2.row + pos2.height;

    return !(
      pos1Right <= pos2.column ||
      pos2Right <= pos1.column ||
      pos1Bottom <= pos2.row ||
      pos2Bottom <= pos1.row
    );
  }

  /**
   * Mark dashboard as refreshed
   */
  async markRefreshed(
    organizationId: Types.ObjectId,
    dashboardId: string
  ): Promise<void> {
    await Dashboard.updateOne(
      { _id: new Types.ObjectId(dashboardId), organization: organizationId },
      { lastRefreshedAt: new Date() }
    );
  }
}

export const dashboardService = new DashboardService();
