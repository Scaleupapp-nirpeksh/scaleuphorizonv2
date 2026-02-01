/**
 * Round Service
 *
 * Business logic for funding round management
 */

import { Types } from 'mongoose';
import { Round, IRound, IRoundDocument } from '../models/round.model';
import { RoundStatus } from '../../constants';
import {
  CreateRoundInput,
  UpdateRoundInput,
  RoundQueryInput,
  OpenRoundInput,
  CloseRoundInput,
  AddDocumentInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';

export class RoundService {
  /**
   * Create a new funding round
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateRoundInput
  ): Promise<IRound> {
    // Check for duplicate active rounds of same type
    const existingActive = await Round.findOne({
      organization: organizationId,
      type: input.type,
      status: { $in: [RoundStatus.PLANNING, RoundStatus.ACTIVE] },
    });

    if (existingActive) {
      throw new BadRequestError(
        `An active or planning ${input.type} round already exists`
      );
    }

    const round = new Round({
      organization: organizationId,
      ...input,
      targetCloseDate: input.targetCloseDate ? new Date(input.targetCloseDate) : undefined,
      createdBy: userId,
    });

    await round.save();
    return round;
  }

  /**
   * Get all rounds for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: RoundQueryInput
  ): Promise<{
    data: IRound[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { status, type, page, limit, sortBy, sortOrder } = query;

    const filter: Record<string, unknown> = { organization: organizationId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const total = await Round.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await Round.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('leadInvestor', 'name type')
      .lean()
      .exec();

    return {
      data: data as unknown as IRound[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single round by ID
   */
  async findById(
    organizationId: Types.ObjectId,
    roundId: string
  ): Promise<IRound> {
    const round = await Round.findOne({
      _id: new Types.ObjectId(roundId),
      organization: organizationId,
    }).populate('leadInvestor', 'name type email');

    if (!round) {
      throw new NotFoundError('Round not found');
    }

    return round;
  }

  /**
   * Update a round
   */
  async update(
    organizationId: Types.ObjectId,
    roundId: string,
    userId: Types.ObjectId,
    input: UpdateRoundInput
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    // Closed rounds cannot be edited
    if (round.status === RoundStatus.CLOSED) {
      throw new BadRequestError('Cannot update a closed round');
    }

    // Update fields
    Object.assign(round, {
      ...input,
      targetCloseDate: input.targetCloseDate ? new Date(input.targetCloseDate) : round.targetCloseDate,
      leadInvestor: input.leadInvestor ? new Types.ObjectId(input.leadInvestor) : round.leadInvestor,
      updatedBy: userId,
    });

    await round.save();
    return round;
  }

  /**
   * Open a round (start accepting investments)
   */
  async openRound(
    organizationId: Types.ObjectId,
    roundId: string,
    userId: Types.ObjectId,
    input: OpenRoundInput
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    if (round.status !== RoundStatus.PLANNING) {
      throw new BadRequestError('Only planning rounds can be opened');
    }

    round.status = RoundStatus.ACTIVE;
    round.openDate = input.openDate ? new Date(input.openDate) : new Date();
    round.updatedBy = userId;

    await round.save();
    return round;
  }

  /**
   * Close a round
   */
  async closeRound(
    organizationId: Types.ObjectId,
    roundId: string,
    userId: Types.ObjectId,
    input: CloseRoundInput
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    if (round.status !== RoundStatus.ACTIVE) {
      throw new BadRequestError('Only active rounds can be closed');
    }

    round.status = RoundStatus.CLOSED;
    round.closeDate = input.closeDate ? new Date(input.closeDate) : new Date();
    if (input.finalRaisedAmount !== undefined) {
      round.raisedAmount = input.finalRaisedAmount;
    }
    round.updatedBy = userId;

    await round.save();
    return round;
  }

  /**
   * Cancel a round
   */
  async cancelRound(
    organizationId: Types.ObjectId,
    roundId: string,
    userId: Types.ObjectId
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    if (round.status === RoundStatus.CLOSED) {
      throw new BadRequestError('Cannot cancel a closed round');
    }

    round.status = RoundStatus.CANCELLED;
    round.updatedBy = userId;

    await round.save();
    return round;
  }

  /**
   * Add a document to a round
   */
  async addDocument(
    organizationId: Types.ObjectId,
    roundId: string,
    userId: Types.ObjectId,
    input: AddDocumentInput
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    const document: IRoundDocument = {
      name: input.name,
      type: input.type,
      url: input.url,
      uploadedAt: new Date(),
    };

    if (!round.documents) {
      round.documents = [];
    }
    round.documents.push(document);
    round.updatedBy = userId;

    await round.save();
    return round;
  }

  /**
   * Remove a document from a round
   */
  async removeDocument(
    organizationId: Types.ObjectId,
    roundId: string,
    documentIndex: number,
    userId: Types.ObjectId
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    if (!round.documents || documentIndex >= round.documents.length) {
      throw new NotFoundError('Document not found');
    }

    round.documents.splice(documentIndex, 1);
    round.updatedBy = userId;

    await round.save();
    return round;
  }

  /**
   * Update raised amount (called when investments are recorded)
   */
  async updateRaisedAmount(
    organizationId: Types.ObjectId,
    roundId: string,
    amount: number
  ): Promise<IRound> {
    const round = await this.findById(organizationId, roundId);

    round.raisedAmount = amount;
    if (round.preMoneyValuation) {
      round.postMoneyValuation = round.preMoneyValuation + amount;
    }

    await round.save();
    return round;
  }

  /**
   * Get round summary with investor details
   */
  async getRoundSummary(
    organizationId: Types.ObjectId,
    roundId: string
  ): Promise<{
    round: IRound;
    investorCount: number;
    totalCommitted: number;
    totalReceived: number;
    percentRaised: number;
    investors: Array<{
      investor: Types.ObjectId;
      name: string;
      type: string;
      commitmentAmount: number;
      receivedAmount: number;
      isLead: boolean;
    }>;
  }> {
    const round = await this.findById(organizationId, roundId);

    // Import Investor model dynamically to avoid circular dependency
    const { Investor } = await import('../../investors/models/investor.model');

    // Get investors for this round
    const investors = await Investor.find({
      organization: organizationId,
      linkedRound: round._id,
    }).lean();

    const investorSummaries = investors.map((inv) => ({
      investor: inv._id,
      name: inv.name,
      type: inv.type,
      commitmentAmount: inv.totalCommitted,
      receivedAmount: inv.totalInvested,
      isLead: round.leadInvestor?.toString() === inv._id.toString(),
    }));

    const totalCommitted = investors.reduce((sum, inv) => sum + (inv.totalCommitted || 0), 0);
    const totalReceived = investors.reduce((sum, inv) => sum + (inv.totalInvested || 0), 0);

    return {
      round,
      investorCount: investors.length,
      totalCommitted,
      totalReceived,
      percentRaised: round.targetAmount > 0 ? (totalReceived / round.targetAmount) * 100 : 0,
      investors: investorSummaries,
    };
  }

  /**
   * Delete a round (only if planning and no investments)
   */
  async delete(
    organizationId: Types.ObjectId,
    roundId: string
  ): Promise<void> {
    const round = await this.findById(organizationId, roundId);

    if (round.status !== RoundStatus.PLANNING) {
      throw new BadRequestError('Only planning rounds can be deleted');
    }

    if (round.raisedAmount > 0) {
      throw new BadRequestError('Cannot delete a round with recorded investments');
    }

    await Round.deleteOne({ _id: round._id });
  }
}

export const roundService = new RoundService();
