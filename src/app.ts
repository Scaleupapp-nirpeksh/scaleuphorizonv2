import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import crypto from 'crypto';

import { config } from '@/config';
import { generateOpenAPIDocument } from '@/config/swagger.config';
import { notFoundHandler, errorHandler } from '@/core/middleware';
import { HttpStatus } from '@/core/constants';

// Module routes
import { authRoutes } from '@/modules/auth';
import { organizationRoutes } from '@/modules/organization';
import { chartOfAccountsRoutes } from '@/modules/chart-of-accounts';
import { planningRoutes } from '@/modules/planning';
import { trackingRoutes } from '@/modules/tracking';
import { projectionRoutes } from '@/modules/projection';
import { analysisRoutes } from '@/modules/analysis';
import { fundraisingRoutes } from '@/modules/fundraising';
import { reportingRoutes } from '@/modules/reporting';
import { operationsRoutes } from '@/modules/operations';
import { intelligenceRoutes } from '@/modules/intelligence';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Organization-Id'],
    })
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Request ID middleware
  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    req.startTime = Date.now();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
        version: '3.0.0',
      },
    });
  });

  // API info endpoint
  app.get(`/api/${config.apiVersion}`, (_req, res) => {
    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        name: 'ScaleUp Horizon API',
        version: '3.0.0',
        apiVersion: config.apiVersion,
        documentation: `/api/${config.apiVersion}/docs`,
      },
    });
  });

  // Swagger documentation
  const openApiDocument = generateOpenAPIDocument();
  app.use(
    `/api/${config.apiVersion}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'ScaleUp Horizon API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  // OpenAPI JSON endpoint
  app.get(`/api/${config.apiVersion}/docs.json`, (_req, res) => {
    res.json(openApiDocument);
  });

  // Mount API routes
  app.use(`/api/${config.apiVersion}/auth`, authRoutes);
  app.use(`/api/${config.apiVersion}/organizations`, organizationRoutes);
  app.use(`/api/${config.apiVersion}/chart-of-accounts`, chartOfAccountsRoutes);
  app.use(`/api/${config.apiVersion}/planning`, planningRoutes);
  app.use(`/api/${config.apiVersion}/tracking`, trackingRoutes);
  app.use(`/api/${config.apiVersion}/projection`, projectionRoutes);
  app.use(`/api/${config.apiVersion}/analysis`, analysisRoutes);
  app.use(`/api/${config.apiVersion}/fundraising`, fundraisingRoutes);
  app.use(`/api/${config.apiVersion}/reporting`, reportingRoutes);
  app.use(`/api/${config.apiVersion}/operations`, operationsRoutes);
  app.use(`/api/${config.apiVersion}/intelligence`, intelligenceRoutes);

  // Module status endpoint
  app.get(`/api/${config.apiVersion}/modules`, (_req, res) => {
    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        active: ['auth', 'organization', 'chart-of-accounts', 'planning', 'tracking', 'projection', 'analysis', 'fundraising', 'reporting', 'operations', 'intelligence'],
        planned: [],
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
