import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates the need for try-catch in every controller
 */
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
};

/**
 * Alternative syntax using higher-order function
 */
export const catchAsync = asyncHandler;

/**
 * Wrap multiple handlers with async error catching
 */
export const wrapAsync = (
  handlers: Array<(req: Request, res: Response, next: NextFunction) => Promise<unknown>>
): RequestHandler[] => {
  return handlers.map((handler) => asyncHandler(handler));
};

export default asyncHandler;
