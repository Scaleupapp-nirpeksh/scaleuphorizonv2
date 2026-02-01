import { Router } from 'express';
import { customerController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

// Special routes (before :id)
router.get('/active-subscribers', customerController.getActiveSubscribers);
router.get('/churned', customerController.getChurnedCustomers);
router.get('/top', customerController.getTopCustomers);

// CRUD
router.get('/', validateQuery(customerQuerySchema.shape.query), customerController.getCustomers);
router.post('/', validateBody(createCustomerSchema.shape.body), customerController.createCustomer);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', validateBody(updateCustomerSchema.shape.body), customerController.updateCustomer);
router.delete('/:id', customerController.archiveCustomer);

export default router;
