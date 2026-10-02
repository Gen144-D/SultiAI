import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getLearnerRepo } from '../db/repositories/learner.repo';

const router = Router();

interface AuthRequest extends Omit<Request, 'user'> {
  user?: { id: number; email: string };
}

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const repo = getLearnerRepo();
    const stats = await repo.getStats(req.user!.id);
    res.json(stats || { xp: 0, coins: 0, hearts: 5, streak: 0, daily_xp: 0 });
  } catch (err) {
    console.error('Game stats error:', err);
    res.status(500).json({ error: 'Failed to load game stats' });
  }
});

router.put('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const repo = getLearnerRepo();
    const { xp, coins, hearts, streak, daily_xp } = req.body;
    await repo.updateStats(req.user!.id, { xp, coins, hearts, streak, daily_xp });
    res.json({ success: true });
  } catch (err) {
    console.error('Game stats update error:', err);
    res.status(500).json({ error: 'Failed to update game stats' });
  }
});

router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'weekly';
    const repo = getLearnerRepo();
    const leaders = await repo.getLeaderboard(period);
    res.json(leaders);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

router.post('/daily-reward', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const repo = getLearnerRepo();
    const reward = { xp: 50, coins: 25 };
    await repo.addDailyReward(req.user!.id, reward);
    res.json({ success: true, reward });
  } catch (err) {
    console.error('Daily reward error:', err);
    res.status(500).json({ error: 'Failed to claim daily reward' });
  }
});

export default router;
