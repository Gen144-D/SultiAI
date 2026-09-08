import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getModules,
  getProgress,
  getUserIdByEmail,
  upsertProgress,
} from '../db/repositories/learning.repo';

const router = Router();

router.get('/modules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const modules = await getModules();
    res.json(modules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const progress = await getProgress(req.user!.email);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

router.post('/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { module_id, completion_percent } = req.body || {};
    if (!module_id) {
      res.status(400).json({ error: 'Module ID is required' });
      return;
    }
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await upsertProgress(userId, module_id, completion_percent || 0);
    res.json({ message: 'Progress updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;
