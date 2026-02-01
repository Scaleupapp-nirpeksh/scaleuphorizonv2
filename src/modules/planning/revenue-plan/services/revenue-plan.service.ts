import { Types } from 'mongoose';
import { RevenuePlan, IRevenuePlan, RevenueStream, IRevenueStream } from '../models';
import {
  CreateRevenuePlanInput,
  UpdateRevenuePlanInput,
  CreateRevenueStreamInput,
  UpdateRevenueStreamInput,
  RevenuePlanQueryInput,
} from '../schemas';
import { RevenuePlanStatus } from '../../constants';
import { validateAccountReference } from '../../utils';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { RevenuePlanSummary, MonthlyRevenueSummary } from '../../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Revenue Plan Service
 * Handles revenue planning business logic
 */
export class RevenuePlanService {
  // ============ Revenue Plan CRUD ============

  /**
   * Create a new revenue plan
   */
  async createRevenuePlan(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateRevenuePlanInput
  ): Promise<IRevenuePlan> {
    const { name, fiscalYear, startDate, endDate, ...rest } = input;

    // Check for duplicate name in same fiscal year
    const existing = await RevenuePlan.findOne({
      organization: organizationId,
      name,
      fiscalYear,
      isArchived: false,
    });

    if (existing) {
      throw new BadRequestError(
        `Revenue plan "${name}" already exists for fiscal year ${fiscalYear}`
      );
    }

    const revenuePlan = new RevenuePlan({
      organization: organizationId,
      name,
      fiscalYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...rest,
      status: RevenuePlanStatus.DRAFT,
      version: 1,
      totalProjectedRevenue: 0,
      createdBy: userId,
    });

    await revenuePlan.save();
    return revenuePlan;
  }

  /**
   * Get all revenue plans for an organization
   */
  async getRevenuePlans(
    organizationId: Types.ObjectId,
    filters?: RevenuePlanQueryInput
  ): Promise<IRevenuePlan[]> {
    const query: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (filters) {
      if (filters.fiscalYear) query.fiscalYear = filters.fiscalYear;
      if (filters.status) query.status = filters.status;
      if (filters.revenueModel) query.revenueModel = filters.revenueModel;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }
    }

    return RevenuePlan.find(query).sort({ fiscalYear: -1, createdAt: -1 });
  }

  /**
   * Get revenue plan by ID
   */
  async getRevenuePlanById(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<IRevenuePlan> {
    const plan = await RevenuePlan.findOne({
      _id: new Types.ObjectId(planId),
      organization: organizationId,
    });

    if (!plan) {
      throw new NotFoundError('Revenue plan not found');
    }

    return plan;
  }

  /**
   * Update a revenue plan
   */
  async updateRevenuePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId,
    input: UpdateRevenuePlanInput
  ): Promise<IRevenuePlan> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    // Cannot update approved/active plans
    if (
      plan.status === RevenuePlanStatus.APPROVED ||
      plan.status === RevenuePlanStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot update approved or active revenue plans');
    }

    // Update fields
    if (input.name !== undefined) plan.name = input.name;
    if (input.description !== undefined)
      plan.description = input.description || undefined;
    if (input.revenueModel !== undefined) plan.revenueModel = input.revenueModel;
    if (input.growthTargetPercentage !== undefined)
      plan.growthTargetPercentage = input.growthTargetPercentage;
    if (input.assumptions !== undefined)
      plan.assumptions = input.assumptions || undefined;

    plan.updatedBy = userId;
    await plan.save();

    return plan;
  }

  /**
   * Archive a revenue plan
   */
  async archiveRevenuePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (plan.status === RevenuePlanStatus.ACTIVE) {
      throw new BadRequestError('Cannot archive an active revenue plan');
    }

    plan.isArchived = true;
    plan.updatedBy = userId;
    await plan.save();

    // Archive all revenue streams
    await RevenueStream.updateMany(
      { revenuePlan: plan._id },
      { isArchived: true, updatedBy: userId }
    );
  }

  // ============ Revenue Plan Workflow ============

  /**
   * Submit revenue plan for approval
   */
  async submitForApproval(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<IRevenuePlan> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (plan.status !== RevenuePlanStatus.DRAFT) {
      throw new BadRequestError('Only draft revenue plans can be submitted for approval');
    }

    // Check if plan has streams
    const streamCount = await RevenueStream.countDocuments({
      revenuePlan: plan._id,
      isArchived: false,
    });

    if (streamCount === 0) {
      throw new BadRequestError('Cannot submit empty revenue plan for approval');
    }

    plan.status = RevenuePlanStatus.PENDING;
    plan.updatedBy = userId;
    await plan.save();

    return plan;
  }

  /**
   * Approve a revenue plan
   */
  async approveRevenuePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<IRevenuePlan> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (plan.status !== RevenuePlanStatus.PENDING) {
      throw new BadRequestError('Only pending revenue plans can be approved');
    }

    plan.status = RevenuePlanStatus.APPROVED;
    plan.approvedBy = userId;
    plan.approvedAt = new Date();
    plan.updatedBy = userId;
    await plan.save();

    return plan;
  }

  /**
   * Reject a revenue plan
   */
  async rejectRevenuePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<IRevenuePlan> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (plan.status !== RevenuePlanStatus.PENDING) {
      throw new BadRequestError('Only pending revenue plans can be rejected');
    }

    plan.status = RevenuePlanStatus.DRAFT;
    plan.updatedBy = userId;
    await plan.save();

    return plan;
  }

  /**
   * Activate an approved revenue plan
   */
  async activateRevenuePlan(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId
  ): Promise<IRevenuePlan> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (plan.status !== RevenuePlanStatus.APPROVED) {
      throw new BadRequestError('Only approved revenue plans can be activated');
    }

    // Deactivate any other active plan of same fiscal year
    await RevenuePlan.updateMany(
      {
        organization: organizationId,
        fiscalYear: plan.fiscalYear,
        status: RevenuePlanStatus.ACTIVE,
        _id: { $ne: plan._id },
      },
      { status: RevenuePlanStatus.ARCHIVED }
    );

    plan.status = RevenuePlanStatus.ACTIVE;
    plan.updatedBy = userId;
    await plan.save();

    return plan;
  }

  // ============ Revenue Streams ============

  /**
   * Add revenue stream
   */
  async addRevenueStream(
    organizationId: Types.ObjectId,
    planId: string,
    userId: Types.ObjectId,
    input: CreateRevenueStreamInput
  ): Promise<IRevenueStream> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    // Cannot add streams to approved/active plans
    if (
      plan.status === RevenuePlanStatus.APPROVED ||
      plan.status === RevenuePlanStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot add streams to approved or active revenue plans');
    }

    // Validate account reference if provided (must be revenue type)
    let accountId: Types.ObjectId | undefined;
    if (input.accountId) {
      const account = await validateAccountReference(
        organizationId,
        input.accountId,
        'revenue'
      );
      accountId = account._id;
    }

    // Generate monthly projections if not provided but MRR data is
    let monthlyProjections = input.monthlyProjections || [];
    if (
      monthlyProjections.length === 0 &&
      input.startingMRR !== undefined &&
      input.projectedMRRGrowth !== undefined
    ) {
      monthlyProjections = this.generateMRRProjections(
        input.startingMRR,
        input.projectedMRRGrowth,
        input.churnRate || 0
      );
    }

    const stream = new RevenueStream({
      organization: organizationId,
      revenuePlan: plan._id,
      account: accountId,
      name: input.name,
      description: input.description,
      streamType: input.streamType,
      product: input.product,
      segment: input.segment,
      pricingModel: input.pricingModel,
      averagePrice: input.averagePrice,
      monthlyProjections,
      startingMRR: input.startingMRR,
      projectedMRRGrowth: input.projectedMRRGrowth,
      churnRate: input.churnRate,
      confidence: input.confidence,
      priority: input.priority || 0,
      createdBy: userId,
    });

    await stream.save();
    await this.recalculatePlanTotal(plan._id);

    return stream.populate('account', 'code name type subtype');
  }

  /**
   * Update revenue stream
   */
  async updateRevenueStream(
    organizationId: Types.ObjectId,
    planId: string,
    streamId: string,
    userId: Types.ObjectId,
    input: UpdateRevenueStreamInput
  ): Promise<IRevenueStream> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (
      plan.status === RevenuePlanStatus.APPROVED ||
      plan.status === RevenuePlanStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot update streams in approved or active revenue plans');
    }

    const stream = await RevenueStream.findOne({
      _id: new Types.ObjectId(streamId),
      revenuePlan: plan._id,
      isArchived: false,
    });

    if (!stream) {
      throw new NotFoundError('Revenue stream not found');
    }

    // Update fields
    if (input.name !== undefined) stream.name = input.name;
    if (input.description !== undefined)
      stream.description = input.description || undefined;
    if (input.monthlyProjections !== undefined)
      stream.monthlyProjections = input.monthlyProjections.map(p => ({
        month: p.month,
        projected: p.projected,
        confidence: p.confidence || 'medium',
        notes: p.notes,
      }));
    if (input.confidence !== undefined) stream.confidence = input.confidence;
    if (input.priority !== undefined) stream.priority = input.priority;

    stream.updatedBy = userId;
    await stream.save();
    await this.recalculatePlanTotal(plan._id);

    return stream.populate('account', 'code name type subtype');
  }

  /**
   * Delete revenue stream
   */
  async deleteRevenueStream(
    organizationId: Types.ObjectId,
    planId: string,
    streamId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    const plan = await this.getRevenuePlanById(organizationId, planId);

    if (
      plan.status === RevenuePlanStatus.APPROVED ||
      plan.status === RevenuePlanStatus.ACTIVE
    ) {
      throw new BadRequestError('Cannot delete streams from approved or active revenue plans');
    }

    const stream = await RevenueStream.findOne({
      _id: new Types.ObjectId(streamId),
      revenuePlan: plan._id,
      isArchived: false,
    });

    if (!stream) {
      throw new NotFoundError('Revenue stream not found');
    }

    stream.isArchived = true;
    stream.updatedBy = userId;
    await stream.save();
    await this.recalculatePlanTotal(plan._id);
  }

  /**
   * Get revenue streams for a plan
   */
  async getRevenueStreams(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<IRevenueStream[]> {
    const plan = await this.getRevenuePlanById(organizationId, planId);
    return RevenueStream.findByPlan(plan._id);
  }

  // ============ Analytics ============

  /**
   * Get revenue plan summary
   */
  async getRevenuePlanSummary(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<RevenuePlanSummary> {
    const plan = await this.getRevenuePlanById(organizationId, planId);
    const streams = await RevenueStream.findByPlan(plan._id);

    // Group by stream type
    const byStreamType: Record<string, number> = {};
    for (const stream of streams) {
      if (!byStreamType[stream.streamType]) {
        byStreamType[stream.streamType] = 0;
      }
      byStreamType[stream.streamType] += stream.annualProjected;
    }

    // Calculate weighted average confidence
    let totalWeight = 0;
    let weightedConfidence = 0;
    const confidenceValues: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    for (const stream of streams) {
      const weight = stream.annualProjected;
      totalWeight += weight;
      weightedConfidence += (confidenceValues[stream.confidence] || 2) * weight;
    }

    const avgConfidenceScore = totalWeight > 0 ? weightedConfidence / totalWeight : 2;
    const avgConfidence =
      avgConfidenceScore >= 2.5 ? 'high' : avgConfidenceScore >= 1.5 ? 'medium' : 'low';

    return {
      id: plan._id.toString(),
      name: plan.name,
      fiscalYear: plan.fiscalYear,
      status: plan.status,
      revenueModel: plan.revenueModel,
      totalProjectedRevenue: plan.totalProjectedRevenue,
      streamCount: streams.length,
      currency: plan.currency,
      byStreamType,
      averageConfidence: avgConfidence,
      growthTargetPercentage: plan.growthTargetPercentage,
      baselineRevenue: plan.baselineRevenue,
      createdAt: plan.createdAt.toISOString(),
    };
  }

  /**
   * Get monthly projections breakdown
   */
  async getMonthlyProjections(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<MonthlyRevenueSummary[]> {
    const plan = await this.getRevenuePlanById(organizationId, planId);
    const streams = await RevenueStream.findByPlan(plan._id);

    const breakdown: MonthlyRevenueSummary[] = [];

    for (let month = 1; month <= 12; month++) {
      const byStreamType: Record<string, number> = {};
      const byConfidence: Record<string, number> = { high: 0, medium: 0, low: 0 };
      let totalProjected = 0;

      for (const stream of streams) {
        const monthData = stream.monthlyProjections.find((m) => m.month === month);
        const amount = monthData?.projected || 0;
        const confidence = monthData?.confidence || stream.confidence;

        if (!byStreamType[stream.streamType]) {
          byStreamType[stream.streamType] = 0;
        }
        byStreamType[stream.streamType] += amount;
        byConfidence[confidence] += amount;
        totalProjected += amount;
      }

      breakdown.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        totalProjected: Math.round(totalProjected * 100) / 100,
        byStreamType,
        byConfidence,
      });
    }

    return breakdown;
  }

  /**
   * Get MRR/ARR metrics for subscription revenue
   */
  async getMRRMetrics(
    organizationId: Types.ObjectId,
    planId: string
  ): Promise<{
    currentMRR: number;
    projectedARR: number;
    avgGrowthRate: number;
    avgChurnRate: number;
    netMRRGrowth: number;
  }> {
    const plan = await this.getRevenuePlanById(organizationId, planId);
    const streams = await RevenueStream.find({
      revenuePlan: plan._id,
      isArchived: false,
      streamType: 'subscription',
    });

    if (streams.length === 0) {
      return {
        currentMRR: 0,
        projectedARR: 0,
        avgGrowthRate: 0,
        avgChurnRate: 0,
        netMRRGrowth: 0,
      };
    }

    let totalStartingMRR = 0;
    let totalEndingMRR = 0;
    let weightedGrowthRate = 0;
    let weightedChurnRate = 0;
    let totalWeight = 0;

    for (const stream of streams) {
      const startMRR = stream.startingMRR || 0;
      totalStartingMRR += startMRR;

      // Calculate ending MRR from monthly projections
      const lastMonth = stream.monthlyProjections.find((m) => m.month === 12);
      totalEndingMRR += lastMonth?.projected || startMRR;

      if (startMRR > 0) {
        weightedGrowthRate += (stream.projectedMRRGrowth || 0) * startMRR;
        weightedChurnRate += (stream.churnRate || 0) * startMRR;
        totalWeight += startMRR;
      }
    }

    const avgGrowthRate = totalWeight > 0 ? weightedGrowthRate / totalWeight : 0;
    const avgChurnRate = totalWeight > 0 ? weightedChurnRate / totalWeight : 0;
    const netMRRGrowth = avgGrowthRate - avgChurnRate;

    return {
      currentMRR: Math.round(totalStartingMRR * 100) / 100,
      projectedARR: Math.round(totalEndingMRR * 12 * 100) / 100,
      avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
      avgChurnRate: Math.round(avgChurnRate * 100) / 100,
      netMRRGrowth: Math.round(netMRRGrowth * 100) / 100,
    };
  }

  // ============ Helpers ============

  /**
   * Generate MRR projections for 12 months
   */
  private generateMRRProjections(
    startingMRR: number,
    monthlyGrowthRate: number,
    churnRate: number
  ): Array<{ month: number; projected: number; confidence: string }> {
    const projections = [];
    let currentMRR = startingMRR;
    const netGrowthRate = (monthlyGrowthRate - churnRate) / 100;

    for (let month = 1; month <= 12; month++) {
      currentMRR = currentMRR * (1 + netGrowthRate);
      projections.push({
        month,
        projected: Math.round(currentMRR * 100) / 100,
        confidence: 'medium',
      });
    }

    return projections;
  }

  /**
   * Recalculate revenue plan total from streams
   */
  private async recalculatePlanTotal(planId: Types.ObjectId): Promise<void> {
    const result = await RevenueStream.aggregate([
      { $match: { revenuePlan: planId, isArchived: false } },
      { $group: { _id: null, total: { $sum: '$annualProjected' } } },
    ]);

    const total = result[0]?.total || 0;

    await RevenuePlan.findByIdAndUpdate(planId, {
      totalProjectedRevenue: Math.round(total * 100) / 100,
    });
  }
}

// Export singleton instance
export const revenuePlanService = new RevenuePlanService();
