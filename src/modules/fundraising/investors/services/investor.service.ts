/**
 * Investor Service
 *
 * Business logic for investor management
 */

import { Types } from 'mongoose';
import { Investor, IInvestor, ITranche } from '../models/investor.model';
import { Round } from '../../rounds/models/round.model';
import { TrancheStatus, InvestorStatus } from '../../constants';
import {
  CreateInvestorInput,
  UpdateInvestorInput,
  InvestorQueryInput,
  CreateTrancheInput,
  UpdateTrancheInput,
  ReceiveTrancheInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';

export class InvestorService {
  /**
   * Create a new investor
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateInvestorInput
  ): Promise<IInvestor> {
    // Validate linked round if provided
    if (input.linkedRound) {
      const round = await Round.findOne({
        _id: new Types.ObjectId(input.linkedRound),
        organization: organizationId,
      });
      if (!round) {
        throw new NotFoundError('Linked round not found');
      }
    }

    const investor = new Investor({
      organization: organizationId,
      ...input,
      linkedRound: input.linkedRound ? new Types.ObjectId(input.linkedRound) : undefined,
      createdBy: userId,
    });

    await investor.save();
    return investor;
  }

  /**
   * Get all investors for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: InvestorQueryInput
  ): Promise<{
    data: IInvestor[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { status, type, roundId, search, page, limit, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = { organization: organizationId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (roundId) filter.linkedRound = new Types.ObjectId(roundId);
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Investor.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await Investor.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('linkedRound', 'name type status')
      .lean()
      .exec();

    return {
      data: data as unknown as IInvestor[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single investor by ID
   */
  async findById(
    organizationId: Types.ObjectId,
    investorId: string
  ): Promise<IInvestor> {
    const investor = await Investor.findOne({
      _id: new Types.ObjectId(investorId),
      organization: organizationId,
    }).populate('linkedRound', 'name type status');

    if (!investor) {
      throw new NotFoundError('Investor not found');
    }

    return investor;
  }

  /**
   * Update an investor
   */
  async update(
    organizationId: Types.ObjectId,
    investorId: string,
    userId: Types.ObjectId,
    input: UpdateInvestorInput
  ): Promise<IInvestor> {
    const investor = await this.findById(organizationId, investorId);

    // Validate linked round if being updated
    if (input.linkedRound) {
      const round = await Round.findOne({
        _id: new Types.ObjectId(input.linkedRound),
        organization: organizationId,
      });
      if (!round) {
        throw new NotFoundError('Linked round not found');
      }
    }

    Object.assign(investor, {
      ...input,
      linkedRound: input.linkedRound ? new Types.ObjectId(input.linkedRound) : investor.linkedRound,
      updatedBy: userId,
    });

    await investor.save();
    return investor;
  }

  /**
   * Delete an investor
   */
  async delete(
    organizationId: Types.ObjectId,
    investorId: string
  ): Promise<void> {
    const investor = await this.findById(organizationId, investorId);

    // Check if investor has received investments
    const hasReceivedInvestment = investor.tranches?.some(
      (t) => t.status === TrancheStatus.RECEIVED
    );

    if (hasReceivedInvestment) {
      throw new BadRequestError('Cannot delete investor with received investments');
    }

    await Investor.deleteOne({ _id: investor._id });
  }

  // ============ Tranche Management ============

  /**
   * Add a tranche to an investor
   */
  async addTranche(
    organizationId: Types.ObjectId,
    investorId: string,
    userId: Types.ObjectId,
    input: CreateTrancheInput
  ): Promise<IInvestor> {
    const investor = await this.findById(organizationId, investorId);

    // Validate round if provided
    if (input.round) {
      const round = await Round.findOne({
        _id: new Types.ObjectId(input.round),
        organization: organizationId,
      });
      if (!round) {
        throw new NotFoundError('Round not found');
      }
    }

    const tranche = {
      round: input.round ? new Types.ObjectId(input.round) : undefined,
      amount: input.amount,
      scheduledDate: new Date(input.scheduledDate),
      status: TrancheStatus.SCHEDULED,
      shareClass: input.shareClass,
      sharesIssued: input.sharesIssued,
      pricePerShare: input.pricePerShare,
      notes: input.notes,
      createdBy: userId,
    };

    investor.tranches.push(tranche as ITranche);
    investor.recalculateTotals();
    investor.updatedBy = userId;

    await investor.save();
    await this.updateRoundRaisedAmount(organizationId, investor);

    return investor;
  }

  /**
   * Update a tranche
   */
  async updateTranche(
    organizationId: Types.ObjectId,
    investorId: string,
    trancheId: string,
    userId: Types.ObjectId,
    input: UpdateTrancheInput
  ): Promise<IInvestor> {
    const investor = await this.findById(organizationId, investorId);

    const tranche = investor.tranches.id(trancheId);
    if (!tranche) {
      throw new NotFoundError('Tranche not found');
    }

    // Cannot update received tranches
    if (tranche.status === TrancheStatus.RECEIVED) {
      throw new BadRequestError('Cannot update a received tranche');
    }

    Object.assign(tranche, {
      ...input,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : tranche.scheduledDate,
    });

    investor.recalculateTotals();
    investor.updatedBy = userId;

    await investor.save();
    await this.updateRoundRaisedAmount(organizationId, investor);

    return investor;
  }

  /**
   * Mark a tranche as received
   */
  async receiveTranche(
    organizationId: Types.ObjectId,
    investorId: string,
    trancheId: string,
    userId: Types.ObjectId,
    input: ReceiveTrancheInput
  ): Promise<IInvestor> {
    const investor = await this.findById(organizationId, investorId);

    const tranche = investor.tranches.id(trancheId);
    if (!tranche) {
      throw new NotFoundError('Tranche not found');
    }

    if (tranche.status === TrancheStatus.RECEIVED) {
      throw new BadRequestError('Tranche already received');
    }

    if (tranche.status === TrancheStatus.CANCELLED) {
      throw new BadRequestError('Cannot receive a cancelled tranche');
    }

    tranche.status = TrancheStatus.RECEIVED;
    tranche.receivedDate = input.receivedDate ? new Date(input.receivedDate) : new Date();
    if (input.sharesIssued !== undefined) tranche.sharesIssued = input.sharesIssued;
    if (input.pricePerShare !== undefined) tranche.pricePerShare = input.pricePerShare;

    investor.recalculateTotals();
    investor.updatedBy = userId;

    await investor.save();
    await this.updateRoundRaisedAmount(organizationId, investor);

    return investor;
  }

  /**
   * Cancel a tranche
   */
  async cancelTranche(
    organizationId: Types.ObjectId,
    investorId: string,
    trancheId: string,
    userId: Types.ObjectId
  ): Promise<IInvestor> {
    const investor = await this.findById(organizationId, investorId);

    const tranche = investor.tranches.id(trancheId);
    if (!tranche) {
      throw new NotFoundError('Tranche not found');
    }

    if (tranche.status === TrancheStatus.RECEIVED) {
      throw new BadRequestError('Cannot cancel a received tranche');
    }

    tranche.status = TrancheStatus.CANCELLED;
    investor.recalculateTotals();
    investor.updatedBy = userId;

    await investor.save();
    await this.updateRoundRaisedAmount(organizationId, investor);

    return investor;
  }

  /**
   * Delete a tranche
   */
  async deleteTranche(
    organizationId: Types.ObjectId,
    investorId: string,
    trancheId: string,
    userId: Types.ObjectId
  ): Promise<IInvestor> {
    const investor = await this.findById(organizationId, investorId);

    const tranche = investor.tranches.id(trancheId);
    if (!tranche) {
      throw new NotFoundError('Tranche not found');
    }

    if (tranche.status === TrancheStatus.RECEIVED) {
      throw new BadRequestError('Cannot delete a received tranche');
    }

    investor.tranches.pull(trancheId);
    investor.recalculateTotals();
    investor.updatedBy = userId;

    await investor.save();
    await this.updateRoundRaisedAmount(organizationId, investor);

    return investor;
  }

  // ============ Helper Methods ============

  /**
   * Update round's raised amount based on investor tranches
   */
  private async updateRoundRaisedAmount(
    organizationId: Types.ObjectId,
    investor: IInvestor
  ): Promise<void> {
    if (!investor.linkedRound) return;

    // Get all investors for this round
    const investors = await Investor.find({
      organization: organizationId,
      linkedRound: investor.linkedRound,
    });

    // Calculate total received across all investors
    let totalReceived = 0;
    for (const inv of investors) {
      for (const tranche of inv.tranches || []) {
        if (
          tranche.status === TrancheStatus.RECEIVED &&
          tranche.round?.toString() === investor.linkedRound.toString()
        ) {
          totalReceived += tranche.amount;
        }
      }
    }

    // Update round
    await Round.findByIdAndUpdate(investor.linkedRound, {
      raisedAmount: totalReceived,
    });
  }

  /**
   * Get investors by status
   */
  async getInvestorsByStatus(
    organizationId: Types.ObjectId,
    status: string
  ): Promise<unknown[]> {
    return Investor.find({
      organization: organizationId,
      status,
    }).lean().exec();
  }

  /**
   * Get top investors by investment amount
   */
  async getTopInvestors(
    organizationId: Types.ObjectId,
    limit: number = 10
  ): Promise<unknown[]> {
    return Investor.find({
      organization: organizationId,
      status: InvestorStatus.INVESTED,
    })
      .sort({ totalInvested: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}

export const investorService = new InvestorService();
