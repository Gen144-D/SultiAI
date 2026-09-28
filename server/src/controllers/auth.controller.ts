import crypto from 'crypto';
import { Request, Response } from 'express';
import { eq, and, or } from 'drizzle-orm';
import axios from 'axios';
import { getDb } from '../db/connection';
import * as schema from '../db/schema-pg';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { success, errors, created } from '../utils/apiResponse';
import { getPlatformSettings } from '../utils/platformSettings';
import { getUserRoleInfo } from '../utils/rbac';
import logger from '../utils/logger';

/** Check if user status allows login */
function checkUserStatus(status: string | null): { allowed: boolean; message?: string } {
  if (status === 'pending')
    return {
      allowed: false,
      message:
        'Your account is pending admin approval. Please wait for an admin to approve your account.',
    };
  if (status === 'rejected')
    return {
      allowed: false,
      message: 'Your account has been rejected. Please contact an administrator.',
    };
  if (status === 'banned')
    return {
      allowed: false,
      message: 'Your account has been banned. Please contact an administrator.',
    };
  if (status === 'suspended')
    return {
      allowed: false,
      message: 'Your account has been suspended. Please contact an administrator.',
    };
  return { allowed: true };
}

export async function signUp(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const fullname = body.fullname || body.name;
    const { email, password } = body;
    if (!fullname || !email || !password) {
      errors.validation(res, 'Fullname, email, and password are required');
      return;
    }

    // Check platform settings
    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      errors.forbidden(res, 'System is under maintenance. Please try again later.');
      return;
    }
    if (!settings.allowSignups) {
      errors.forbidden(
        res,
        'New registrations are currently disabled. Please contact an administrator.'
      );
      return;
    }

    const db = getDb();
    const existing = await (db as any)
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length > 0) {
      errors.conflict(res, 'Email already registered');
      return;
    }

    const passwordHash = hashPassword(password);
    const result = await (db as any).insert(schema.users).values({
      fullname,
      email,
      passwordHash,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const userId = result.lastInsertRowid;

    created(
      res,
      {
        user: { id: userId, fullname, email, status: 'pending' },
        message: 'Account created successfully. Your account is pending admin approval.',
      },
      'Account created — pending admin approval'
    );
  } catch (err) {
    logger.error('Signup error', { error: (err as Error).message });
    errors.internal(res, 'Failed to create account');
  }
}

export async function signIn(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      errors.validation(res, 'Email and password are required');
      return;
    }

    // Check platform settings
    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      errors.forbidden(res, 'System is under maintenance. Please try again later.');
      return;
    }

    const db = getDb();
    const rows = await (db as any)
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (rows.length === 0) {
      errors.unauthorized(res, 'Invalid email or password');
      return;
    }

    const user = rows[0];
    if (!verifyPassword(password, user.passwordHash)) {
      errors.unauthorized(res, 'Invalid email or password');
      return;
    }

    // Check user status
    const statusCheck = checkUserStatus(user.status);
    if (!statusCheck.allowed) {
      errors.forbidden(res, statusCheck.message!);
      return;
    }

    // Fetch role info for JWT
    const roleInfo = await getUserRoleInfo(user.userId);

    const tokens = generateTokenPair({
      email: user.email,
      userId: user.userId,
      role: roleInfo.role,
      roleId: roleInfo.roleId || undefined,
      permissions: roleInfo.permissions,
    });
    await storeRefreshToken(user.userId, tokens.refreshToken);

    success(
      res,
      {
        user: {
          id: user.userId,
          fullname: user.fullname,
          email: user.email,
          avatarId: user.avatarId,
          role: user.role,
          status: user.status,
          permissions: roleInfo.permissions,
        },
        ...tokens,
      },
      'Signed in successfully'
    );
  } catch (err) {
    logger.error('Signin error', { error: (err as Error).message });
    errors.internal(res, 'Failed to sign in');
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      errors.validation(res, 'Refresh token is required');
      return;
    }

    const payload = verifyRefreshToken(refresh_token);
    if (!payload) {
      errors.unauthorized(res, 'Invalid or expired refresh token');
      return;
    }

    const isValid = await validateStoredToken(payload.userId, refresh_token);
    if (!isValid) {
      errors.unauthorized(res, 'Refresh token revoked');
      return;
    }

    await revokeToken(payload.userId, refresh_token);

    const roleInfo = await getUserRoleInfo(payload.userId);
    const tokens = generateTokenPair({
      email: payload.email,
      userId: payload.userId,
      role: roleInfo.role,
      roleId: roleInfo.roleId || undefined,
      permissions: roleInfo.permissions,
    });
    await storeRefreshToken(payload.userId, tokens.refreshToken);

    success(res, tokens, 'Token refreshed');
  } catch (err) {
    logger.error('Refresh token error', { error: (err as Error).message });
    errors.internal(res, 'Failed to refresh token');
  }
}

export async function clerkSync(req: Request, res: Response): Promise<void> {
  try {
    const { clerkId, clerkToken, email, name, avatar } = req.body || {};
    if (!clerkId) {
      errors.validation(res, 'clerkId is required');
      return;
    }

    // Check platform settings
    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      errors.forbidden(res, 'System is under maintenance.');
      return;
    }

    const db = getDb();

    // 1. Try to find existing user by clerk_id first
    let rows: any[] = await (db as any)
      .select()
      .from(schema.users)
      .where(eq(schema.users.clerkId, clerkId))
      .limit(1);

    // 2. If not found by clerk_id, try by email
    if (rows.length === 0 && email) {
      rows = await (db as any)
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      // If found by email, link the clerk_id
      if (rows.length > 0) {
        await (db as any)
          .update(schema.users)
          .set({ clerkId })
          .where(eq(schema.users.userId, rows[0].userId));
      }
    }

    let userId: number;
    let isNewUser = false;

    if (rows.length > 0) {
      // Existing user — update their info if needed
      userId = rows[0].userId;
      const updates: any = {};
      if (name && name !== rows[0].fullname) updates.fullname = name;
      if (Object.keys(updates).length > 0) {
        await (db as any).update(schema.users).set(updates).where(eq(schema.users.userId, userId));
      }

      // Check status of existing user
      const statusCheck = checkUserStatus(rows[0].status);
      if (!statusCheck.allowed) {
        errors.forbidden(res, statusCheck.message!);
        return;
      }
    } else {
      // New user — create account with pending status
      if (!settings.allowSignups) {
        errors.forbidden(res, 'New registrations are currently disabled.');
        return;
      }

      const fullname = name || 'User';
      const passwordHash = hashPassword(crypto.randomUUID());
      const result = await (db as any).insert(schema.users).values({
        fullname,
        email: email || `${clerkId}@clerk.sultiai`,
        passwordHash,
        clerkId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      userId = result.lastInsertRowid;
      isNewUser = true;
    }

    // Issue backend JWT so subsequent API calls work
    const user = rows.length > 0 ? rows[0] : null;
    const roleInfo = user
      ? await getUserRoleInfo(user.userId || userId)
      : { role: 'user', roleId: null, permissions: [] };
    const tokens = generateTokenPair({
      email: email || `${clerkId}@clerk.sultiai`,
      userId,
      role: roleInfo.role,
      roleId: roleInfo.roleId || undefined,
      permissions: roleInfo.permissions,
    });
    await storeRefreshToken(userId, tokens.refreshToken);

    success(
      res,
      {
        user: {
          id: userId,
          fullname: user?.fullname || name || 'User',
          email: email || user?.email,
          avatarId: user?.avatarId,
          role: user?.role,
          status: user?.status || 'pending',
        },
        ...tokens,
        isNewUser,
      },
      isNewUser ? 'Clerk user synced — pending admin approval' : 'Clerk user synced'
    );
  } catch (err) {
    logger.error('Clerk sync error', { error: (err as Error).message });
    errors.internal(res, 'Failed to sync Clerk user');
  }
}

export async function googleSignIn(req: Request, res: Response): Promise<void> {
  try {
    const { idToken, email, name, avatar } = req.body || {};
    if (!idToken) {
      errors.validation(res, 'idToken is required');
      return;
    }

    // Check platform settings
    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      errors.forbidden(res, 'System is under maintenance.');
      return;
    }

    // Verify the Google ID token by calling Google's tokeninfo endpoint
    let googleUser: { sub: string; email: string; name?: string; picture?: string };
    try {
      const tokenRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );
      googleUser = tokenRes.data;
    } catch {
      errors.unauthorized(res, 'Invalid Google ID token');
      return;
    }

    const googleId = googleUser.sub;
    const userEmail = email || googleUser.email;
    const userName = name || googleUser.name || 'Google User';
    const userAvatar = avatar || googleUser.picture;

    if (!googleId) {
      errors.unauthorized(res, 'Could not verify Google identity');
      return;
    }

    const db = getDb();

    // 1. Try to find existing user by google_id
    let rows: any[] = await (db as any)
      .select()
      .from(schema.users)
      .where(eq(schema.users.googleId, googleId))
      .limit(1);

    // 2. If not found by google_id, try by email
    if (rows.length === 0 && userEmail) {
      rows = await (db as any)
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, userEmail))
        .limit(1);

      // Link google_id to existing account
      if (rows.length > 0) {
        await (db as any)
          .update(schema.users)
          .set({ googleId })
          .where(eq(schema.users.userId, rows[0].userId));
      }
    }

    let userId: number;
    let isNewUser = false;

    if (rows.length > 0) {
      userId = rows[0].userId;

      // Check status of existing user
      const statusCheck = checkUserStatus(rows[0].status);
      if (!statusCheck.allowed) {
        errors.forbidden(res, statusCheck.message!);
        return;
      }

      // Update profile info if changed
      const updates: any = {};
      if (userName && userName !== rows[0].fullname) updates.fullname = userName;
      if (userAvatar && userAvatar !== rows[0].avatarImage) updates.avatarImage = userAvatar;
      if (Object.keys(updates).length > 0) {
        await (db as any).update(schema.users).set(updates).where(eq(schema.users.userId, userId));
      }
    } else {
      // New user — create account with pending status
      if (!settings.allowSignups) {
        errors.forbidden(res, 'New registrations are currently disabled.');
        return;
      }

      const passwordHash = hashPassword(crypto.randomUUID());
      const result = await (db as any).insert(schema.users).values({
        fullname: userName,
        email: userEmail || `${googleId}@google.sultiai`,
        passwordHash,
        googleId,
        avatarImage: userAvatar || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      userId = result.lastInsertRowid;
      isNewUser = true;
    }

    const roleInfo =
      rows.length > 0
        ? await getUserRoleInfo(rows[0].userId || userId)
        : { role: 'user', roleId: null, permissions: [] };
    const tokens = generateTokenPair({
      email: userEmail || `${googleId}@google.sultiai`,
      userId,
      role: roleInfo.role,
      roleId: roleInfo.roleId || undefined,
      permissions: roleInfo.permissions,
    });
    await storeRefreshToken(userId, tokens.refreshToken);

    const updatedUser = rows.length > 0 ? rows[0] : null;
    success(
      res,
      {
        user: {
          id: userId,
          fullname: userName || updatedUser?.fullname,
          email: userEmail || updatedUser?.email,
          avatarId: updatedUser?.avatarId,
          avatarImage: userAvatar || updatedUser?.avatarImage,
          role: updatedUser?.role || 'user',
          status: updatedUser?.status || 'pending',
        },
        ...tokens,
        isNewUser,
      },
      isNewUser ? 'Google sign-in successful — pending admin approval' : 'Google sign-in successful'
    );
  } catch (err) {
    logger.error('Google sign-in error', { error: (err as Error).message });
    errors.internal(res, 'Failed to sign in with Google');
  }
}

export async function signOut(req: Request, res: Response): Promise<void> {
  try {
    const { refresh_token } = req.body || {};
    if (refresh_token) {
      const payload = verifyRefreshToken(refresh_token);
      if (payload) {
        await revokeToken(payload.userId, refresh_token);
      }
    }

    success(res, null, 'Signed out successfully');
  } catch (err) {
    logger.error('Signout error', { error: (err as Error).message });
    errors.internal(res, 'Failed to sign out');
  }
}

/**
 * Sync a Supabase user into the local SQLite database.
 * Called by the mobile app after successful Supabase signup/sign-in
 * so the user appears in the admin panel.
 */
export async function syncSupabase(req: Request, res: Response): Promise<void> {
  try {
    const { supabaseId, email, name, native_language, target_language } = req.body || {};
    if (!supabaseId || !email) {
      errors.validation(res, 'supabaseId and email are required');
      return;
    }

    // Check platform settings
    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      errors.forbidden(res, 'System is under maintenance.');
      return;
    }

    const db = getDb();

    // 1. Try to find existing user by supabase_id
    let rows: any[] = await (db as any)
      .select()
      .from(schema.users)
      .where(eq(schema.users.supabaseId, supabaseId))
      .limit(1);

    // 2. If not found by supabase_id, try by email
    if (rows.length === 0 && email) {
      rows = await (db as any)
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      // If found by email, link the supabase_id
      if (rows.length > 0) {
        await (db as any)
          .update(schema.users)
          .set({ supabaseId })
          .where(eq(schema.users.userId, rows[0].userId));
      }
    }

    let userId: number;
    let isNewUser = false;

    if (rows.length > 0) {
      // Existing user — update info if needed
      userId = rows[0].userId;
      const updates: any = {};
      if (name && name !== rows[0].fullname) updates.fullname = name;
      if (Object.keys(updates).length > 0) {
        await (db as any).update(schema.users).set(updates).where(eq(schema.users.userId, userId));
      }

      // Check status of existing user
      const statusCheck = checkUserStatus(rows[0].status);
      if (!statusCheck.allowed) {
        errors.forbidden(res, statusCheck.message!);
        return;
      }
    } else {
      // New user — create account in SQLite with pending status
      if (!settings.allowSignups) {
        errors.forbidden(res, 'New registrations are currently disabled.');
        return;
      }

      const fullname = name || 'User';
      const passwordHash = hashPassword(crypto.randomUUID());
      const result = await (db as any).insert(schema.users).values({
        fullname,
        email,
        passwordHash,
        supabaseId,
        preferredLang: native_language || 'English',
        learningLang: target_language || 'Bisaya',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      userId = result.lastInsertRowid;
      isNewUser = true;

      // Create learner profile
      await (db as any).insert(schema.learnerProfiles).values({
        userId,
        level: 'beginner',
        totalXp: 0,
        coins: 0,
        streak: 0,
        dailyXp: 0,
        dailyGoal: 50,
        totalSessions: 0,
      });
    }

    const existingUser = rows.length > 0 ? rows[0] : null;

    success(
      res,
      {
        user: {
          id: userId,
          fullname: name || existingUser?.fullname || 'User',
          email: email || existingUser?.email,
          role: existingUser?.role || 'user',
          status: existingUser?.status || 'pending',
        },
        isNewUser,
      },
      isNewUser
        ? 'Supabase user synced — pending admin approval'
        : 'Supabase user already exists in local DB'
    );
  } catch (err) {
    logger.error('Supabase sync error', { error: (err as Error).message });
    errors.internal(res, 'Failed to sync Supabase user');
  }
}

async function storeRefreshToken(userId: number, token: string): Promise<void> {
  try {
    const db = getDb();
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await (db as any).insert(schema.userSessions).values({
      id,
      userId,
      refreshToken: token,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn('Failed to store refresh token', { error: (err as Error).message });
  }
}

async function validateStoredToken(userId: number, token: string): Promise<boolean> {
  try {
    const db = getDb();
    const rows = await (db as any)
      .select()
      .from(schema.userSessions)
      .where(
        and(eq(schema.userSessions.userId, userId), eq(schema.userSessions.refreshToken, token))
      )
      .limit(1);

    if (rows.length === 0) return false;
    return new Date(rows[0].expiresAt) > new Date();
  } catch {
    return false;
  }
}

async function revokeToken(userId: number, token: string): Promise<void> {
  try {
    const db = getDb();
    await (db as any)
      .delete(schema.userSessions)
      .where(
        and(eq(schema.userSessions.userId, userId), eq(schema.userSessions.refreshToken, token))
      );
  } catch (err) {
    logger.warn('Failed to revoke token', { error: (err as Error).message });
  }
}
