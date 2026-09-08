import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from '../connection';
import * as schema from '../schema-sqlite';

export async function getConversations(userEmail: string): Promise<any[]> {
  const db = getDb();
  const userSubquery = (db as any)
    .select({ id: schema.users.userId })
    .from(schema.users)
    .where(eq(schema.users.email, userEmail));

  const rows = await (db as any)
    .select({
      conversationId: schema.conversations.conversationId,
      title: schema.conversations.title,
      createdAt: schema.conversations.createdAt,
      sender: schema.conversationMessages.sender,
      message: schema.conversationMessages.message,
      translatedMessage: schema.conversationMessages.translatedMessage,
    })
    .from(schema.conversations)
    .leftJoin(
      schema.conversationMessages,
      eq(schema.conversations.conversationId, schema.conversationMessages.conversationId)
    )
    .where(
      eq(
        schema.conversations.userId,
        (db as any)
          .select({ id: schema.users.userId })
          .from(schema.users)
          .where(eq(schema.users.email, userEmail))
      )
    )
    .orderBy(desc(schema.conversations.createdAt));

  const convoMap = new Map<number, any>();
  for (const row of rows) {
    if (!convoMap.has(row.conversationId)) {
      convoMap.set(row.conversationId, {
        id: String(row.conversationId),
        title: row.title,
        messages: [],
        createdAt: row.createdAt,
      });
    }
    if (row.message) {
      convoMap.get(row.conversationId).messages.push({
        type: row.sender,
        text: row.message,
      });
    }
  }
  return Array.from(convoMap.values());
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

export async function createConversation(userId: number, title: string | null): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .insert(schema.conversations)
    .values({ userId, title })
    .returning();
  return result[0].conversationId;
}

export async function addMessages(
  conversationId: number,
  messages: { type: string; text: string }[]
): Promise<void> {
  const db = getDb();
  const values = messages.map((m) => ({
    conversationId,
    sender: m.type || 'user',
    message: m.text || '',
  }));
  await (db as any).insert(schema.conversationMessages).values(values);
}

export async function deleteConversation(conversationId: number, userEmail: string): Promise<void> {
  const db = getDb();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return;
  await (db as any)
    .delete(schema.conversations)
    .where(
      and(
        eq(schema.conversations.conversationId, conversationId),
        eq(schema.conversations.userId, userId)
      )
    );
}
