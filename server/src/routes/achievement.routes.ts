import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { getDb, getSchema } from '../db/connection';
import { addXp, addCoins } from '../db/repositories/learner.repo';

const schema = getSchema();

const router = Router();

const ACHIEVEMENTS = [
  {
    id: 'first_100_xp',
    title: 'First Steps',
    description: 'Earn 100 XP',
    icon: 'star',
    xpReward: 50,
    coinReward: 20,
  },
  {
    id: 'thousand_xp',
    title: 'Century',
    description: 'Earn 1,000 XP',
    icon: 'trophy',
    xpReward: 200,
    coinReward: 100,
  },
  {
    id: 'five_thousand_xp',
    title: 'Dedicated',
    description: 'Earn 5,000 XP',
    icon: 'diamond',
    xpReward: 500,
    coinReward: 250,
  },
  {
    id: 'streak_3',
    title: 'Getting Started',
    description: '3-day streak',
    icon: 'sparkles',
    xpReward: 50,
    coinReward: 30,
  },
  {
    id: 'streak_7',
    title: 'Consistent',
    description: '7-day streak',
    icon: 'calendar',
    xpReward: 100,
    coinReward: 50,
  },
  {
    id: 'streak_30',
    title: 'Unstoppable',
    description: '30-day streak',
    icon: 'crown',
    xpReward: 500,
    coinReward: 200,
  },
  {
    id: 'daily_goal',
    title: 'Goal Crusher',
    description: 'Reach daily goal',
    icon: 'target',
    xpReward: 50,
    coinReward: 25,
  },
  {
    id: 'first_lesson',
    title: 'First Lesson',
    description: 'Complete your first lesson',
    icon: 'school',
    xpReward: 30,
    coinReward: 15,
  },
  {
    id: 'voice_pioneer',
    title: 'Voice Pioneer',
    description: 'Try voice practice',
    icon: 'mic',
    xpReward: 20,
    coinReward: 10,
  },
  {
    id: 'community_member',
    title: 'Community Member',
    description: 'Join the community',
    icon: 'people',
    xpReward: 25,
    coinReward: 10,
  },
];

const BADGES = [
  {
    id: 'native_speaker',
    title: 'Native Speaker',
    description: 'Verified native Bisaya speaker',
    icon: 'shield-checkmark',
    color: '#10B981',
  },
  {
    id: 'top_contributor',
    title: 'Top Contributor',
    description: 'Helped the most in the community',
    icon: 'trophy',
    color: '#FFD700',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Helped 10+ learners improve',
    icon: 'school',
    color: '#1E6F9F',
  },
  {
    id: 'early_adopter',
    title: 'Early Adopter',
    description: 'Joined in the first month',
    icon: 'rocket',
    color: '#8B5CF6',
  },
];

function meetsCriterion(
  id: string,
  s: { xp: number; streak: number; dailyXp: number; dailyGoal: number }
): boolean {
  switch (id) {
    case 'first_100_xp':
      return s.xp >= 100;
    case 'thousand_xp':
      return s.xp >= 1000;
    case 'five_thousand_xp':
      return s.xp >= 5000;
    case 'streak_3':
      return s.streak >= 3;
    case 'streak_7':
      return s.streak >= 7;
    case 'streak_30':
      return s.streak >= 30;
    case 'daily_goal':
      return s.dailyXp >= (s.dailyGoal || 50);
    default:
      return false;
  }
}

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userAchievements = await getUserAchievements(req.user!.userId);
    res.json({
      all: ACHIEVEMENTS,
      earned: userAchievements,
    });
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

router.get('/badges', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userBadges = await getUserBadges(req.user!.userId);
    res.json({
      all: BADGES,
      earned: userBadges,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load badges' });
  }
});

router.post('/check', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { xp = 0, streak = 0, dailyXp = 0, dailyGoal = 50 } = req.body || {};
    const userId = req.user!.userId;
    if (!userId || userId <= 0) {
      res.json({ newlyEarned: [] });
      return;
    }

    const db = getDb();
    const earnedRows = await (db as any)
      .select({ achievementId: schema.userAchievements.achievementId })
      .from(schema.userAchievements)
      .where(eq(schema.userAchievements.userId, userId));
    const earnedSet = new Set(earnedRows.map((r: any) => r.achievementId));
    const now = new Date().toISOString();

    const newlyEarned: any[] = [];
    for (const a of ACHIEVEMENTS) {
      if (earnedSet.has(a.id)) continue;
      if (!meetsCriterion(a.id, { xp, streak, dailyXp, dailyGoal })) continue;

      // Relies on the unique(user_id, achievement_id) constraint already present
      // on user_achievements — a concurrent duplicate request inserts nothing.
      const inserted = await (db as any)
        .insert(schema.userAchievements)
        .values({ userId, achievementId: a.id, unlockedAt: now })
        .onConflictDoNothing({
          target: [schema.userAchievements.userId, schema.userAchievements.achievementId],
        })
        .returning({ id: schema.userAchievements.userAchievementId });

      if (!inserted.length) continue; // someone else's concurrent request won the race

      await addXp(userId, a.xpReward, {
        source: 'achievement',
        idempotencyKey: `achievement:${userId}:${a.id}`,
      });
      await addCoins(userId, a.coinReward);
      newlyEarned.push({ ...a, unlockedAt: now });
    }
    res.json({ newlyEarned });
  } catch (err) {
    console.error('Achievement check error:', err);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

async function getUserAchievements(userId: number): Promise<any[]> {
  const db = getDb();
  return (db as any)
    .select()
    .from(schema.userAchievements)
    .where(eq(schema.userAchievements.userId, userId));
}

async function getUserBadges(userId: number): Promise<any[]> {
  const db = getDb();
  return (db as any).select().from(schema.userBadges).where(eq(schema.userBadges.userId, userId));
}

export default router;
