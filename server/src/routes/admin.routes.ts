import { Router } from 'express';
import { adminMiddleware } from '../middleware/admin';
import { invalidateCache } from '../middleware/cache';
import { success } from '../utils/apiResponse';
import {
  getOverview,
  listUsers,
  getUser,
  createUser,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  verifyUser,
  listPendingUsers,
  approveUser,
  rejectUser,
  bulkApproveUsers,
  listLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  listPosts,
  toggleFeatured,
  setPostHidden,
  deletePost,
  listReports,
  updateReportStatus,
  getAiUsage,
  getXpOverview,
  listFeedback,
  resolveFeedback,
  listPreserved,
  verifyPreserved,
  getSettings,
  updateSettings,
  listRoles,
  listPermissions,
  updateRolePermissions,
  getAuditLogs,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  reactivateApiKey,
  deleteApiKey,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require admin role
router.use(adminMiddleware);

// Dashboard
router.get('/analytics/overview', getOverview);

// Users
router.get('/users', listUsers);
router.get('/users/pending', listPendingUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/verify', verifyUser);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);
router.post('/users/bulk-approve', bulkApproveUsers);

// Lessons
router.get('/lessons', listLessons);
router.post('/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// Community
router.get('/community/posts', listPosts);
router.patch('/community/posts/:id', toggleFeatured);
router.patch('/community/posts/:id/visibility', setPostHidden);
router.delete('/community/posts/:id', deletePost);
router.get('/community/reports', listReports);
router.patch('/community/reports/:id', updateReportStatus);

// AI Usage
router.get('/ai/usage', getAiUsage);

// XP & Rewards
router.get('/xp/overview', getXpOverview);

// Feedback
router.get('/feedback', listFeedback);
router.patch('/feedback/:id', resolveFeedback);

// Preservation
router.get('/preservation', listPreserved);
router.post('/preservation/:id', verifyPreserved);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// RBAC: Roles & Permissions
router.get('/roles', listRoles);
router.get('/permissions', listPermissions);
router.put('/roles/:id/permissions', updateRolePermissions);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Public API keys
router.get('/api-keys', listApiKeys);
router.post('/api-keys', createApiKey);
router.post('/api-keys/:id/revoke', revokeApiKey);
router.post('/api-keys/:id/reactivate', reactivateApiKey);
router.delete('/api-keys/:id', deleteApiKey);

// Cache Management
router.post('/cache/invalidate', async (req, res) => {
  try {
    const { pattern } = req.body;
    await invalidateCache(pattern || '*');
    success(res, { message: 'Cache invalidated', pattern: pattern || '*' });
  } catch (error) {
    success(res, { message: 'Cache invalidation failed', error: (error as Error).message });
  }
});

router.post('/cache/invalidate/vocabulary', async (_req, res) => {
  await invalidateCache('vocab:*');
  success(res, { message: 'Vocabulary cache invalidated' });
});

router.post('/cache/invalidate/challenges', async (_req, res) => {
  await invalidateCache('challenges:*');
  success(res, { message: 'Challenges cache invalidated' });
});

router.post('/cache/invalidate/analytics', async (_req, res) => {
  await invalidateCache('analytics:*');
  success(res, { message: 'Analytics cache invalidated' });
});

export default router;
