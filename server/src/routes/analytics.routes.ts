import { Router, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

interface AuthRequest extends Omit<Request, 'user'> {
  user?: { id: number; email: string };
}

router.get('/learning', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const userId = req.user!.id;
    const rows = await (db as any).all(sql`
      SELECT
        COALESCE(SUM(lp.completion_percent), 0) as total_progress,
        COUNT(DISTINCT lp.module_id) as modules_started,
        COALESCE(AVG(lp.completion_percent), 0) as avg_completion,
        COUNT(DISTINCT CASE WHEN lp.completion_percent = 100 THEN lp.module_id END) as modules_completed
      FROM learning_progress lp
      WHERE lp.user_id = ${userId}
    `);
    res.json(
      rows[0] ?? { total_progress: 0, modules_started: 0, avg_completion: 0, modules_completed: 0 }
    );
  } catch (err) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

router.get('/weekly', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const userId = req.user!.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessions = await (db as any).all(sql`
      SELECT DATE(started_at) as date, COUNT(*) as sessions, COALESCE(SUM(xp_earned), 0) as xp
      FROM tutor_sessions
      WHERE user_id = ${userId} AND started_at >= ${sevenDaysAgo}
      GROUP BY DATE(started_at)
      ORDER BY date
    `);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weekly progress' });
  }
});

router.get('/streak', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { getDb } = await import('../db/connection');
    const db = getDb();
    const userId = req.user!.id;
    const sessions = (await (db as any).all(sql`
      SELECT DISTINCT DATE(started_at) as date
      FROM tutor_sessions
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT 60
    `)) as any[];

    const dates = sessions.map((s) => s.date);
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
