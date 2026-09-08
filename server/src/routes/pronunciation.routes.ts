import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { speechRateLimit } from '../middleware/rateLimit';
import { recordAttempt, getStats, getTrend } from '../controllers/pronunciation.controller';

const router = Router();

router.use(authMiddleware);

router.post('/attempt', aiRateLimit, recordAttempt);
router.get('/stats', speechRateLimit, getStats);
router.get('/trend', speechRateLimit, getTrend);

export default router;
