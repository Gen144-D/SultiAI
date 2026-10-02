import { Request, Response, NextFunction } from 'express';
import { errors } from '../utils/apiResponse';
import { API_KEY_PREFIX, verifyApiKey } from '../utils/crypto';
import { env } from '../config';
import logger from '../utils/logger';
import {
  getApiKeyByPrefix,
  isKeyUsable,
  scopeAllows,
  touchApiKey,
  type ApiKeyRecord,
  type ApiKeyScope,
} from '../db/repositories/apiKey.repo';
import { apiKeyRateLimit } from './rateLimit';

declare global {
  namespace Express {
    interface Request {
      apiKey?: { keyId: number; name: string; scopes: string };
    }
  }
}

/** Public API keys are always sent in this header. */
export const API_KEY_HEADER = 'x-api-key';

/**
 * Accept a key from `X-API-Key`, or from `Authorization: Bearer` when it is
 * clearly a key rather than a user JWT.
 */
function extractKey(req: Request): string | null {
  const header = req.headers[API_KEY_HEADER];
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();

  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith(`Bearer ${API_KEY_PREFIX}`)) {
    return auth.slice('Bearer '.length).trim();
  }
  return null;
}

function isExpired(row: ApiKeyRecord): boolean {
  if (!row.expiresAt) return false;
  const expiry = Date.parse(row.expiresAt);
  return !Number.isNaN(expiry) && expiry <= Date.now();
}

/**
 * Authenticate a public API key and enforce its scope.
 *
 * Disabled unless `API_KEYS_ENABLED=true`, so an unconfigured deployment stays
 * closed rather than silently open.
 */
export function apiKeyAuth(requiredScope?: ApiKeyScope) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (env.API_KEYS_ENABLED !== 'true') {
      errors.forbidden(res, 'Public API is not enabled on this deployment');
      return;
    }

    const presented = extractKey(req);
    if (!presented) {
      errors.unauthorized(res, `API key required. Send it in the ${API_KEY_HEADER} header.`);
      return;
    }

    if (!presented.startsWith(API_KEY_PREFIX)) {
      errors.unauthorized(res, 'Malformed API key');
      return;
    }

    const row = await getApiKeyByPrefix(presented.slice(0, 14));
    if (!row || !verifyApiKey(presented, row.keyHash)) {
      logger.warn('Rejected API key', { prefix: presented.slice(0, 14), path: req.path });
      errors.unauthorized(res, 'Invalid API key');
      return;
    }

    if (row.status === 'revoked') {
      errors.forbidden(res, 'This API key has been revoked');
      return;
    }
    if (isExpired(row)) {
      errors.forbidden(res, 'This API key has expired');
      return;
    }
    if (!isKeyUsable(row)) {
      errors.forbidden(res, 'This API key is not active');
      return;
    }

    if (!scopeAllows(row.scopes, requiredScope as ApiKeyScope)) {
      errors.forbidden(res, `This API key is missing the "${requiredScope}" scope`);
      return;
    }

    req.apiKey = { keyId: row.keyId, name: row.name, scopes: row.scopes };
    touchApiKey(row.keyId);

    // Per-key quota, independent of the caller's IP.
    apiKeyRateLimit(row.rateLimitPerMinute)(req, res, next);
  };
}
