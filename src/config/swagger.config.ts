import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { config } from './index';

// Create the OpenAPI registry
export const registry = new OpenAPIRegistry();

// Generate OpenAPI document
export const generateOpenAPIDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'ScaleUp Horizon API',
      version: '3.0.0',
      description: `
# ScaleUp Horizon Backend API

A comprehensive financial management platform for startups with:
- **Planning**: Budgets, headcount plans, revenue plans, scenarios
- **Tracking**: Expenses, revenue, bank integration
- **Projections**: Cash flow, runway, forecasting
- **Analysis**: Variance, trends, unit economics
- **Fundraising**: Rounds, investors, cap table, ESOP
- **Reporting**: Dashboards, investor reports, statements
- **Intelligence**: ML categorization, anomaly detection, predictions

## Authentication
All endpoints (except auth) require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Multi-tenancy
Most endpoints are scoped to an organization. After login, set the active organization
using \`POST /api/v1/organizations/:id/switch\`.
      `,
      contact: {
        name: 'ScaleUp Team',
        email: 'support@scaleup.com',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/${config.apiVersion}`,
        description: 'Development server',
      },
      {
        url: `https://api.scaleup.com/api/${config.apiVersion}`,
        description: 'Production server',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  });
};

// Register security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT access token',
});

// Common response schemas
export const commonResponses = {
  unauthorized: {
    description: 'Unauthorized - Invalid or missing token',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Authentication required' },
              },
            },
          },
        },
      },
    },
  },
  forbidden: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'FORBIDDEN' },
                message: { type: 'string', example: 'Access denied' },
              },
            },
          },
        },
      },
    },
  },
  notFound: {
    description: 'Not Found - Resource does not exist',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: 'Resource not found' },
              },
            },
          },
        },
      },
    },
  },
  validationError: {
    description: 'Validation Error - Invalid request data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  serverError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INTERNAL_ERROR' },
                message: { type: 'string', example: 'An unexpected error occurred' },
              },
            },
          },
        },
      },
    },
  },
};

export default { registry, generateOpenAPIDocument, commonResponses };
