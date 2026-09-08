import { Request, Response, NextFunction } from 'express';
import { getRedis, isRedisConfigured } from '../config/redis';
import logger from '../utils/logger';

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  skipCache?: (req: Request) => boolean;
}

const DEFAULT_TTL = 300;

export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = DEFAULT_TTL, keyPrefix = 'api', skipCache } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isRedisConfigured()) {
      return next();
    }

    if (skipCache && skipCache(req)) {
      return next();
    }

    if (req.method !== 'GET') {
      return next();
    }

    const redis = getRedis();
    if (!redis) {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    const userId = (req as any).userId;
    const userKey = userId ? `:user:${userId}` : '';
    const fullKey = cacheKey + userKey;

    try {
      const cached = await redis.get(fullKey);
      if (cached) {
        logger.debug('Cache hit', { key: fullKey });
        res.setHeader('X-Cache', 'HIT');
        res.json(cached);
        return;
      }
    } catch (error) {
      logger.warn('Cache read error', { key: fullKey, error: (error as Error).message });
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      redis.set(fullKey, body, { ex: ttl }).catch((error) => {
        logger.warn('Cache write error', { key: fullKey, error: (error as Error).message });
      });
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!isRedisConfigured()) return;

  const redis = getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis!.del(key)));
      logger.info('Cache invalidated', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.warn('Cache invalidation error', { pattern, error: (error as Error).message });
  }
}
