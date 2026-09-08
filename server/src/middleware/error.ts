import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { errors } from '../utils/apiResponse';
import { isProduction } from '../config';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn('Application error', {
      code: err.code,
      message: err.message,
      path: req.path,
      method: req.method,
    });
    if (err.code === 'VALIDATION_ERROR') {
      errors.validation(res, err.message, err.details);
      return;
    }
    errors.internal(res, err.message);
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: isProduction() ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });

  errors.internal(res, isProduction() ? 'An unexpected error occurred' : err.message);
}

export function notFoundHandler(req: Request, res: Response): void {
  errors.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
}
