import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

router.get('/learning', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const stats = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(lp.completion_percent), 0) as total_progress,
        COUNT(DISTINCT lm.module_id) as modules_started,
        COALESCE(AVG(lp.completion_percent), 0) as avg_completion,
        COUNT(DISTINCT CASE WHEN lp.completion_percent = 100 THEN lm.module_id END) as modules_completed
      FROM learning_modules lm
      LEFT JOIN learning_progress lp ON lp.module_id = lm.module_id AND lp.user_id = ?
      WHERE lp.user_id = ?
    `
      )
      .get(req.user!.id, req.user!.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

router.get('/weekly', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessions = db
      .prepare(
        `
      SELECT DATE(created_at) as date, COUNT(*) as sessions, COALESCE(SUM(xp_earned), 0) as xp
      FROM tutor_sessions
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `
      )
      .all(req.user!.id, sevenDaysAgo);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weekly progress' });
  }
});

router.get('/streak', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const sessions = db
      .prepare(
        `
      SELECT DISTINCT DATE(created_at) as date
      FROM tutor_sessions
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 60
    `
      )
      .all(req.user!.id) as any[];

    const dates = sessions.map((s: any) => s.date);
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      const expectedDate = expected.toISOString().split('T')[0];
      if (dates.includes(expectedDate)) streak++;
      else if (i === 0 && !dates.includes(today)) continue;
      else break;
    }

    res.json({ currentStreak: streak, activeDates: dates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load streak data' });
  }
});

export default router;
