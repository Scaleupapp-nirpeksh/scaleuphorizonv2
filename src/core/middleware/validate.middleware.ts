import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodType } from 'zod';
import { ValidationError } from '../errors';
import { asyncHandler } from '../utils';

/**
 * Validate request against Zod schema
 * Schema should have shape: { body?, query?, params? }
 */
export const validate = (schema: AnyZodObject) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError(validationErrors);
      }
      throw error;
    }
  });
};

/**
 * Validate only request body
 * Accepts ZodType to support schemas with .refine() or .transform()
 */
export const validateBody = (schema: ZodType<unknown>) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError(validationErrors);
      }
      throw error;
    }
  });
};

/**
 * Validate only query parameters
 * Accepts ZodType to support schemas with .refine() or .transform()
 */
export const validateQuery = (schema: ZodType<unknown>) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = (await schema.parseAsync(req.query)) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: `query.${err.path.join('.')}`,
          message: err.message,
        }));
        throw new ValidationError(validationErrors);
      }
      throw error;
    }
  });
};

/**
 * Validate only route parameters
 * Accepts ZodType to support schemas with .refine() or .transform()
 */
export const validateParams = (schema: ZodType<unknown>) => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = (await schema.parseAsync(req.params)) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: `params.${err.path.join('.')}`,
          message: err.message,
        }));
        throw new ValidationError(validationErrors);
      }
      throw error;
    }
  });
};

export default { validate, validateBody, validateQuery, validateParams };
