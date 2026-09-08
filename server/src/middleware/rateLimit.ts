import { Request, Response, NextFunction } from 'express';
import { RATE_LIMITS } from '../config';
import { errors } from '../utils/apiResponse';
import logger from '../utils/logger';

interface RateEntry {
  count: number;
  resetTime: number;
}

interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const stores: Map<string, RateEntry> = new Map();
const failedAttempts: Map<string, FailedAttempt> = new Map();
const ipBlacklist: Set<string> = new Set();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const PROGRESSIVE_DELAY_BASE_MS = 1000;

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function isIpBlacklisted(ip: string): boolean {
  return ipBlacklist.has(ip);
}

export function blacklistIp(ip: string): void {
  ipBlacklist.add(ip);
  logger.warn('IP blacklisted', { ip });
}

export function unblacklistIp(ip: string): boolean {
  return ipBlacklist.delete(ip);
}

export function getBlacklistedIps(): string[] {
  return Array.from(ipBlacklist);
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || now - entry.firstAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return;
  }

  entry.count++;
  entry.lastAttempt = now;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    logger.warn('IP locked out due to failed attempts', { ip, attempts: entry.count });
  }
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export function isIpLocked(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return true;
  }

  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    failedAttempts.delete(ip);
    return false;
  }

  return false;
}

function getProgressiveDelay(ip: string): number {
  const entry = failedAttempts.get(ip);
  if (!entry || entry.count < 2) return 0;

  const delay = Math.min(PROGRESSIVE_DELAY_BASE_MS * Math.pow(2, entry.count - 1), 30000);
  return delay;
}

function checkLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  key: string,
  windowMs: number,
  max: number
): void {
  const ip = getClientIp(req);

  if (isIpBlacklisted(ip)) {
    logger.warn('Blocked blacklisted IP', { ip, path: req.path });
    errors.forbidden(res, 'Access denied');
    return;
  }

  if (isIpLocked(ip)) {
    const entry = failedAttempts.get(ip);
    const remainingMs = entry?.lockedUntil ? entry.lockedUntil - Date.now() : 0;
    const remainingSec = Math.ceil(remainingMs / 1000);
    res.setHeader('Retry-After', String(remainingSec));
    logger.warn('Blocked locked IP', { ip, path: req.path, retryAfter: remainingSec });
    errors.rateLimited(res, `Too many failed attempts. Try again in ${remainingSec} seconds.`);
    return;
  }

  const progressiveDelay = getProgressiveDelay(ip);
  if (progressiveDelay > 0) {
    setTimeout(() => {
      processRateLimit(req, res, next, key, ip, windowMs, max);
    }, progressiveDelay);
    return;
  }

  processRateLimit(req, res, next, key, ip, windowMs, max);
}

function processRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  key: string,
  ip: string,
  windowMs: number,
  max: number
): void {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();

  let entry = stores.get(storeKey);
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    stores.set(storeKey, entry);
  }

  entry.count++;

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

  if (entry.count > max) {
    logger.warn('Rate limit exceeded', { ip, path: req.path, limit: max });
    errors.rateLimited(res);
    return;
  }

  next();
}

export function globalRateLimit(req: Request, res: Response, next: NextFunction): void {
  checkLimit(req, res, next, 'global', RATE_LIMITS.GLOBAL.windowMs, RATE_LIMITS.GLOBAL.max);
}

export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  checkLimit(req, res, next, 'auth', RATE_LIMITS.AUTH.windowMs, RATE_LIMITS.AUTH.max);
}

export function aiRateLimit(req: Request, res: Response, next: NextFunction): void {
  checkLimit(req, res, next, 'ai', RATE_LIMITS.AI.windowMs, RATE_LIMITS.AI.max);
}

export function speechRateLimit(req: Request, res: Response, next: NextFunction): void {
  checkLimit(req, res, next, 'speech', RATE_LIMITS.SPEECH.windowMs, RATE_LIMITS.SPEECH.max);
}

export function communityRateLimit(req: Request, res: Response, next: NextFunction): void {
  checkLimit(
    req,
    res,
    next,
    'community',
    RATE_LIMITS.COMMUNITY.windowMs,
    RATE_LIMITS.COMMUNITY.max
  );
}

/**
 * Role-based rate limit: admins and moderators get higher limits.
 * Usage: roleBasedRateLimit(req, res, next, 'ai', { user: 50, moderator: 100, admin: 500 })
 */
export function roleBasedRateLimit(
  key: string,
  limits: { user?: number; moderator?: number; admin?: number },
  windowMs: number
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.userRole?.role || req.user?.role || 'user';
    let max = limits.user || 50;

    if (role === 'admin' && limits.admin) {
      max = limits.admin;
    } else if (role === 'moderator' && limits.moderator) {
      max = limits.moderator;
    }

    checkLimit(req, res, next, `role:${key}`, windowMs, max);
  };
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of stores.entries()) {
      if (now >= entry.resetTime) {
        stores.delete(key);
      }
    }
    for (const [ip, entry] of failedAttempts.entries()) {
      if (entry.lockedUntil && now >= entry.lockedUntil) {
        failedAttempts.delete(ip);
      } else if (!entry.lockedUntil && now - entry.lastAttempt > LOCKOUT_DURATION_MS) {
        failedAttempts.delete(ip);
      }
    }
  }, 60 * 1000);
}
