/**
 * Investor Schemas
 *
 * Zod validation schemas for investor management endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { InvestorType, InvestorStatus, ShareClass } from '../../constants';

extendZodWithOpenApi(z);

// ============ Nested Schemas ============

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const contactPersonSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const investorDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['kyc', 'agreement', 'consent', 'other']),
  url: z.string().url(),
});

// ============ Create Schema ============

export const createInvestorSchema = z.object({
  name: z.string().min(1).max(200).openapi({ description: 'Investor name', example: 'Sequoia Capital' }),
  type: z.enum([
    InvestorType.ANGEL,
    InvestorType.VC,
    InvestorType.CORPORATE,
    InvestorType.FAMILY_OFFICE,
    InvestorType.ACCELERATOR,
    InvestorType.CROWDFUNDING,
    InvestorType.FOUNDER,
    InvestorType.EMPLOYEE,
    InvestorType.OTHER,
  ]).openapi({ description: 'Type of investor' }),
  status: z.enum([
    InvestorStatus.PROSPECT,
    InvestorStatus.IN_DISCUSSION,
    InvestorStatus.COMMITTED,
    InvestorStatus.INVESTED,
    InvestorStatus.PASSED,
  ]).optional().default(InvestorStatus.PROSPECT),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url().optional(),
  address: addressSchema.optional(),
  contactPerson: contactPersonSchema.optional(),
  linkedRound: z.string().optional().openapi({ description: 'ID of the funding round' }),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateInvestorInput = z.infer<typeof createInvestorSchema>;

// ============ Update Schema ============

export const updateInvestorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum([
    InvestorType.ANGEL,
    InvestorType.VC,
    InvestorType.CORPORATE,
    InvestorType.FAMILY_OFFICE,
    InvestorType.ACCELERATOR,
    InvestorType.CROWDFUNDING,
    InvestorType.FOUNDER,
    InvestorType.EMPLOYEE,
    InvestorType.OTHER,
  ]).optional(),
  status: z.enum([
    InvestorStatus.PROSPECT,
    InvestorStatus.IN_DISCUSSION,
    InvestorStatus.COMMITTED,
    InvestorStatus.INVESTED,
    InvestorStatus.PASSED,
  ]).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url().optional(),
  address: addressSchema.optional(),
  contactPerson: contactPersonSchema.optional(),
  linkedRound: z.string().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateInvestorInput = z.infer<typeof updateInvestorSchema>;

// ============ Tranche Schemas ============

export const createTrancheSchema = z.object({
  round: z.string().optional().openapi({ description: 'Round ID' }),
  amount: z.number().min(0).openapi({ description: 'Investment amount', example: 500000 }),
  scheduledDate: z.string().datetime().openapi({ description: 'Scheduled payment date' }),
  shareClass: z.enum([
    ShareClass.COMMON,
    ShareClass.PREFERRED,
    ShareClass.SERIES_SEED,
    ShareClass.SERIES_A,
    ShareClass.SERIES_B,
    ShareClass.SERIES_C,
    ShareClass.SERIES_D,
    ShareClass.OPTIONS,
    ShareClass.WARRANTS,
    ShareClass.CONVERTIBLE,
  ]).optional(),
  sharesIssued: z.number().min(0).optional(),
  pricePerShare: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateTrancheInput = z.infer<typeof createTrancheSchema>;

export const updateTrancheSchema = z.object({
  amount: z.number().min(0).optional(),
  scheduledDate: z.string().datetime().optional(),
  shareClass: z.enum([
    ShareClass.COMMON,
    ShareClass.PREFERRED,
    ShareClass.SERIES_SEED,
    ShareClass.SERIES_A,
    ShareClass.SERIES_B,
    ShareClass.SERIES_C,
    ShareClass.SERIES_D,
    ShareClass.OPTIONS,
    ShareClass.WARRANTS,
    ShareClass.CONVERTIBLE,
  ]).optional(),
  sharesIssued: z.number().min(0).optional(),
  pricePerShare: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateTrancheInput = z.infer<typeof updateTrancheSchema>;

export const receiveTrancheSchema = z.object({
  receivedDate: z.string().datetime().optional().openapi({ description: 'Date received (defaults to now)' }),
  sharesIssued: z.number().min(0).optional().openapi({ description: 'Shares to issue' }),
  pricePerShare: z.number().min(0).optional().openapi({ description: 'Price per share' }),
});

export type ReceiveTrancheInput = z.infer<typeof receiveTrancheSchema>;

// ============ Query Schema ============

export const investorQuerySchema = z.object({
  status: z.enum([
    InvestorStatus.PROSPECT,
    InvestorStatus.IN_DISCUSSION,
    InvestorStatus.COMMITTED,
    InvestorStatus.INVESTED,
    InvestorStatus.PASSED,
  ]).optional(),
  type: z.enum([
    InvestorType.ANGEL,
    InvestorType.VC,
    InvestorType.CORPORATE,
    InvestorType.FAMILY_OFFICE,
    InvestorType.ACCELERATOR,
    InvestorType.CROWDFUNDING,
    InvestorType.FOUNDER,
    InvestorType.EMPLOYEE,
    InvestorType.OTHER,
  ]).optional(),
  roundId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'name', 'totalInvested', 'totalCommitted']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type InvestorQueryInput = z.infer<typeof investorQuerySchema>;

// ============ Response Schemas ============

export const trancheResponseSchema = z.object({
  _id: z.string(),
  round: z.string().optional(),
  amount: z.number(),
  scheduledDate: z.string(),
  receivedDate: z.string().optional(),
  status: z.string(),
  shareClass: z.string().optional(),
  sharesIssued: z.number().optional(),
  pricePerShare: z.number().optional(),
  notes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const investorResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    organization: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    website: z.string().optional(),
    address: addressSchema.optional(),
    contactPerson: contactPersonSchema.optional(),
    linkedRound: z.string().optional(),
    totalCommitted: z.number(),
    totalInvested: z.number(),
    pendingAmount: z.number().optional(),
    sharesOwned: z.number(),
    ownershipPercent: z.number(),
    tranches: z.array(trancheResponseSchema),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    documents: z.array(investorDocumentSchema).optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const investorListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(investorResponseSchema.shape.data),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});
