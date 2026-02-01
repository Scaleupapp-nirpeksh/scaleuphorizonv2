import { Request, Response, NextFunction } from 'express';
import { config } from '@/config';
import { AppError } from '../errors';
import { HttpStatus } from '../constants';

/**
 * Not found handler - for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (config.isDevelopment) {
    console.error('Error:', err);
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.message,
      },
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
      },
    });
    return;
  }

  // Handle duplicate key errors
  if ((err as unknown as Record<string, unknown>).code === 11000) {
    res.status(HttpStatus.CONFLICT).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Duplicate entry',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
    });
    return;
  }

  // Default server error
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction
        ? 'An unexpected error occurred'
        : err.message,
      ...(config.isDevelopment && { stack: err.stack }),
    },
  });
};

/**
 * Async error wrapper for uncaught rejections
 */
export const unhandledRejectionHandler = (reason: unknown): void => {
  console.error('Unhandled Rejection:', reason);
  // In production, you might want to gracefully shutdown
  if (config.isProduction) {
    process.exit(1);
  }
};

/**
 * Uncaught exception handler
 */
export const uncaughtExceptionHandler = (error: Error): void => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
};

export default {
  notFoundHandler,
  errorHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
};
