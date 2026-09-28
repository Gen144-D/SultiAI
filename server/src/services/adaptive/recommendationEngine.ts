import { eq } from 'drizzle-orm';
import { getDb, getSchema } from '../../db/connection';
import adaptiveLearningEngine from './learningEngine';
import logger from '../../utils/logger';

interface LessonRecommendation {
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  reason: string;
  priority: number;
}

interface StudyPlan {
  dailyGoal: number;
  lessons: LessonRecommendation[];
  reviewWords: string[];
  practiceAreas: string[];
  estimatedMinutes: number;
}

export class RecommendationEngine {
  async generateStudyPlan(userId: number): Promise<StudyPlan> {
    try {
      const state = await adaptiveLearningEngine.getAdaptiveState(userId);
      const dueWords = await this.getDueWords(userId);
      const weakAreas = await this.getWeakAreas(userId);
      const recentMistakes = await this.getRecentMistakes(userId);

      const lessons = this.generateLessonRecommendations(state, weakAreas, recentMistakes);
      const dailyGoal = this.calculateDailyGoal(state);

      return {
        dailyGoal,
        lessons: lessons.slice(0, 3),
        reviewWords: dueWords.slice(0, 10),
        practiceAreas: weakAreas.slice(0, 3),
        estimatedMinutes: lessons.length * 5 + dueWords.length * 2,
      };
    } catch (err) {
      logger.warn('Failed to generate study plan', { error: (err as Error).message, userId });
      return this.getDefaultPlan();
    }
  }

  async getPersonalizedGreeting(userId: number): Promise<string> {
    try {
      const state = await adaptiveLearningEngine.getAdaptiveState(userId);
      const dueCount = (await this.getDueWords(userId)).length;

      if (dueCount > 5) {
        return `Welcome back! You have ${dueCount} words ready for review. Let's strengthen your memory!`;
      }
      if (state.currentLevel !== 'beginner') {
        return `Ready for your next ${state.currentLevel} lesson? Let's keep the momentum going!`;
      }
      return "Ready to practice Bisaya today? Let's start with some useful phrases!";
    } catch {
      return 'Ready to practice Bisaya today?';
    }
  }

  private generateLessonRecommendations(
    state: any,
    weakAreas: string[],
    recentMistakes: string[]
  ): LessonRecommendation[] {
    const recommendations: LessonRecommendation[] = [];

    for (const area of weakAreas.slice(0, 3)) {
      recommendations.push({
        topic: area,
        difficulty: state.currentLevel,
        reason: `Focus on weak area: ${area}`,
        priority: 1,
      });
    }

    if (recentMistakes.length > 0) {
      recommendations.push({
        topic: 'mistake_review',
        difficulty: state.currentLevel,
        reason: `Review ${recentMistakes.length} recent mistake patterns`,
        priority: 2,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        topic: 'conversation_practice',
        difficulty: state.currentLevel,
        reason: 'Continue building fluency',
        priority: 3,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private async getDueWords(userId: number): Promise<string[]> {
    try {
      const db = getDb();
      const schema = getSchema();
      const now = new Date().toISOString();
      const due = await (db as any)
        .select()
        .from(schema.vocabularyReviews)
        .where(
          (db as any).and(
            eq(schema.vocabularyReviews.userId, userId),
            (db as any).lte(schema.vocabularyReviews.nextReview, now)
          )
        )
        .limit(20);
      return due.map((d: any) => d.word);
    } catch {
      return [];
    }
  }

  private async getWeakAreas(userId: number): Promise<string[]> {
    try {
      const db = getDb();
      const schema = getSchema();
      const rows = await (db as any)
        .select()
        .from(schema.learnerProfiles)
        .where(eq(schema.learnerProfiles.userId, userId))
        .limit(1);

      if (rows.length === 0) return [];
      const profile = rows[0];
      if (profile.weakAreas) {
        try {
          return JSON.parse(profile.weakAreas);
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  private async getRecentMistakes(userId: number): Promise<string[]> {
    try {
      const db = getDb();
      const schema = getSchema();
      const rows = await (db as any)
        .select()
        .from(schema.learnerProfiles)
        .where(eq(schema.learnerProfiles.userId, userId))
        .limit(1);

      if (rows.length === 0) return [];
      const profile = rows[0];
      if (profile.commonMistakes) {
        try {
          const mistakes = JSON.parse(profile.commonMistakes);
          return Array.isArray(mistakes) ? mistakes.slice(0, 5).map((m: any) => m.pattern) : [];
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  private calculateDailyGoal(state: any): number {
    const base = 50;
    const streakBonus = Math.min(20, (state.sessionsAtLevel || 0) * 2);
    return base + streakBonus;
  }

  private getDefaultPlan(): StudyPlan {
    return {
      dailyGoal: 50,
      lessons: [
        { topic: 'greetings', difficulty: 'beginner', reason: 'Start with basics', priority: 1 },
      ],
      reviewWords: [],
      practiceAreas: ['pronunciation'],
      estimatedMinutes: 15,
    };
  }
}

export const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;
