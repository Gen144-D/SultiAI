import { Router } from 'express';
import { authRateLimit } from '../middleware/rateLimit';
import { validate, validators } from '../middleware/validate';
import {
  signUp,
  signIn,
  refreshToken,
  signOut,
  clerkSync,
  googleSignIn,
  syncSupabase,
} from '../controllers/auth.controller';
import { createClient } from '@supabase/supabase-js';
import { success, errors } from '../utils/apiResponse';
import logger from '../utils/logger';

const router = Router();

router.post(
  '/signup',
  authRateLimit,
  validate([
    {
      field: 'fullname',
      validators: [
        validators.required(),
        validators.string(),
        validators.minLength(2),
        validators.maxLength(100),
      ],
    },
    {
      field: 'email',
      validators: [validators.required(), validators.string(), validators.email()],
    },
    {
      field: 'password',
      validators: [validators.required(), validators.string(), validators.minLength(6)],
    },
  ]),
  signUp
);

router.post(
  '/signin',
  authRateLimit,
  validate([
    {
      field: 'email',
      validators: [validators.required(), validators.string(), validators.email()],
    },
    { field: 'password', validators: [validators.required(), validators.string()] },
  ]),
  signIn
);

router.post('/clerk-sync', authRateLimit, clerkSync);
router.post('/sync-supabase', authRateLimit, syncSupabase);
router.post('/google', authRateLimit, googleSignIn);
router.post('/refresh', authRateLimit, refreshToken);
router.post('/signout', signOut);

// Auto-confirm Supabase user (development helper)
// Uses service_role key to bypass email confirmation
router.post('/confirm-user', async (req, res) => {
  const { email, userId } = req.body || {};
  if (!email || !userId) {
    errors.validation(res, 'email and userId required');
    return;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    errors.internal(res, 'Supabase admin not configured');
    return;
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) throw error;
    success(res, { userId: data.user.id }, 'User confirmed');
  } catch (err) {
    logger.error('[Auth] Auto-confirm error:', { error: (err as Error).message });
    errors.internal(res, 'Failed to confirm user');
  }
});

// Admin setup: promote user by email (unauthenticated, for initial bootstrap only)
router.post('/promote', async (req, res) => {
  const { email, secret } = req.body || {};
  if (!email) {
    errors.validation(res, 'Email required');
    return;
  }
  // Simple bootstrap protection: require a secret or allow if no admins exist yet
  try {
    const { getDb } = await import('../db/connection');
    const schema = await import('../db/schema-sqlite');
    const { eq, count } = await import('drizzle-orm');
    const db = getDb();

    // Check if any admins exist yet
    const [adminCount] = await (db as any)
      .select({ c: count() })
      .from(schema.users)
      .where(eq(schema.users.role, 'admin'));

    const isFirstAdmin = !adminCount || adminCount.c === 0;
    const validSecret = secret === (process.env.JWT_SECRET || 'dev-secret-key-12345');

    if (!isFirstAdmin && !validSecret) {
      errors.forbidden(res, 'Admin secret required');
      return;
    }

    // Get admin role_id
    const adminRole = await (db as any)
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, 'admin'))
      .limit(1);
    const roleId = adminRole.length > 0 ? adminRole[0].roleId : null;

    await (db as any)
      .update(schema.users)
      .set({ role: 'admin', roleId, status: 'approved' })
      .where(eq(schema.users.email, email));
    success(res, null, `User ${email} promoted to admin`);
  } catch (err) {
    logger.error('[Auth] Promote error:', { error: (err as Error).message });
    errors.internal(res, 'Failed to promote user');
  }
});

export default router;
