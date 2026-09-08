import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

const DAILY_CHALLENGES = [
  {
    id: 'daily_1',
    title: '5 Conversations',
    description: 'Have 5 exchanges with the AI tutor',
    icon: 'chatbubbles',
    xpReward: 50,
    coinReward: 25,
  },
  {
    id: 'daily_2',
    title: 'Voice Practice',
    description: 'Record 3 pronunciation attempts',
    icon: 'mic',
    xpReward: 40,
    coinReward: 20,
  },
  {
    id: 'daily_3',
    title: 'Vocabulary Review',
    description: 'Review 10 flashcards',
    icon: 'layers',
    xpReward: 30,
    coinReward: 15,
  },
  {
    id: 'daily_4',
    title: 'Streak Saver',
    description: 'Complete any lesson today',
    icon: 'flame',
    xpReward: 20,
    coinReward: 10,
  },
  {
    id: 'daily_5',
    title: 'Community Helper',
    description: 'Comment on a community post',
    icon: 'people',
    xpReward: 35,
    coinReward: 15,
  },
];

const WEEKLY_CHALLENGES = [
  {
    id: 'weekly_1',
    title: '7-Day Warrior',
    description: 'Complete lessons 7 days this week',
    icon: 'calendar',
    xpReward: 200,
    coinReward: 100,
  },
  {
    id: 'weekly_2',
    title: '1000 XP Week',
    description: 'Earn 1000 XP in one week',
    icon: 'star',
    xpReward: 300,
    coinReward: 150,
  },
  {
    id: 'weekly_3',
    title: 'Perfect Pronunciation',
    description: 'Get 5 pronunciation scores above 80%',
    icon: 'mic',
    xpReward: 150,
    coinReward: 75,
  },
  {
    id: 'weekly_4',
    title: 'Community Star',
    description: 'Create 3 community posts',
    icon: 'people',
    xpReward: 100,
    coinReward: 50,
  },
];

router.get('/daily', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const completed = db
      .prepare(
        'SELECT challenge_id FROM completed_challenges WHERE user_id = ? AND type = ? AND completed_date = ?'
      )
      .all(req.user!.id, 'daily', today) as any[];
    const completedIds = new Set(completed.map((c: any) => c.challenge_id));
    const challenges = DAILY_CHALLENGES.map((c) => ({
      ...c,
      completed: completedIds.has(c.id),
    }));
    res.json(challenges);
  } catch (err) {
    console.error('Daily challenge error:', err);
    res.status(500).json({ error: 'Failed to load daily challenges' });
  }
});

router.get('/weekly', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const weekStart = getWeekStart();
    const completed = db
      .prepare(
        'SELECT challenge_id FROM completed_challenges WHERE user_id = ? AND type = ? AND completed_date >= ?'
      )
      .all(req.user!.id, 'weekly', weekStart) as any[];
    const completedIds = new Set(completed.map((c: any) => c.challenge_id));
    const challenges = WEEKLY_CHALLENGES.map((c) => ({
      ...c,
      completed: completedIds.has(c.id),
    }));
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weekly challenges' });
  }
});

router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const challengeId = req.params.id;
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const type = challengeId.startsWith('weekly') ? 'weekly' : 'daily';

    db.prepare(
      `
      INSERT OR IGNORE INTO completed_challenges (user_id, challenge_id, type, completed_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(req.user!.id, challengeId, type, today, now);

    const challenge = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].find((c) => c.id === challengeId);
    if (challenge) {
      const repo = (await import('../db/repositories/learner.repo')).getLearnerRepo();
      await repo.addXp(req.user!.id, challenge.xpReward);
      await repo.addCoins(req.user!.id, challenge.coinReward);
    }

    res.json({
      success: true,
      xpReward: challenge?.xpReward || 0,
      coinReward: challenge?.coinReward || 0,
    });
  } catch (err) {
    console.error('Challenge complete error:', err);
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
});

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export default router;
