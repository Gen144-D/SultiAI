import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  submitWord,
  getPreservedWords,
  verifyWord,
  getLivingLexicon,
  getLexiconCount,
  getDialectalVariations,
} from '../db/repositories/preservation.repo';
import { getUserIdByEmail } from '../db/repositories/conversation.repo';

const router = Router();

router.post('/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      word,
      definition,
      partOfSpeech,
      dialectalRegion,
      bisayaExample,
      englishExample,
      pronunciationGuide,
      source,
    } = req.body || {};
    if (!word) {
      res.status(400).json({ error: 'Word is required' });
      return;
    }
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const wordId = await submitWord(userId, {
      word: word.toLowerCase().trim(),
      definition,
      partOfSpeech,
      dialectalRegion,
      bisayaExample,
      englishExample,
      pronunciationGuide,
      source,
    });
    res.json({
      wordId,
      message:
        'Word submitted for review. Thank you for contributing to the Bisaya living lexicon!',
    });
  } catch (err) {
    console.error('Submit word error:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

router.get('/lexicon', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const words = await getPreservedWords(status, limit, offset);
    const count = await getLexiconCount();
    res.json({ words, totalApproved: count });
  } catch (err) {
    console.error('Get lexicon error:', err);
    res.status(500).json({ error: 'Failed to get lexicon' });
  }
});

router.get('/living', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const lexicon = await getLivingLexicon(20);
    res.json({ lexicon });
  } catch (err) {
    console.error('Get living lexicon error:', err);
    res.status(500).json({ error: 'Failed to get living lexicon' });
  }
});

router.get('/count', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const count = await getLexiconCount();
    res.json({ count });
  } catch (err) {
    console.error('Get lexicon count error:', err);
    res.status(500).json({ error: 'Failed to get lexicon count' });
  }
});

router.get('/variations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const word = req.query.word as string;
    if (!word) {
      res.status(400).json({ error: 'Word query parameter is required' });
      return;
    }
    const variations = await getDialectalVariations(word);
    res.json({ word, variations });
  } catch (err) {
    console.error('Get variations error:', err);
    res.status(500).json({ error: 'Failed to get variations' });
  }
});

router.put('/:id/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const wordId = parseInt(req.params.id);
    const { status } = req.body || {};
    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
      return;
    }
    await verifyWord(wordId, status);
    res.json({ message: `Word ${status} successfully` });
  } catch (err) {
    console.error('Verify word error:', err);
    res.status(500).json({ error: 'Failed to verify word' });
  }
});

export default router;
