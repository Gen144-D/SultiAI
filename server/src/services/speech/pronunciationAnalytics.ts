import { getDb } from '../../db/connection';
import { and, eq, gte, lt, desc } from 'drizzle-orm';
import * as schema from '../../db/schema-pg';
import logger from '../../utils/logger';
import type { PronunciationAttempt, PhonemeMistake } from '../../types';

interface PronunciationStats {
  totalAttempts: number;
  avgAccuracy: number;
  avgConfidence: number;
  weeklyImprovement: number;
  monthlyImprovement: number;
  difficultWords: string[];
  masteredWords: string[];
  phonemePatterns: Record<string, number>;
}

/**
 * Callers send `mistakes` either as an array or as an already-serialised JSON
 * string. Blindly stringifying a string double-encodes it, which later makes
 * JSON.parse yield a string that iterates per character and corrupts the
 * phoneme aggregation. Normalise both shapes to a JSON array string.
 */
function serializeMistakes(mistakes: unknown): string {
  if (Array.isArray(mistakes)) return JSON.stringify(mistakes);
  if (typeof mistakes === 'string' && mistakes.trim()) {
    try {
      const parsed = JSON.parse(mistakes);
      return JSON.stringify(Array.isArray(parsed) ? parsed : []);
    } catch {
      return '[]';
    }
  }
  return '[]';
}

/** Read-side guard: only aggregate well-formed mistake objects. */
function parseMistakes(raw: unknown): PhonemeMistake[] {
  if (Array.isArray(raw)) return raw.filter((m) => m && typeof m === 'object') as PhonemeMistake[];
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && typeof m === 'object' && !Array.isArray(m)) as PhonemeMistake[];
  } catch {
    return [];
  }
}

export class PronunciationAnalyticsService {
  async recordAttempt(attempt: Omit<PronunciationAttempt, 'id' | 'timestamp'>): Promise<void> {
    try {
      const db = getDb();
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      await (db as any).insert(schema.pronunciationAttempts).values({
        id,
        userId: attempt.userId,
        word: attempt.word,
        phoneticExpected: attempt.phoneticExpected,
        phoneticHeard: attempt.phoneticHeard,
        accuracy: attempt.accuracy,
        confidence: attempt.confidence,
        mistakes: serializeMistakes(attempt.mistakes),
        lessonContext: attempt.lessonContext,
        timestamp,
      });

      logger.debug('Pronunciation attempt recorded', {
        userId: attempt.userId,
        word: attempt.word,
        accuracy: attempt.accuracy,
      });
    } catch (err) {
      logger.warn('Failed to record pronunciation attempt', {
        error: (err as Error).message,
        userId: attempt.userId,
      });
    }
  }

  async getStats(
    userId: number,
    period: 'week' | 'month' | 'all' = 'all'
  ): Promise<PronunciationStats> {
    try {
      const db = getDb();
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const attempts = await (db as any)
        .select()
        .from(schema.pronunciationAttempts)
        .where(
          and(
            eq(schema.pronunciationAttempts.userId, userId),
            gte(schema.pronunciationAttempts.timestamp, since)
          )
        )
        .orderBy(desc(schema.pronunciationAttempts.timestamp));

      if (attempts.length === 0) {
        return this.getEmptyStats();
      }

      const avgAccuracy =
        attempts.reduce((sum: number, a: any) => sum + (a.accuracy || 0), 0) / attempts.length;
      const avgConfidence =
        attempts.reduce((sum: number, a: any) => sum + (a.confidence || 0), 0) / attempts.length;

      const wordStats: Record<string, { total: number; count: number }> = {};
      const phonemePatterns: Record<string, number> = {};

      for (const attempt of attempts) {
        if (!wordStats[attempt.word]) {
          wordStats[attempt.word] = { total: 0, count: 0 };
        }
        wordStats[attempt.word].total += attempt.accuracy || 0;
        wordStats[attempt.word].count++;

        for (const m of parseMistakes(attempt.mistakes)) {
          const expected = typeof m.expected === 'string' ? m.expected : '';
          const heard = typeof m.heard === 'string' ? m.heard : '';
          if (!expected && !heard) continue;
          const key = `${expected}->${heard}`;
          phonemePatterns[key] = (phonemePatterns[key] || 0) + 1;
        }
      }

      const difficultWords = Object.entries(wordStats)
        .filter(([, s]) => s.total / s.count < 60)
        .sort((a, b) => a[1].total / a[1].count - b[1].total / b[1].count)
        .slice(0, 5)
        .map(([word]) => word);

      const masteredWords = Object.entries(wordStats)
        .filter(([, s]) => s.total / s.count >= 85 && s.count >= 3)
        .sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)
        .slice(0, 5)
        .map(([word]) => word);

      const weeklyImprovement = await this.calculateImprovement(userId, 7);
      const monthlyImprovement = await this.calculateImprovement(userId, 30);

      return {
        totalAttempts: attempts.length,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        weeklyImprovement,
        monthlyImprovement,
        difficultWords,
        masteredWords,
        phonemePatterns,
      };
    } catch (err) {
      logger.warn('Failed to get pronunciation stats', { error: (err as Error).message, userId });
      return this.getEmptyStats();
    }
  }

  async getTrend(
    userId: number,
    days: number = 30
  ): Promise<Array<{ date: string; avgAccuracy: number; attempts: number }>> {
    try {
      const db = getDb();
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const attempts = await (db as any)
        .select()
        .from(schema.pronunciationAttempts)
        .where(
          and(
            eq(schema.pronunciationAttempts.userId, userId),
            gte(schema.pronunciationAttempts.timestamp, since)
          )
        );

      const dailyData: Record<string, { total: number; count: number }> = {};
      for (const attempt of attempts) {
        const date = attempt.timestamp.split('T')[0];
        if (!dailyData[date]) dailyData[date] = { total: 0, count: 0 };
        dailyData[date].total += attempt.accuracy || 0;
        dailyData[date].count++;
      }

      return Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          avgAccuracy: Math.round((data.total / data.count) * 10) / 10,
          attempts: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      logger.warn('Failed to get pronunciation trend', { error: (err as Error).message, userId });
      return [];
    }
  }

  private async calculateImprovement(userId: number, days: number): Promise<number> {
    try {
      const db = getDb();
      const midpoint = Date.now() - (days / 2) * 24 * 60 * 60 * 1000;
      const since = new Date(midpoint).toISOString();

      const recent = await (db as any)
        .select()
        .from(schema.pronunciationAttempts)
        .where(
          and(
            eq(schema.pronunciationAttempts.userId, userId),
            gte(schema.pronunciationAttempts.timestamp, since)
          )
        );

      const older = await (db as any)
        .select()
        .from(schema.pronunciationAttempts)
        .where(
          and(
            eq(schema.pronunciationAttempts.userId, userId),
            lt(schema.pronunciationAttempts.timestamp, since)
          )
        );

      if (recent.length === 0 || older.length === 0) return 0;

      const recentAvg =
        recent.reduce((s: number, a: any) => s + (a.accuracy || 0), 0) / recent.length;
      const olderAvg = older.reduce((s: number, a: any) => s + (a.accuracy || 0), 0) / older.length;

      return Math.round((recentAvg - olderAvg) * 10) / 10;
    } catch (err) {
      logger.warn('Failed to calculate improvement', { error: (err as Error).message, userId, days });
      return 0;
    }
  }

  private getEmptyStats(): PronunciationStats {
    return {
      totalAttempts: 0,
      avgAccuracy: 0,
      avgConfidence: 0,
      weeklyImprovement: 0,
      monthlyImprovement: 0,
      difficultWords: [],
      masteredWords: [],
      phonemePatterns: {},
    };
  }
}

export const pronunciationAnalytics = new PronunciationAnalyticsService();
export default pronunciationAnalytics;
