import { eq, and, desc } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

export async function getNotifications(userEmail: string): Promise<any[]> {
  const db = getDb();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return [];

  const rows = await (db as any)
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);

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

export async function createNotification(
  userId: number,
  title: string,
  message: string
): Promise<void> {
  const db = getDb();
  await (db as any).insert(schema.notifications).values({ userId, title, message, isRead: 0 });
}

export async function markAsRead(notifyId: number, userEmail: string): Promise<void> {
  const db = getDb();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return;
  await (db as any)
    .update(schema.notifications)
    .set({ isRead: 1 })
    .where(
      and(eq(schema.notifications.notifyId, notifyId), eq(schema.notifications.userId, userId))
    );
}

export async function markAllAsRead(userEmail: string): Promise<number> {
  const db = getDb();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return 0;

  const result = await (db as any)
    .update(schema.notifications)
    .set({ isRead: 1 })
    .where(eq(schema.notifications.userId, userId));

  const affected =
    typeof result?.changes === 'number'
      ? result.changes
      : typeof result?.rowCount === 'number'
        ? result.rowCount
        : 0;
  return affected;
}
