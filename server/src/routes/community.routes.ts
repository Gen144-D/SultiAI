import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireOwnership } from '../middleware/rbac';
import { success, errors } from '../utils/apiResponse';
import {
  getPosts,
  getResources,
  getUserIdByEmail,
  createPost,
  getComments,
  createComment,
} from '../db/repositories/community.repo';
import {
  createVerificationRequest,
  getPendingVerifications,
  approveVerification,
  getUserVerifications,
  getVerifierStats,
} from '../db/repositories/verification.repo';

const router = Router();

router.get('/posts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const posts = await getPosts();
    success(
      res,
      posts.map((p: any) => ({
        id: p.postId,
        user_id: p.userId,
        title: p.title,
        content: p.content,
        author_name: p.authorName,
        author_verified: p.authorVerified || false,
        created_at: p.createdAt,
        likes: p.likes || 0,
      }))
    );
  } catch (err) {
    errors.internal(res, 'Failed to get posts');
  }
});

router.post('/posts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body || {};
    if (!title || !content) {
      errors.validation(res, 'Title and content are required');
      return;
    }
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }
    const postId = await createPost(userId, { title, content });
    success(res, { id: postId, title, content, created_at: new Date().toISOString() });
  } catch (err) {
    errors.internal(res, 'Failed to create post');
  }
});

router.get('/resources', authMiddleware, async (req: Request, res: Response) => {
  try {
    const resources = await getResources();
    success(
      res,
      resources.map((r: any) => ({
        id: String(r.postId),
        phrase: r.phrase,
        translation: r.translation,
        category: r.category,
        title: r.title,
        content: r.content,
        created_by: r.authorName,
        createdAt: r.createdAt,
      }))
    );
  } catch (err) {
    errors.internal(res, 'Failed to get resources');
  }
});

router.post('/resources', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { phrase, translation, category, title, content } = req.body || {};
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }
    const postId = await createPost(userId, { title, content, phrase, translation, category });
    success(res, {
      id: String(postId),
      phrase,
      translation,
      category,
      title,
      content,
      created_by: req.user!.email,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    errors.internal(res, 'Failed to create resource');
  }
});

router.get('/posts/:postId/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const comments = await getComments(Number(req.params.postId as string));
    success(
      res,
      comments.map((c: any) => ({
        comment_id: c.commentId,
        post_id: c.postId,
        author_name: c.authorName,
        comment: c.comment,
        created_at: c.createdAt,
      }))
    );
  } catch (err) {
    errors.internal(res, 'Failed to get comments');
  }
});

router.post('/posts/:postId/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { comment } = req.body || {};
    if (!comment) {
      errors.validation(res, 'Comment is required');
      return;
    }
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }
    const commentId = await createComment(Number(req.params.postId as string), userId, comment);
    success(res, {
      comment_id: commentId,
      post_id: parseInt(req.params.postId as string),
      user_id: userId,
      comment,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    errors.internal(res, 'Failed to create comment');
  }
});

// === Native Speaker Verification Routes ===

router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { audio, phrase_id } = req.body || {};
    const userId = await getUserIdByEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }
    const requestId = await createVerificationRequest(userId, {
      audioPath: audio ? 'inline_base64' : undefined,
      recordedText: req.body.text,
      wordId: phrase_id ? parseInt(phrase_id) : undefined,
    });
    success(res, {
      request_id: requestId,
      status: 'pending',
      message: 'Submitted for native speaker verification',
    });
  } catch (err) {
    errors.internal(res, 'Failed to submit verification request');
  }
});

router.get(
  '/verify/requests',
  requireRole('admin', 'moderator'),
  async (req: Request, res: Response) => {
    try {
      const pending = await getPendingVerifications();
      success(res, pending);
    } catch (err) {
      errors.internal(res, 'Failed to get verification requests');
    }
  }
);

router.post(
  '/verify/:id/approve',
  requireRole('admin', 'moderator'),
  async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id as string);
      const { score, feedback } = req.body || {};
      await approveVerification(requestId, req.user!.email, { score, feedback });
      success(res, { message: 'Verification approved. Thank you for contributing!' });
    } catch (err) {
      errors.internal(res, 'Failed to approve verification');
    }
  }
);

router.get('/verify/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await getVerifierStats(req.user!.email);
    success(res, stats);
  } catch (err) {
    errors.internal(res, 'Failed to get verifier stats');
  }
});

export default router;
