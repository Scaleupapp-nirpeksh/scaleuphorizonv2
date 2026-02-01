import { Response } from 'express';
import { HttpStatus } from '../constants';
import type { ApiResponse, PaginatedResponse } from '../types';

/**
 * Standard success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = HttpStatus.OK,
  message?: string
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Success response with message only
 */
export const sendMessage = (
  res: Response,
  message: string,
  statusCode: number = HttpStatus.OK
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
  });
};

/**
 * Created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, HttpStatus.CREATED, message);
};

/**
 * No content response (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(HttpStatus.NO_CONTENT).send();
};

/**
 * Paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginatedResponse<T>['pagination'],
  statusCode: number = HttpStatus.OK
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
  });
};

/**
 * Error response
 */
export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: unknown
): Response => {
  const errorObj: { code: string; message: string; details?: unknown } = {
    code,
    message,
  };
  if (details !== undefined) {
    errorObj.details = details;
  }
  const response: ApiResponse = {
    success: false,
    error: errorObj,
  };
  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string }>,
  message: string = 'Validation failed'
): Response => {
  return sendError(res, 'VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, errors);
};

/**
 * Not found error response
 */
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return sendError(res, 'NOT_FOUND', `${resource} not found`, HttpStatus.NOT_FOUND);
};

/**
 * Unauthorized error response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Authentication required'
): Response => {
  return sendError(res, 'UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
};

/**
 * Forbidden error response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Access denied'
): Response => {
  return sendError(res, 'FORBIDDEN', message, HttpStatus.FORBIDDEN);
};

export default {
  sendSuccess,
  sendMessage,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
};
