import { Request, Response } from 'express';
import { getDb } from '../db/connection';
import * as schema from '../db/schema-sqlite';
import { success, errors } from '../utils/apiResponse';
import logger from '../utils/logger';

export async function getPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const db = getDb();
    const rows = await (db as any)
      .select()
      .from(schema.notificationPreferences)
      .where((db as any).eq(schema.notificationPreferences.userId, userId))
      .limit(1);

    if (rows.length === 0) {
      success(res, {
        daily_reminder: true,
        daily_reminder_hour: 9,
        daily_reminder_minute: 0,
        streak_reminder: true,
        review_reminder: true,
        weekly_report: true,
        achievement_alerts: true,
        community_alerts: true,
      });
      return;
    }

    const prefs = rows[0];
    success(res, {
      daily_reminder: !!prefs.dailyReminder,
      daily_reminder_hour: prefs.dailyReminderHour || 9,
      daily_reminder_minute: prefs.dailyReminderMinute || 0,
      streak_reminder: !!prefs.streakReminder,
      review_reminder: !!prefs.reviewReminder,
      weekly_report: !!prefs.weeklyReport,
      achievement_alerts: !!prefs.achievementAlerts,
      community_alerts: !!prefs.communityAlerts,
    });
  } catch (err) {
    logger.error('Get notification preferences error', { error: (err as Error).message });
    errors.internal(res, 'Failed to get preferences');
  }
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = await getUserIdFromEmail(req.user!.email);
    if (!userId) {
      errors.notFound(res, 'User not found');
      return;
    }

    const {
      daily_reminder,
      daily_reminder_hour,
      daily_reminder_minute,
      streak_reminder,
      review_reminder,
      weekly_report,
      achievement_alerts,
      community_alerts,
    } = req.body || {};

    const db = getDb();
    const now = new Date().toISOString();

    const existing = await (db as any)
      .select()
      .from(schema.notificationPreferences)
      .where((db as any).eq(schema.notificationPreferences.userId, userId))
      .limit(1);

    const values = {
      ...(daily_reminder !== undefined && { dailyReminder: daily_reminder ? 1 : 0 }),
      ...(daily_reminder_hour !== undefined && { dailyReminderHour: daily_reminder_hour }),
      ...(daily_reminder_minute !== undefined && { dailyReminderMinute: daily_reminder_minute }),
      ...(streak_reminder !== undefined && { streakReminder: streak_reminder ? 1 : 0 }),
      ...(review_reminder !== undefined && { reviewReminder: review_reminder ? 1 : 0 }),
      ...(weekly_report !== undefined && { weeklyReport: weekly_report ? 1 : 0 }),
      ...(achievement_alerts !== undefined && { achievementAlerts: achievement_alerts ? 1 : 0 }),
      ...(community_alerts !== undefined && { communityAlerts: community_alerts ? 1 : 0 }),
      updatedAt: now,
    };

    if (existing.length > 0) {
      await (db as any)
        .update(schema.notificationPreferences)
        .set(values)
        .where((db as any).eq(schema.notificationPreferences.userId, userId));
    } else {
      await (db as any).insert(schema.notificationPreferences).values({ userId, ...values });
    }

    success(res, values, 'Preferences updated');
  } catch (err) {
    logger.error('Update notification preferences error', { error: (err as Error).message });
    errors.internal(res, 'Failed to update preferences');
  }
}

async function getUserIdFromEmail(email: string): Promise<number | undefined> {
  const { getUserIdByEmail } = await import('../db/repositories/conversation.repo');
  return getUserIdByEmail(email);
}
