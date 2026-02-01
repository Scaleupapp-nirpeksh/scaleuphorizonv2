import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  BudgetStatus,
  BudgetType,
  AllocationMethod,
  Priority,
  PLANNING_CONSTANTS,
} from '../../constants';

extendZodWithOpenApi(z);

const {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  ASSUMPTIONS_MAX_LENGTH,
  MIN_FISCAL_YEAR,
  MAX_FISCAL_YEAR,
} = PLANNING_CONSTANTS;

// ============ Enums ============

export const budgetStatusSchema = z
  .enum(Object.values(BudgetStatus) as [string, ...string[]])
  .openapi({
    description: 'Budget status',
    example: 'draft',
  });

export const budgetTypeSchema = z
  .enum(Object.values(BudgetType) as [string, ...string[]])
  .openapi({
    description: 'Budget type',
    example: 'annual',
  });

export const allocationMethodSchema = z
  .enum(Object.values(AllocationMethod) as [string, ...string[]])
  .openapi({
    description: 'Amount allocation method',
    example: 'even',
  });

export const prioritySchema = z
  .enum(Object.values(Priority) as [string, ...string[]])
  .openapi({
    description: 'Item priority',
    example: 'medium',
  });

// ============ Monthly Amount ============

export const monthlyAmountSchema = z.object({
  month: z.number().min(1).max(12).openapi({ example: 1 }),
  amount: z.number().min(0).openapi({ example: 5000 }),
  notes: z.string().max(200).optional().openapi({ example: 'Q1 marketing push' }),
});

// ============ Budget Response Schemas ============

export const budgetResponseSchema = z
  .object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    organization: z.string().openapi({ example: '507f1f77bcf86cd799439010' }),
    name: z.string().openapi({ example: 'FY2024 Annual Budget' }),
    description: z.string().optional().openapi({ example: 'Company-wide budget for fiscal year 2024' }),
    fiscalYear: z.number().openapi({ example: 2024 }),
    type: budgetTypeSchema,
    quarter: z.number().min(1).max(4).optional().openapi({ example: 1 }),
    month: z.number().min(1).max(12).optional().openapi({ example: 1 }),
    status: budgetStatusSchema,
    startDate: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    endDate: z.string().openapi({ example: '2024-12-31T23:59:59.999Z' }),
    totalAmount: z.number().openapi({ example: 1200000 }),
    currency: z.string().openapi({ example: 'USD' }),
    version: z.number().openapi({ example: 1 }),
    approvedBy: z.string().optional().openapi({ example: '507f1f77bcf86cd799439012' }),
    approvedAt: z.string().optional().openapi({ example: '2024-01-15T10:30:00.000Z' }),
    tags: z.array(z.string()).optional().openapi({ example: ['annual', 'approved'] }),
    createdBy: z.string().openapi({ example: '507f1f77bcf86cd799439012' }),
    createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  })
  .openapi('Budget');

export const budgetItemResponseSchema = z
  .object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439013' }),
    budget: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    account: z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        type: z.string(),
        subtype: z.string(),
      })
      .openapi({ example: { id: '...', code: '7100', name: 'Marketing', type: 'expense', subtype: 'marketing' } }),
    category: z.string().openapi({ example: 'marketing' }),
    name: z.string().openapi({ example: 'Digital Advertising' }),
    description: z.string().optional().openapi({ example: 'Google Ads, Facebook Ads' }),
    annualAmount: z.number().openapi({ example: 60000 }),
    monthlyBreakdown: z.array(monthlyAmountSchema).openapi({
      example: [
        { month: 1, amount: 5000 },
        { month: 2, amount: 5000 },
      ],
    }),
    allocationMethod: allocationMethodSchema,
    vendor: z.string().optional().openapi({ example: 'Google Inc.' }),
    department: z.string().optional().openapi({ example: 'Marketing' }),
    priority: prioritySchema,
    isRecurring: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  })
  .openapi('BudgetItem');

// ============ Create Budget Request ============

export const createBudgetSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(NAME_MIN_LENGTH)
        .max(NAME_MAX_LENGTH)
        .openapi({ example: 'FY2024 Annual Budget' }),
      description: z
        .string()
        .max(DESCRIPTION_MAX_LENGTH)
        .optional()
        .openapi({ example: 'Company-wide budget for fiscal year 2024' }),
      fiscalYear: z
        .number()
        .min(MIN_FISCAL_YEAR)
        .max(MAX_FISCAL_YEAR)
        .openapi({ example: 2024 }),
      type: budgetTypeSchema,
      quarter: z.number().min(1).max(4).optional().openapi({ example: 1 }),
      month: z.number().min(1).max(12).optional().openapi({ example: 1 }),
      startDate: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      endDate: z.string().datetime().openapi({ example: '2024-12-31T23:59:59.999Z' }),
      currency: z.string().length(3).optional().openapi({ example: 'USD' }),
      tags: z.array(z.string()).optional().openapi({ example: ['annual'] }),
      notes: z.string().max(NOTES_MAX_LENGTH).optional(),
    })
    .openapi('CreateBudgetRequest'),
});

// ============ Update Budget Request ============

export const updateBudgetSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).optional(),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional().nullable(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      currency: z.string().length(3).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().max(NOTES_MAX_LENGTH).optional().nullable(),
    })
    .openapi('UpdateBudgetRequest'),
});

// ============ Create Budget Item Request ============

export const createBudgetItemSchema = z.object({
  body: z
    .object({
      accountId: z.string().openapi({ example: '507f1f77bcf86cd799439014' }),
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).openapi({ example: 'Digital Advertising' }),
      description: z
        .string()
        .max(DESCRIPTION_MAX_LENGTH)
        .optional()
        .openapi({ example: 'Google and Facebook ads' }),
      annualAmount: z.number().min(0).openapi({ example: 60000 }),
      monthlyBreakdown: z.array(monthlyAmountSchema).optional(),
      allocationMethod: allocationMethodSchema.optional(),
      vendor: z.string().max(100).optional(),
      department: z.string().max(100).optional(),
      costCenter: z.string().max(50).optional(),
      isRecurring: z.boolean().optional(),
      recurringFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
      startMonth: z.number().min(1).max(12).optional(),
      endMonth: z.number().min(1).max(12).optional(),
      assumptions: z.string().max(ASSUMPTIONS_MAX_LENGTH).optional(),
      priority: prioritySchema.optional(),
      tags: z.array(z.string()).optional(),
    })
    .openapi('CreateBudgetItemRequest'),
});

// ============ Update Budget Item Request ============

export const updateBudgetItemSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).optional(),
      description: z.string().max(DESCRIPTION_MAX_LENGTH).optional().nullable(),
      annualAmount: z.number().min(0).optional(),
      monthlyBreakdown: z.array(monthlyAmountSchema).optional(),
      allocationMethod: allocationMethodSchema.optional(),
      vendor: z.string().max(100).optional().nullable(),
      department: z.string().max(100).optional().nullable(),
      costCenter: z.string().max(50).optional().nullable(),
      isRecurring: z.boolean().optional(),
      recurringFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional().nullable(),
      startMonth: z.number().min(1).max(12).optional().nullable(),
      endMonth: z.number().min(1).max(12).optional().nullable(),
      assumptions: z.string().max(ASSUMPTIONS_MAX_LENGTH).optional().nullable(),
      priority: prioritySchema.optional(),
      tags: z.array(z.string()).optional(),
    })
    .openapi('UpdateBudgetItemRequest'),
});

// ============ Approval/Rejection Requests ============

export const approveBudgetSchema = z.object({
  body: z
    .object({
      notes: z.string().max(NOTES_MAX_LENGTH).optional().openapi({ example: 'Approved with minor adjustments' }),
    })
    .openapi('ApproveBudgetRequest'),
});

export const rejectBudgetSchema = z.object({
  body: z
    .object({
      reason: z.string().min(1).max(NOTES_MAX_LENGTH).openapi({ example: 'Marketing budget exceeds projections' }),
    })
    .openapi('RejectBudgetRequest'),
});

// ============ Clone Request ============

export const cloneBudgetSchema = z.object({
  body: z
    .object({
      name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).openapi({ example: 'FY2025 Annual Budget' }),
      fiscalYear: z.number().min(MIN_FISCAL_YEAR).max(MAX_FISCAL_YEAR).optional().openapi({ example: 2025 }),
    })
    .openapi('CloneBudgetRequest'),
});

// ============ Query Schemas ============

export const budgetIdParamSchema = z.object({
  params: z.object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
  }),
});

export const budgetItemIdParamSchema = z.object({
  params: z.object({
    id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    itemId: z.string().openapi({ example: '507f1f77bcf86cd799439013' }),
  }),
});

export const budgetQuerySchema = z.object({
  query: z.object({
    fiscalYear: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    type: budgetTypeSchema.optional(),
    status: budgetStatusSchema.optional(),
    search: z.string().optional(),
  }),
});

// ============ Response Wrappers ============

export const budgetListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(budgetResponseSchema),
});

export const singleBudgetResponseSchema = z.object({
  success: z.literal(true),
  data: budgetResponseSchema,
});

export const budgetItemListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(budgetItemResponseSchema),
});

export const singleBudgetItemResponseSchema = z.object({
  success: z.literal(true),
  data: budgetItemResponseSchema,
});

export const budgetSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    name: z.string(),
    fiscalYear: z.number(),
    type: budgetTypeSchema,
    status: budgetStatusSchema,
    totalAmount: z.number(),
    itemCount: z.number(),
    currency: z.string(),
    byCategory: z.record(z.number()),
  }),
});

export const monthlyBreakdownResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      month: z.number(),
      monthName: z.string(),
      totalAmount: z.number(),
      byCategory: z.record(z.number()),
    })
  ),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

// ============ Type Exports ============

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>['body'];
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>['body'];
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>['body'];
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>['body'];
export type ApproveBudgetInput = z.infer<typeof approveBudgetSchema>['body'];
export type RejectBudgetInput = z.infer<typeof rejectBudgetSchema>['body'];
export type CloneBudgetInput = z.infer<typeof cloneBudgetSchema>['body'];
export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>['query'];
export type BudgetResponse = z.infer<typeof budgetResponseSchema>;
export type BudgetItemResponse = z.infer<typeof budgetItemResponseSchema>;
