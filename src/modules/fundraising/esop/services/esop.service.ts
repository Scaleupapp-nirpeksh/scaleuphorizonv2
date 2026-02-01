/**
 * ESOP Service
 *
 * Business logic for ESOP pool and grant management
 */

import { Types } from 'mongoose';
import { ESOPPool, IESOPPool } from '../models/esop-pool.model';
import { ESOPGrant, IESOPGrant, IVestingEvent, IExerciseEvent } from '../models/esop-grant.model';
import { GrantStatus, calculateVestedShares } from '../../constants';
import {
  CreatePoolInput,
  UpdatePoolInput,
  CreateGrantInput,
  UpdateGrantInput,
  ApproveGrantInput,
  ExerciseGrantInput,
  GrantQueryInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';

export class ESOPService {
  // ============ Pool Management ============

  /**
   * Create or update ESOP pool
   */
  async createPool(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreatePoolInput
  ): Promise<IESOPPool> {
    // Check if pool already exists
    const existing = await ESOPPool.findOne({
      organization: organizationId,
      isActive: true,
    });

    if (existing) {
      throw new BadRequestError('ESOP pool already exists. Use update instead.');
    }

    const pool = new ESOPPool({
      organization: organizationId,
      ...input,
      createdFromRound: input.createdFromRound
        ? new Types.ObjectId(input.createdFromRound)
        : undefined,
      createdBy: userId,
    });

    await pool.save();
    return pool;
  }

  /**
   * Get ESOP pool
   */
  async getPool(organizationId: Types.ObjectId): Promise<IESOPPool | null> {
    return ESOPPool.findOne({
      organization: organizationId,
      isActive: true,
    });
  }

  /**
   * Update ESOP pool
   */
  async updatePool(
    organizationId: Types.ObjectId,
    input: UpdatePoolInput
  ): Promise<IESOPPool> {
    const pool = await this.getPool(organizationId);
    if (!pool) {
      throw new NotFoundError('ESOP pool not found');
    }

    // Validate total shares not less than allocated
    if (input.totalShares !== undefined && input.totalShares < pool.allocatedShares) {
      throw new BadRequestError(
        `Total shares cannot be less than allocated shares (${pool.allocatedShares})`
      );
    }

    Object.assign(pool, input);
    await pool.save();
    return pool;
  }

  // ============ Grant Management ============

  /**
   * Create a new grant
   */
  async createGrant(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateGrantInput
  ): Promise<IESOPGrant> {
    // Validate pool exists and has available shares
    const pool = await ESOPPool.findOne({
      _id: new Types.ObjectId(input.pool),
      organization: organizationId,
      isActive: true,
    });

    if (!pool) {
      throw new NotFoundError('ESOP pool not found');
    }

    if (input.totalShares > pool.availableShares) {
      throw new BadRequestError(
        `Not enough shares available. Available: ${pool.availableShares}, Requested: ${input.totalShares}`
      );
    }

    const grant = new ESOPGrant({
      organization: organizationId,
      pool: pool._id,
      grantee: new Types.ObjectId(input.grantee),
      granteeName: input.granteeName,
      granteeEmail: input.granteeEmail,
      employeeId: input.employeeId,
      department: input.department,
      grantType: input.grantType,
      totalShares: input.totalShares,
      exercisePrice: input.exercisePrice,
      fairMarketValue: input.fairMarketValue,
      grantDate: new Date(input.grantDate),
      vestingSchedule: input.vestingSchedule,
      vestingStartDate: new Date(input.vestingStartDate),
      vestingMonths: input.vestingMonths,
      cliffMonths: input.cliffMonths,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
      accelerationClause: input.accelerationClause,
      boardApprovalDate: input.boardApprovalDate ? new Date(input.boardApprovalDate) : undefined,
      grantAgreementUrl: input.grantAgreementUrl,
      notes: input.notes,
      createdBy: userId,
    });

    await grant.save();

    // Update pool allocated shares
    pool.allocatedShares += input.totalShares;
    await pool.save();

    return grant;
  }

  /**
   * Get all grants
   */
  async getGrants(
    organizationId: Types.ObjectId,
    query: GrantQueryInput
  ): Promise<{
    data: IESOPGrant[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const filter: Record<string, unknown> = { organization: organizationId };
    if (query.status) filter.status = query.status;
    if (query.grantType) filter.grantType = query.grantType;
    if (query.department) filter.department = query.department;
    if (query.granteeId) filter.grantee = new Types.ObjectId(query.granteeId);

    const page = query.page || 1;
    const limit = query.limit || 20;

    const total = await ESOPGrant.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await ESOPGrant.find(filter)
      .sort({ grantDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('pool', 'name')
      .lean()
      .exec();

    return {
      data: data as unknown as IESOPGrant[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get grant by ID
   */
  async getGrantById(
    organizationId: Types.ObjectId,
    grantId: string
  ): Promise<IESOPGrant> {
    const grant = await ESOPGrant.findOne({
      _id: new Types.ObjectId(grantId),
      organization: organizationId,
    }).populate('pool', 'name');

    if (!grant) {
      throw new NotFoundError('Grant not found');
    }

    return grant;
  }

  /**
   * Update grant
   */
  async updateGrant(
    organizationId: Types.ObjectId,
    grantId: string,
    userId: Types.ObjectId,
    input: UpdateGrantInput
  ): Promise<IESOPGrant> {
    const grant = await this.getGrantById(organizationId, grantId);

    // Only draft grants can be fully edited
    if (grant.status !== GrantStatus.DRAFT) {
      // Limited fields for non-draft grants
      const allowedFields = ['notes', 'grantAgreementUrl', 'accelerationClause'];
      const inputKeys = Object.keys(input);
      const invalidFields = inputKeys.filter(k => !allowedFields.includes(k));
      if (invalidFields.length > 0) {
        throw new BadRequestError(
          `Cannot update ${invalidFields.join(', ')} for non-draft grants`
        );
      }
    }

    Object.assign(grant, {
      ...input,
      boardApprovalDate: input.boardApprovalDate ? new Date(input.boardApprovalDate) : grant.boardApprovalDate,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : grant.expirationDate,
      updatedBy: userId,
    });

    await grant.save();
    return grant;
  }

  /**
   * Approve grant
   */
  async approveGrant(
    organizationId: Types.ObjectId,
    grantId: string,
    userId: Types.ObjectId,
    input: ApproveGrantInput
  ): Promise<IESOPGrant> {
    const grant = await this.getGrantById(organizationId, grantId);

    if (grant.status !== GrantStatus.DRAFT) {
      throw new BadRequestError('Only draft grants can be approved');
    }

    grant.status = GrantStatus.APPROVED;
    grant.boardApprovalDate = input.boardApprovalDate
      ? new Date(input.boardApprovalDate)
      : new Date();
    grant.updatedBy = userId;

    await grant.save();

    // Generate vesting schedule
    await this.generateVestingSchedule(grant);

    return grant;
  }

  /**
   * Activate grant (start vesting)
   */
  async activateGrant(
    organizationId: Types.ObjectId,
    grantId: string,
    userId: Types.ObjectId
  ): Promise<IESOPGrant> {
    const grant = await this.getGrantById(organizationId, grantId);

    if (grant.status !== GrantStatus.APPROVED) {
      throw new BadRequestError('Only approved grants can be activated');
    }

    grant.status = GrantStatus.ACTIVE;
    grant.updatedBy = userId;

    await grant.save();
    return grant;
  }

  /**
   * Exercise shares
   */
  async exerciseShares(
    organizationId: Types.ObjectId,
    grantId: string,
    userId: Types.ObjectId,
    input: ExerciseGrantInput
  ): Promise<IESOPGrant> {
    const grant = await this.getGrantById(organizationId, grantId);

    // Update vesting first
    await this.updateVesting(grant);

    const exercisableShares = grant.vestedShares - grant.exercisedShares;
    if (input.sharesExercised > exercisableShares) {
      throw new BadRequestError(
        `Cannot exercise ${input.sharesExercised} shares. Only ${exercisableShares} exercisable.`
      );
    }

    const exerciseEvent: Partial<IExerciseEvent> = {
      date: input.exerciseDate ? new Date(input.exerciseDate) : new Date(),
      sharesExercised: input.sharesExercised,
      pricePerShare: grant.exercisePrice,
      totalCost: input.sharesExercised * grant.exercisePrice,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
    };

    grant.exerciseEvents.push(exerciseEvent as IExerciseEvent);
    grant.exercisedShares += input.sharesExercised;
    grant.updatedBy = userId;

    // Update status if fully exercised
    if (grant.exercisedShares >= grant.vestedShares && grant.vestedShares >= grant.totalShares) {
      grant.status = GrantStatus.EXERCISED;
    }

    await grant.save();
    return grant;
  }

  /**
   * Cancel grant
   */
  async cancelGrant(
    organizationId: Types.ObjectId,
    grantId: string,
    userId: Types.ObjectId,
    reason?: string
  ): Promise<IESOPGrant> {
    const grant = await this.getGrantById(organizationId, grantId);

    if (grant.status === GrantStatus.EXERCISED) {
      throw new BadRequestError('Cannot cancel a fully exercised grant');
    }

    // Return unvested shares to pool
    const pool = await ESOPPool.findById(grant.pool);
    if (pool) {
      const unvestedShares = grant.totalShares - grant.exercisedShares;
      pool.allocatedShares -= unvestedShares;
      await pool.save();
    }

    grant.status = GrantStatus.CANCELLED;
    if (reason) grant.notes = (grant.notes || '') + `\nCancellation reason: ${reason}`;
    grant.updatedBy = userId;

    await grant.save();
    return grant;
  }

  /**
   * Delete grant (only draft)
   */
  async deleteGrant(
    organizationId: Types.ObjectId,
    grantId: string
  ): Promise<void> {
    const grant = await this.getGrantById(organizationId, grantId);

    if (grant.status !== GrantStatus.DRAFT) {
      throw new BadRequestError('Only draft grants can be deleted');
    }

    // Return shares to pool
    const pool = await ESOPPool.findById(grant.pool);
    if (pool) {
      pool.allocatedShares -= grant.totalShares;
      await pool.save();
    }

    await ESOPGrant.deleteOne({ _id: grant._id });
  }

  // ============ Vesting ============

  /**
   * Get vesting schedule details
   */
  async getVestingSchedule(
    organizationId: Types.ObjectId,
    grantId: string
  ): Promise<{
    grant: IESOPGrant;
    projectedVesting: Array<{
      date: Date;
      sharesVesting: number;
      cumulativeVested: number;
      percentVested: number;
    }>;
    totalVested: number;
    totalUnvested: number;
    totalExercised: number;
    totalExercisable: number;
    nextVestingDate?: Date;
    nextVestingAmount?: number;
  }> {
    const grant = await this.getGrantById(organizationId, grantId);

    // Update current vesting status
    await this.updateVesting(grant);

    // Generate projected vesting schedule
    const projectedVesting = this.calculateProjectedVesting(grant);

    // Find next vesting event
    const now = new Date();
    const futureEvents = projectedVesting.filter(v => v.date > now);
    const nextVestingDate = futureEvents[0]?.date;
    const nextVestingAmount = futureEvents[0]?.sharesVesting;

    return {
      grant,
      projectedVesting,
      totalVested: grant.vestedShares,
      totalUnvested: grant.totalShares - grant.vestedShares,
      totalExercised: grant.exercisedShares,
      totalExercisable: grant.vestedShares - grant.exercisedShares,
      nextVestingDate,
      nextVestingAmount,
    };
  }

  /**
   * Update vesting for a grant
   */
  async updateVesting(grant: IESOPGrant): Promise<void> {
    if (![GrantStatus.ACTIVE, GrantStatus.PARTIALLY_VESTED, GrantStatus.APPROVED].includes(grant.status as any)) {
      return;
    }

    const vestingResult = calculateVestedShares(
      grant.totalShares,
      grant.vestingStartDate,
      grant.vestingMonths,
      grant.cliffMonths
    );

    grant.vestedShares = vestingResult.vestedShares;
    grant.unvestedShares = vestingResult.unvestedShares;

    // Update status based on vesting
    if (grant.vestedShares >= grant.totalShares) {
      grant.status = GrantStatus.FULLY_VESTED;
    } else if (grant.vestedShares > 0) {
      grant.status = GrantStatus.PARTIALLY_VESTED;
    }

    await grant.save();
  }

  /**
   * Generate vesting schedule events
   */
  private async generateVestingSchedule(grant: IESOPGrant): Promise<void> {
    const events: IVestingEvent[] = [];
    const startDate = new Date(grant.vestingStartDate);
    const cliffDate = new Date(startDate);
    cliffDate.setMonth(cliffDate.getMonth() + grant.cliffMonths);

    // Standard vesting: Monthly after cliff
    const monthlyVesting = grant.totalShares / grant.vestingMonths;
    let cumulativeVested = 0;

    for (let month = 1; month <= grant.vestingMonths; month++) {
      const vestDate = new Date(startDate);
      vestDate.setMonth(vestDate.getMonth() + month);

      if (vestDate <= cliffDate && month < grant.cliffMonths) {
        continue; // No vesting before cliff
      }

      let sharesVesting = monthlyVesting;

      // At cliff, vest all accumulated shares
      if (month === grant.cliffMonths) {
        sharesVesting = monthlyVesting * grant.cliffMonths;
      }

      cumulativeVested += sharesVesting;

      events.push({
        date: vestDate,
        sharesVested: Math.floor(sharesVesting),
        cumulativeVested: Math.floor(cumulativeVested),
        percentVested: (cumulativeVested / grant.totalShares) * 100,
      });
    }

    grant.vestingEvents = events;
    await grant.save();
  }

  /**
   * Calculate projected vesting dates
   */
  private calculateProjectedVesting(grant: IESOPGrant): Array<{
    date: Date;
    sharesVesting: number;
    cumulativeVested: number;
    percentVested: number;
  }> {
    const projections: Array<{
      date: Date;
      sharesVesting: number;
      cumulativeVested: number;
      percentVested: number;
    }> = [];

    const startDate = new Date(grant.vestingStartDate);
    const monthlyVesting = grant.totalShares / grant.vestingMonths;
    let cumulativeVested = 0;

    for (let month = 1; month <= grant.vestingMonths; month++) {
      const vestDate = new Date(startDate);
      vestDate.setMonth(vestDate.getMonth() + month);

      let sharesVesting = monthlyVesting;

      if (month < grant.cliffMonths) {
        continue; // No vesting before cliff
      }

      if (month === grant.cliffMonths) {
        sharesVesting = monthlyVesting * grant.cliffMonths;
      }

      cumulativeVested += sharesVesting;

      projections.push({
        date: vestDate,
        sharesVesting: Math.floor(sharesVesting),
        cumulativeVested: Math.floor(cumulativeVested),
        percentVested: (cumulativeVested / grant.totalShares) * 100,
      });
    }

    return projections;
  }

  // ============ Summary ============

  /**
   * Get ESOP summary
   */
  async getSummary(organizationId: Types.ObjectId): Promise<{
    pool: IESOPPool | null;
    totalGrants: number;
    activeGrants: number;
    totalAllocated: number;
    totalVested: number;
    totalExercised: number;
    totalAvailable: number;
    utilizationPercent: number;
    byDepartment: Array<{
      department: string;
      grantCount: number;
      totalShares: number;
      vestedShares: number;
      exercisedShares: number;
    }>;
    recentGrants: IESOPGrant[];
  }> {
    const pool = await this.getPool(organizationId);

    const grants = await ESOPGrant.find({
      organization: organizationId,
      status: { $ne: GrantStatus.CANCELLED },
    });

    const activeGrants = grants.filter(g =>
      [GrantStatus.ACTIVE, GrantStatus.PARTIALLY_VESTED, GrantStatus.FULLY_VESTED].includes(g.status as any)
    ).length;

    const totalAllocated = grants.reduce((sum, g) => sum + g.totalShares, 0);
    const totalVested = grants.reduce((sum, g) => sum + g.vestedShares, 0);
    const totalExercised = grants.reduce((sum, g) => sum + g.exercisedShares, 0);

    // Group by department
    const departmentMap = new Map<string, {
      grantCount: number;
      totalShares: number;
      vestedShares: number;
      exercisedShares: number;
    }>();

    for (const grant of grants) {
      const dept = grant.department || 'Unassigned';
      const current = departmentMap.get(dept) || {
        grantCount: 0,
        totalShares: 0,
        vestedShares: 0,
        exercisedShares: 0,
      };

      departmentMap.set(dept, {
        grantCount: current.grantCount + 1,
        totalShares: current.totalShares + grant.totalShares,
        vestedShares: current.vestedShares + grant.vestedShares,
        exercisedShares: current.exercisedShares + grant.exercisedShares,
      });
    }

    const byDepartment = Array.from(departmentMap.entries()).map(([department, data]) => ({
      department,
      ...data,
    }));

    // Recent grants
    const recentGrants = await ESOPGrant.find({
      organization: organizationId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec();

    return {
      pool,
      totalGrants: grants.length,
      activeGrants,
      totalAllocated,
      totalVested,
      totalExercised,
      totalAvailable: pool ? pool.availableShares : 0,
      utilizationPercent: pool ? (totalAllocated / pool.totalShares) * 100 : 0,
      byDepartment,
      recentGrants: recentGrants as unknown as IESOPGrant[],
    };
  }
}

export const esopService = new ESOPService();
