import { Request, Response } from 'express';
import { aiPipeline } from '../services/ai';
import { adaptiveLearningEngine } from '../services/adaptive';
import { upsertProfileFromAnalysis } from '../db/repositories/learner.repo';
import { success, errors, created } from '../utils/apiResponse';
import logger from '../utils/logger';

export async function getLevel(req: Request, res: Response): Promise<void> {
  try {
    const { getProfile } = await import('../db/repositories/learner.repo');
    const profile = await getProfile(req.user!.email);
    if (!profile) {
      success(res, {
        level: 'beginner',
        strengths: [],
        weak_areas: [],
        common_mistakes: [],
        total_xp: 0,
        total_sessions: 0,
      });
      return;
    }
    success(res, {
      level: profile.level,
      strengths: profile.strengths || [],
      weak_areas: profile.weakAreas || [],
      common_mistakes: profile.commonMistakes || [],
      total_xp: profile.totalXp || 0,
      total_sessions: profile.totalSessions || 0,
      last_active: profile.lastActive || null,
    });
  } catch (err) {
    logger.error('Get level error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get level');
  }
}

export async function getMistakes(req: Request, res: Response): Promise<void> {
  try {
    const { getMistakes } = await import('../db/repositories/learner.repo');
    const mistakes = await getMistakes(req.user!.email);
    success(res, mistakes);
  } catch (err) {
    logger.error('Get mistakes error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get mistakes');
  }
}

export async function generateLesson(req: Request, res: Response): Promise<void> {
  try {
    const { situation } = req.body || {};
    if (!situation) {
      errors.validation(res, 'Situation is required');
      return;
    }

    const lesson = await aiPipeline.generateLesson(situation, req.user!.email);
    success(res, { role: 'lesson', ...lesson }, 'Lesson generated');
  } catch (err) {
    logger.error('Lesson error', { error: (err as Error).message });
    errors.aiError(res, 'Lesson generation failed');
  }
}

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, audio, session_id } = req.body || {};
    if (!message && !audio) {
      errors.validation(res, 'Message or audio is required');
      return;
    }

    const result = await aiPipeline.process(
      { message, audio, session_id, nativeLanguage: 'English' },
      req.user!.email
    );

    const { getSessionMessages, createSession, updateSession } =
      await import('../db/repositories/tutor.repo');
    let sessionId = session_id;
    let sessionMessages: any[] = [];

    if (session_id) {
      try {
        const msgs = await getSessionMessages(Number(session_id), req.user!.email);
        sessionMessages = Array.isArray(msgs) ? msgs : [];
      } catch {}
    }

    sessionMessages.push({ role: 'user', content: message || result.transcription || '' });
    sessionMessages.push({ role: 'assistant', content: result.reply });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (sessionId) {
      await updateSession(Number(sessionId), sessionMessages, now);
    } else {
      const id = await createSession(req.user!.email, sessionMessages, now);
      sessionId = String(id);
    }

    try {
      await upsertProfileFromAnalysis(
        req.user!.email,
        result.analysis,
        message || '',
        result.reply,
        session_id
      );
    } catch (err) {
      logger.warn('Profile update error', { error: (err as Error).message });
    }

    success(
      res,
      {
        reply: result.reply,
        session_id: sessionId,
        transcription: result.transcription,
        pronunciation: result.pronunciation,
        analysis: result.analysis,
        recommendations: result.recommendations,
      },
      'Chat response generated'
    );
  } catch (err) {
    logger.error('Tutor chat error', { error: (err as Error).message });
    errors.aiError(res, 'Tutor chat failed');
  }
}

export async function getAdaptiveRecommendation(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const state = await adaptiveLearningEngine.getAdaptiveState(userId);
    const vocabularyModule = await import('../services/speech/vocabularyIntelligence');
    const dueWords = await vocabularyModule.vocabularyIntelligence.getDueWords(userId);

    success(res, {
      level: state.currentLevel,
      composite_score: state.compositeScore,
      sessions_at_level: state.sessionsAtLevel,
      topic_masteries: state.topicMasteries,
      due_words: dueWords.length,
    });
  } catch (err) {
    logger.error('Adaptive recommendation error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get recommendation');
  }
}

async function getUserIdFromEmail(email: string): Promise<number | undefined> {
  const { getUserIdByEmail } = await import('../db/repositories/conversation.repo');
  return getUserIdByEmail(email);
}
