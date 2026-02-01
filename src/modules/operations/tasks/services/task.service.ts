/**
 * Task Service
 *
 * Business logic for task management
 */

import { Types } from 'mongoose';
import { Task, ITask, ITaskComment } from '../models';
import { TaskStatus, TaskPriority, TaskCategory, isValidTaskStatusTransition } from '../../constants';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryInput,
  AddCommentInput,
  UpdateCommentInput,
  AddReminderInput,
  BulkUpdateInput,
  UpdateStatusInput,
} from '../schemas';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { TaskStats } from '../../types';

export class TaskService {
  /**
   * Create a new task
   */
  async create(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTaskInput
  ): Promise<ITask> {
    // If parent task specified, validate it exists
    if (input.parentTask) {
      const parentTask = await Task.findOne({
        _id: new Types.ObjectId(input.parentTask),
        organization: organizationId,
        isArchived: false,
      });

      if (!parentTask) {
        throw new NotFoundError('Parent task not found');
      }
    }

    const task = new Task({
      organization: organizationId,
      ...input,
      assignee: input.assignee ? new Types.ObjectId(input.assignee) : undefined,
      parentTask: input.parentTask ? new Types.ObjectId(input.parentTask) : undefined,
      linkedMilestone: input.linkedMilestone ? new Types.ObjectId(input.linkedMilestone) : undefined,
      linkedMeeting: input.linkedMeeting ? new Types.ObjectId(input.linkedMeeting) : undefined,
      watchers: input.watchers?.map(id => new Types.ObjectId(id)),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      reminders: input.reminders?.map(r => ({
        ...r,
        reminderDate: new Date(r.reminderDate),
        sent: false,
      })),
      reporter: userId,
      createdBy: userId,
    });

    await task.save();

    // If this is a subtask, add to parent's subtasks array
    if (input.parentTask) {
      await Task.updateOne(
        { _id: new Types.ObjectId(input.parentTask) },
        { $addToSet: { subtasks: task._id } }
      );
    }

    return task;
  }

  /**
   * Get all tasks for an organization
   */
  async findAll(
    organizationId: Types.ObjectId,
    query: TaskQueryInput
  ): Promise<{
    data: ITask[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const {
      status,
      priority,
      category,
      assignee,
      reporter,
      dueFrom,
      dueTo,
      isOverdue,
      hasNoAssignee,
      linkedMilestone,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, unknown> = {
      organization: organizationId,
      isArchived: false,
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignee) filter.assignee = new Types.ObjectId(assignee);
    if (reporter) filter.reporter = new Types.ObjectId(reporter);
    if (linkedMilestone) filter.linkedMilestone = new Types.ObjectId(linkedMilestone);
    if (hasNoAssignee) filter.assignee = { $exists: false };

    // Date range filter
    if (dueFrom || dueTo) {
      filter.dueDate = {};
      if (dueFrom) (filter.dueDate as Record<string, Date>).$gte = new Date(dueFrom);
      if (dueTo) (filter.dueDate as Record<string, Date>).$lte = new Date(dueTo);
    }

    // Overdue filter
    if (isOverdue) {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] };
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      filter.tags = { $in: tagArray };
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    const total = await Task.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    // Build sort options
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const data = await Task.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignee', 'firstName lastName email')
      .populate('reporter', 'firstName lastName email')
      .populate('linkedMilestone', 'title status')
      .lean()
      .exec();

    return {
      data: data as unknown as ITask[],
      pagination: { page, limit, total, pages },
    };
  }

  /**
   * Get a single task by ID
   */
  async findById(
    organizationId: Types.ObjectId,
    taskId: string
  ): Promise<ITask> {
    const task = await Task.findOne({
      _id: new Types.ObjectId(taskId),
      organization: organizationId,
    })
      .populate('assignee', 'firstName lastName email')
      .populate('reporter', 'firstName lastName email')
      .populate('comments.author', 'firstName lastName email')
      .populate('linkedMilestone', 'title status')
      .populate('linkedMeeting', 'title startTime')
      .populate('parentTask', 'title status')
      .populate('subtasks', 'title status priority');

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return task;
  }

  /**
   * Update a task
   */
  async update(
    organizationId: Types.ObjectId,
    taskId: string,
    userId: Types.ObjectId,
    input: UpdateTaskInput
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    if (task.isArchived) {
      throw new BadRequestError('Cannot update archived task');
    }

    // Validate status transition if status is being changed
    if (input.status && input.status !== task.status) {
      if (!isValidTaskStatusTransition(task.status, input.status)) {
        throw new BadRequestError(`Invalid status transition from ${task.status} to ${input.status}`);
      }
    }

    // Update fields
    Object.assign(task, {
      ...input,
      assignee: input.assignee === null ? undefined : (input.assignee ? new Types.ObjectId(input.assignee) : task.assignee),
      linkedMilestone: input.linkedMilestone === null ? undefined : (input.linkedMilestone ? new Types.ObjectId(input.linkedMilestone) : task.linkedMilestone),
      linkedMeeting: input.linkedMeeting === null ? undefined : (input.linkedMeeting ? new Types.ObjectId(input.linkedMeeting) : task.linkedMeeting),
      watchers: input.watchers?.map(id => new Types.ObjectId(id)) || task.watchers,
      dueDate: input.dueDate === null ? undefined : (input.dueDate ? new Date(input.dueDate) : task.dueDate),
      startDate: input.startDate === null ? undefined : (input.startDate ? new Date(input.startDate) : task.startDate),
      reminders: input.reminders?.map(r => ({
        ...r,
        reminderDate: new Date(r.reminderDate),
        sent: false,
      })) || task.reminders,
      updatedBy: userId,
    });

    await task.save();
    return task;
  }

  /**
   * Update task status
   */
  async updateStatus(
    organizationId: Types.ObjectId,
    taskId: string,
    userId: Types.ObjectId,
    input: UpdateStatusInput
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    if (task.isArchived) {
      throw new BadRequestError('Cannot update archived task');
    }

    if (!isValidTaskStatusTransition(task.status, input.status)) {
      throw new BadRequestError(`Invalid status transition from ${task.status} to ${input.status}`);
    }

    task.status = input.status;
    if (input.actualHours !== undefined) {
      task.actualHours = input.actualHours;
    }
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  /**
   * Archive a task
   */
  async archive(
    organizationId: Types.ObjectId,
    taskId: string,
    userId: Types.ObjectId
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    task.isArchived = true;
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  /**
   * Delete a task (permanently)
   */
  async delete(
    organizationId: Types.ObjectId,
    taskId: string
  ): Promise<void> {
    const task = await this.findById(organizationId, taskId);

    // Remove from parent's subtasks if it's a subtask
    if (task.parentTask) {
      await Task.updateOne(
        { _id: task.parentTask },
        { $pull: { subtasks: task._id } }
      );
    }

    // Delete all subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      await Task.deleteMany({ _id: { $in: task.subtasks } });
    }

    await Task.deleteOne({ _id: task._id });
  }

  // ============ Comments ============

  /**
   * Add a comment to a task
   */
  async addComment(
    organizationId: Types.ObjectId,
    taskId: string,
    userId: Types.ObjectId,
    input: AddCommentInput
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    const comment: ITaskComment = {
      content: input.content,
      author: userId,
      createdAt: new Date(),
      mentions: input.mentions?.map(id => new Types.ObjectId(id)),
      attachments: input.attachments,
    };

    if (!task.comments) {
      task.comments = [];
    }
    task.comments.push(comment);
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  /**
   * Update a comment
   */
  async updateComment(
    organizationId: Types.ObjectId,
    taskId: string,
    commentId: string,
    userId: Types.ObjectId,
    input: UpdateCommentInput
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    const comment = task.comments?.find(c => c._id?.toString() === commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Only author can edit
    if (comment.author.toString() !== userId.toString()) {
      throw new BadRequestError('Only comment author can edit');
    }

    comment.content = input.content;
    comment.updatedAt = new Date();
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    organizationId: Types.ObjectId,
    taskId: string,
    commentId: string,
    userId: Types.ObjectId
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    const commentIndex = task.comments?.findIndex(c => c._id?.toString() === commentId);
    if (commentIndex === undefined || commentIndex === -1) {
      throw new NotFoundError('Comment not found');
    }

    const comment = task.comments![commentIndex];
    // Only author can delete
    if (comment.author.toString() !== userId.toString()) {
      throw new BadRequestError('Only comment author can delete');
    }

    task.comments!.splice(commentIndex, 1);
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  // ============ Reminders ============

  /**
   * Add a reminder to a task
   */
  async addReminder(
    organizationId: Types.ObjectId,
    taskId: string,
    userId: Types.ObjectId,
    input: AddReminderInput
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    if (!task.reminders) {
      task.reminders = [];
    }

    task.reminders.push({
      reminderDate: new Date(input.reminderDate),
      reminderType: input.reminderType || 'in_app',
      sent: false,
    });
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  /**
   * Remove a reminder
   */
  async removeReminder(
    organizationId: Types.ObjectId,
    taskId: string,
    reminderIndex: number,
    userId: Types.ObjectId
  ): Promise<ITask> {
    const task = await this.findById(organizationId, taskId);

    if (!task.reminders || reminderIndex >= task.reminders.length) {
      throw new NotFoundError('Reminder not found');
    }

    task.reminders.splice(reminderIndex, 1);
    task.updatedBy = userId;

    await task.save();
    return task;
  }

  // ============ Bulk Operations ============

  /**
   * Bulk update tasks
   */
  async bulkUpdate(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: BulkUpdateInput
  ): Promise<{ updated: number }> {
    const { taskIds, updates } = input;

    const result = await Task.updateMany(
      {
        _id: { $in: taskIds.map(id => new Types.ObjectId(id)) },
        organization: organizationId,
        isArchived: false,
      },
      {
        $set: {
          ...updates,
          assignee: updates.assignee === null ? undefined : (updates.assignee ? new Types.ObjectId(updates.assignee) : undefined),
          updatedBy: userId,
          updatedAt: new Date(),
        },
      }
    );

    return { updated: result.modifiedCount };
  }

  // ============ My Tasks ============

  /**
   * Get tasks assigned to or reported by user
   */
  async getMyTasks(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    query: TaskQueryInput
  ): Promise<{
    data: ITask[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { page = 1, limit = 20, sortBy = 'dueDate', sortOrder = 'asc' } = query;

    const filter = {
      organization: organizationId,
      isArchived: false,
      $or: [
        { assignee: userId },
        { reporter: userId },
        { watchers: userId },
      ],
      status: { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
    };

    const total = await Task.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const data = await Task.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignee', 'firstName lastName email')
      .populate('linkedMilestone', 'title status')
      .lean()
      .exec();

    return {
      data: data as unknown as ITask[],
      pagination: { page, limit, total, pages },
    };
  }

  // ============ Statistics ============

  /**
   * Get task statistics
   */
  async getStats(organizationId: Types.ObjectId): Promise<TaskStats> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      byStatusResult,
      byPriorityResult,
      byCategoryResult,
      overdue,
      completedThisWeek,
      completedThisMonth,
      avgCompletionResult,
    ] = await Promise.all([
      Task.countDocuments({ organization: organizationId, isArchived: false }),

      Task.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: { organization: organizationId, isArchived: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      Task.countDocuments({
        organization: organizationId,
        isArchived: false,
        dueDate: { $lt: now },
        status: { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      }),

      Task.countDocuments({
        organization: organizationId,
        isArchived: false,
        status: TaskStatus.COMPLETED,
        completedAt: { $gte: startOfWeek },
      }),

      Task.countDocuments({
        organization: organizationId,
        isArchived: false,
        status: TaskStatus.COMPLETED,
        completedAt: { $gte: startOfMonth },
      }),

      Task.aggregate([
        {
          $match: {
            organization: organizationId,
            isArchived: false,
            status: TaskStatus.COMPLETED,
            completedAt: { $exists: true },
          },
        },
        {
          $project: {
            completionTime: {
              $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$completionTime' } } },
      ]),
    ]);

    // Convert aggregation results to records
    const byStatus = byStatusResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = byPriorityResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = byCategoryResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byStatus: byStatus as Record<typeof TaskStatus[keyof typeof TaskStatus], number>,
      byPriority: byPriority as Record<typeof TaskPriority[keyof typeof TaskPriority], number>,
      byCategory: byCategory as Record<typeof TaskCategory[keyof typeof TaskCategory], number>,
      overdue,
      completedThisWeek,
      completedThisMonth,
      averageCompletionTime: avgCompletionResult[0]?.avg,
    };
  }
}

export const taskService = new TaskService();
