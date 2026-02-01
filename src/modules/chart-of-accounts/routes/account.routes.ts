import { Router } from 'express';
import { accountController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '@/core/middleware/validate.middleware';
import { registry } from '@/config/swagger.config';
import { z } from 'zod';
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
  accountQuerySchema,
  seedChartSchema,
  accountListResponseSchema,
  singleAccountResponseSchema,
  accountTreeResponseSchema,
  seedResponseSchema,
  deleteAccountResponseSchema,
  accountTypeSchema,
} from '../schemas';

const router = Router();

// All routes require authentication and organization context
router.use(protect);
router.use(requireOrganization);

// ==================== OpenAPI Documentation ====================

// GET /chart-of-accounts
registry.registerPath({
  method: 'get',
  path: '/api/v1/chart-of-accounts',
  tags: ['Chart of Accounts'],
  summary: 'Get all accounts',
  description: 'Retrieve all accounts for the current organization with optional filters',
  security: [{ bearerAuth: [] }],
  request: {
    query: accountQuerySchema.shape.query,
  },
  responses: {
    200: {
      description: 'List of accounts',
      content: {
        'application/json': {
          schema: accountListResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Organization context required' },
  },
});

// GET /chart-of-accounts/tree
registry.registerPath({
  method: 'get',
  path: '/api/v1/chart-of-accounts/tree',
  tags: ['Chart of Accounts'],
  summary: 'Get account tree',
  description: 'Retrieve hierarchical tree structure of accounts',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Hierarchical account tree',
      content: {
        'application/json': {
          schema: accountTreeResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

// GET /chart-of-accounts/stats
registry.registerPath({
  method: 'get',
  path: '/api/v1/chart-of-accounts/stats',
  tags: ['Chart of Accounts'],
  summary: 'Get account statistics',
  description: 'Get statistics about the chart of accounts',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Account statistics',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              hasChartOfAccounts: z.boolean(),
              totalAccounts: z.number(),
              byType: z.record(z.number()),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

// GET /chart-of-accounts/leaf
registry.registerPath({
  method: 'get',
  path: '/api/v1/chart-of-accounts/leaf',
  tags: ['Chart of Accounts'],
  summary: 'Get leaf accounts',
  description: 'Get accounts that can have transactions (no children)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of leaf accounts',
      content: {
        'application/json': {
          schema: accountListResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

// GET /chart-of-accounts/by-type/:type
registry.registerPath({
  method: 'get',
  path: '/api/v1/chart-of-accounts/by-type/{type}',
  tags: ['Chart of Accounts'],
  summary: 'Get accounts by type',
  description: 'Get all accounts of a specific type (for dropdowns)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      type: accountTypeSchema,
    }),
  },
  responses: {
    200: {
      description: 'List of accounts by type',
      content: {
        'application/json': {
          schema: accountListResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

// POST /chart-of-accounts
registry.registerPath({
  method: 'post',
  path: '/api/v1/chart-of-accounts',
  tags: ['Chart of Accounts'],
  summary: 'Create account',
  description: 'Create a new account. Requires owner or admin role.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createAccountSchema.shape.body,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Account created',
      content: {
        'application/json': {
          schema: singleAccountResponseSchema,
        },
      },
    },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Insufficient permissions' },
    409: { description: 'Conflict - Account code already exists' },
  },
});

// POST /chart-of-accounts/seed
registry.registerPath({
  method: 'post',
  path: '/api/v1/chart-of-accounts/seed',
  tags: ['Chart of Accounts'],
  summary: 'Seed default chart',
  description: 'Seed the default chart of accounts. Owner only.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: seedChartSchema.shape.body,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Chart seeded',
      content: {
        'application/json': {
          schema: seedResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Owner only' },
    409: { description: 'Conflict - Chart already exists' },
  },
});

// GET /chart-of-accounts/:id
registry.registerPath({
  method: 'get',
  path: '/api/v1/chart-of-accounts/{id}',
  tags: ['Chart of Accounts'],
  summary: 'Get account by ID',
  description: 'Get a single account by its ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: accountIdParamSchema.shape.params,
  },
  responses: {
    200: {
      description: 'Account details',
      content: {
        'application/json': {
          schema: singleAccountResponseSchema,
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Account not found' },
  },
});

// PUT /chart-of-accounts/:id
registry.registerPath({
  method: 'put',
  path: '/api/v1/chart-of-accounts/{id}',
  tags: ['Chart of Accounts'],
  summary: 'Update account',
  description: 'Update an account. Requires owner or admin role.',
  security: [{ bearerAuth: [] }],
  request: {
    params: accountIdParamSchema.shape.params,
    body: {
      content: {
        'application/json': {
          schema: updateAccountSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Account updated',
      content: {
        'application/json': {
          schema: singleAccountResponseSchema,
        },
      },
    },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Insufficient permissions' },
    404: { description: 'Account not found' },
  },
});

// DELETE /chart-of-accounts/:id
registry.registerPath({
  method: 'delete',
  path: '/api/v1/chart-of-accounts/{id}',
  tags: ['Chart of Accounts'],
  summary: 'Archive account',
  description: 'Archive (soft delete) an account. Requires owner or admin role.',
  security: [{ bearerAuth: [] }],
  request: {
    params: accountIdParamSchema.shape.params,
  },
  responses: {
    200: {
      description: 'Account archived',
      content: {
        'application/json': {
          schema: deleteAccountResponseSchema,
        },
      },
    },
    400: { description: 'Cannot archive - has active children' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Insufficient permissions' },
    404: { description: 'Account not found' },
  },
});

// ==================== Route Definitions ====================

// Order matters - specific routes before parameterized routes

// GET /chart-of-accounts/tree
router.get('/tree', accountController.getAccountTree);

// GET /chart-of-accounts/stats
router.get('/stats', accountController.getAccountStats);

// GET /chart-of-accounts/leaf
router.get('/leaf', accountController.getLeafAccounts);

// GET /chart-of-accounts/by-type/:type
router.get('/by-type/:type', accountController.getAccountsByType);

// POST /chart-of-accounts/seed
router.post('/seed', validateBody(seedChartSchema.shape.body), accountController.seedChart);

// GET /chart-of-accounts
router.get('/', validateQuery(accountQuerySchema.shape.query), accountController.getAccounts);

// POST /chart-of-accounts
router.post('/', validateBody(createAccountSchema.shape.body), accountController.createAccount);

// GET /chart-of-accounts/:id
router.get('/:id', validateParams(accountIdParamSchema.shape.params), accountController.getAccount);

// PUT /chart-of-accounts/:id
router.put(
  '/:id',
  validateParams(accountIdParamSchema.shape.params),
  validateBody(updateAccountSchema.shape.body),
  accountController.updateAccount
);

// DELETE /chart-of-accounts/:id
router.delete(
  '/:id',
  validateParams(accountIdParamSchema.shape.params),
  accountController.archiveAccount
);

export default router;
