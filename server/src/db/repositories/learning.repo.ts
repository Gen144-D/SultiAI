import { and, eq, sql, asc } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

const PRACTICE_MODULE_KEYS = [
  'voice_practice',
  'phrasebook',
  'flashcards',
  'pronunciation_lab',
  'vocabulary_notebook',
] as const;

const PRACTICE_TARGETS: Record<
  string,
  { table: any; aggregate: 'count' | 'sumReviews'; target: number }
> = {
  voice_practice: { table: schema.speechRecords, aggregate: 'count', target: 10 },
  phrasebook: { table: schema.savedPhrases, aggregate: 'count', target: 20 },
  flashcards: { table: schema.vocabularyReviews, aggregate: 'sumReviews', target: 40 },
  pronunciation_lab: { table: schema.pronunciationAttempts, aggregate: 'count', target: 20 },
  vocabulary_notebook: { table: schema.vocabularyReviews, aggregate: 'count', target: 20 },
};

function clampPercent(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

export async function getModules(): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select()
    .from(schema.learningModules)
    .orderBy(asc(schema.learningModules.sortOrder), asc(schema.learningModules.moduleId));
}

export async function getModuleByKey(moduleKey: string): Promise<any | null> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.learningModules)
    .where(eq(schema.learningModules.moduleKey, moduleKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function getModuleById(moduleId: number): Promise<any | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.learningModules)
    .where(eq(schema.learningModules.moduleId, moduleId))
    .limit(1);
  return rows[0];
}

export async function getLessonItems(moduleId: number): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select()
    .from(schema.lessonItems)
    .where(eq(schema.lessonItems.moduleId, moduleId))
    .orderBy(asc(schema.lessonItems.sortOrder), asc(schema.lessonItems.itemId));
}

async function getUserId(userEmail: string): Promise<number | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, userEmail))
    .limit(1);
  return rows[0]?.userId;
}

/**
 * Real practice-activity counts per module, derived server-side from the tables
 * the activity screens already write to. Keeps the practice modules honest:
 * progress reflects work actually done, not a number the client invented.
 */
async function getPracticeCounts(
  userId: number
): Promise<Record<string, { count: number; target: number }>> {
  const db = getDb();
  const result: Record<string, { count: number; target: number }> = {};

  for (const key of PRACTICE_MODULE_KEYS) {
    const spec = PRACTICE_TARGETS[key];
    const column =
      spec.aggregate === 'sumReviews'
        ? sql`COALESCE(SUM(${schema.vocabularyReviews.reviewCount}), 0)`
        : sql`COUNT(*)`;

    const rows = await (db as any)
      .select({ total: column })
      .from(spec.table)
      .where(eq(spec.table.userId, userId));

    result[key] = { count: Number(rows[0]?.total) || 0, target: spec.target };
  }

  return result;
}

/**
 * Returns one row per learning module so the client can key progress by
 * `moduleId` instead of matching on the free-text module title.
 */
export async function getProgress(userEmail: string): Promise<any[]> {
  const userId = await getUserId(userEmail);
  const modules = await getModules();
  if (!userId) {
    return modules.map((m) => ({
      moduleId: m.moduleId,
      moduleKey: m.moduleKey,
      moduleTitle: m.moduleTitle,
      difficulty: m.difficulty,
      sortOrder: m.sortOrder,
      completionPercent: 0,
      source: 'tracked',
      updatedAt: null,
    }));
  }

  const db = getDb();
  const tracked = await (db as any)
    .select({
      moduleId: schema.learningProgress.moduleId,
      completionPercent: schema.learningProgress.completionPercent,
      updatedAt: schema.learningProgress.updatedAt,
    })
    .from(schema.learningProgress)
    .where(eq(schema.learningProgress.userId, userId));

  const trackedByModule = new Map<number, any>();
  for (const row of tracked) {
    trackedByModule.set(Number(row.moduleId), row);
  }

  const practice = await getPracticeCounts(userId);

  return modules.map((m) => {
    const key = m.moduleKey ?? null;
    const practiceStats =
      key && PRACTICE_MODULE_KEYS.includes(key as any) ? practice[key] : undefined;

    if (practiceStats) {
      const derived = Math.min(
        100,
        Math.round((practiceStats.count / Math.max(1, practiceStats.target)) * 100)
      );
      const stored = trackedByModule.get(Number(m.moduleId));
      const storedPct = stored ? clampPercent(stored.completionPercent) : 0;
      return {
        moduleId: m.moduleId,
        moduleKey: key,
        moduleTitle: m.moduleTitle,
        difficulty: m.difficulty,
        sortOrder: m.sortOrder,
        completionPercent: Math.max(derived, storedPct),
        source: 'derived',
        activityCount: practiceStats.count,
        activityTarget: practiceStats.target,
        updatedAt: stored?.updatedAt ?? null,
      };
    }

    const stored = trackedByModule.get(Number(m.moduleId));
    return {
      moduleId: m.moduleId,
      moduleKey: key,
      moduleTitle: m.moduleTitle,
      difficulty: m.difficulty,
      sortOrder: m.sortOrder,
      completionPercent: stored ? clampPercent(stored.completionPercent) : 0,
      source: 'tracked',
      activityCount: null,
      activityTarget: null,
      updatedAt: stored?.updatedAt ?? null,
    };
  });
}

export async function upsertProgress(
  userId: number,
  moduleId: number,
  completionPercent: number
): Promise<void> {
  const db = getDb();
  const percent = clampPercent(completionPercent);

  const existing = await (db as any)
    .select()
    .from(schema.learningProgress)
    .where(
      and(
        eq(schema.learningProgress.userId, userId),
        eq(schema.learningProgress.moduleId, moduleId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await (db as any)
      .update(schema.learningProgress)
      .set({
        completionPercent: percent,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.learningProgress.progressId, existing[0].progressId));
    return;
  }

  await (db as any).insert(schema.learningProgress).values({
    userId,
    moduleId,
    completionPercent: percent,
  });
}

export async function getUserIdByEmail(email: string): Promise<number | undefined> {
  return getUserId(email);
}
