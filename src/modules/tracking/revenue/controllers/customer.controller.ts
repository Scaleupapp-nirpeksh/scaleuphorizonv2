import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { customerService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from '../schemas';

class CustomerController {
  /**
   * Create a new customer
   * POST /tracking/customers
   */
  createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const customer = await customerService.createCustomer(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateCustomerInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: customer,
    });
  });

  /**
   * Get customers with filtering
   * GET /tracking/customers
   */
  getCustomers = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await customerService.getCustomers(
      organizationId,
      req.query as unknown as CustomerQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get customer by ID
   * GET /tracking/customers/:id
   */
  getCustomerById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const customer = await customerService.getCustomerById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: customer,
    });
  });

  /**
   * Update customer
   * PUT /tracking/customers/:id
   */
  updateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const customer = await customerService.updateCustomer(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateCustomerInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: customer,
    });
  });

  /**
   * Archive customer
   * DELETE /tracking/customers/:id
   */
  archiveCustomer = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    await customerService.archiveCustomer(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Customer archived successfully',
    });
  });

  /**
   * Get active subscribers
   * GET /tracking/customers/active-subscribers
   */
  getActiveSubscribers = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const customers = await customerService.getActiveSubscribers(organizationId, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: customers,
    });
  });

  /**
   * Get churned customers
   * GET /tracking/customers/churned
   */
  getChurnedCustomers = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const customers = await customerService.getChurnedCustomers(organizationId, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: customers,
    });
  });

  /**
   * Get top customers by revenue
   * GET /tracking/customers/top
   */
  getTopCustomers = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const customers = await customerService.getTopCustomers(organizationId, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: customers,
    });
  });
}

export const customerController = new CustomerController();
