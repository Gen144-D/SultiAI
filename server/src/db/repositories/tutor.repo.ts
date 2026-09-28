import { eq, desc } from 'drizzle-orm';
import { getDb } from '../connection';
import * as schema from '../schema-pg';
import { isMongoConnected } from '../mongodb/connection';
import { TutorSession } from '../mongodb/tutorSession.model';

export async function getSession(sessionId: number, userEmail: string): Promise<any> {
  const db = getDb();

  if (isMongoConnected()) {
    const session = await TutorSession.findById(sessionId).lean();
    return session;
  }

  const rows = await (db as any)
    .select()
    .from(schema.tutorSessions)
    .where(eq(schema.tutorSessions.sessionId, sessionId))
    .limit(1);
  return rows[0] || null;
}

export async function getSessionMessages(sessionId: number, userEmail: string): Promise<any[]> {
  const session = await getSession(sessionId, userEmail);
  if (!session) return [];

  if (isMongoConnected()) {
    return (session as any).messages || [];
  }

  try {
    return typeof session.messages === 'string'
      ? JSON.parse(session.messages)
      : session.messages || [];
  } catch {
    return [];
  }
}

export async function createSession(
  userEmail: string,
  messages: any[],
  now: string
): Promise<number> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, userEmail))
    .limit(1);
  const userId = rows[0]?.userId;
  if (!userId) throw new Error('User not found');

  if (isMongoConnected()) {
    const session = await TutorSession.create({
      userId,
      messages,
      startedAt: new Date(now),
      endedAt: new Date(now),
    });
    return Number(session._id);
  }

  const result = await (db as any)
    .insert(schema.tutorSessions)
    .values({
      userId,
      messages: JSON.stringify(messages),
      startedAt: now,
      endedAt: now,
    })
    .returning();
  return result[0].sessionId;
}

export async function updateSession(
  sessionId: number,
  messages: any[],
  now: string
): Promise<void> {
  if (isMongoConnected()) {
    await TutorSession.findByIdAndUpdate(sessionId, {
      messages,
      endedAt: new Date(now),
    });
    return;
  }

  const db = getDb();
  await (db as any)
    .update(schema.tutorSessions)
    .set({
      messages: JSON.stringify(messages),
      endedAt: now,
    })
    .where(eq(schema.tutorSessions.sessionId, sessionId));
}
