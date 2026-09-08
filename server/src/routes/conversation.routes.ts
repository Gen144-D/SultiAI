import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getConversations,
  getUserIdByEmail,
  createConversation,
  addMessages,
  deleteConversation,
} from '../db/repositories/conversation.repo';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const convos = await getConversations(req.user!.email);
    res.json(convos);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages, title } = req.body || {};
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const conversationId = await createConversation(userId, title || null);
    if (messages && Array.isArray(messages)) {
      await addMessages(conversationId, messages);
    }
    res.json({
      id: String(conversationId),
      title: title || null,
      messages: messages || [],
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

export default router;

export const historyRouter = Router();

historyRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const convos = await getConversations(req.user!.email);
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

historyRouter.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await deleteConversation(Number(req.params.id), req.user!.email);
    res.json({ message: 'History deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete history' });
  }
});
