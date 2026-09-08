import { Response } from 'express';
import crypto from 'crypto';
import type { ApiResponse, ApiError, ErrorResponse, ResponseMeta, PaginationMeta } from '../types';

function createMeta(pagination?: PaginationMeta): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    ...(pagination ? { pagination } : {}),
  };
}

export function success<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  pagination?: PaginationMeta
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: createMeta(pagination),
  };
  return res.status(statusCode).json(response);
}

export function created<T>(res: Response, data: T, message = 'Created successfully'): Response {
  return success(res, data, message, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function error(
  res: Response,
  code: ApiError['code'],
  message: string,
  statusCode = 500,
  details?: Record<string, unknown>
): Response {
  const response: ErrorResponse = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
    meta: createMeta(),
  };
  return res.status(statusCode).json(response);
}

export const errors = {
  validation: (res: Response, message: string, details?: Record<string, unknown>) =>
    error(res, 'VALIDATION_ERROR', message, 400, details),
  unauthorized: (res: Response, message = 'Authentication required') =>
    error(res, 'UNAUTHORIZED', message, 401),
  forbidden: (res: Response, message = 'Access denied') => error(res, 'FORBIDDEN', message, 403),
  notFound: (res: Response, message = 'Resource not found') =>
    error(res, 'NOT_FOUND', message, 404),
  conflict: (res: Response, message: string) => error(res, 'CONFLICT', message, 409),
  rateLimited: (res: Response, message = 'Too many requests') =>
    error(res, 'RATE_LIMITED', message, 429),
  aiError: (res: Response, message = 'AI service unavailable') =>
    error(res, 'AI_SERVICE_ERROR', message, 502),
  database: (res: Response, message = 'Database error') =>
    error(res, 'DATABASE_ERROR', message, 500),
  internal: (res: Response, message = 'Internal server error') =>
    error(res, 'INTERNAL_ERROR', message, 500),
};

export function paginate<T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  message = 'Success'
): Response {
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationMeta = { page, limit, total, totalPages };
  return success(res, items, message, 200, pagination);
}
