import { eq, desc } from 'drizzle-orm';
import { getDb } from '../connection';
import * as schema from '../schema-sqlite';

export async function getModules(): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select()
    .from(schema.learningModules)
    .orderBy(schema.learningModules.moduleId);
}

export async function getProgress(userEmail: string): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      progressId: schema.learningProgress.progressId,
      userId: schema.learningProgress.userId,
      moduleId: schema.learningProgress.moduleId,
      completionPercent: schema.learningProgress.completionPercent,
      createdAt: schema.learningProgress.createdAt,
      moduleTitle: schema.learningModules.moduleTitle,
      difficulty: schema.learningModules.difficulty,
    })
    .from(schema.learningProgress)
    .innerJoin(
      schema.learningModules,
      eq(schema.learningProgress.moduleId, schema.learningModules.moduleId)
    )
    .where(
      eq(
        schema.learningProgress.userId,
        (db as any)
          .select({ id: schema.users.userId })
          .from(schema.users)
          .where(eq(schema.users.email, userEmail))
      )
    );
}

export async function getUserIdByEmail(email: string): Promise<number | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows[0]?.userId;
}

export async function upsertProgress(
  userId: number,
  moduleId: number,
  completionPercent: number
): Promise<void> {
  const db = getDb();
  const existing = await (db as any)
    .select()
    .from(schema.learningProgress)
    .where(
      eq(schema.learningProgress.userId, userId) && eq(schema.learningProgress.moduleId, moduleId)
    )
    .limit(1);

  if (existing[0]) {
    await (db as any)
      .update(schema.learningProgress)
      .set({ completionPercent })
      .where(eq(schema.learningProgress.progressId, existing[0].progressId));
  } else {
    await (db as any)
      .insert(schema.learningProgress)
      .values({ userId, moduleId, completionPercent });
  }
}
