import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { vendorService } from '../services';
import { asyncHandler } from '@/core/utils';
import { ForbiddenError } from '@/core/errors';
import { HttpStatus } from '@/core/constants';
import { CreateVendorInput, UpdateVendorInput, VendorQueryInput } from '../schemas';

class VendorController {
  /**
   * Create a new vendor
   * POST /tracking/vendors
   */
  createVendor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const vendor = await vendorService.createVendor(
      organizationId,
      new Types.ObjectId(userId),
      req.body as CreateVendorInput
    );

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: vendor,
    });
  });

  /**
   * Get vendors with filtering
   * GET /tracking/vendors
   */
  getVendors = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const result = await vendorService.getVendors(
      organizationId,
      req.query as unknown as VendorQueryInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get vendor by ID
   * GET /tracking/vendors/:id
   */
  getVendorById = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const vendor = await vendorService.getVendorById(organizationId, req.params.id);

    res.status(HttpStatus.OK).json({
      success: true,
      data: vendor,
    });
  });

  /**
   * Update vendor
   * PUT /tracking/vendors/:id
   */
  updateVendor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    const vendor = await vendorService.updateVendor(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId),
      req.body as UpdateVendorInput
    );

    res.status(HttpStatus.OK).json({
      success: true,
      data: vendor,
    });
  });

  /**
   * Archive vendor
   * DELETE /tracking/vendors/:id
   */
  archiveVendor = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) throw new ForbiddenError('Organization context required');

    await vendorService.archiveVendor(
      organizationId,
      req.params.id,
      new Types.ObjectId(userId)
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Vendor archived successfully',
    });
  });

  /**
   * Get top vendors
   * GET /tracking/vendors/top
   */
  getTopVendors = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.organizationContext?.organizationId;
    if (!organizationId) throw new ForbiddenError('Organization context required');

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const vendors = await vendorService.getTopVendors(organizationId, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: vendors,
    });
  });
}

export const vendorController = new VendorController();
