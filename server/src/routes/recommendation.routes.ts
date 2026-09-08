import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { getStudyPlan, getPersonalizedGreeting } from '../controllers/recommendation.controller';

const router = Router();

router.use(authMiddleware);
router.use(aiRateLimit);

router.get('/study-plan', getStudyPlan);
router.get('/greeting', getPersonalizedGreeting);

export default router;
