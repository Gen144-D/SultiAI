import { getDb } from '../../db/connection';
import * as schema from '../../db/schema-sqlite';
import { SM2_DEFAULTS } from '../../config';
import logger from '../../utils/logger';
import type { VocabularyItem } from '../../types';

interface Sm2Result {
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  nextReview: string;
}

export class VocabularyIntelligenceService {
  async addWord(
    userId: number,
    word: string,
    translation: string,
    options: {
      pronunciation?: string;
      category?: string;
      difficulty?: number;
    } = {}
  ): Promise<void> {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      const existing = await (db as any)
        .select()
        .from(schema.vocabularyReviews)
        .where(
          (db as any).and(
            (db as any).eq(schema.vocabularyReviews.userId, userId),
            (db as any).eq(schema.vocabularyReviews.word, word)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await (db as any)
          .update(schema.vocabularyReviews)
          .set({
            usageFrequency: (db as any).sql`usage_frequency + 1`,
            updatedAt: now,
          })
          .where((db as any).eq(schema.vocabularyReviews.id, existing[0].id));
        return;
      }

      const id = crypto.randomUUID();
      const nextReview = new Date(
        Date.now() + SM2_DEFAULTS.INITIAL_INTERVAL * 24 * 60 * 60 * 1000
      ).toISOString();

      await (db as any).insert(schema.vocabularyReviews).values({
        id,
        userId,
        word,
        translation,
        pronunciation: options.pronunciation || '',
        category: options.category || 'custom',
        difficulty: options.difficulty || 1,
        mastery: 0,
        reviewCount: 0,
        easeFactor: SM2_DEFAULTS.INITIAL_EASE_FACTOR,
        interval: SM2_DEFAULTS.INITIAL_INTERVAL,
        nextReview,
        isFavorite: false,
        usageFrequency: 1,
        createdAt: now,
        updatedAt: now,
      });

      logger.debug('Vocabulary word added', { userId, word });
    } catch (err) {
      logger.warn('Failed to add vocabulary word', { error: (err as Error).message, userId, word });
    }
  }

  async reviewWord(userId: number, word: string, quality: number): Promise<Sm2Result> {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      const existing = await (db as any)
        .select()
        .from(schema.vocabularyReviews)
        .where(
          (db as any).and(
            (db as any).eq(schema.vocabularyReviews.userId, userId),
            (db as any).eq(schema.vocabularyReviews.word, word)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await this.addWord(userId, word, '');
        return this.reviewWord(userId, word, quality);
      }

      const item = existing[0];
      const sm2Result = this.calculateSm2(
        quality,
        item.easeFactor || SM2_DEFAULTS.INITIAL_EASE_FACTOR,
        item.interval || SM2_DEFAULTS.INITIAL_INTERVAL,
        item.reviewCount || 0
      );

      const mastery =
        quality >= 4
          ? Math.min(100, (item.mastery || 0) + 15)
          : Math.max(0, (item.mastery || 0) - 5);

      await (db as any)
        .update(schema.vocabularyReviews)
        .set({
          mastery,
          reviewCount: (item.reviewCount || 0) + 1,
          easeFactor: sm2Result.easeFactor,
          interval: sm2Result.interval,
          nextReview: sm2Result.nextReview,
          lastReview: now,
          updatedAt: now,
        })
        .where((db as any).eq(schema.vocabularyReviews.id, item.id));

      logger.debug('Word reviewed', {
        userId,
        word,
        quality,
        mastery,
        interval: sm2Result.interval,
      });

      return sm2Result;
    } catch (err) {
      logger.warn('Failed to review word', { error: (err as Error).message, userId, word });
      return {
        easeFactor: SM2_DEFAULTS.INITIAL_EASE_FACTOR,
        interval: SM2_DEFAULTS.INITIAL_INTERVAL,
        repetitionCount: 0,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  async getDueWords(userId: number, limit = 20): Promise<VocabularyItem[]> {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      const due = await (db as any)
        .select()
        .from(schema.vocabularyReviews)
        .where(
          (db as any).and(
            (db as any).eq(schema.vocabularyReviews.userId, userId),
            (db as any).lte(schema.vocabularyReviews.nextReview, now)
          )
        )
        .orderBy(schema.vocabularyReviews.nextReview)
        .limit(limit);

      return due.map((d: any) => ({
        id: d.id,
        userId: d.userId,
        word: d.word,
        translation: d.translation || '',
        pronunciation: d.pronunciation || '',
        category: d.category || 'custom',
        difficulty: d.difficulty || 1,
        mastery: d.mastery || 0,
        reviewCount: d.reviewCount || 0,
        easeFactor: d.easeFactor || SM2_DEFAULTS.INITIAL_EASE_FACTOR,
        interval: d.interval || SM2_DEFAULTS.INITIAL_INTERVAL,
        nextReview: d.nextReview,
        lastReview: d.lastReview,
        isFavorite: d.isFavorite || false,
        usageFrequency: d.usageFrequency || 0,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    } catch {
      return [];
    }
  }

  async getMasteryStats(userId: number): Promise<{
    totalWords: number;
    masteredWords: number;
    avgMastery: number;
    dueToday: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      const words = await (db as any)
        .select()
        .from(schema.vocabularyReviews)
        .where((db as any).eq(schema.vocabularyReviews.userId, userId));

      const totalWords = words.length;
      const masteredWords = words.filter((w: any) => (w.mastery || 0) >= 80).length;
      const avgMastery =
        totalWords > 0
          ? words.reduce((s: number, w: any) => s + (w.mastery || 0), 0) / totalWords
          : 0;

      const dueToday = words.filter((w: any) => w.nextReview <= now).length;

      const byCategory: Record<string, number> = {};
      for (const w of words) {
        const cat = w.category || 'custom';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }

      return {
        totalWords,
        masteredWords,
        avgMastery: Math.round(avgMastery),
        dueToday,
        byCategory,
      };
    } catch {
      return { totalWords: 0, masteredWords: 0, avgMastery: 0, dueToday: 0, byCategory: {} };
    }
  }

  async toggleFavorite(userId: number, word: string): Promise<boolean> {
    try {
      const db = getDb();
      const existing = await (db as any)
        .select()
        .from(schema.vocabularyReviews)
        .where(
          (db as any).and(
            (db as any).eq(schema.vocabularyReviews.userId, userId),
            (db as any).eq(schema.vocabularyReviews.word, word)
          )
        )
        .limit(1);

      if (existing.length === 0) return false;

      const newValue = !existing[0].isFavorite;
      await (db as any)
        .update(schema.vocabularyReviews)
        .set({ isFavorite: newValue, updatedAt: new Date().toISOString() })
        .where((db as any).eq(schema.vocabularyReviews.id, existing[0].id));

      return newValue;
    } catch {
      return false;
    }
  }

  private calculateSm2(
    quality: number,
    easeFactor: number,
    interval: number,
    repetitionCount: number
  ): Sm2Result {
    let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < SM2_DEFAULTS.MIN_EASE_FACTOR) {
      newEaseFactor = SM2_DEFAULTS.MIN_EASE_FACTOR;
    }

    let newInterval: number;
    let newRepCount: number;

    if (quality < SM2_DEFAULTS.GRADING_THRESHOLD_PASS) {
      newRepCount = 0;
      newInterval = 1;
    } else {
      newRepCount = repetitionCount + 1;
      if (newRepCount === 1) {
        newInterval = 1;
      } else if (newRepCount === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEaseFactor);
      }
    }

    if (newInterval > SM2_DEFAULTS.MAX_INTERVAL) {
      newInterval = SM2_DEFAULTS.MAX_INTERVAL;
    }

    const nextReview = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000).toISOString();

    return {
      easeFactor: Math.round(newEaseFactor * 100) / 100,
      interval: newInterval,
      repetitionCount: newRepCount,
      nextReview,
    };
  }
}

export const vocabularyIntelligence = new VocabularyIntelligenceService();
export default vocabularyIntelligence;
