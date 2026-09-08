import { Request, Response, NextFunction } from 'express';
import { requireRole } from './rbac';

/**
 * Requires a valid JWT AND role === 'admin'.
 * Now delegates to the unified requireRole middleware.
 */
export const adminMiddleware = requireRole('admin');
