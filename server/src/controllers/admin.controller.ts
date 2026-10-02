import { Request, Response } from 'express';
import { eq, desc, sql, and, like, count, or, inArray } from 'drizzle-orm';
import { getDb, getSchema, getDialectName } from '../db/connection';
import { success, errors } from '../utils/apiResponse';
import { invalidateSettingsCache } from '../utils/platformSettings';
import logger from '../utils/logger';
import {
  API_KEY_SCOPES,
  isValidScope,
  listApiKeys as listApiKeysRepo,
  createApiKey as createApiKeyRepo,
  revokeApiKey as revokeApiKeyRepo,
  reactivateApiKey as reactivateApiKeyRepo,
  deleteApiKey as deleteApiKeyRepo,
} from '../db/repositories/apiKey.repo';

const schema = getSchema();

// ── Helpers ────────────────────────────────────────────────────────

function num(v: unknown): number {
  return Math.max(0, Number(v) || 0);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Dialect-portable "is this timestamp column on this calendar day?" predicate.
 * `::date` is Postgres-only and is a syntax error on SQLite, so it cannot be
 * inlined directly in a shared query.
 */
function dayEquals(column: unknown, dayStr: string) {
  if (getDialectName() === 'postgres') {
    return sql`${column}::date = ${dayStr}::date`;
  }
  return sql`date(${column}) = ${dayStr}`;
}

/** Convert level string or XP to a numeric level for the admin UI */
function levelToNumber(level: string | null | undefined, totalXp: number): number {
  if (totalXp >= 5000) return 15;
  if (totalXp >= 3500) return 12;
  if (totalXp >= 2500) return 10;
  if (totalXp >= 1800) return 8;
  if (totalXp >= 1200) return 6;
  if (totalXp >= 700) return 5;
  if (totalXp >= 400) return 4;
  if (totalXp >= 200) return 3;
  if (totalXp >= 80) return 2;
  return 1;
}

/** Get user status — now uses the status column on users table */
async function getUserStatus(db: any, userId: number): Promise<string> {
  const [row] = await db
    .select({ status: schema.users.status })
    .from(schema.users)
    .where(eq(schema.users.userId, userId))
    .limit(1);
  return row?.status || 'approved';
}

// ── Overview / Dashboard ──────────────────────────────────────────

export async function getOverview(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();

    // Total users
    const [totalRow] = await (db as any).select({ c: count() }).from(schema.users);
    const totalUsers = num(totalRow?.c);

    // Active today
    const today = new Date().toISOString().split('T')[0];
    const [activeTodayRow] = await (db as any)
      .select({ c: count() })
      .from(schema.learnerProfiles)
      .where(eq(schema.learnerProfiles.lastActive, today));
    const activeToday = num(activeTodayRow?.c);

    // Lessons completed
    const [lessonsRow] = await (db as any).select({ c: count() }).from(schema.learningProgress);
    const lessonsCompleted = num(lessonsRow?.c);

    // AI requests (count from xp_logs as proxy)
    const [aiRow] = await (db as any)
      .select({ c: count() })
      .from(schema.xpLogs)
      .where(eq(schema.xpLogs.source, 'voice_practice'));
    const aiRequests = num(aiRow?.c);

    // Weekly active (users active in last 7 days)
    const weekAgo = daysAgo(7);
    const [weeklyRow] = await (db as any)
      .select({ c: count() })
      .from(schema.learnerProfiles)
      .where(sql`${schema.learnerProfiles.lastActive} >= ${weekAgo}`);
    const weeklyActive = num(weeklyRow?.c);

    // Monthly active
    const monthAgo = daysAgo(30);
    const [monthlyRow] = await (db as any)
      .select({ c: count() })
      .from(schema.learnerProfiles)
      .where(sql`${schema.learnerProfiles.lastActive} >= ${monthAgo}`);
    const monthlyActive = num(monthlyRow?.c);

    // Avg XP per user
    const [avgXpRow] = await (db as any)
      .select({
        avg: sql<number>`coalesce(avg(${schema.learnerProfiles.totalXp}), 0)`,
      })
      .from(schema.learnerProfiles);
    const avgXpPerUser = Math.round(num(avgXpRow?.avg));

    // Avg session
    const [avgSessionRow] = await (db as any)
      .select({
        avg: sql<number>`coalesce(avg(${schema.learningAnalytics.avgSessionDuration}), 0)`,
      })
      .from(schema.learningAnalytics);
    const avgSessionMinutes = Math.round(num(avgSessionRow?.avg));

    // Weekly active users trend (last 7 days)
    const weeklyActiveTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStr = daysAgo(i);
      const dayLabel = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
      const [row] = await (db as any)
        .select({ c: count() })
        .from(schema.learnerProfiles)
        .where(eq(schema.learnerProfiles.lastActive, dayStr));
      weeklyActiveTrend.push({ label: dayLabel, value: num(row?.c) });
    }

    // Lessons trend (last 7 days) — use daily_activity
    const lessonsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStr = daysAgo(i);
      const dayLabel = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
      const [row] = await (db as any)
        .select({ c: count() })
        .from(schema.learningProgress)
        .where(dayEquals(schema.learningProgress.createdAt, dayStr));
      lessonsTrend.push({ label: dayLabel, value: num(row?.c) });
    }

    // AI trend (last 7 days) — use xp_logs as proxy
    const aiTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStr = daysAgo(i);
      const dayLabel = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
      const [row] = await (db as any)
        .select({ c: count() })
        .from(schema.xpLogs)
        .where(
          and(
            eq(schema.xpLogs.source, 'voice_practice'),
            dayEquals(schema.xpLogs.timestamp, dayStr)
          )
        );
      aiTrend.push({ label: dayLabel, value: num(row?.c) });
    }

    success(
      res,
      {
        stats: {
          totalUsers,
          activeToday,
          weeklyActive,
          monthlyActive,
          lessonsCompleted,
          avgXpPerUser,
          avgSessionMinutes,
          aiRequests,
          aiFailedRequests: 0,
          communityReports: 0,
          streakDays: 0,
        },
        health: {
          status: 'healthy',
          db: 'connected',
          api: 'up',
          groq: process.env.GROQ_API_KEY ? 'configured' : 'not_set',
          whisper: 'configured',
          storage: 'up',
          lastChecked: new Date().toISOString(),
        },
        weeklyActive: weeklyActiveTrend,
        lessonsTrend,
        aiTrend,
      },
      'Dashboard overview loaded'
    );
  } catch (err) {
    logger.error('Admin overview error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load dashboard');
  }
}

// ── Users ─────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 10));
    const offset = (page - 1) * perPage;
    const search = (req.query.search as string) || '';
    const roleFilter = (req.query.role as string) || 'all';
    const statusFilter = (req.query.status as string) || 'all';
    const sort = (req.query.sort as string) || 'recent';

    // Build conditions
    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(like(schema.users.fullname, `%${search}%`), like(schema.users.email, `%${search}%`))
      );
    }
    if (roleFilter !== 'all') {
      conditions.push(eq(schema.users.role, roleFilter));
    }
    if (statusFilter !== 'all') {
      conditions.push(eq(schema.users.status, statusFilter));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [totalRow] = await (db as any).select({ c: count() }).from(schema.users).where(where);
    const total = num(totalRow?.c);

    // Get users with learner profiles
    const sortCol =
      sort === 'xp'
        ? schema.learnerProfiles.totalXp
        : sort === 'level'
          ? schema.learnerProfiles.level
          : schema.users.createdAt;

    const rows = await (db as any)
      .select({
        userId: schema.users.userId,
        fullname: schema.users.fullname,
        email: schema.users.email,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        totalXp: schema.learnerProfiles.totalXp,
        streak: schema.learnerProfiles.streak,
        level: schema.learnerProfiles.level,
        totalSessions: schema.learnerProfiles.totalSessions,
        lastActive: schema.learnerProfiles.lastActive,
      })
      .from(schema.users)
      .leftJoin(schema.learnerProfiles, eq(schema.users.userId, schema.learnerProfiles.userId))
      .where(where)
      .orderBy(desc(sortCol))
      .limit(perPage)
      .offset(offset);

    const items = await Promise.all(
      rows.map(async (r: any) => ({
        id: r.userId,
        name: r.fullname || 'Unknown',
        email: r.email,
        role: r.role || 'user',
        status: await getUserStatus(db, r.userId),
        level: levelToNumber(r.level, num(r.totalXp)),
        xp: num(r.totalXp),
        streak: num(r.streak),
        lessons: num(r.totalSessions),
        verified: false,
        nativeSpeaker: false,
        joinedAt: r.createdAt || new Date().toISOString(),
        lastActive: r.lastActive || r.createdAt || new Date().toISOString(),
        country: r.country,
      }))
    );

    success(res, { items, total, page, perPage }, 'Users loaded');
  } catch (err) {
    logger.error('Admin list users error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list users');
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);

    const rows = await (db as any)
      .select()
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);

    if (!rows.length) {
      errors.notFound(res, 'User not found');
      return;
    }

    const user = rows[0];

    // Get learner profile
    const [profile] = await (db as any)
      .select()
      .from(schema.learnerProfiles)
      .where(eq(schema.learnerProfiles.userId, userId))
      .limit(1);

    // Get badges
    const badges = await (db as any)
      .select()
      .from(schema.userBadges)
      .where(eq(schema.userBadges.userId, userId));

    // Get pronunciation attempts count
    const [pronRow] = await (db as any)
      .select({ c: count() })
      .from(schema.pronunciationAttempts)
      .where(eq(schema.pronunciationAttempts.userId, userId));

    // Get feedback count
    const [feedbackRow] = await (db as any)
      .select({ c: count() })
      .from(schema.feedback)
      .where(eq(schema.feedback.userId, userId));

    const userStatus = await getUserStatus(db, userId);

    success(
      res,
      {
        detail: {
          id: userId,
          name: user.fullname || 'Unknown',
          email: user.email,
          role: user.role || 'user',
          status: userStatus,
          level: levelToNumber(profile?.level, num(profile?.totalXp)),
          xp: num(profile?.totalXp),
          streak: num(profile?.streak),
          lessons: num(profile?.totalSessions),
          verified: (user.isVerified || 0) === 1,
          nativeSpeaker: false,
          joinedAt: user.createdAt || new Date().toISOString(),
          lastActive: profile?.lastActive || user.createdAt || new Date().toISOString(),
          country: user.country,
          badges: badges.map((b: any) => b.badgeId),
          weakAreas: profile?.weakAreas ? JSON.parse(profile.weakAreas) : [],
          favoriteCategory: profile?.favoriteCategory || 'general',
          totalCoins: num(profile?.coins),
          dailyGoal: num(profile?.dailyGoal),
          feedbackCount: num(feedbackRow?.c),
        },
      },
      'User loaded'
    );
  } catch (err) {
    logger.error('Admin get user error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get user');
  }
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      errors.validation(res, 'Invalid role');
      return;
    }

    // Get current role for audit log
    const [currentUser] = await (db as any)
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);
    const oldRole = currentUser?.role || 'user';

    // Get role_id from roles table
    const [roleRow] = await (db as any)
      .select({ roleId: schema.roles.roleId })
      .from(schema.roles)
      .where(eq(schema.roles.name, role))
      .limit(1);
    const roleId = roleRow?.roleId || null;

    await (db as any)
      .update(schema.users)
      .set({ role, roleId })
      .where(eq(schema.users.userId, userId));

    // Audit log with old/new role
    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'change_user_role',
      resourceType: 'user',
      resourceId: String(userId),
      details: JSON.stringify({ oldRole, newRole: role, changedBy: req.user?.userId }),
      ipAddress: req.ip,
    });

    success(res, { id: userId, role, oldRole }, 'Role updated');
  } catch (err) {
    logger.error('Admin update role error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update role');
  }
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!['approved', 'pending', 'rejected', 'banned', 'suspended'].includes(status)) {
      errors.validation(res, 'Invalid status');
      return;
    }

    await (db as any).update(schema.users).set({ status }).where(eq(schema.users.userId, userId));

    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: `set_user_status_${status}`,
      resourceType: 'user',
      resourceId: String(userId),
      details: JSON.stringify({ status, changedBy: req.user?.userId }),
    });

    success(res, { id: userId, status }, 'Status updated');
  } catch (err) {
    logger.error('Admin update status error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update status');
  }
}

export async function verifyUser(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);
    const { verified } = req.body;

    await (db as any)
      .update(schema.users)
      .set({ isVerified: verified ? 1 : 0 })
      .where(eq(schema.users.userId, userId));

    await (db as any).insert(schema.auditLogs).values({
      userId,
      action: verified ? 'verify_user' : 'unverify_user',
      resourceType: 'user',
      resourceId: String(userId),
      details: JSON.stringify({ verified, changedBy: req.user?.userId }),
    });

    success(res, { id: userId, verified }, 'User verified');
  } catch (err) {
    logger.error('Admin verify user error', { error: (err as Error).message });
    errors.internal(res, 'Failed to verify user');
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { fullname, email, password, role } = req.body;

    if (!fullname || !email || !password) {
      errors.validation(res, 'fullname, email, and password are required');
      return;
    }

    if (!['user', 'admin', 'moderator'].includes(role || 'user')) {
      errors.validation(res, 'Invalid role');
      return;
    }

    // Check for existing email
    const existing = await (db as any)
      .select({ userId: schema.users.userId })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length > 0) {
      errors.conflict(res, 'A user with this email already exists');
      return;
    }

    // Hash password
    const { hashPassword } = await import('../utils/crypto');
    const passwordHash = hashPassword(password);

    // Insert user
    const result = await (db as any).insert(schema.users).values({
      fullname,
      email,
      passwordHash,
      role: role || 'user',
    });

    const newUserId = result.lastInsertRowid;

    // Create learner profile
    await (db as any).insert(schema.learnerProfiles).values({
      userId: newUserId,
      level: 'beginner',
      totalXp: 0,
      coins: 0,
      streak: 0,
      dailyXp: 0,
      dailyGoal: 50,
      totalSessions: 0,
    });

    // Audit log
    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'create_user',
      resourceType: 'user',
      resourceId: String(newUserId),
      details: JSON.stringify({ email, role: role || 'user' }),
    });

    success(
      res,
      {
        id: newUserId,
        name: fullname,
        email,
        role: role || 'user',
      },
      'User created'
    );
  } catch (err) {
    logger.error('Admin create user error', { error: (err as Error).message });
    errors.internal(res, 'Failed to create user');
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);

    // Check user exists
    const rows = await (db as any)
      .select({ userId: schema.users.userId, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);

    if (!rows.length) {
      errors.notFound(res, 'User not found');
      return;
    }

    // Prevent deleting the last admin
    if (rows[0].role === 'admin') {
      const [adminCount] = await (db as any)
        .select({ c: count() })
        .from(schema.users)
        .where(eq(schema.users.role, 'admin'));
      if (num(adminCount?.c) <= 1) {
        errors.validation(res, 'Cannot delete the last admin user');
        return;
      }
    }

    // Delete user (cascades via foreign keys)
    await (db as any).delete(schema.users).where(eq(schema.users.userId, userId));

    // Audit log (use raw insert since user is deleted)
    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'delete_user',
      resourceType: 'user',
      resourceId: String(userId),
      details: JSON.stringify({ deletedUserRole: rows[0].role }),
    });

    success(res, null, 'User deleted');
  } catch (err) {
    logger.error('Admin delete user error', { error: (err as Error).message });
    errors.internal(res, 'Failed to delete user');
  }
}

// ── Lessons ───────────────────────────────────────────────────────

export async function listPendingUsers(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const rows = await (db as any)
      .select({
        userId: schema.users.userId,
        fullname: schema.users.fullname,
        email: schema.users.email,
        role: schema.users.role,
        status: schema.users.status,
        createdAt: schema.users.createdAt,
        supabaseId: schema.users.supabaseId,
        googleId: schema.users.googleId,
      })
      .from(schema.users)
      .where(eq(schema.users.status, 'pending'))
      .orderBy(desc(schema.users.createdAt));

    const items = rows.map((r: any) => ({
      id: r.userId,
      name: r.fullname || 'Unknown',
      email: r.email,
      role: r.role || 'user',
      status: r.status || 'pending',
      joinedAt: r.createdAt || new Date().toISOString(),
      authProvider: r.supabaseId ? 'supabase' : r.googleId ? 'google' : 'email',
    }));

    success(res, { items, total: items.length }, 'Pending users loaded');
  } catch (err) {
    logger.error('Admin list pending users error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list pending users');
  }
}

export async function approveUser(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);

    const rows = await (db as any)
      .select({ userId: schema.users.userId, status: schema.users.status })
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);

    if (!rows.length) {
      errors.notFound(res, 'User not found');
      return;
    }

    await (db as any)
      .update(schema.users)
      .set({ status: 'approved' })
      .where(eq(schema.users.userId, userId));

    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'approve_user',
      resourceType: 'user',
      resourceId: String(userId),
      details: JSON.stringify({ approvedBy: req.user?.userId }),
    });

    success(res, { id: userId, status: 'approved' }, 'User approved');
  } catch (err) {
    logger.error('Admin approve user error', { error: (err as Error).message });
    errors.internal(res, 'Failed to approve user');
  }
}

export async function rejectUser(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);
    const { reason } = req.body || {};

    const rows = await (db as any)
      .select({ userId: schema.users.userId })
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);

    if (!rows.length) {
      errors.notFound(res, 'User not found');
      return;
    }

    await (db as any)
      .update(schema.users)
      .set({ status: 'rejected' })
      .where(eq(schema.users.userId, userId));

    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'reject_user',
      resourceType: 'user',
      resourceId: String(userId),
      details: JSON.stringify({ rejectedBy: req.user?.userId, reason: reason || null }),
    });

    success(res, { id: userId, status: 'rejected' }, 'User rejected');
  } catch (err) {
    logger.error('Admin reject user error', { error: (err as Error).message });
    errors.internal(res, 'Failed to reject user');
  }
}

export async function bulkApproveUsers(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      errors.validation(res, 'userIds array is required');
      return;
    }

    await (db as any)
      .update(schema.users)
      .set({ status: 'approved' })
      .where(inArray(schema.users.userId, userIds));

    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'bulk_approve_users',
      resourceType: 'user',
      resourceId: userIds.join(','),
      details: JSON.stringify({ count: userIds.length, approvedBy: req.user?.userId }),
    });

    success(res, { approved: userIds.length }, `${userIds.length} users approved`);
  } catch (err) {
    logger.error('Admin bulk approve error', { error: (err as Error).message });
    errors.internal(res, 'Failed to bulk approve users');
  }
}

// ── Lessons ───────────────────────────────────────────────────────

export async function listLessons(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const rows = await (db as any).select().from(schema.learningModules);

    const lessons = rows.map((m: any, i: number) => ({
      id: m.moduleId,
      title: m.moduleTitle,
      difficulty: m.difficulty || 'beginner',
      language: m.language || 'Bisaya',
      lessons: 8,
      completions: 0,
      avgCompletionPercent: 0,
      published: true,
      updatedAt: m.createdAt || new Date().toISOString(),
    }));

    success(res, lessons, 'Lessons loaded');
  } catch (err) {
    logger.error('Admin list lessons error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list lessons');
  }
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { title, difficulty, language } = req.body;

    const result = await (db as any).insert(schema.learningModules).values({
      moduleTitle: title || 'Untitled Module',
      difficulty: difficulty || 'beginner',
      language: language || 'Bisaya',
    });

    success(
      res,
      {
        id: result.lastInsertRowid,
        title,
        difficulty: difficulty || 'beginner',
        language: language || 'Bisaya',
        lessons: 0,
        completions: 0,
        avgCompletionPercent: 0,
        published: true,
        updatedAt: new Date().toISOString(),
      },
      'Lesson created'
    );
  } catch (err) {
    logger.error('Admin create lesson error', { error: (err as Error).message });
    errors.internal(res, 'Failed to create lesson');
  }
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const moduleId = Number(req.params.id);
    const { title, difficulty, published } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.moduleTitle = title;
    if (difficulty !== undefined) updates.difficulty = difficulty;

    if (Object.keys(updates).length > 0) {
      await (db as any)
        .update(schema.learningModules)
        .set(updates)
        .where(eq(schema.learningModules.moduleId, moduleId));
    }

    success(res, { id: moduleId, ...updates, published }, 'Lesson updated');
  } catch (err) {
    logger.error('Admin update lesson error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update lesson');
  }
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const moduleId = Number(req.params.id);
    await (db as any)
      .delete(schema.learningModules)
      .where(eq(schema.learningModules.moduleId, moduleId));
    success(res, null, 'Lesson deleted');
  } catch (err) {
    logger.error('Admin delete lesson error', { error: (err as Error).message });
    errors.internal(res, 'Failed to delete lesson');
  }
}

// ── Community ─────────────────────────────────────────────────────

export async function listPosts(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const rows = await (db as any)
      .select({
        postId: schema.communityPosts.postId,
        title: schema.communityPosts.title,
        content: schema.communityPosts.content,
        category: schema.communityPosts.category,
        createdAt: schema.communityPosts.createdAt,
        userId: schema.communityPosts.userId,
        userFullname: schema.users.fullname,
        isFeatured: schema.communityPosts.isFeatured,
        isHidden: schema.communityPosts.isHidden,
        likesCount: schema.communityPosts.likesCount,
      })
      .from(schema.communityPosts)
      .leftJoin(schema.users, eq(schema.communityPosts.userId, schema.users.userId))
      .orderBy(desc(schema.communityPosts.createdAt))
      .limit(50);

    const posts = await Promise.all(
      rows.map(async (r: any) => {
        const [commentRows, reportRows] = await Promise.all([
          (db as any)
            .select({ n: sql`count(*)` })
            .from(schema.comments)
            .where(eq(schema.comments.postId, r.postId)),
          (db as any)
            .select({ n: sql`count(*)` })
            .from(schema.communityReports)
            .where(eq(schema.communityReports.postId, r.postId)),
        ]);

        return {
          id: r.postId,
          author: { id: r.userId, name: r.userFullname || 'Unknown' },
          title: r.title || 'Untitled',
          content: r.content || '',
          category: r.category || 'general',
          likes: Number(r.likesCount || 0),
          comments: Number(commentRows[0]?.n || 0),
          reports: Number(reportRows[0]?.n || 0),
          featured: !!r.isFeatured,
          hidden: !!r.isHidden,
          createdAt: r.createdAt || new Date().toISOString(),
        };
      })
    );

    success(res, posts, 'Posts loaded');
  } catch (err) {
    logger.error('Admin list posts error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list posts');
  }
}

export async function toggleFeatured(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const postId = Number(req.params.id);
    // Client sends { toggleFeatured: boolean }; also accept { featured } explicitly.
    const body = req.body ?? {};
    const requested = body.toggleFeatured ?? body.featured;

    let next: boolean;
    if (typeof requested === 'boolean') {
      next = requested;
    } else {
      const [current] = await (db as any)
        .select({ isFeatured: schema.communityPosts.isFeatured })
        .from(schema.communityPosts)
        .where(eq(schema.communityPosts.postId, postId));
      if (!current) {
        errors.notFound(res, 'Post not found');
        return;
      }
      next = !current.isFeatured;
    }

    await (db as any)
      .update(schema.communityPosts)
      .set({ isFeatured: next ? 1 : 0 })
      .where(eq(schema.communityPosts.postId, postId));

    success(res, { id: postId, featured: next }, next ? 'Post featured' : 'Post unfeatured');
  } catch (err) {
    logger.error('Admin toggle featured error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update post');
  }
}

export async function setPostHidden(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const postId = Number(req.params.id);
    const { hidden } = req.body ?? {};

    await (db as any)
      .update(schema.communityPosts)
      .set({ isHidden: hidden ? 1 : 0 })
      .where(eq(schema.communityPosts.postId, postId));

    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: hidden ? 'hide_post' : 'unhide_post',
      resourceType: 'post',
      resourceId: String(postId),
    });

    success(res, { id: postId, hidden: !!hidden }, hidden ? 'Post hidden' : 'Post visible');
  } catch (err) {
    logger.error('Admin set post hidden error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update post');
  }
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const postId = Number(req.params.id);
    await (db as any).delete(schema.communityPosts).where(eq(schema.communityPosts.postId, postId));
    success(res, null, 'Post deleted');
  } catch (err) {
    logger.error('Admin delete post error', { error: (err as Error).message });
    errors.internal(res, 'Failed to delete post');
  }
}

export async function listReports(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const rows = await (db as any)
      .select({
        reportId: schema.communityReports.reportId,
        postId: schema.communityReports.postId,
        reporterId: schema.communityReports.reporterId,
        reason: schema.communityReports.reason,
        status: schema.communityReports.status,
        createdAt: schema.communityReports.createdAt,
        reporterName: schema.users.fullname,
      })
      .from(schema.communityReports)
      .leftJoin(schema.users, eq(schema.communityReports.reporterId, schema.users.userId))
      .orderBy(desc(schema.communityReports.createdAt))
      .limit(50);

    const reports = rows.map((r: any) => ({
      id: r.reportId,
      postId: r.postId,
      reportedBy: { id: r.reporterId || 0, name: r.reporterName || 'Unknown' },
      reason: r.reason || '',
      status: r.status || 'open',
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    success(res, reports, 'Reports loaded');
  } catch (err) {
    logger.error('Admin list reports error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list reports');
  }
}

export async function updateReportStatus(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const reportId = Number(req.params.id);
    const { status } = req.body;

    if (!['open', 'resolved', 'dismissed'].includes(status)) {
      errors.validation(res, 'Invalid status');
      return;
    }

    await (db as any)
      .update(schema.communityReports)
      .set({ status })
      .where(eq(schema.communityReports.reportId, reportId));

    success(res, { id: reportId, status }, 'Report updated');
  } catch (err) {
    logger.error('Admin update report error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update report');
  }
}

// ── AI Usage ──────────────────────────────────────────────────────

export async function getAiUsage(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();

    // Voice sessions from xp_logs
    const [voiceRow] = await (db as any)
      .select({ c: count() })
      .from(schema.xpLogs)
      .where(eq(schema.xpLogs.source, 'voice_practice'));

    // Tutor requests from xp_logs
    const [tutorRow] = await (db as any)
      .select({ c: count() })
      .from(schema.xpLogs)
      .where(eq(schema.xpLogs.source, 'lesson'));

    // Total tokens estimate
    const [tokenRow] = await (db as any)
      .select({
        total: sql<number>`coalesce(sum(${schema.learningAnalytics.totalSpeakingSeconds}), 0)`,
      })
      .from(schema.learningAnalytics);

    // Trend (last 7 days)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStr = daysAgo(i);
      const dayLabel = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
      const [row] = await (db as any)
        .select({ c: count() })
        .from(schema.xpLogs)
        .where(sql`date(${schema.xpLogs.timestamp}) = ${dayStr}`);
      trend.push({ label: dayLabel, value: num(row?.c) });
    }

    const conversations = num(voiceRow?.c);
    const tutorRequests = num(tutorRow?.c);
    const voiceRequests = conversations;
    const whisperRequests = 0;
    const total = conversations + tutorRequests + voiceRequests + whisperRequests;

    success(
      res,
      {
        conversations,
        voiceRequests,
        whisperRequests,
        tutorRequests,
        failedRequests: 0,
        avgResponseMs: 850,
        totalTokens: num(tokenRow?.total) * 100 || total * 500,
        providers: [
          { name: 'Groq (LLM)', requests: tutorRequests, failed: 0 },
          { name: 'Voicebox', requests: voiceRequests, failed: 0 },
          { name: 'Local STT', requests: whisperRequests, failed: 0 },
        ],
        trend,
      },
      'AI usage loaded'
    );
  } catch (err) {
    logger.error('Admin AI usage error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load AI usage');
  }
}

// ── XP & Rewards ──────────────────────────────────────────────────

export async function getXpOverview(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();

    const [totalXpRow] = await (db as any)
      .select({
        total: sql<number>`coalesce(sum(${schema.xpLogs.amount}), 0)`,
      })
      .from(schema.xpLogs);

    const [avgDailyRow] = await (db as any)
      .select({
        avg: sql<number>`coalesce(avg(${schema.xpLogs.amount}), 0)`,
      })
      .from(schema.xpLogs);

    // Level distribution
    const levelRows = await (db as any)
      .select({
        level: schema.learnerProfiles.level,
        c: count(),
      })
      .from(schema.learnerProfiles)
      .groupBy(schema.learnerProfiles.level);

    const levelDistribution = levelRows.map((r: any) => ({
      label: r.level || 'beginner',
      value: num(r.c),
    }));

    // Top users
    const topRows = await (db as any)
      .select({
        userId: schema.users.userId,
        fullname: schema.users.fullname,
        totalXp: schema.learnerProfiles.totalXp,
        streak: schema.learnerProfiles.streak,
        level: schema.learnerProfiles.level,
      })
      .from(schema.users)
      .leftJoin(schema.learnerProfiles, eq(schema.users.userId, schema.learnerProfiles.userId))
      .orderBy(desc(schema.learnerProfiles.totalXp))
      .limit(10);

    const topUsers = topRows.map((r: any) => ({
      id: r.userId,
      name: r.fullname || 'Unknown',
      level: levelToNumber(r.level, num(r.totalXp)),
      xp: num(r.totalXp),
      streak: num(r.streak),
    }));

    success(
      res,
      {
        totalXpAwarded: num(totalXpRow?.total),
        avgDailyXp: Math.round(num(avgDailyRow?.avg)),
        dailyRewardsClaimed: 0,
        levelDistribution,
        topUsers,
      },
      'XP overview loaded'
    );
  } catch (err) {
    logger.error('Admin XP overview error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load XP overview');
  }
}

// ── Feedback ──────────────────────────────────────────────────────

export async function listFeedback(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const rows = await (db as any)
      .select({
        feedbackId: schema.feedback.feedbackId,
        userId: schema.feedback.userId,
        functionality: schema.feedback.functionality,
        usability: schema.feedback.usability,
        reliability: schema.feedback.reliability,
        createdAt: schema.feedback.createdAt,
        userFullname: schema.users.fullname,
      })
      .from(schema.feedback)
      .leftJoin(schema.users, eq(schema.feedback.userId, schema.users.userId))
      .orderBy(desc(schema.feedback.createdAt))
      .limit(50);

    const items = rows.map((r: any) => ({
      id: r.feedbackId,
      user: { id: r.userId, name: r.userFullname || 'Unknown' },
      functionality: num(r.functionality),
      usability: num(r.usability),
      reliability: num(r.reliability),
      resolved: false,
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    success(res, items, 'Feedback loaded');
  } catch (err) {
    logger.error('Admin feedback error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load feedback');
  }
}

export async function resolveFeedback(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const feedbackId = Number(req.params.id);
    const { resolved } = req.body;

    await (db as any)
      .update(schema.feedback)
      .set({ resolved: resolved ? 1 : 0 })
      .where(eq(schema.feedback.feedbackId, feedbackId));

    success(
      res,
      { id: feedbackId, resolved: !!resolved },
      resolved ? 'Feedback resolved' : 'Feedback reopened'
    );
  } catch (err) {
    logger.error('Admin resolve feedback error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update feedback');
  }
}

// ── Preservation ──────────────────────────────────────────────────

export async function listPreserved(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const rows = await (db as any)
      .select({
        wordId: schema.preservedWords.wordId,
        word: schema.preservedWords.word,
        dialectalRegion: schema.preservedWords.dialectalRegion,
        definition: schema.preservedWords.definition,
        status: schema.preservedWords.status,
        createdAt: schema.preservedWords.createdAt,
        submittedBy: schema.preservedWords.submittedBy,
        userFullname: schema.users.fullname,
      })
      .from(schema.preservedWords)
      .leftJoin(schema.users, eq(schema.preservedWords.submittedBy, schema.users.userId))
      .orderBy(desc(schema.preservedWords.createdAt))
      .limit(50);

    const items = rows.map((r: any) => ({
      id: r.wordId,
      word: r.word,
      dialect: r.dialectalRegion || 'Unknown',
      meaning: r.definition || '',
      submittedBy: { id: r.submittedBy || 0, name: r.userFullname || 'Unknown' },
      status: r.status || 'pending',
      variations: [],
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    success(res, items, 'Preserved words loaded');
  } catch (err) {
    logger.error('Admin preservation error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load preserved words');
  }
}

export async function verifyPreserved(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const wordId = Number(req.params.id);
    const { status } = req.body;

    await (db as any)
      .update(schema.preservedWords)
      .set({ status })
      .where(eq(schema.preservedWords.wordId, wordId));

    success(res, { id: wordId, status }, 'Word verified');
  } catch (err) {
    logger.error('Admin verify preserved error', { error: (err as Error).message });
    errors.internal(res, 'Failed to verify word');
  }
}

// ── Settings ──────────────────────────────────────────────────────

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const admins = await (db as any)
      .select({
        userId: schema.users.userId,
        fullname: schema.users.fullname,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.role, 'admin'));

    success(
      res,
      {
        maintenanceMode: false,
        allowSignups: true,
        allowCommunity: true,
        requireVerificationForCommunity: false,
        dailyXpGoal: 50,
        maxDailyAiRequests: 100,
        aiProvider: process.env.GROQ_API_KEY ? 'groq' : 'auto',
        admins: admins.map((a: any) => ({
          id: a.userId,
          name: a.fullname,
          email: a.email,
          role: a.role,
        })),
        updatedAt: new Date().toISOString(),
      },
      'Settings loaded'
    );
  } catch (err) {
    logger.error('Admin settings error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load settings');
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const {
      maintenanceMode,
      allowSignups,
      allowCommunity,
      requireVerificationForCommunity,
      dailyXpGoal,
      maxDailyAiRequests,
      aiProvider,
    } = req.body;

    // Store settings as key-value pairs in audit_logs (or a dedicated settings table)
    const settingsData = {
      maintenanceMode: !!maintenanceMode,
      allowSignups: allowSignups !== false,
      allowCommunity: allowCommunity !== false,
      requireVerificationForCommunity: !!requireVerificationForCommunity,
      dailyXpGoal: Number(dailyXpGoal) || 50,
      maxDailyAiRequests: Number(maxDailyAiRequests) || 100,
      aiProvider: aiProvider || 'auto',
    };

    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'update_settings',
      resourceType: 'settings',
      resourceId: 'platform',
      details: JSON.stringify(settingsData),
    });

    // Invalidate settings cache so next request picks up new values
    invalidateSettingsCache();

    success(res, { ...settingsData, updatedAt: new Date().toISOString() }, 'Settings updated');
  } catch (err) {
    logger.error('Admin update settings error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update settings');
  }
}

// ── RBAC: Roles & Permissions ──────────────────────────────────────

export async function listRoles(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const roles = await (db as any).select().from(schema.roles);

    // Fetch permissions for each role
    const rolesWithPerms = await Promise.all(
      roles.map(async (role: any) => {
        const perms = await (db as any)
          .select({
            name: schema.permissions.name,
            resource: schema.permissions.resource,
            action: schema.permissions.action,
          })
          .from(schema.rolePermissions)
          .innerJoin(
            schema.permissions,
            eq(schema.rolePermissions.permissionId, schema.permissions.permissionId)
          )
          .where(eq(schema.rolePermissions.roleId, role.roleId));

        return {
          id: role.roleId,
          name: role.name,
          description: role.description,
          permissions: perms,
        };
      })
    );

    success(res, rolesWithPerms, 'Roles loaded');
  } catch (err) {
    logger.error('Admin list roles error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list roles');
  }
}

export async function listPermissions(_req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const perms = await (db as any).select().from(schema.permissions);
    success(res, perms, 'Permissions loaded');
  } catch (err) {
    logger.error('Admin list permissions error', { error: (err as Error).message });
    errors.internal(res, 'Failed to list permissions');
  }
}

export async function updateRolePermissions(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const roleId = Number(req.params.id);
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      errors.validation(res, 'permissionIds must be an array');
      return;
    }

    // Verify role exists
    const [role] = await (db as any)
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.roleId, roleId))
      .limit(1);

    if (!role) {
      errors.notFound(res, 'Role not found');
      return;
    }

    // Prevent removing all permissions from admin role
    if (role.name === 'admin' && permissionIds.length === 0) {
      errors.validation(res, 'Admin role must have at least one permission');
      return;
    }

    // Delete existing permissions
    await (db as any)
      .delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId));

    // Insert new permissions
    for (const permId of permissionIds) {
      await (db as any).insert(schema.rolePermissions).values({
        roleId,
        permissionId: permId,
      });
    }

    // Audit log
    await (db as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'update_role_permissions',
      resourceType: 'role',
      resourceId: String(roleId),
      details: JSON.stringify({
        roleName: role.name,
        permissionCount: permissionIds.length,
        changedBy: req.user?.userId,
      }),
      ipAddress: req.ip,
    });

    success(res, { roleId, permissionCount: permissionIds.length }, 'Role permissions updated');
  } catch (err) {
    logger.error('Admin update role permissions error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update role permissions');
  }
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { action, userId, page = '1', perPage = '50' } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limit = Math.min(100, Math.max(1, Number(perPage)));
    const offset = (pageNum - 1) * limit;

    let query = (db as any).select().from(schema.auditLogs);
    let countQuery = (db as any).select({ c: count() }).from(schema.auditLogs);

    if (action) {
      query = query.where(eq(schema.auditLogs.action, action as string));
      countQuery = countQuery.where(eq(schema.auditLogs.action, action as string));
    }
    if (userId) {
      query = query.where(eq(schema.auditLogs.userId, Number(userId)));
      countQuery = countQuery.where(eq(schema.auditLogs.userId, Number(userId)));
    }

    const [totalRow] = await countQuery;
    const total = totalRow?.c || 0;

    const logs = await query.orderBy(schema.auditLogs.timestamp).limit(limit).offset(offset);

    success(res, logs, 'Audit logs loaded', 200, {
      page: pageNum,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error('Admin audit logs error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get audit logs');
  }
}

// ---------------------------------------------------------------------------
// Public API keys
// ---------------------------------------------------------------------------

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  try {
    success(res, { keys: await listApiKeysRepo() });
  } catch (err) {
    logger.error('Admin list api keys error', { error: (err as Error).message });
    errors.internal(res, 'Failed to load API keys');
  }
}

/**
 * Mint a key. The plaintext key is returned exactly once in this response -
 * it is not stored anywhere and cannot be retrieved again, so the admin UI
 * must surface it immediately.
 */
export async function createApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { name, scopes, rateLimitPerMinute, expiresAt } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) {
      errors.validation(res, 'Field "name" is required');
      return;
    }
    if (scopes !== undefined && !Array.isArray(scopes)) {
      errors.validation(res, 'Field "scopes" must be an array of scope strings');
      return;
    }
    if (scopes?.length) {
      const unknown = scopes.filter((s: string) => !isValidScope(s));
      if (unknown.length) {
        errors.validation(res, `Unknown scope(s): ${unknown.join(', ')}`, {
          valid: API_KEY_SCOPES,
        });
        return;
      }
    }

    const limit = Number(rateLimitPerMinute);
    if (
      rateLimitPerMinute !== undefined &&
      (!Number.isFinite(limit) || limit < 1 || limit > 10000)
    ) {
      errors.validation(res, 'Field "rateLimitPerMinute" must be between 1 and 10000');
      return;
    }

    const { record, plaintextKey } = await createApiKeyRepo({
      name: name.trim(),
      scopes,
      rateLimitPerMinute: Number.isFinite(limit) ? limit : 60,
      ownerUserId: req.user?.userId ?? null,
      expiresAt: typeof expiresAt === 'string' && expiresAt ? expiresAt : null,
    });

    await (getDb() as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'create_api_key',
      resourceType: 'api_key',
      resourceId: String(record.keyId),
      details: JSON.stringify({ name: record.name, scopes: record.scopes }),
    });

    success(
      res,
      {
        key: { ...record, keyHash: undefined, maskedKey: `${record.lookupPrefix}${'*'.repeat(8)}` },
        // Shown once. Losing it means revoking and reissuing.
        plaintextKey,
        warning: 'Store this key now. It cannot be retrieved again.',
      },
      'API key created',
      201
    );
  } catch (err) {
    logger.error('Admin create api key error', { error: (err as Error).message });
    errors.internal(res, 'Failed to create API key');
  }
}

export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const changed = await revokeApiKeyRepo(id);
    if (!changed) {
      errors.notFound(res, 'No active API key with that id');
      return;
    }

    await (getDb() as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'revoke_api_key',
      resourceType: 'api_key',
      resourceId: String(id),
    });

    success(res, { id, status: 'revoked' }, 'API key revoked');
  } catch (err) {
    logger.error('Admin revoke api key error', { error: (err as Error).message });
    errors.internal(res, 'Failed to revoke API key');
  }
}

export async function reactivateApiKey(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const changed = await reactivateApiKeyRepo(id);
    if (!changed) {
      errors.notFound(res, 'No revoked API key with that id');
      return;
    }

    await (getDb() as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'reactivate_api_key',
      resourceType: 'api_key',
      resourceId: String(id),
    });

    success(res, { id, status: 'active' }, 'API key reactivated');
  } catch (err) {
    logger.error('Admin reactivate api key error', { error: (err as Error).message });
    errors.internal(res, 'Failed to reactivate API key');
  }
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const changed = await deleteApiKeyRepo(id);
    if (!changed) {
      errors.notFound(res, 'No API key with that id');
      return;
    }

    await (getDb() as any).insert(schema.auditLogs).values({
      userId: req.user?.userId,
      action: 'delete_api_key',
      resourceType: 'api_key',
      resourceId: String(id),
    });

    success(res, null, 'API key deleted');
  } catch (err) {
    logger.error('Admin delete api key error', { error: (err as Error).message });
    errors.internal(res, 'Failed to delete API key');
  }
}
