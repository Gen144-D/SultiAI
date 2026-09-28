import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getModules,
  getModuleByKey,
  getModuleById,
  getLessonItems,
  getProgress,
  getUserIdByEmail,
  upsertProgress,
} from '../db/repositories/learning.repo';
import { recommendationEngine } from '../services/adaptive';

const router = Router();

/**
 * Aggregate payload for the Learn dashboard: the learner's position on the path,
 * a compact progress summary, and SULTI's recommendation.
 *
 * The recommendation is only flagged `available` when the engine actually found
 * signal (weak areas, due reviews, or recorded mistakes). With no history it
 * reports `available: false` instead of presenting a generic suggestion as if
 * it were personalized analysis.
 */
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [modules, progressRows, plan] = await Promise.all([
      getModules(),
      getProgress(req.user!.email),
      recommendationEngine.generateStudyPlan(userId),
    ]);

    const byModule = new Map<number, any>();
    for (const row of progressRows) {
      byModule.set(Number(row.moduleId), row);
    }

    const clamp = (value: unknown) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.max(0, Math.min(100, num));
    };

    const path = modules.map((m: any, index: number) => {
      const row = byModule.get(Number(m.moduleId));
      const pct = clamp(row?.completionPercent);
      return {
        moduleKey: m.moduleKey,
        moduleId: Number(m.moduleId),
        title: m.moduleTitle,
        index,
        pct,
        status: pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'upcoming',
      };
    });

    const next = path.find((p: any) => p.status !== 'completed') || null;
    const total = path.length;

    const hasSignal =
      plan.practiceAreas.length > 0 ||
      plan.reviewWords.length > 0 ||
      plan.lessons.some((l: any) => l.topic === 'mistake_review');

    res.json({
      language: 'Bisaya / Cebuano',
      summary: {
        totalModules: total,
        modulesStarted: path.filter((p: any) => p.pct > 0).length,
        modulesCompleted: path.filter((p: any) => p.status === 'completed').length,
        courseProgress: total ? Math.round(path.reduce((sum: number, p: any) => sum + p.pct, 0) / total) : 0,
      },
      continue: next,
      recommendation: hasSignal
        ? {
            available: true,
            title: plan.lessons[0].topic,
            reason: plan.lessons[0].reason,
            difficulty: plan.lessons[0].difficulty,
            dueWords: plan.reviewWords.length,
            weakAreas: plan.practiceAreas,
            estimatedMinutes: plan.estimatedMinutes,
          }
        : {
            available: false,
            reason:
              'Complete a few lessons and pronunciation checks, and SULTI will personalize this for you.',
          },
    });
  } catch (err) {
    console.error('[learning] getDashboard failed:', err);
    res.status(500).json({ error: 'Failed to load learning dashboard' });
  }
});

router.get('/modules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const modules = await getModules();
    res.json(modules);
  } catch (err) {
    console.error('[learning] getModules failed:', err);
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

router.get('/modules/:key/lessons', authMiddleware, async (req: Request, res: Response) => {
  try {
    const module = await getModuleByKey(String(req.params.key));
    if (!module) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }
    const items = await getLessonItems(Number(module.moduleId));
    const progress = await getProgress(req.user!.email);
    const own = progress.find((row: { moduleId: number }) => row.moduleId === module.moduleId);
    res.json({
      moduleKey: module.moduleKey,
      moduleId: module.moduleId,
      items,
      progress: { completionPercent: own?.completionPercent ?? 0 },
    });
  } catch (err) {
    console.error('[learning] getLessonItems failed:', err);
    res.status(500).json({ error: 'Failed to get lesson items' });
  }
});

router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const progress = await getProgress(req.user!.email);
    res.json(progress);
  } catch (err) {
    console.error('[learning] getProgress failed:', err);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

router.post('/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { module_id, module_key, completion_percent } = req.body || {};

    let resolvedModuleId: number | undefined = module_id === undefined ? undefined : Number(module_id);

    if (!resolvedModuleId && module_key) {
      const module = await getModuleByKey(String(module_key));
      resolvedModuleId = module ? Number(module.moduleId) : undefined;
    }

    if (!resolvedModuleId || !Number.isInteger(resolvedModuleId) || resolvedModuleId <= 0) {
      res.status(400).json({ error: 'A valid module_id or module_key is required' });
      return;
    }

    const module = await getModuleById(resolvedModuleId);
    if (!module) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }

    const percent = Number(completion_percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      res.status(400).json({ error: 'completion_percent must be a number between 0 and 100' });
      return;
    }

    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await upsertProgress(userId, resolvedModuleId, percent);
    res.json({ moduleId: resolvedModuleId, completionPercent: percent });
  } catch (err) {
    console.error('[learning] updateProgress failed:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;
