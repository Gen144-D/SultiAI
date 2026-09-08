import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { validate, validators } from '../middleware/validate';
import {
  getLevel,
  getMistakes,
  generateLesson,
  chat,
  getAdaptiveRecommendation,
} from '../controllers/tutor.controller';

const router = Router();

router.use(authMiddleware);

router.get('/level', getLevel);
router.get('/mistakes', getMistakes);
router.post(
  '/lesson',
  aiRateLimit,
  validate([
    {
      field: 'situation',
      validators: [validators.required(), validators.string(), validators.minLength(3)],
    },
  ]),
  generateLesson
);
router.post('/chat', aiRateLimit, chat);
router.get('/adaptive', aiRateLimit, getAdaptiveRecommendation);

export default router;
