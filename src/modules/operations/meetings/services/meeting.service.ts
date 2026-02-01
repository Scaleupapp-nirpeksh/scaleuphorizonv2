/**
 * Meeting Service
 *
 * Business logic for investor meeting management
 */

import { Types } from 'mongoose';
import { Meeting, IMeeting, IMeetingActionItem } from '../models';
import { MeetingStatus, ActionItemStatus } from '../../constants';
import {
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingQueryInput,
  CompleteMeetingInput,
  AddActionItemInput,
  UpdateActionItemInput,
  RescheduleInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { MeetingStats } from '../../types';

export class MeetingService {
  /**
   * Create a new meeting
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateMeetingInput
  ): Promise<IMeeting> {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    if (endTime <= startTime) {
      throw new BadRequestError('End time must be after start time');
    }

    const meeting = new Meeting({
      organization: organizationId,
      ...input,
      startTime,
      endTime,
      investor: input.investor ? new Types.ObjectId(input.investor) : undefined,
      round: input.round ? new Types.ObjectId(input.round) : undefined,
      attendees: input.attendees?.map(a => ({
        ...a,
        user: a.user ? new Types.ObjectId(a.user) : undefined,
        investor: a.investor ? new Types.ObjectId(a.investor) : undefined,
      })),
      reminders: input.reminders?.map(r => ({
        ...r,
        reminderDate: new Date(r.reminderDate),
        sent: false,
      })),
      createdBy: userId,
    });

    await meeting.save();
    return meeting;
  }

  /**
   * Get all meetings for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: MeetingQueryInput
  ): Promise<{
    data: IMeeting[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const {
      type,
      status,
      investor,
      round,
      startFrom,
      startTo,
      outcome,
      search,
      page = 1,
      limit = 20,
      sortBy = 'startTime',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (investor) filter.investor = new Types.ObjectId(investor);
    if (round) filter.round = new Types.ObjectId(round);
    if (outcome) filter.outcome = outcome;

    // Date range filter
    if (startFrom || startTo) {
      filter.startTime = {};
      if (startFrom) (filter.startTime as Record<string, Date>).$gte = new Date(startFrom);
      if (startTo) (filter.startTime as Record<string, Date>).$lte = new Date(startTo);
    }

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { agenda: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Meeting.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await Meeting.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('investor', 'name type email')
      .populate('round', 'name type status')
      .populate('attendees.user', 'firstName lastName email')
      .lean()
      .exec();

    return {
      data: data as unknown as IMeeting[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single meeting by ID
   */
  async findById(
    organizationId: Types.ObjectId,
    meetingId: string
  ): Promise<IMeeting> {
    const meeting = await Meeting.findOne({
      _id: new Types.ObjectId(meetingId),
      organization: organizationId,
    })
      .populate('investor', 'name type email phone')
      .populate('round', 'name type status raisedAmount targetAmount')
      .populate('attendees.user', 'firstName lastName email')
      .populate('actionItems.assignee', 'firstName lastName email')
      .populate('previousMeeting', 'title startTime outcome')
      .populate('followUpMeeting', 'title startTime status');

    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    return meeting;
  }

  /**
   * Update a meeting
   */
  async update(
    organizationId: Types.ObjectId,
    meetingId: string,
    userId: Types.ObjectId,
    input: UpdateMeetingInput
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    if (meeting.isArchived) {
      throw new BadRequestError('Cannot update archived meeting');
    }

    // Validate times if both are provided
    if (input.startTime && input.endTime) {
      if (new Date(input.endTime) <= new Date(input.startTime)) {
        throw new BadRequestError('End time must be after start time');
      }
    }

    // Update fields
    Object.assign(meeting, {
      ...input,
      startTime: input.startTime ? new Date(input.startTime) : meeting.startTime,
      endTime: input.endTime ? new Date(input.endTime) : meeting.endTime,
      investor: input.investor === null ? undefined : (input.investor ? new Types.ObjectId(input.investor) : meeting.investor),
      round: input.round === null ? undefined : (input.round ? new Types.ObjectId(input.round) : meeting.round),
      attendees: input.attendees?.map(a => ({
        ...a,
        user: a.user ? new Types.ObjectId(a.user) : undefined,
        investor: a.investor ? new Types.ObjectId(a.investor) : undefined,
      })) || meeting.attendees,
      followUpDate: input.followUpDate === null ? undefined : (input.followUpDate ? new Date(input.followUpDate) : meeting.followUpDate),
      reminders: input.reminders?.map(r => ({
        ...r,
        reminderDate: new Date(r.reminderDate),
        sent: false,
      })) || meeting.reminders,
      updatedBy: userId,
    });

    await meeting.save();
    return meeting;
  }

  /**
   * Complete a meeting with outcome
   */
  async complete(
    organizationId: Types.ObjectId,
    meetingId: string,
    userId: Types.ObjectId,
    input: CompleteMeetingInput
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestError('Meeting is already completed');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestError('Cannot complete a cancelled meeting');
    }

    meeting.status = MeetingStatus.COMPLETED;
    meeting.outcome = input.outcome;
    meeting.outcomeNotes = input.outcomeNotes;
    if (input.notes) {
      meeting.notes = input.notes;
    }
    if (input.followUpDate) {
      meeting.followUpDate = new Date(input.followUpDate);
    }
    if (input.actionItems) {
      meeting.actionItems = input.actionItems.map(ai => ({
        ...ai,
        assignee: ai.assignee ? new Types.ObjectId(ai.assignee) : undefined,
        dueDate: ai.dueDate ? new Date(ai.dueDate) : undefined,
        createdAt: new Date(),
      } as IMeetingActionItem));
    }
    meeting.updatedBy = userId;

    await meeting.save();
    return meeting;
  }

  /**
   * Cancel a meeting
   */
  async cancel(
    organizationId: Types.ObjectId,
    meetingId: string,
    userId: Types.ObjectId
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestError('Cannot cancel a completed meeting');
    }

    meeting.status = MeetingStatus.CANCELLED;
    meeting.updatedBy = userId;

    await meeting.save();
    return meeting;
  }

  /**
   * Reschedule a meeting
   */
  async reschedule(
    organizationId: Types.ObjectId,
    meetingId: string,
    userId: Types.ObjectId,
    input: RescheduleInput
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestError('Cannot reschedule a completed meeting');
    }

    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    if (endTime <= startTime) {
      throw new BadRequestError('End time must be after start time');
    }

    meeting.status = MeetingStatus.RESCHEDULED;
    meeting.startTime = startTime;
    meeting.endTime = endTime;
    if (input.location) meeting.location = input.location;
    if (input.meetingLink) meeting.meetingLink = input.meetingLink;
    if (input.notes) {
      meeting.notes = (meeting.notes || '') + '\n\n' + `[Rescheduled on ${new Date().toISOString()}] ${input.notes}`;
    }
    meeting.updatedBy = userId;

    await meeting.save();

    // Reset status to scheduled
    meeting.status = MeetingStatus.SCHEDULED;
    await meeting.save();

    return meeting;
  }

  /**
   * Archive a meeting
   */
  async archive(
    organizationId: Types.ObjectId,
    meetingId: string,
    userId: Types.ObjectId
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    meeting.isArchived = true;
    meeting.updatedBy = userId;

    await meeting.save();
    return meeting;
  }

  /**
   * Delete a meeting (permanently)
   */
  async delete(
    organizationId: Types.ObjectId,
    meetingId: string
  ): Promise<void> {
    const meeting = await this.findById(organizationId, meetingId);
    await Meeting.deleteOne({ _id: meeting._id });
  }

  // ============ Action Items ============

  /**
   * Add an action item to a meeting
   */
  async addActionItem(
    organizationId: Types.ObjectId,
    meetingId: string,
    userId: Types.ObjectId,
    input: AddActionItemInput
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    if (!meeting.actionItems) {
      meeting.actionItems = [];
    }

    meeting.actionItems.push({
      ...input,
      assignee: input.assignee ? new Types.ObjectId(input.assignee) : undefined,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      createdAt: new Date(),
    } as IMeetingActionItem);

    meeting.updatedBy = userId;
    await meeting.save();

    return meeting;
  }

  /**
   * Update an action item
   */
  async updateActionItem(
    organizationId: Types.ObjectId,
    meetingId: string,
    actionItemId: string,
    userId: Types.ObjectId,
    input: UpdateActionItemInput
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    const actionItem = meeting.actionItems?.find(ai => ai._id?.toString() === actionItemId);
    if (!actionItem) {
      throw new NotFoundError('Action item not found');
    }

    Object.assign(actionItem, {
      ...input,
      assignee: input.assignee === null ? undefined : (input.assignee ? new Types.ObjectId(input.assignee) : actionItem.assignee),
      dueDate: input.dueDate === null ? undefined : (input.dueDate ? new Date(input.dueDate) : actionItem.dueDate),
    });

    // Set completedAt if status changes to completed
    if (input.status === ActionItemStatus.COMPLETED && !actionItem.completedAt) {
      actionItem.completedAt = new Date();
    } else if (input.status !== ActionItemStatus.COMPLETED) {
      actionItem.completedAt = undefined;
    }

    meeting.updatedBy = userId;
    await meeting.save();

    return meeting;
  }

  /**
   * Delete an action item
   */
  async deleteActionItem(
    organizationId: Types.ObjectId,
    meetingId: string,
    actionItemId: string,
    userId: Types.ObjectId
  ): Promise<IMeeting> {
    const meeting = await this.findById(organizationId, meetingId);

    const actionItemIndex = meeting.actionItems?.findIndex(ai => ai._id?.toString() === actionItemId);
    if (actionItemIndex === undefined || actionItemIndex === -1) {
      throw new NotFoundError('Action item not found');
    }

    meeting.actionItems!.splice(actionItemIndex, 1);
    meeting.updatedBy = userId;
    await meeting.save();

    return meeting;
  }

  // ============ Specialized Queries ============

  /**
   * Get upcoming meetings
   */
  async getUpcoming(
    organizationId: Types.ObjectId
  ): Promise<{
    today: IMeeting[];
    thisWeek: IMeeting[];
    later: IMeeting[];
  }> {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const baseFilter = {
      organization: organizationId,
      isArchived: false,
      status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.CONFIRMED] },
      startTime: { $gte: now },
    };

    const [today, thisWeek, later] = await Promise.all([
      Meeting.find({
        ...baseFilter,
        startTime: { $gte: now, $lte: todayEnd },
      })
        .sort({ startTime: 1 })
        .limit(10)
        .populate('investor', 'name type')
        .lean(),

      Meeting.find({
        ...baseFilter,
        startTime: { $gt: todayEnd, $lte: weekEnd },
      })
        .sort({ startTime: 1 })
        .limit(20)
        .populate('investor', 'name type')
        .lean(),

      Meeting.find({
        ...baseFilter,
        startTime: { $gt: weekEnd },
      })
        .sort({ startTime: 1 })
        .limit(20)
        .populate('investor', 'name type')
        .lean(),
    ]);

    return {
      today: today as unknown as IMeeting[],
      thisWeek: thisWeek as unknown as IMeeting[],
      later: later as unknown as IMeeting[],
    };
  }

  /**
   * Get meetings with an investor
   */
  async getByInvestor(
    organizationId: Types.ObjectId,
    investorId: string
  ): Promise<IMeeting[]> {
    const meetings = await Meeting.find({
      organization: organizationId,
      investor: new Types.ObjectId(investorId),
      isArchived: false,
    })
      .sort({ startTime: -1 })
      .populate('round', 'name type')
      .lean()
      .exec();

    return meetings as unknown as IMeeting[];
  }

  // ============ Statistics ============

  /**
   * Get meeting statistics
   */
  async getStats(organizationId: Types.ObjectId): Promise<MeetingStats> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      byTypeResult,
      byStatusResult,
      byOutcomeResult,
      thisWeek,
      thisMonth,
      avgDurationResult,
    ] = await Promise.all([
      Meeting.countDocuments({ organization: organizationId, isArchived: false }),

      Meeting.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),

      Meeting.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Meeting.aggregate([
        { $match: { organization: organizationId, isArchived: false, outcome: { $exists: true } } },
        { $group: { _id: '$outcome', count: { $sum: 1 } } },
      ]),

      Meeting.countDocuments({
        organization: organizationId,
        isArchived: false,
        startTime: { $gte: startOfWeek },
      }),

      Meeting.countDocuments({
        organization: organizationId,
        isArchived: false,
        startTime: { $gte: startOfMonth },
      }),

      Meeting.aggregate([
        {
          $match: {
            organization: organizationId,
            isArchived: false,
          },
        },
        {
          $project: {
            duration: { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 1000 * 60] },
          },
        },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
    ]);

    // Convert aggregation results to records
    const byType = byTypeResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = byStatusResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byOutcome = byOutcomeResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byType: byType as Record<string, number>,
      byStatus: byStatus as Record<string, number>,
      byOutcome: byOutcome as Record<string, number>,
      thisWeek,
      thisMonth,
      averageDuration: avgDurationResult[0]?.avg,
    };
  }
}

export const meetingService = new MeetingService();
