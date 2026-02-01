import { Router } from 'express';
import { vendorController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware';
import {
  createVendorSchema,
  updateVendorSchema,
  vendorQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

// Special routes (before :id)
router.get('/top', vendorController.getTopVendors);

// CRUD
router.get('/', validateQuery(vendorQuerySchema.shape.query), vendorController.getVendors);
router.post('/', validateBody(createVendorSchema.shape.body), vendorController.createVendor);
router.get('/:id', vendorController.getVendorById);
router.put('/:id', validateBody(updateVendorSchema.shape.body), vendorController.updateVendor);
router.delete('/:id', vendorController.archiveVendor);

export default router;
