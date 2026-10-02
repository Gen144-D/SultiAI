import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';
import { generateApiKey } from '../../utils/crypto';

const schema = getSchema();

/** Scopes a key may carry. `*` is treated as a wildcard by scopeAllows(). */
export const API_KEY_SCOPES = ['lexicon:read', 'g2p:read', 'pronunciation:write'] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const DEFAULT_KEY_SCOPES: ApiKeyScope[] = [...API_KEY_SCOPES];

export function scopeAllows(granted: string, required: ApiKeyScope): boolean {
  if (!required) return true;
  const scopes = granted
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return scopes.includes('*') || scopes.includes(required);
}

export function isValidScope(scope: string): scope is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(scope);
}

export interface ApiKeyRecord {
  keyId: number;
  name: string;
  lookupPrefix: string;
  keyHash: string;
  scopes: string;
  rateLimitPerMinute: number;
  status: string;
  ownerUserId: number | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  requestCount: number;
  createdAt: string;
}

export interface ApiKeyListItem extends Omit<ApiKeyRecord, 'keyHash'> {
  maskedKey: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Mint a key. The plaintext `key` is returned once and never stored - callers
 * must surface it to the operator immediately and cannot retrieve it again.
 */
export async function createApiKey(input: {
  name: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  ownerUserId?: number | null;
  expiresAt?: string | null;
}): Promise<{ record: ApiKeyRecord; plaintextKey: string }> {
  const db = getDb();
  const { key, lookupPrefix, keyHash } = generateApiKey();
  const scopes = (input.scopes && input.scopes.length ? input.scopes : DEFAULT_KEY_SCOPES).join(
    ','
  );

  const inserted = await (db as any)
    .insert(schema.apiKeys)
    .values({
      name: input.name,
      lookupPrefix,
      keyHash,
      scopes,
      rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
      status: 'active',
      ownerUserId: input.ownerUserId ?? null,
      expiresAt: input.expiresAt ?? null,
      requestCount: 0,
    })
    .returning();

  return { record: inserted[0] as ApiKeyRecord, plaintextKey: key };
}

function mask(prefix: string): string {
  return `${prefix}${'*'.repeat(8)}`;
}

function toListItem(row: ApiKeyRecord): ApiKeyListItem {
  const { keyHash, ...rest } = row;
  void keyHash;
  return { ...rest, maskedKey: mask(row.lookupPrefix) };
}

export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.apiKeys)
    .orderBy(desc(schema.apiKeys.createdAt));
  return (rows as ApiKeyRecord[]).map(toListItem);
}

export async function getApiKeyById(id: number): Promise<ApiKeyRecord | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyId, id))
    .limit(1);
  return rows[0] as ApiKeyRecord | undefined;
}

/**
 * Find the candidate row for a presented key using the plaintext prefix, so we
 * only ever run one scrypt verification per request.
 */
export async function getApiKeyByPrefix(prefix: string): Promise<ApiKeyRecord | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.lookupPrefix, prefix))
    .limit(1);
  return rows[0] as ApiKeyRecord | undefined;
}

export function isKeyUsable(row: ApiKeyRecord): boolean {
  if (row.status !== 'active') return false;
  if (row.expiresAt) {
    const expiry = Date.parse(row.expiresAt);
    if (!Number.isNaN(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

/** Bump usage counters. Deliberately not awaited on the request hot path. */
export function touchApiKey(id: number): void {
  const db = getDb();
  void (db as any)
    .update(schema.apiKeys)
    .set({ lastUsedAt: nowIso(), requestCount: sql`${schema.apiKeys.requestCount} + 1` })
    .where(eq(schema.apiKeys.keyId, id))
    .catch(() => undefined);
}

export async function revokeApiKey(id: number): Promise<boolean> {
  const db = getDb();
  const updated = await (db as any)
    .update(schema.apiKeys)
    .set({ status: 'revoked', revokedAt: nowIso() })
    .where(and(eq(schema.apiKeys.keyId, id), eq(schema.apiKeys.status, 'active')))
    .returning({ keyId: schema.apiKeys.keyId });
  return updated.length > 0;
}

export async function reactivateApiKey(id: number): Promise<boolean> {
  const db = getDb();
  const updated = await (db as any)
    .update(schema.apiKeys)
    .set({ status: 'active', revokedAt: null })
    .where(and(eq(schema.apiKeys.keyId, id), eq(schema.apiKeys.status, 'revoked')))
    .returning({ keyId: schema.apiKeys.keyId });
  return updated.length > 0;
}

export async function deleteApiKey(id: number): Promise<boolean> {
  const db = getDb();
  const deleted = await (db as any)
    .delete(schema.apiKeys)
    .where(eq(schema.apiKeys.keyId, id))
    .returning({ keyId: schema.apiKeys.keyId });
  return deleted.length > 0;
}
