import { eq, desc, and, asc } from 'drizzle-orm';
import { getDb } from '../connection';
import * as schema from '../schema-pg';

const VALID_SENDERS = new Set(['user', 'assistant', 'user_voice', 'system', 'lesson']);

/**
 * Normalize a client message into `{ role, text }`.
 *
 * Clients send `role` (user / assistant / user_voice / lesson), but older
 * callers sent `type`. Reading only `type` silently coerced every assistant
 * turn into a `user` row, which is why history showed only the learner's half
 * of each exchange.
 */
function normalizeMessage(m: any): { role: string; text: string; translated: string | null } {
  const role = String(m?.role ?? m?.type ?? 'user');
  const text = String(m?.text ?? m?.message ?? m?.content ?? '');
  const translated = m?.translatedMessage ?? m?.translation ?? null;
  return {
    role: VALID_SENDERS.has(role) ? role : 'user',
    text,
    translated: translated == null ? null : String(translated),
  };
}

export async function getConversations(userEmail: string): Promise<any[]> {
  const db = getDb();

  const rows = await (db as any)
    .select({
      conversationId: schema.conversations.conversationId,
      title: schema.conversations.title,
      createdAt: schema.conversations.createdAt,
      messageId: schema.conversationMessages.messageId,
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
    // Conversations newest-first, but the messages inside each one stay in
    // the order they were actually spoken.
    .orderBy(desc(schema.conversations.createdAt), asc(schema.conversationMessages.messageId));

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
      const { role, text, translated } = normalizeMessage({
        role: row.sender,
        text: row.message,
        translatedMessage: row.translatedMessage,
      });
      convoMap.get(row.conversationId).messages.push({
        role,
        type: role, // legacy alias for older clients
        text,
        ...(translated ? { translatedMessage: translated } : {}),
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

/** Ownership check so one user can never overwrite another's conversation. */
export async function conversationBelongsTo(
  conversationId: number,
  userId: number
): Promise<boolean> {
  const db = getDb();
  const rows = await (db as any)
    .select({ id: schema.conversations.conversationId })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.conversationId, conversationId),
        eq(schema.conversations.userId, userId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function addMessages(
  conversationId: number,
  messages: { role?: string; type?: string; text?: string; translatedMessage?: string | null }[]
): Promise<void> {
  const normalized = messages.map(normalizeMessage);
  if (normalized.length === 0) return;
  const db = getDb();
  const values = normalized.map((m) => ({
    conversationId,
    sender: m.role,
    message: m.text,
    translatedMessage: m.translated,
  }));
  await (db as any).insert(schema.conversationMessages).values(values);
}

/**
 * Replace a conversation's messages wholesale. Used for upserts, where the
 * client holds the full authoritative transcript and re-sends it each turn —
 * appending instead would duplicate the whole thread once per message.
 */
export async function replaceMessages(
  conversationId: number,
  title: string | null,
  messages: { role?: string; type?: string; text?: string; translatedMessage?: string | null }[]
): Promise<void> {
  const normalized = messages.map(normalizeMessage);
  const db = getDb();
  await (db as any)
    .delete(schema.conversationMessages)
    .where(eq(schema.conversationMessages.conversationId, conversationId));
  if (title) {
    await (db as any)
      .update(schema.conversations)
      .set({ title })
      .where(eq(schema.conversations.conversationId, conversationId));
  }
  if (normalized.length === 0) return;
  await (db as any).insert(schema.conversationMessages).values(
    normalized.map((m) => ({
      conversationId,
      sender: m.role,
      message: m.text,
      translatedMessage: m.translated,
    }))
  );
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
