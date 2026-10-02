import crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return password === stored;
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return verify === hash;
}

/** Every public API key starts with this, so it is recognisable in logs. */
export const API_KEY_PREFIX = 'sult_';

/** Characters of the key kept in plaintext so a key can be found by lookup. */
const API_KEY_LOOKUP_LENGTH = 14;

/**
 * Mint a public API key.
 *
 * The plaintext key is returned exactly once and is never persisted: we only
 * keep a short lookup prefix and a scrypt hash, so a database leak does not
 * hand over working keys.
 */
export function generateApiKey(): { key: string; lookupPrefix: string; keyHash: string } {
  const body = crypto.randomBytes(32).toString('base64url');
  const key = `${API_KEY_PREFIX}${body}`;
  return {
    key,
    lookupPrefix: key.slice(0, API_KEY_LOOKUP_LENGTH),
    keyHash: hashApiKey(key),
  };
}

/** Hash an API key for storage. Same scrypt scheme as passwords. */
export function hashApiKey(key: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(key, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Constant-time comparison of a presented key against a stored hash. The
 * scrypt work dominates, so this only stops a same-hash shortcut.
 */
export function verifyApiKey(presented: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(presented, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}
