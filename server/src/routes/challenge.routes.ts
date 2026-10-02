import { Router, Request, Response } from 'express';
import { and, eq, gte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { getDb, getSchema } from '../db/connection';
import { addXp, addCoins } from '../db/repositories/learner.repo';

const schema = getSchema();

const router = Router();

interface AuthRequest extends Omit<Request, 'user'> {
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

async function getCompletedIds(userId: number, type: 'daily' | 'weekly', sinceDate: string) {
  const db = getDb();
  const rows = await (db as any)
    .select({ challengeId: schema.completedChallenges.challengeId })
    .from(schema.completedChallenges)
    .where(
      and(
        eq(schema.completedChallenges.userId, userId),
        eq(schema.completedChallenges.type, type),
        gte(schema.completedChallenges.completedDate, sinceDate)
      )
    );
  return new Set(rows.map((r: any) => r.challengeId));
}

router.get('/daily', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const completedIds = await getCompletedIds(req.user!.id, 'daily', today);
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
    const weekStart = getWeekStart();
    const completedIds = await getCompletedIds(req.user!.id, 'weekly', weekStart);
    const challenges = WEEKLY_CHALLENGES.map((c) => ({
      ...c,
      completed: completedIds.has(c.id),
    }));
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weekly challenges' });
  }
});

/**
 * Server-side completion checks against real activity tables, where the
 * criterion is cheap to verify. Challenges not listed here fall back to
 * trusting the client's completion claim (still deduped — see below) — a
 * known gap to close as a fast-follow, not a blocker for this cutover.
 */
async function verifyCompletion(
  challengeId: string,
  userId: number,
  today: string
): Promise<boolean> {
  const db = getDb();
  if (challengeId === 'daily_2') {
    // "Record 3 pronunciation attempts"
    const rows = await (db as any)
      .select({ id: schema.pronunciationAttempts.id })
      .from(schema.pronunciationAttempts)
      .where(
        and(
          eq(schema.pronunciationAttempts.userId, userId),
          gte(schema.pronunciationAttempts.timestamp, today)
        )
      );
    return rows.length >= 3;
  }
  if (challengeId === 'daily_4') {
    // "Complete any lesson today"
    const rows = await (db as any)
      .select({ id: schema.learningProgress.progressId })
      .from(schema.learningProgress)
      .where(
        and(
          eq(schema.learningProgress.userId, userId),
          gte(schema.learningProgress.updatedAt, new Date(`${today}T00:00:00.000Z`))
        )
      );
    return rows.length > 0;
  }
  return true; // not yet verifiable server-side; trust the client's claim
}

router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user!.id;
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const type: 'daily' | 'weekly' = challengeId.startsWith('weekly') ? 'weekly' : 'daily';

    const challenge = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].find((c) => c.id === challengeId);
    if (!challenge) {
      res.status(404).json({ error: 'Unknown challenge' });
      return;
    }

    const verified = await verifyCompletion(
      challengeId,
      userId,
      type === 'weekly' ? getWeekStart() : today
    );
    if (!verified) {
      res.status(400).json({ error: 'Challenge criteria not met' });
      return;
    }

    const db = getDb();
    // Relies on unique(user_id, challenge_id, completed_date) — a duplicate
    // complete call for the same day inserts nothing and credits nothing.
    const inserted = await (db as any)
      .insert(schema.completedChallenges)
      .values({ userId, challengeId, type, completedDate: today })
      .onConflictDoNothing({
        target: [
          schema.completedChallenges.userId,
          schema.completedChallenges.challengeId,
          schema.completedChallenges.completedDate,
        ],
      })
      .returning({ id: schema.completedChallenges.id });

    if (!inserted.length) {
      res.json({ success: true, alreadyCompleted: true, xpReward: 0, coinReward: 0 });
      return;
    }

    await addXp(userId, challenge.xpReward, {
      source: 'challenge',
      idempotencyKey: `challenge:${userId}:${challengeId}:${today}`,
    });
    await addCoins(userId, challenge.coinReward);

    res.json({ success: true, xpReward: challenge.xpReward, coinReward: challenge.coinReward });
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
