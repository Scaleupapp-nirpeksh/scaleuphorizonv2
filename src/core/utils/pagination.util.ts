import { Pagination } from '../constants';
import type { PaginationParams, PaginatedResponse } from '../types';

/**
 * Parse pagination parameters from query string
 */
export const parsePaginationParams = (query: Record<string, unknown>): PaginationParams => {
  const page = Math.max(1, parseInt(query.page as string, 10) || Pagination.DEFAULT_PAGE);
  const limit = Math.min(
    Pagination.MAX_LIMIT,
    Math.max(1, parseInt(query.limit as string, 10) || Pagination.DEFAULT_LIMIT)
  );
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = ((query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  return { page, limit, sortBy, sortOrder };
};

/**
 * Calculate skip value for MongoDB queries
 */
export const calculateSkip = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Build pagination metadata
 */
export const buildPaginationMeta = <T>(
  _data: T[],
  totalCount: number,
  params: PaginationParams
): PaginatedResponse<T>['pagination'] => {
  const totalPages = Math.ceil(totalCount / params.limit);

  return {
    page: params.page,
    limit: params.limit,
    totalPages,
    totalCount,
    hasNextPage: params.page < totalPages,
    hasPrevPage: params.page > 1,
  };
};

/**
 * Create paginated response object
 */
export const createPaginatedResponse = <T>(
  data: T[],
  totalCount: number,
  params: PaginationParams
): PaginatedResponse<T> => {
  return {
    data,
    pagination: buildPaginationMeta(data, totalCount, params),
  };
};

/**
 * Build MongoDB sort object from params
 */
export const buildSortObject = (params: PaginationParams): Record<string, 1 | -1> => {
  return {
    [params.sortBy || 'createdAt']: params.sortOrder === 'asc' ? 1 : -1,
  };
};

/**
 * Apply pagination to a Mongoose query
 */
interface PaginatableQuery<T> {
  skip: (n: number) => PaginatableQuery<T>;
  limit: (n: number) => PaginatableQuery<T>;
  sort: (s: Record<string, 1 | -1>) => T;
}

export const applyPagination = <T>(
  query: PaginatableQuery<T>,
  params: PaginationParams
): T => {
  const skip = calculateSkip(params.page, params.limit);
  const sortObject = buildSortObject(params);

  return query.skip(skip).limit(params.limit).sort(sortObject);
};

export default {
  parsePaginationParams,
  calculateSkip,
  buildPaginationMeta,
  createPaginatedResponse,
  buildSortObject,
  applyPagination,
};
