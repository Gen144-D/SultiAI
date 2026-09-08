import { getDb } from '../../db/connection';
import * as schema from '../../db/schema-sqlite';
import { CONVERSATION_MEMORY } from '../../config';
import logger from '../../utils/logger';
import type { ConversationSummary, MemoryEntry } from '../../types';

interface ConversationRecord {
  id: string;
  userId: number;
  summary: string;
  topics: string;
  vocabulary_learned: string;
  duration: number;
  timestamp: string;
}

export class ConversationMemoryService {
  async storeConversation(
    userId: number,
    messages: Array<{ role: string; content: string }>,
    summary: string,
    topics: string[],
    vocabularyLearned: string[]
  ): Promise<void> {
    try {
      const db = getDb();
      const id = crypto.randomUUID();
      const duration = this.estimateDuration(messages);
      const now = new Date().toISOString();

      await (db as any).insert(schema.conversationSummaries).values({
        id,
        userId,
        summary,
        topics: JSON.stringify(topics),
        vocabularyLearned: JSON.stringify(vocabularyLearned),
        duration,
        timestamp: now,
      });

      await this.pruneOldMemories(userId);
    } catch (err) {
      logger.warn('Failed to store conversation memory', { error: (err as Error).message, userId });
    }
  }

  async getRelevantContext(userId: number, currentTopic?: string): Promise<MemoryEntry[]> {
    try {
      const db = getDb();
      const since = new Date(
        Date.now() - CONVERSATION_MEMORY.MEMORY_DECAY_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      const records = await (db as any)
        .select()
        .from(schema.conversationSummaries)
        .where(
          (db as any).and(
            (db as any).eq(schema.conversationSummaries.userId, userId),
            (db as any).gte(schema.conversationSummaries.timestamp, since)
          )
        )
        .orderBy((db as any).desc(schema.conversationSummaries.timestamp))
        .limit(CONVERSATION_MEMORY.MAX_SUMMARY_ENTRIES);

      const entries: MemoryEntry[] = [];
      for (const record of records) {
        const topics = this.safeParseArray(record.topics);
        const vocabulary = this.safeParseArray(record.vocabulary_learned);

        for (const topic of topics) {
          entries.push({
            type: 'topic',
            content: topic,
            importance: this.calculateImportance(record.timestamp, currentTopic === topic),
            lastAccessed: record.timestamp,
          });
        }

        for (const word of vocabulary) {
          entries.push({
            type: 'vocabulary',
            content: word,
            importance: 0.8,
            lastAccessed: record.timestamp,
          });
        }
      }

      return entries.sort((a, b) => b.importance - a.importance).slice(0, 20);
    } catch {
      return [];
    }
  }

  async extractPreferences(userId: number): Promise<string[]> {
    try {
      const entries = await this.getRelevantContext(userId);
      return entries
        .filter((e) => e.type === 'topic')
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5)
        .map((e) => e.content);
    } catch {
      return [];
    }
  }

  private async pruneOldMemories(userId: number): Promise<void> {
    try {
      const db = getDb();
      const cutoff = new Date(
        Date.now() - CONVERSATION_MEMORY.MEMORY_DECAY_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      await (db as any)
        .delete(schema.conversationSummaries)
        .where(
          (db as any).and(
            (db as any).eq(schema.conversationSummaries.userId, userId),
            (db as any).lt(schema.conversationSummaries.timestamp, cutoff)
          )
        );
    } catch {}
  }

  private calculateImportance(timestamp: string, isRelevant: boolean): number {
    const age = Date.now() - new Date(timestamp).getTime();
    const daysSince = age / (24 * 60 * 60 * 1000);
    const recencyFactor = Math.pow(CONVERSATION_MEMORY.IMPORTANCE_DECAY_RATE, daysSince);
    const relevanceBoost = isRelevant ? 0.3 : 0;
    return Math.min(1, recencyFactor + relevanceBoost);
  }

  private estimateDuration(messages: Array<{ role: string; content: string }>): number {
    const wordCount = messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
    return Math.round((wordCount / 150) * 60);
  }

  private safeParseArray(val: string | null): string[] {
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
}

export const conversationMemory = new ConversationMemoryService();
export default conversationMemory;
