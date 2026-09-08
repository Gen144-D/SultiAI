import { Redis } from '@upstash/redis';
import { env } from './env';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

export function isRedisConfigured(): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export async function checkRedisHealth(): Promise<{ status: string; latencyMs?: number }> {
  const client = getRedis();
  if (!client) {
    return { status: 'not_configured' };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return { status: 'ok', latencyMs };
  } catch (error) {
    return { status: 'error' };
  }
}
