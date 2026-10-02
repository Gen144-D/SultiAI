import { eq, desc } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

export async function getSavedPhrases(userEmail: string): Promise<any[]> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.savedPhrases)
    .where(
      eq(
        schema.savedPhrases.userId,
        (db as any)
          .select({ id: schema.users.userId })
          .from(schema.users)
          .where(eq(schema.users.email, userEmail))
      )
    )
    .orderBy(desc(schema.savedPhrases.createdAt));
  return rows;
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

export async function savePhrase(
  userId: number,
  phrase: string,
  language: string | null,
  category: string | null
): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .insert(schema.savedPhrases)
    .values({ userId, phrase, language, category })
    .returning();
  return result[0].phraseId;
}

export async function deletePhrase(phraseId: number, userEmail: string): Promise<void> {
  const db = getDb();
  await (db as any).delete(schema.savedPhrases).where(eq(schema.savedPhrases.phraseId, phraseId));
}
