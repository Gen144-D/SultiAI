import { getDb } from '../../db/connection';
import * as schema from '../../db/schema-sqlite';
import { ADAPTIVE_PARAMS, XP_VALUES } from '../../config';
import logger from '../../utils/logger';
import type { RecommendationInput, RecommendationOutput } from '../../types';

interface TopicMastery {
  topic: string;
  attempts: number;
  successes: number;
  avgScore: number;
  lastPracticed: string;
}

interface AdaptiveState {
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  sessionsAtLevel: number;
  topicMasteries: TopicMastery[];
  compositeScore: number;
}

export class AdaptiveLearningEngine {
  async assessDifficulty(userId: number): Promise<'beginner' | 'intermediate' | 'advanced'> {
    const state = await this.getAdaptiveState(userId);
    return state.currentLevel;
  }

  async generateRecommendations(input: RecommendationInput): Promise<RecommendationOutput> {
    const state = await this.getAdaptiveState(input.userId);
    const weakTopics = this.getWeakTopics(state);
    const reviewWords = await this.getDueReviewWords(input.userId);

    const reasoning: string[] = [];

    let lessonDifficulty = state.currentLevel;
    if (
      state.compositeScore >= ADAPTIVE_PARAMS.MASTERY_THRESHOLD_UP &&
      state.sessionsAtLevel >= ADAPTIVE_PARAMS.SESSIONS_TO_LEVEL_UP
    ) {
      lessonDifficulty = this.getNextLevel(state.currentLevel);
      reasoning.push(
        `Promoted to ${lessonDifficulty} (composite: ${state.compositeScore.toFixed(2)})`
      );
    } else if (
      state.compositeScore <= ADAPTIVE_PARAMS.MASTERY_THRESHOLD_DOWN &&
      state.sessionsAtLevel >= ADAPTIVE_PARAMS.SESSIONS_TO_LEVEL_DOWN
    ) {
      lessonDifficulty = this.getPreviousLevel(state.currentLevel);
      reasoning.push(
        `Adjusted to ${lessonDifficulty} (composite: ${state.compositeScore.toFixed(2)})`
      );
    }

    const suggestedTopics = [...new Set([...weakTopics, ...input.weakAreas])].slice(0, 5);
    if (suggestedTopics.length === 0 && input.recentTopics.length > 0) {
      suggestedTopics.push(input.recentTopics[0]);
    }

    const dailyGoal = this.calculateDailyGoal(input.streakStatus, input.vocabularyMastery);

    const focusAreas = weakTopics.slice(0, 3);
    if (input.pronunciationAccuracy < 70) {
      focusAreas.push('pronunciation');
    }

    return {
      lessonDifficulty,
      suggestedTopics,
      reviewWords: reviewWords.slice(0, 10),
      dailyGoal,
      focusAreas,
      reasoning: reasoning.join('; ') || `Maintaining ${lessonDifficulty} level`,
    };
  }

  async recordSession(
    userId: number,
    topic: string,
    accuracy: number,
    wordsPracticed: number
  ): Promise<void> {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      const existing = await (db as any)
        .select()
        .from(schema.learningProgress)
        .where(
          (db as any).and(
            (db as any).eq(schema.learningProgress.userId, userId),
            (db as any).eq(schema.learningProgress.moduleId, await this.getModuleId(topic))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0];
        const newCompletion = Math.min(100, (current.completionPercent || 0) + accuracy * 0.1);
        await (db as any)
          .update(schema.learningProgress)
          .set({ completionPercent: newCompletion, updatedAt: now })
          .where((db as any).eq(schema.learningProgress.progressId, current.progressId));
      } else {
        await (db as any).insert(schema.learningProgress).values({
          userId,
          moduleId: await this.getModuleId(topic),
          completionPercent: accuracy * 0.1,
          createdAt: now,
          updatedAt: now,
        });
      }

      logger.debug('Session recorded', { userId, topic, accuracy, wordsPracticed });
    } catch (err) {
      logger.warn('Failed to record session', { error: (err as Error).message, userId });
    }
  }

  async getAdaptiveState(userId: number): Promise<AdaptiveState> {
    try {
      const db = getDb();
      const profileRows = await (db as any)
        .select()
        .from(schema.learnerProfiles)
        .where((db as any).eq(schema.learnerProfiles.userId, userId))
        .limit(1);

      const profile = profileRows[0];
      if (!profile) {
        return this.getDefaultState();
      }

      const progressRows = await (db as any)
        .select()
        .from(schema.learningProgress)
        .where((db as any).eq(schema.learningProgress.userId, userId));

      const topicMasteries = this.calculateTopicMasteries(progressRows);
      const compositeScore = this.calculateCompositeScore(topicMasteries, profile);

      return {
        currentLevel: (profile.level || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
        sessionsAtLevel: profile.totalSessions || 0,
        topicMasteries,
        compositeScore,
      };
    } catch {
      return this.getDefaultState();
    }
  }

  private calculateTopicMasteries(progressRows: any[]): TopicMastery[] {
    const topics: Record<string, { attempts: number; totalScore: number; lastPracticed: string }> =
      {};

    for (const row of progressRows) {
      const topic = row.topic || 'general';
      if (!topics[topic]) {
        topics[topic] = {
          attempts: 0,
          totalScore: 0,
          lastPracticed: row.updatedAt || row.createdAt || '',
        };
      }
      topics[topic].attempts++;
      topics[topic].totalScore += row.completionPercent || 0;
      if (row.updatedAt && row.updatedAt > topics[topic].lastPracticed) {
        topics[topic].lastPracticed = row.updatedAt;
      }
    }

    return Object.entries(topics).map(([topic, data]) => ({
      topic,
      attempts: data.attempts,
      successes: Math.round((data.totalScore / data.attempts / 100) * data.attempts),
      avgScore: data.totalScore / data.attempts,
      lastPracticed: data.lastPracticed,
    }));
  }

  private calculateCompositeScore(topicMasteries: TopicMastery[], profile: any): number {
    if (topicMasteries.length === 0) return 0.5;

    const avgMastery =
      topicMasteries.reduce((sum, t) => sum + t.avgScore / 100, 0) / topicMasteries.length;
    const avgAttempts =
      topicMasteries.reduce((sum, t) => sum + t.attempts, 0) / topicMasteries.length;
    const experienceFactor = Math.min(1, avgAttempts / 10);

    return avgMastery * 0.6 + experienceFactor * 0.4;
  }

  private getWeakTopics(state: AdaptiveState): string[] {
    return state.topicMasteries
      .filter((t) => t.avgScore < 70)
      .sort((a, b) => a.avgScore - b.avgScore)
      .map((t) => t.topic);
  }

  private async getDueReviewWords(userId: number): Promise<string[]> {
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
        .limit(20);

      return due.map((d: any) => d.word);
    } catch {
      return [];
    }
  }

  private calculateDailyGoal(streak: number, vocabularyMastery: number): number {
    const base = 50;
    const streakBonus = Math.min(20, streak * 2);
    const masteryAdjustment = vocabularyMastery > 70 ? 10 : 0;
    return base + streakBonus + masteryAdjustment;
  }

  private getNextLevel(current: string): 'beginner' | 'intermediate' | 'advanced' {
    if (current === 'beginner') return 'intermediate';
    if (current === 'intermediate') return 'advanced';
    return 'advanced';
  }

  private getPreviousLevel(current: string): 'beginner' | 'intermediate' | 'advanced' {
    if (current === 'advanced') return 'intermediate';
    if (current === 'intermediate') return 'beginner';
    return 'beginner';
  }

  private async getModuleId(topic: string): Promise<number> {
    try {
      const db = getDb();
      const modules = await (db as any)
        .select()
        .from(schema.learningModules)
        .where((db as any).like(schema.learningModules.moduleTitle, `%${topic}%`))
        .limit(1);

      if (modules.length > 0) return modules[0].moduleId;

      const result = await (db as any).insert(schema.learningModules).values({
        moduleTitle: topic,
        difficulty: 'intermediate',
        createdAt: new Date().toISOString(),
      });

      return result.lastInsertRowid;
    } catch {
      return 1;
    }
  }

  private getDefaultState(): AdaptiveState {
    return {
      currentLevel: 'beginner',
      sessionsAtLevel: 0,
      topicMasteries: [],
      compositeScore: 0.5,
    };
  }
}

export const adaptiveLearningEngine = new AdaptiveLearningEngine();
export default adaptiveLearningEngine;
