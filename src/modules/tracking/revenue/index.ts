// Models
export { Customer, type ICustomer, type ICustomerModel, type IAddress } from './models';
export { RevenueEntry, type IRevenueEntry, type IRevenueEntryModel } from './models';

// Schemas
export {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerQueryInput,
  createRevenueEntrySchema,
  updateRevenueEntrySchema,
  receiveRevenueEntrySchema,
  cancelRevenueEntrySchema,
  revenueEntryQuerySchema,
  type CreateRevenueEntryInput,
  type UpdateRevenueEntryInput,
  type ReceiveRevenueEntryInput,
  type CancelRevenueEntryInput,
  type RevenueEntryQueryInput,
} from './schemas';

// Services
export { customerService, CustomerService } from './services';
export { revenueEntryService, RevenueEntryService } from './services';

// Controllers
export { customerController } from './controllers';
export { revenueEntryController } from './controllers';

// Routes
export { revenueRoutes } from './routes';
