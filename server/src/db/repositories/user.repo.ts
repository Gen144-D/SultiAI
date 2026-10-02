import { and, eq } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

export interface UserRow {
  userId: number;
  fullname: string;
  username: string | null;
  email: string;
  passwordHash: string;
  avatarId: number | null;
  preferredLang: string | null;
  learningLang: string | null;
  country: string | null;
  role: string;
  createdAt: string | null;
}

export async function findByEmail(email: string): Promise<UserRow | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows[0];
}

export async function findById(userId: number): Promise<UserRow | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.userId, userId))
    .limit(1);
  return rows[0];
}

export async function createUser(data: {
  fullname: string;
  username: string;
  email: string;
  passwordHash: string;
  preferredLang: string;
  learningLang: string;
}): Promise<number> {
  const db = getDb();
  const result = await (db as any).insert(schema.users).values(data).returning();
  return result[0].userId;
}

export async function updateUser(
  email: string,
  data: Partial<{
    fullname: string;
    preferredLang: string;
    learningLang: string;
    username: string;
    country: string;
    avatarId: number;
  }>
): Promise<void> {
  const db = getDb();
  await (db as any).update(schema.users).set(data).where(eq(schema.users.email, email));
}

/**
 * Resolve a local user row for an authenticated email, creating one if the
 * account was provisioned through Supabase and has no local row yet.
 *
 * Without this, every write path keyed on userId (conversations, tutor_sessions,
 * pronunciation attempts) silently fails for Supabase-authed users, because the
 * foreign key has nothing to point at.
 */
export async function ensureUserByEmail(
  email: string,
  supabaseId?: string
): Promise<number | undefined> {
  if (!email) return undefined;
  const existing = await findByEmail(email);
  if (existing) return existing.userId;

  const db = getDb();
  // Backfill supabaseId on rows created before SSO was wired up.
  if (supabaseId) {
    const { eq: eqOp, and: andOp } = require('drizzle-orm');
    await (db as any)
      .update(schema.users)
      .set({ supabaseId })
      .where(andOp(eqOp(schema.users.email, email), eqOp(schema.users.supabaseId, null)));
  }

  const fullname =
    email
      .split('@')[0]
      ?.replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Learner';
  try {
    const result = await (db as any)
      .insert(schema.users)
      .values({
        fullname,
        username: email.split('@')[0] || null,
        email,
        passwordHash: 'supabase', // no local password; auth is handled by Supabase
        supabaseId: supabaseId || null,
      })
      .returning();
    return result[0]?.userId;
  } catch {
    // Lost a race against a concurrent insert - re-read.
    const raced = await findByEmail(email);
    return raced?.userId;
  }
}

export async function getUserWithAvatar(email: string): Promise<any> {
  const db = getDb();
  const rows = await (db as any)
    .select({
      userId: schema.users.userId,
      fullname: schema.users.fullname,
      username: schema.users.username,
      email: schema.users.email,
      preferredLang: schema.users.preferredLang,
      learningLang: schema.users.learningLang,
      country: schema.users.country,
      role: schema.users.role,
      createdAt: schema.users.createdAt,
      avatarName: schema.avatars.avatarName,
      avatarImage: schema.avatars.avatarImage,
    })
    .from(schema.users)
    .leftJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.avatarId))
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows[0];
}
