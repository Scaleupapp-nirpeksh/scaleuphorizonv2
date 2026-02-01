/**
 * Task Controller
 *
 * Handles HTTP requests for task management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { taskService } from '../services';
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
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';

class TaskController {
  // ============ Task CRUD ============

  /**
   * Create a new task
   * POST /operations/tasks
   */
  createTask = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as CreateTaskInput;
    const task = await taskService.create(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: task,
      message: 'Task created successfully',
    });
  });

  /**
   * Get all tasks
   * GET /operations/tasks
   */
  getTasks = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as TaskQueryInput;
    const result = await taskService.findAll(organizationId, {
      ...query,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get task by ID
   * GET /operations/tasks/:id
   */
  getTaskById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const task = await taskService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
    });
  });

  /**
   * Update task
   * PUT /operations/tasks/:id
   */
  updateTask = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateTaskInput;
    const task = await taskService.update(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
      message: 'Task updated successfully',
    });
  });

  /**
   * Delete task
   * DELETE /operations/tasks/:id
   */
  deleteTask = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const role = req.organizationContext?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Only owners and admins can delete tasks');
    }

    await taskService.delete(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Task deleted successfully',
    });
  });

  /**
   * Archive task
   * POST /operations/tasks/:id/archive
   */
  archiveTask = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const task = await taskService.archive(
      organizationId,
      id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
      message: 'Task archived successfully',
    });
  });

  // ============ Status Updates ============

  /**
   * Update task status
   * PUT /operations/tasks/:id/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateStatusInput;
    const task = await taskService.updateStatus(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
      message: 'Task status updated successfully',
    });
  });

  // ============ Comments ============

  /**
   * Add comment to task
   * POST /operations/tasks/:id/comments
   */
  addComment = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as AddCommentInput;
    const task = await taskService.addComment(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: task,
      message: 'Comment added successfully',
    });
  });

  /**
   * Get task comments
   * GET /operations/tasks/:id/comments
   */
  getComments = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const task = await taskService.findById(organizationId, id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: task.comments || [],
    });
  });

  /**
   * Update comment
   * PUT /operations/tasks/:id/comments/:commentId
   */
  updateComment = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, commentId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as UpdateCommentInput;
    const task = await taskService.updateComment(
      organizationId,
      id,
      commentId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
      message: 'Comment updated successfully',
    });
  });

  /**
   * Delete comment
   * DELETE /operations/tasks/:id/comments/:commentId
   */
  deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, commentId } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const task = await taskService.deleteComment(
      organizationId,
      id,
      commentId,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
      message: 'Comment deleted successfully',
    });
  });

  // ============ Reminders ============

  /**
   * Add reminder to task
   * POST /operations/tasks/:id/reminders
   */
  addReminder = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as AddReminderInput;
    const task = await taskService.addReminder(
      organizationId,
      id,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: task,
      message: 'Reminder added successfully',
    });
  });

  /**
   * Remove reminder
   * DELETE /operations/tasks/:id/reminders/:reminderIndex
   */
  removeReminder = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;
    const { id, reminderIndex } = req.params;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const task = await taskService.removeReminder(
      organizationId,
      id,
      parseInt(reminderIndex, 10),
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: task,
      message: 'Reminder removed successfully',
    });
  });

  // ============ Bulk Operations ============

  /**
   * Bulk update tasks
   * PUT /operations/tasks/bulk
   */
  bulkUpdate = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const input = req.body as BulkUpdateInput;
    const result = await taskService.bulkUpdate(
      organizationId,
      new Types.ObjectId(userId),
      input
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
      message: `${result.updated} tasks updated successfully`,
    });
  });

  // ============ My Tasks ============

  /**
   * Get my tasks
   * GET /operations/tasks/my
   */
  getMyTasks = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      throw new ForbiddenError('Organization context required');
    }

    const query = req.query as unknown as TaskQueryInput;
    const result = await taskService.getMyTasks(
      organizationId,
      new Types.ObjectId(userId),
      query
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  // ============ Statistics ============

  /**
   * Get task statistics
   * GET /operations/tasks/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const stats = await taskService.getStats(organizationId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: stats,
    });
  });
}

export const taskController = new TaskController();
