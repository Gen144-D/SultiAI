import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

export async function submitWord(
  userId: number,
  data: {
    word: string;
    definition?: string;
    partOfSpeech?: string;
    dialectalRegion?: string;
    bisayaExample?: string;
    englishExample?: string;
    pronunciationGuide?: string;
    source?: string;
  }
): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .insert(schema.preservedWords)
    .values({
      word: data.word,
      definition: data.definition ?? null,
      partOfSpeech: data.partOfSpeech ?? null,
      dialectalRegion: data.dialectalRegion ?? null,
      bisayaExample: data.bisayaExample ?? null,
      englishExample: data.englishExample ?? null,
      pronunciationGuide: data.pronunciationGuide ?? null,
      submittedBy: userId,
      source: data.source ?? 'learner',
      status: 'pending',
      verificationCount: 0,
    })
    .returning();
  return result[0].wordId;
}

export async function getPreservedWords(status?: string, limit = 50, offset = 0): Promise<any[]> {
  const db = getDb();
  const conditions = [];
  if (status) conditions.push(eq(schema.preservedWords.status, status));

  let query = (db as any)
    .select({
      wordId: schema.preservedWords.wordId,
      word: schema.preservedWords.word,
      definition: schema.preservedWords.definition,
      partOfSpeech: schema.preservedWords.partOfSpeech,
      dialectalRegion: schema.preservedWords.dialectalRegion,
      bisayaExample: schema.preservedWords.bisayaExample,
      englishExample: schema.preservedWords.englishExample,
      pronunciationGuide: schema.preservedWords.pronunciationGuide,
      source: schema.preservedWords.source,
      status: schema.preservedWords.status,
      verificationCount: schema.preservedWords.verificationCount,
      createdAt: schema.preservedWords.createdAt,
      submitterName: schema.users.fullname,
    })
    .from(schema.preservedWords)
    .leftJoin(schema.users, eq(schema.preservedWords.submittedBy, schema.users.userId));

  if (conditions.length > 0) query = query.where(and(...conditions));
  query = query.orderBy(desc(schema.preservedWords.createdAt)).limit(limit).offset(offset);

  return await query;
}

export async function verifyWord(
  wordId: number,
  status: 'approved' | 'rejected',
  feedback?: string
): Promise<void> {
  const db = getDb();
  await (db as any)
    .update(schema.preservedWords)
    .set({
      status,
      verificationCount: sql`verification_count + 1`,
    })
    .where(eq(schema.preservedWords.wordId, wordId));
}

export async function getLivingLexicon(limit = 20): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      word: schema.preservedWords.word,
      definition: schema.preservedWords.definition,
      bisayaExample: schema.preservedWords.bisayaExample,
      englishExample: schema.preservedWords.englishExample,
      pronunciationGuide: schema.preservedWords.pronunciationGuide,
      dialectalRegion: schema.preservedWords.dialectalRegion,
      partOfSpeech: schema.preservedWords.partOfSpeech,
      source: schema.preservedWords.source,
      verificationCount: schema.preservedWords.verificationCount,
    })
    .from(schema.preservedWords)
    .where(eq(schema.preservedWords.status, 'approved'))
    .orderBy(desc(schema.preservedWords.verificationCount), desc(schema.preservedWords.createdAt))
    .limit(limit);
}

export async function getLexiconCount(): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .select({ count: sql`count(*)` })
    .from(schema.preservedWords)
    .where(eq(schema.preservedWords.status, 'approved'));
  return Number(result[0].count);
}

export async function getDialectalVariations(word: string): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      word: schema.preservedWords.word,
      definition: schema.preservedWords.definition,
      dialectalRegion: schema.preservedWords.dialectalRegion,
      pronunciationGuide: schema.preservedWords.pronunciationGuide,
    })
    .from(schema.preservedWords)
    .where(
      and(
        eq(schema.preservedWords.status, 'approved'),
        sql`${schema.preservedWords.word} LIKE ${'%' + word + '%'}`
      )
    )
    .limit(10);
}
