import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { verifyCredentials } from '@supabase/server/core';
import { errors } from '../utils/apiResponse';
import { env } from '../config';
import { ensureUserByEmail } from '../db/repositories/user.repo';
import { logger } from '../utils/logger';

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
        // data is an AuthResult wrapper: { authMode, token, userClaims, jwtClaims, keyName }.
        // The claims are nested, NOT on the top-level object.
        const claims = (data as any).userClaims || (data as any).jwtClaims || null;
        const supabaseEmail = (claims?.email as string) || '';
        const supabaseSub = (claims?.id as string) || (claims?.sub as string) || '';

        if (supabaseEmail || supabaseSub) {
          const session: JwtPayload = {
            email: supabaseEmail,
            userId: 0, // Will be resolved via email lookup
            id: 0,
            sub: supabaseSub,
            iat: claims?.iat,
            exp: claims?.exp,
          };

          // Resolve Supabase UUID → local user ID, provisioning the row if needed
          const supabaseId = session.sub;
          const email = session.email;

          if (supabaseId && userIdCache.has(supabaseId)) {
            session.userId = userIdCache.get(supabaseId)!;
          } else if (email) {
            try {
              const userId = await ensureUserByEmail(email, supabaseId || undefined);
              if (userId) {
                session.userId = userId;
                if (supabaseId) userIdCache.set(supabaseId, userId);
              }
            } catch (dbErr) {
              logger.warn('User resolution failed', { error: (dbErr as Error).message });
            }
          }

          req.user = { ...session, id: session.userId };
          return next();
        }
        // Claims were empty/unusable — fall through to legacy verification
        // rather than attaching an unidentified session.
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
          const userId = await ensureUserByEmail(email, supabaseId || undefined);
          if (userId) {
            legacySession.userId = userId;
            if (supabaseId) userIdCache.set(supabaseId, userId);
          }
        } catch (dbErr) {
          logger.warn('User resolution failed', { error: (dbErr as Error).message });
        }
      }
    }

    req.user = { ...legacySession, id: legacySession.userId };
    return next();
  }

  errors.unauthorized(res, 'Invalid or expired token');
}
