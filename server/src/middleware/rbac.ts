import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { getDb } from '../db/connection';
import * as schema from '../db/schema-sqlite';
import { eq } from 'drizzle-orm';
import { verifyCredentials } from '@supabase/server/core';
import { errors } from '../utils/apiResponse';
import { getUserRoleInfo, UserRoleInfo } from '../utils/rbac';

const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

// Shared cache for Supabase UUID → local user ID mapping
const userIdCache = new Map<string, number>();

// Extend Express Request to include user and role info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      userRole?: UserRoleInfo;
    }
  }
}

function extractCredentials(req: Request) {
  const authHeader = req.headers['authorization'] || '';
  const apikey = (req.headers['apikey'] as string | undefined) || SUPABASE_PUBLISHABLE_KEY;
  return {
    token: authHeader.startsWith('Bearer ') ? authHeader.slice(7) || null : null,
    apikey: apikey || null,
  };
}

async function resolveSupabaseUser(payload: any): Promise<JwtPayload | null> {
  const supabaseId = payload.sub || '';
  const email = payload.email || '';
  let userId = 0;

  if (supabaseId && userIdCache.has(supabaseId)) {
    userId = userIdCache.get(supabaseId)!;
  } else if (email) {
    try {
      const db = getDb();
      const [existing] = await (db as any)
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (existing) {
        userId = existing.user_id;
        if (supabaseId) userIdCache.set(supabaseId, userId);
      }
    } catch {
      // DB lookup failed
    }
  }

  return {
    email,
    userId,
    id: userId,
    sub: supabaseId,
    iat: payload.iat,
    exp: payload.exp,
    role: payload.role,
    roleId: payload.roleId,
    permissions: payload.permissions,
  };
}

/**
 * Core authentication middleware. Verifies JWT and resolves user.
 * Used as a building block for requireRole and requirePermission.
 */
export async function authenticate(req: Request, res: Response): Promise<JwtPayload | null> {
  const credentials = extractCredentials(req);

  if (!credentials.token) {
    return null;
  }

  // Try Supabase JWKS verification first
  if (credentials.token) {
    try {
      const { data, error } = await verifyCredentials(credentials, { auth: 'user' });
      if (!error && data) {
        const session = await resolveSupabaseUser(data as any);
        if (session && session.userId === 0 && session.email) {
          await resolveUserId(session);
        }
        if (session && session.userId !== 0) {
          return session;
        }
      }
    } catch {
      // JWKS verification failed, fall through
    }
  }

  // Fall back to legacy JWT verification
  const legacySession = verifyToken(credentials.token);
  if (legacySession) {
    if (legacySession.userId === 0 && legacySession.email) {
      await resolveUserId(legacySession);
    }
    if (legacySession.userId !== 0) {
      return legacySession;
    }
  }

  return null;
}

async function resolveUserId(session: JwtPayload): Promise<void> {
  const email = session.email || '';
  const supabaseId = session.sub || '';

  if (supabaseId && userIdCache.has(supabaseId)) {
    session.userId = userIdCache.get(supabaseId)!;
    session.id = session.userId;
    return;
  }

  if (email) {
    try {
      const db = getDb();
      const [existing] = await (db as any)
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      if (existing) {
        session.userId = existing.user_id;
        session.id = existing.user_id;
        if (supabaseId) userIdCache.set(supabaseId, existing.user_id);
      }
    } catch {
      // DB lookup failed
    }
  }
}

/**
 * Middleware: requires user to have one of the specified roles.
 * Usage: requireRole('admin'), requireRole('admin', 'moderator')
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await authenticate(req, res);
    if (!session) {
      errors.unauthorized(res, 'Authentication required');
      return;
    }

    req.user = session;

    // Check JWT role claim first (fast path)
    if (session.role && allowedRoles.includes(session.role)) {
      // Fetch full role info for downstream use
      try {
        req.userRole = await getUserRoleInfo(session.userId);
      } catch {
        req.userRole = {
          role: session.role,
          roleId: session.roleId || null,
          permissions: session.permissions || [],
        };
      }
      next();
      return;
    }

    // Fallback: fetch role from database
    try {
      const roleInfo = await getUserRoleInfo(session.userId);
      req.userRole = roleInfo;

      if (!allowedRoles.includes(roleInfo.role)) {
        errors.forbidden(res, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
        return;
      }

      next();
    } catch {
      errors.internal(res, 'Failed to verify user role');
    }
  };
}

/**
 * Middleware: requires user to have a specific permission.
 * Usage: requirePermission('posts:delete'), requirePermission('users:write')
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await authenticate(req, res);
    if (!session) {
      errors.unauthorized(res, 'Authentication required');
      return;
    }

    req.user = session;

    // Check JWT permissions claim first (fast path)
    if (session.permissions && session.permissions.includes(permission)) {
      try {
        req.userRole = await getUserRoleInfo(session.userId);
      } catch {
        req.userRole = {
          role: session.role || 'user',
          roleId: session.roleId || null,
          permissions: session.permissions,
        };
      }
      next();
      return;
    }

    // Fallback: fetch permissions from database
    try {
      const roleInfo = await getUserRoleInfo(session.userId);
      req.userRole = roleInfo;

      if (!roleInfo.permissions.includes(permission)) {
        errors.forbidden(res, `Missing required permission: ${permission}`);
        return;
      }

      next();
    } catch {
      errors.internal(res, 'Failed to verify user permissions');
    }
  };
}

/**
 * Middleware: requires user to own the resource or have a privileged role.
 * Usage: requireOwnership('userId'), requireOwnership('userId', 'admin', 'moderator')
 *
 * Looks for the ownership field in req.params, req.body, or req.query.
 */
export function requireOwnership(ownerField: string, ...bypassRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await authenticate(req, res);
    if (!session) {
      errors.unauthorized(res, 'Authentication required');
      return;
    }

    req.user = session;

    try {
      const roleInfo = await getUserRoleInfo(session.userId);
      req.userRole = roleInfo;

      // Bypass ownership check for privileged roles
      if (bypassRoles.includes(roleInfo.role)) {
        next();
        return;
      }

      // Get resource owner ID from params, body, or query
      const resourceOwnerId = Number(
        req.params[ownerField] || req.body[ownerField] || req.query[ownerField]
      );

      if (!resourceOwnerId) {
        errors.validation(res, `Missing ${ownerField} parameter`);
        return;
      }

      if (resourceOwnerId !== session.userId) {
        errors.forbidden(res, 'You can only access your own resources');
        return;
      }

      next();
    } catch {
      errors.internal(res, 'Failed to verify resource ownership');
    }
  };
}

/**
 * Middleware: authenticates user but does NOT enforce any role/permission.
 * Sets req.user and req.userRole for downstream use.
 * Useful for routes that work for any authenticated user but need role info.
 */
export async function authWithRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await authenticate(req, res);
  if (!session) {
    errors.unauthorized(res, 'Authentication required');
    return;
  }

  req.user = session;

  try {
    req.userRole = await getUserRoleInfo(session.userId);
  } catch {
    req.userRole = {
      role: session.role || 'user',
      roleId: session.roleId || null,
      permissions: session.permissions || [],
    };
  }

  next();
}
