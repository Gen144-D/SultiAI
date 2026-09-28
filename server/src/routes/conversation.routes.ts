import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getConversations,
  getUserIdByEmail,
  createConversation,
  addMessages,
  replaceMessages,
  conversationBelongsTo,
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

/**
 * Upsert a whole transcript. The client owns the full message list, so this
 * replaces the stored messages instead of appending — otherwise a screen that
 * saves after every turn would duplicate the entire thread on each request.
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId)) {
      res.status(400).json({ error: 'Invalid conversation id' });
      return;
    }
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!(await conversationBelongsTo(conversationId, userId))) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const { messages, title } = req.body || {};
    await replaceMessages(conversationId, title || null, Array.isArray(messages) ? messages : []);
    res.json({ id: String(conversationId), title: title || null, messages: messages || [] });
  } catch (err) {
    console.error('Update conversation error:', err);
    res.status(500).json({ error: 'Failed to update conversation' });
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
