import { eq } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

export async function getUserIdByEmail(email: string): Promise<number | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows[0]?.userId;
}

export async function submitFeedback(
  userId: number,
  functionality: number,
  usability: number,
  reliability: number
): Promise<void> {
  const db = getDb();
  await (db as any)
    .insert(schema.feedback)
    .values({ userId, functionality, usability, reliability });
}
