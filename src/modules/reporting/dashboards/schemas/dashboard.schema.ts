/**
 * Dashboard Zod Schemas
 *
 * Validation schemas for dashboard API requests/responses
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  DashboardType,
  WidgetType,
  WidgetDataSource,
  RefreshInterval,
  REPORTING_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

// ============ Widget Schemas ============

const widgetPositionSchema = z.object({
  row: z.number().int().min(0).openapi({ example: 0 }),
  column: z.number().int().min(0).openapi({ example: 0 }),
  width: z.number().int().min(1).max(12).openapi({ example: 4 }),
  height: z.number().int().min(1).openapi({ example: 2 }),
});

const timeRangeSchema = z.object({
  type: z.enum(['relative', 'absolute']),
  relativeValue: z.number().int().positive().optional(),
  relativeUnit: z.enum(['days', 'weeks', 'months', 'quarters', 'years']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const comparisonConfigSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(['previous_period', 'same_period_last_year', 'budget', 'target']).optional(),
  showPercentChange: z.boolean().default(true),
});

const visualizationConfigSchema = z.object({
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  showLabels: z.boolean().default(true),
  colors: z.array(z.string()).optional(),
  stacked: z.boolean().default(false),
});

const aggregationConfigSchema = z.object({
  groupBy: z.string().optional(),
  aggregateFunction: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum'),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().positive().optional(),
});

const formattingConfigSchema = z.object({
  numberFormat: z.enum(['currency', 'percentage', 'number', 'compact']).optional(),
  currency: z.string().default('USD'),
  decimals: z.number().int().min(0).max(6).default(2),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

const widgetConfigSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  timeRange: timeRangeSchema.optional(),
  comparison: comparisonConfigSchema.optional(),
  visualization: visualizationConfigSchema.optional(),
  customQuery: z.string().max(REPORTING_CONSTANTS.MAX_CUSTOM_QUERY_LENGTH).optional(),
  aggregation: aggregationConfigSchema.optional(),
  formatting: formattingConfigSchema.optional(),
});

const widgetFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains']),
  value: z.unknown(),
});

// ============ Dashboard Schemas ============

const dashboardLayoutSchema = z.object({
  columns: z.number().int().min(1).max(24).default(12),
  rows: z.number().int().min(1).default(12),
  gridGap: z.number().int().min(0).default(16),
});

export const createDashboardSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).openapi({ example: 'Executive Dashboard' }),
    description: z.string().max(500).optional().openapi({ example: 'High-level KPIs for executives' }),
    type: z.enum(Object.values(DashboardType) as [string, ...string[]]).default('custom').openapi({ example: 'executive' }),
    isDefault: z.boolean().default(false),
    isPublic: z.boolean().default(false),
    layout: dashboardLayoutSchema.optional(),
    refreshInterval: z.enum(Object.values(RefreshInterval) as [string, ...string[]]).default('daily').openapi({ example: 'daily' }),
  }),
});

export const updateDashboardSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    type: z.enum(Object.values(DashboardType) as [string, ...string[]]).optional(),
    isDefault: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    layout: dashboardLayoutSchema.optional(),
    refreshInterval: z.enum(Object.values(RefreshInterval) as [string, ...string[]]).optional(),
    sharedWith: z.array(z.string()).optional(),
  }),
});

export const createWidgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).openapi({ example: 'Monthly Revenue' }),
    type: z.enum(Object.values(WidgetType) as [string, ...string[]]).openapi({ example: 'line_chart' }),
    dataSource: z.enum(Object.values(WidgetDataSource) as [string, ...string[]]).openapi({ example: 'revenue' }),
    position: widgetPositionSchema,
    config: widgetConfigSchema.optional(),
    filters: z.array(widgetFilterSchema).optional(),
    isVisible: z.boolean().default(true),
  }),
});

export const updateWidgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(Object.values(WidgetType) as [string, ...string[]]).optional(),
    dataSource: z.enum(Object.values(WidgetDataSource) as [string, ...string[]]).optional(),
    position: widgetPositionSchema.optional(),
    config: widgetConfigSchema.optional(),
    filters: z.array(widgetFilterSchema).optional(),
    isVisible: z.boolean().optional(),
  }),
});

export const dashboardQuerySchema = z.object({
  query: z.object({
    type: z.enum(Object.values(DashboardType) as [string, ...string[]]).optional(),
    isDefault: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    sortBy: z.enum(['name', 'type', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ============ Type Exports ============

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>['body'];
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>['body'];
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>['body'];
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>['body'];
export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>['query'];
