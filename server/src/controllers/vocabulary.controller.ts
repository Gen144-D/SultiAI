import { Request, Response } from 'express';
import { vocabularyIntelligence } from '../services/speech';
import { success, errors, created, paginate } from '../utils/apiResponse';
import logger from '../utils/logger';

export async function addWord(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const { word, translation, pronunciation, category, difficulty } = req.body || {};
    if (!word) {
      errors.validation(res, 'Word is required');
      return;
    }

    await vocabularyIntelligence.addWord(userId, word, translation || '', {
      pronunciation,
      category,
      difficulty,
    });

    created(res, { word, translation, category }, 'Word added to vocabulary');
  } catch (err) {
    logger.error('Add word error', { error: (err as Error).message });
    errors.internal(res, 'Failed to add word');
  }
}

export async function reviewWord(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const { word, quality } = req.body || {};
    if (!word || quality === undefined) {
      errors.validation(res, 'Word and quality (0-5) are required');
      return;
    }

    if (quality < 0 || quality > 5) {
      errors.validation(res, 'Quality must be between 0 and 5');
      return;
    }

    const result = await vocabularyIntelligence.reviewWord(userId, word, quality);
    success(
      res,
      {
        word,
        ease_factor: result.easeFactor,
        interval: result.interval,
        next_review: result.nextReview,
        repetition_count: result.repetitionCount,
      },
      'Word reviewed'
    );
  } catch (err) {
    logger.error('Review word error', { error: (err as Error).message });
    errors.internal(res, 'Failed to review word');
  }
}

export async function getDueWords(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const words = await vocabularyIntelligence.getDueWords(userId, limit);
    success(res, words, `${words.length} words due for review`);
  } catch (err) {
    logger.error('Get due words error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get due words');
  }
}

export async function getMasteryStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const stats = await vocabularyIntelligence.getMasteryStats(userId);
    success(res, stats);
  } catch (err) {
    logger.error('Get mastery stats error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get mastery stats');
  }
}

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const { word } = req.body || {};
    if (!word) {
      errors.validation(res, 'Word is required');
      return;
    }

    const isFavorite = await vocabularyIntelligence.toggleFavorite(userId, word);
    success(
      res,
      { word, is_favorite: isFavorite },
      isFavorite ? 'Added to favorites' : 'Removed from favorites'
    );
  } catch (err) {
    logger.error('Toggle favorite error', { error: (err as Error).message });
    errors.internal(res, 'Failed to toggle favorite');
  }
}

async function getUserIdFromEmail(email: string): Promise<number | undefined> {
  const { getUserIdByEmail } = await import('../db/repositories/conversation.repo');
  return getUserIdByEmail(email);
}
