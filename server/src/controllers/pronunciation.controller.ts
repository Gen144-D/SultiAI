import { Request, Response } from 'express';
import { pronunciationAnalytics } from '../services/speech';
import { success, errors } from '../utils/apiResponse';
import logger from '../utils/logger';
import type { PronunciationAttempt } from '../types';

export async function recordAttempt(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const {
      word,
      phonetic_expected,
      phonetic_heard,
      accuracy,
      confidence,
      mistakes,
      lesson_context,
    } = req.body || {};
    if (!word) {
      errors.validation(res, 'Word is required');
      return;
    }

    await pronunciationAnalytics.recordAttempt({
      userId,
      word,
      phoneticExpected: phonetic_expected || '',
      phoneticHeard: phonetic_heard || '',
      accuracy: accuracy || 0,
      confidence: confidence || 0,
      mistakes: mistakes || [],
      lessonContext: lesson_context,
    });

    success(res, { word, accuracy }, 'Pronunciation attempt recorded');
  } catch (err) {
    logger.error('Record pronunciation error', { error: (err as Error).message });
    errors.internal(res, 'Failed to record pronunciation attempt');
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const period = (req.query.period as 'week' | 'month' | 'all') || 'all';
    const stats = await pronunciationAnalytics.getStats(userId, period);
    success(res, stats);
  } catch (err) {
    logger.error('Get pronunciation stats error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get pronunciation stats');
  }
}

export async function getTrend(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const trend = await pronunciationAnalytics.getTrend(userId, days);
    success(res, trend);
  } catch (err) {
    logger.error('Get pronunciation trend error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get pronunciation trend');
  }
}

async function getUserIdFromEmail(email: string): Promise<number | undefined> {
  const { getUserIdByEmail } = await import('../db/repositories/conversation.repo');
  return getUserIdByEmail(email);
}
