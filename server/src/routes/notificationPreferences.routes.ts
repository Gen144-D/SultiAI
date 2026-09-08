import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getPreferences, updatePreferences } from '../controllers/notification.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getPreferences);
router.put('/', updatePreferences);

export default router;
