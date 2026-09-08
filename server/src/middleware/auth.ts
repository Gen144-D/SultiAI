import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { getDb } from '../db/connection';
import { verifyCredentials } from '@supabase/server/core';
import { errors } from '../utils/apiResponse';
import { env } from '../config';

// Cache for Supabase UUID → local user ID mapping
const userIdCache = new Map<string, number>();

// Supabase publishable key for JWKS verification (set from env)
const SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY || '';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Build a credentials object from Express request headers
 * that @supabase/server/core can verify.
 */
function extractCredentials(req: Request) {
  const authHeader = req.headers['authorization'] || '';
  const apikey = (req.headers['apikey'] as string | undefined) || SUPABASE_PUBLISHABLE_KEY;
  return {
    token: authHeader.startsWith('Bearer ') ? authHeader.slice(7) || null : null,
    apikey: apikey || null,
  };
}

/**
 * Auth middleware that verifies Supabase-issued JWTs using @supabase/server/core,
 * then falls back to legacy JWT verification.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const credentials = extractCredentials(req);

  if (!credentials.token) {
    errors.unauthorized(res, 'Access token required');
    return;
  }

  // Try Supabase JWKS verification via @supabase/server/core
  if (credentials.token) {
    try {
      const { data, error } = await verifyCredentials(credentials, {
        auth: 'user',
      });

      if (!error && data) {
        // data contains the verified payload
        const payload = data as any;
        const session: JwtPayload = {
          email: payload.email || '',
          userId: 0, // Will be resolved via email lookup
          id: 0,
          sub: payload.sub || payload.user_sub || '',
          iat: payload.iat,
          exp: payload.exp,
        };

        // Resolve Supabase UUID → local user ID
        const supabaseId = session.sub || '';
        const email = session.email || '';

        if (supabaseId && userIdCache.has(supabaseId)) {
          session.userId = userIdCache.get(supabaseId)!;
        } else if (email) {
          try {
            const db = getDb();
            const schema = require('../db/schema-sqlite');
            const { eq } = require('drizzle-orm');
            const [existing] = (db as any)
              .select()
              .from(schema.users)
              .where(eq(schema.users.email, email))
              .limit(1);
            if (existing) {
              session.userId = existing.user_id;
              if (supabaseId) userIdCache.set(supabaseId, existing.user_id);
            }
          } catch (dbErr) {
            // DB lookup failed — userId stays 0
          }
        }

        req.user = { ...session, id: session.userId };
        return next();
      }
    } catch (err) {
      // JWKS verification failed, fall through to legacy
    }
  }

  // Fall back to legacy JWT verification (also handles Supabase tokens via SUPABASE_JWT_SECRET)
  const legacySession = verifyToken(credentials.token);
  if (legacySession) {
    // Resolve email → local userId if needed
    const email = legacySession.email || '';
    const supabaseId = legacySession.sub || '';

    if (legacySession.userId === 0 && email) {
      if (supabaseId && userIdCache.has(supabaseId)) {
        legacySession.userId = userIdCache.get(supabaseId)!;
      } else {
        try {
          const db = getDb();
          const schema = require('../db/schema-sqlite');
          const { eq } = require('drizzle-orm');
          const [existing] = (db as any)
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);
          if (existing) {
            legacySession.userId = existing.user_id;
            if (supabaseId) userIdCache.set(supabaseId, existing.user_id);
          }
        } catch (dbErr) {
          // DB lookup failed — userId stays 0
        }
      }
    }

    req.user = { ...legacySession, id: legacySession.userId };
    return next();
  }

  errors.unauthorized(res, 'Invalid or expired token');
}
