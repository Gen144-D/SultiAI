import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../db/repositories/notification.repo';

const router = Router();

function serializeNotification(n: any) {
  return {
    id: n.notifyId,
    is_read: !!n.isRead,
    title: n.title,
    message: n.message,
    created_at: n.createdAt,
  };
}

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // No auto-seeding: an empty list is a legitimate state and must render as
    // an empty state rather than fabricated placeholder rows.
    const rows = await getNotifications(req.user!.email);
    res.json(rows.map(serializeNotification));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Registered before '/:id' so the literal segment is not swallowed by the id param.
router.put('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const updated = await markAllAsRead(req.user!.email);
    res.json({ message: 'All notifications marked as read', updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const notifyId = Number(req.params.id);
  if (!Number.isInteger(notifyId)) {
    res.status(400).json({ error: 'Invalid notification id' });
    return;
  }
  try {
    await markAsRead(notifyId, req.user!.email);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
