import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from '../connection';
import * as schema from '../schema-pg';

export async function createVerificationRequest(
  userId: number,
  data: { audioPath?: string; recordedText?: string; wordId?: number }
): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .insert(schema.verificationRequests)
    .values({
      userId,
      wordId: data.wordId ?? null,
      audioPath: data.audioPath ?? null,
      recordedText: data.recordedText ?? null,
      status: 'pending',
    })
    .returning();
  return result[0].requestId;
}

export async function getPendingVerifications(): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      requestId: schema.verificationRequests.requestId,
      userId: schema.verificationRequests.userId,
      wordId: schema.verificationRequests.wordId,
      recordedText: schema.verificationRequests.recordedText,
      status: schema.verificationRequests.status,
      createdAt: schema.verificationRequests.createdAt,
      userName: schema.users.fullname,
      word: schema.preservedWords.word,
    })
    .from(schema.verificationRequests)
    .leftJoin(schema.users, eq(schema.verificationRequests.userId, schema.users.userId))
    .leftJoin(
      schema.preservedWords,
      eq(schema.verificationRequests.wordId, schema.preservedWords.wordId)
    )
    .where(eq(schema.verificationRequests.status, 'pending'))
    .orderBy(desc(schema.verificationRequests.createdAt));
}

export async function approveVerification(
  requestId: number,
  verifierEmail: string,
  data: { score?: number; feedback?: string }
): Promise<void> {
  const db = getDb();
  const verifier = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, verifierEmail))
    .limit(1);
  const verifierId = verifier[0]?.userId;
  if (!verifierId) throw new Error('Verifier not found');

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await (db as any)
    .update(schema.verificationRequests)
    .set({
      verifierId,
      score: data.score ?? null,
      feedback: data.feedback ?? null,
      status: 'approved',
      verifiedAt: now,
    })
    .where(eq(schema.verificationRequests.requestId, requestId));

  await (db as any)
    .update(schema.users)
    .set({ role: 'native_speaker' })
    .where(eq(schema.users.userId, verifierId));
}

export async function getUserVerifications(userId: number): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select()
    .from(schema.verificationRequests)
    .where(eq(schema.verificationRequests.userId, userId))
    .orderBy(desc(schema.verificationRequests.createdAt));
}

export async function getVerifierStats(verifierEmail: string): Promise<any> {
  const db = getDb();
  const verifier = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, verifierEmail))
    .limit(1);
  const verifierId = verifier[0]?.userId;
  if (!verifierId) return { totalVerified: 0, averageScore: 0 };

  const result = await (db as any)
    .select({
      totalVerified: sql`count(*)`,
      averageScore: sql`avg(score)`,
    })
    .from(schema.verificationRequests)
    .where(
      and(
        eq(schema.verificationRequests.verifierId, verifierId),
        eq(schema.verificationRequests.status, 'approved')
      )
    );
  return {
    totalVerified: Number(result[0].totalVerified),
    averageScore: Math.round(Number(result[0].averageScore) * 10) / 10 || 0,
  };
}
