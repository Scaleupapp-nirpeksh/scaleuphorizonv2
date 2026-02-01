/**
 * Milestone Service
 *
 * Business logic for milestone management
 */

import { Types } from 'mongoose';
import { Milestone, IMilestone, IKeyResult } from '../models';
import { MilestoneStatus, isValidMilestoneStatusTransition } from '../../constants';
import {
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneQueryInput,
  UpdateStatusInput,
  UpdateProgressInput,
  AddKeyResultInput,
  UpdateKeyResultInput,
  LinkTasksInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { MilestoneStats } from '../../types';

export class MilestoneService {
  /**
   * Create a new milestone
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateMilestoneInput
  ): Promise<IMilestone> {
    const milestone = new Milestone({
      organization: organizationId,
      ...input,
      targetDate: new Date(input.targetDate),
      linkedRound: input.linkedRound ? new Types.ObjectId(input.linkedRound) : undefined,
      owner: input.owner ? new Types.ObjectId(input.owner) : undefined,
      stakeholders: input.stakeholders?.map(id => new Types.ObjectId(id)),
      createdBy: userId,
    });

    await milestone.save();
    return milestone;
  }

  /**
   * Get all milestones for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: MilestoneQueryInput
  ): Promise<{
    data: IMilestone[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const {
      status,
      category,
      owner,
      targetFrom,
      targetTo,
      linkedRound,
      search,
      page = 1,
      limit = 20,
      sortBy = 'targetDate',
      sortOrder = 'asc',
    } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (owner) filter.owner = new Types.ObjectId(owner);
    if (linkedRound) filter.linkedRound = new Types.ObjectId(linkedRound);

    // Date range filter
    if (targetFrom || targetTo) {
      filter.targetDate = {};
      if (targetFrom) (filter.targetDate as Record<string, Date>).$gte = new Date(targetFrom);
      if (targetTo) (filter.targetDate as Record<string, Date>).$lte = new Date(targetTo);
    }

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Milestone.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await Milestone.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('owner', 'firstName lastName email')
      .populate('linkedRound', 'name type status')
      .lean()
      .exec();

    return {
      data: data as unknown as IMilestone[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single milestone by ID
   */
  async findById(
    organizationId: Types.ObjectId,
    milestoneId: string
  ): Promise<IMilestone> {
    const milestone = await Milestone.findOne({
      _id: new Types.ObjectId(milestoneId),
      organization: organizationId,
    })
      .populate('owner', 'firstName lastName email')
      .populate('stakeholders', 'firstName lastName email')
      .populate('linkedRound', 'name type status')
      .populate('linkedTasks', 'title status priority');

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    return milestone;
  }

  /**
   * Update a milestone
   */
  async update(
    organizationId: Types.ObjectId,
    milestoneId: string,
    userId: Types.ObjectId,
    input: UpdateMilestoneInput
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    if (milestone.isArchived) {
      throw new BadRequestError('Cannot update archived milestone');
    }

    // Validate status transition if status is being changed
    if (input.status && input.status !== milestone.status) {
      if (!isValidMilestoneStatusTransition(milestone.status, input.status)) {
        throw new BadRequestError(`Invalid status transition from ${milestone.status} to ${input.status}`);
      }
    }

    // Update fields
    Object.assign(milestone, {
      ...input,
      targetDate: input.targetDate ? new Date(input.targetDate) : milestone.targetDate,
      linkedRound: input.linkedRound === null ? undefined : (input.linkedRound ? new Types.ObjectId(input.linkedRound) : milestone.linkedRound),
      owner: input.owner === null ? undefined : (input.owner ? new Types.ObjectId(input.owner) : milestone.owner),
      stakeholders: input.stakeholders?.map(id => new Types.ObjectId(id)) || milestone.stakeholders,
      updatedBy: userId,
    });

    await milestone.save();
    return milestone;
  }

  /**
   * Update milestone status
   */
  async updateStatus(
    organizationId: Types.ObjectId,
    milestoneId: string,
    userId: Types.ObjectId,
    input: UpdateStatusInput
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    if (milestone.isArchived) {
      throw new BadRequestError('Cannot update archived milestone');
    }

    if (!isValidMilestoneStatusTransition(milestone.status, input.status)) {
      throw new BadRequestError(`Invalid status transition from ${milestone.status} to ${input.status}`);
    }

    milestone.status = input.status;
    if (input.notes) {
      milestone.notes = (milestone.notes || '') + '\n\n' + `[${new Date().toISOString()}] Status changed to ${input.status}: ${input.notes}`;
    }
    milestone.updatedBy = userId;

    await milestone.save();
    return milestone;
  }

  /**
   * Update milestone progress
   */
  async updateProgress(
    organizationId: Types.ObjectId,
    milestoneId: string,
    userId: Types.ObjectId,
    input: UpdateProgressInput
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    if (milestone.isArchived) {
      throw new BadRequestError('Cannot update archived milestone');
    }

    milestone.progress = input.progress;
    milestone.updatedBy = userId;

    // Auto-complete if progress is 100%
    if (input.progress === 100 && milestone.status !== MilestoneStatus.COMPLETED) {
      milestone.status = MilestoneStatus.COMPLETED;
      milestone.completedDate = new Date();
    }

    await milestone.save();
    return milestone;
  }

  /**
   * Archive a milestone
   */
  async archive(
    organizationId: Types.ObjectId,
    milestoneId: string,
    userId: Types.ObjectId
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    milestone.isArchived = true;
    milestone.updatedBy = userId;

    await milestone.save();
    return milestone;
  }

  /**
   * Delete a milestone (permanently)
   */
  async delete(
    organizationId: Types.ObjectId,
    milestoneId: string
  ): Promise<void> {
    const milestone = await this.findById(organizationId, milestoneId);
    await Milestone.deleteOne({ _id: milestone._id });
  }

  // ============ Key Results ============

  /**
   * Add a key result to a milestone
   */
  async addKeyResult(
    organizationId: Types.ObjectId,
    milestoneId: string,
    userId: Types.ObjectId,
    input: AddKeyResultInput
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    if (!milestone.keyResults) {
      milestone.keyResults = [];
    }

    milestone.keyResults.push(input as IKeyResult);
    milestone.updatedBy = userId;

    await milestone.save();
    return milestone;
  }

  /**
   * Update a key result
   */
  async updateKeyResult(
    organizationId: Types.ObjectId,
    milestoneId: string,
    keyResultId: string,
    userId: Types.ObjectId,
    input: UpdateKeyResultInput
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    const keyResult = milestone.keyResults?.find(kr => kr._id?.toString() === keyResultId);
    if (!keyResult) {
      throw new NotFoundError('Key result not found');
    }

    Object.assign(keyResult, input);
    milestone.updatedBy = userId;

    await milestone.save();
    return milestone;
  }

  /**
   * Delete a key result
   */
  async deleteKeyResult(
    organizationId: Types.ObjectId,
    milestoneId: string,
    keyResultId: string,
    userId: Types.ObjectId
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    const keyResultIndex = milestone.keyResults?.findIndex(kr => kr._id?.toString() === keyResultId);
    if (keyResultIndex === undefined || keyResultIndex === -1) {
      throw new NotFoundError('Key result not found');
    }

    milestone.keyResults!.splice(keyResultIndex, 1);
    milestone.updatedBy = userId;

    await milestone.save();
    return milestone;
  }

  // ============ Task Linking ============

  /**
   * Link tasks to a milestone
   */
  async linkTasks(
    organizationId: Types.ObjectId,
    milestoneId: string,
    userId: Types.ObjectId,
    input: LinkTasksInput
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    const taskIds = input.taskIds.map(id => new Types.ObjectId(id));
    milestone.linkedTasks = [...(milestone.linkedTasks || []), ...taskIds];
    milestone.updatedBy = userId;

    await milestone.save();

    // Update tasks to link back to milestone
    const { Task } = await import('../../tasks/models');
    await Task.updateMany(
      { _id: { $in: taskIds }, organization: organizationId },
      { $set: { linkedMilestone: milestone._id } }
    );

    return milestone;
  }

  /**
   * Unlink a task from a milestone
   */
  async unlinkTask(
    organizationId: Types.ObjectId,
    milestoneId: string,
    taskId: string,
    userId: Types.ObjectId
  ): Promise<IMilestone> {
    const milestone = await this.findById(organizationId, milestoneId);

    milestone.linkedTasks = milestone.linkedTasks?.filter(
      id => id.toString() !== taskId
    );
    milestone.updatedBy = userId;

    await milestone.save();

    // Update task to remove milestone link
    const { Task } = await import('../../tasks/models');
    await Task.updateOne(
      { _id: new Types.ObjectId(taskId), organization: organizationId },
      { $unset: { linkedMilestone: 1 } }
    );

    return milestone;
  }

  // ============ Roadmap View ============

  /**
   * Get milestones organized by quarter for roadmap view
   */
  async getRoadmap(
    organizationId: Types.ObjectId
  ): Promise<{
    quarters: Array<{
      quarter: string;
      milestones: IMilestone[];
    }>;
  }> {
    const milestones = await Milestone.find({
      organization: organizationId,
      isArchived: false,
      status: { $ne: MilestoneStatus.CANCELLED },
    })
      .sort({ targetDate: 1 })
      .populate('owner', 'firstName lastName')
      .lean()
      .exec();

    // Group by quarter
    const quarterMap = new Map<string, unknown[]>();

    milestones.forEach(milestone => {
      const date = new Date(milestone.targetDate);
      const year = date.getFullYear();
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const key = `${year} Q${quarter}`;

      if (!quarterMap.has(key)) {
        quarterMap.set(key, []);
      }
      quarterMap.get(key)!.push(milestone);
    });

    const quarters = Array.from(quarterMap.entries()).map(([quarter, milestones]) => ({
      quarter,
      milestones: milestones as IMilestone[],
    }));

    return { quarters };
  }

  // ============ Statistics ============

  /**
   * Get milestone statistics
   */
  async getStats(organizationId: Types.ObjectId): Promise<MilestoneStats> {
    const now = new Date();

    const [
      total,
      byStatusResult,
      byCategoryResult,
      overdue,
      avgProgressResult,
    ] = await Promise.all([
      Milestone.countDocuments({ organization: organizationId, isArchived: false }),

      Milestone.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Milestone.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      Milestone.countDocuments({
        organization: organizationId,
        isArchived: false,
        targetDate: { $lt: now },
        status: { $nin: [MilestoneStatus.COMPLETED, MilestoneStatus.CANCELLED] },
      }),

      Milestone.aggregate([
        {
          $match: {
            organization: organizationId,
            isArchived: false,
            status: { $nin: [MilestoneStatus.COMPLETED, MilestoneStatus.CANCELLED] },
          },
        },
        { $group: { _id: null, avg: { $avg: '$progress' } } },
      ]),
    ]);

    // Convert aggregation results to records
    const byStatus = byStatusResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = byCategoryResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate on-track and at-risk
    const onTrack = byStatus[MilestoneStatus.IN_PROGRESS] || 0;
    const atRisk = (byStatus[MilestoneStatus.AT_RISK] || 0) + (byStatus[MilestoneStatus.DELAYED] || 0);

    return {
      total,
      byStatus: byStatus as Record<typeof MilestoneStatus[keyof typeof MilestoneStatus], number>,
      byCategory: byCategory as Record<string, number>,
      onTrack,
      atRisk,
      overdue,
      averageProgress: avgProgressResult[0]?.avg || 0,
    };
  }
}

export const milestoneService = new MilestoneService();
