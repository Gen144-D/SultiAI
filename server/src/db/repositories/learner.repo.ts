import { eq, gte, desc, sql } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';
import { isMongoConnected } from '../mongodb/connection';
import { LearnerProfile } from '../mongodb/learnerProfile.model';

const schema = getSchema();

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseJsonField(val: any): any {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
}

function safeStringify(val: any): string | null {
  if (!val) return null;
  return JSON.stringify(val);
}

export async function getProfile(userEmail: string): Promise<any> {
  const db = getDb();
  const userId = await getUserIdByEmail(userEmail);
  if (!userId) return null;

  if (isMongoConnected()) {
    let profile = await LearnerProfile.findOne({ userId }).lean();
    if (!profile) {
      profile = (await LearnerProfile.create({ userId }).then((d) => d.toObject())) as any;
    }
    return {
      level: (profile as any).level || 'beginner',
      strengths: (profile as any).strengths || [],
      weakAreas: (profile as any).weakAreas || [],
      commonMistakes: (profile as any).commonMistakes || [],
      totalXp: (profile as any).totalXp || 0,
      totalSessions: (profile as any).totalSessions || 0,
      lastActive: (profile as any).lastActive || null,
    };
  }

  const rows = await (db as any)
    .select()
    .from(schema.learnerProfiles)
    .where(eq(schema.learnerProfiles.userId, userId))
    .limit(1);

  let profile = rows[0];
  if (!profile) {
    await (db as any).insert(schema.learnerProfiles).values({ userId });
    return {
      level: 'beginner',
      strengths: [],
      weakAreas: [],
      commonMistakes: [],
      totalXp: 0,
      totalSessions: 0,
    };
  }

  return {
    level: profile.level || 'beginner',
    strengths: parseJsonField(profile.strengths),
    weakAreas: parseJsonField(profile.weakAreas),
    commonMistakes: parseJsonField(profile.commonMistakes),
    totalXp: profile.totalXp || 0,
    totalSessions: profile.totalSessions || 0,
    lastActive: profile.lastActive || null,
  };
}

export async function getMistakes(userEmail: string): Promise<any[]> {
  const profile = await getProfile(userEmail);
  return profile?.commonMistakes || [];
}

export async function getUserIdByEmail(email: string): Promise<number | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows[0]?.userId;
}

export async function getFullProfileByEmail(email: string): Promise<any> {
  const db = getDb();
  const userId = await getUserIdByEmail(email);
  if (!userId) return null;

  if (isMongoConnected()) {
    const profile = await LearnerProfile.findOne({ userId }).lean();
    return profile;
  }

  const rows = await (db as any)
    .select()
    .from(schema.learnerProfiles)
    .where(eq(schema.learnerProfiles.userId, userId))
    .limit(1);
  return rows[0] || null;
}

export async function getStats(userId: number): Promise<any> {
  const db = getDb();
  if (isMongoConnected()) {
    const profile = await LearnerProfile.findOne({ userId }).lean();
    return profile
      ? {
          xp: (profile as any).totalXp || 0,
          coins: (profile as any).coins || 0,
          hearts: (profile as any).hearts || 5,
          streak: (profile as any).streak || 0,
          daily_xp: (profile as any).dailyXp || 0,
          daily_goal: (profile as any).dailyGoal || 50,
        }
      : null;
  }
  const rows = await (db as any)
    .select()
    .from(schema.learnerProfiles)
    .where(eq(schema.learnerProfiles.userId, userId))
    .limit(1);
  const p = rows[0];
  if (!p) return null;
  return {
    xp: p.totalXp || 0,
    coins: p.coins || 0,
    hearts: p.hearts || 5,
    streak: 0,
    daily_xp: p.dailyXp || 0,
    daily_goal: p.dailyGoal || 50,
  };
}

export async function updateStats(userId: number, data: any): Promise<void> {
  const db = getDb();
  if (isMongoConnected()) {
    await LearnerProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(data.xp != null && { totalXp: data.xp }),
          ...(data.coins != null && { coins: data.coins }),
          ...(data.hearts != null && { hearts: data.hearts }),
          ...(data.streak != null && { streak: data.streak }),
          ...(data.daily_xp != null && { dailyXp: data.daily_xp }),
        },
      }
    );
    return;
  }
  const updates: any = {};
  if (data.xp != null) updates.totalXp = data.xp;
  if (data.coins != null) updates.coins = data.coins;
  if (data.hearts != null) updates.hearts = data.hearts;
  if (data.streak != null) updates.streak = data.streak;
  if (data.daily_xp != null) updates.dailyXp = data.daily_xp;
  if (Object.keys(updates).length > 0) {
    await (db as any)
      .update(schema.learnerProfiles)
      .set(updates)
      .where(eq(schema.learnerProfiles.userId, userId));
  }
}

export function getLearnerRepo() {
  return {
    getProfile: (email: string) => getProfile(email),
    getStats: (userId: number) => getStats(userId),
    updateStats: (userId: number, data: any) => updateStats(userId, data),
    getLeaderboard: (period: string) => getLeaderboard(period),
    addDailyReward: (userId: number, reward: { xp: number; coins: number }) =>
      addDailyReward(userId, reward),
    addXp: (userId: number, amount: number) => addXp(userId, amount),
    addCoins: (userId: number, amount: number) => addCoins(userId, amount),
    getMistakes: (email: string) => getMistakes(email),
    getUserIdByEmail: (email: string) => getUserIdByEmail(email),
  };
}

export async function getLeaderboard(period: string): Promise<any[]> {
  const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  if (isMongoConnected()) {
    return LearnerProfile.find({ lastActive: { $gte: new Date(since) } })
      .sort({ totalXp: -1 })
      .limit(50)
      .lean()
      .then((profiles: any) =>
        profiles.map((p: any, i: number) => ({
          rank: i + 1,
          id: p.userId,
          name: p.userName || 'Anonymous',
          xp: p.totalXp || 0,
          streak: p.streak || 0,
          avatar: p.avatar || null,
        }))
      );
  }

  const db = getDb();
  const leaders = await (db as any)
    .select({
      id: schema.learnerProfiles.userId,
      name: schema.users.fullname,
      username: schema.users.username,
      xp: schema.learnerProfiles.totalXp,
      streak: schema.learnerProfiles.streak,
    })
    .from(schema.learnerProfiles)
    .innerJoin(schema.users, eq(schema.users.userId, schema.learnerProfiles.userId))
    .where(gte(schema.learnerProfiles.lastActive, since))
    .orderBy(desc(schema.learnerProfiles.totalXp))
    .limit(50);
  return leaders.map((l: any, i: number) => ({ ...l, rank: i + 1 }));
}

/**
 * Claims the daily reward exactly once per user per calendar day. Relies on the
 * unique index on daily_activity(user_id, activity_date) added by
 * supabase/migrations/20261001_gamification_integrity.sql — without it this
 * ON CONFLICT is a no-op and the row is inserted unconditionally every call.
 */
export async function addDailyReward(
  userId: number,
  reward: { xp: number; coins: number }
): Promise<{ claimed: boolean }> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const inserted = await (db as any)
    .insert(schema.dailyActivity)
    .values({ userId, activityDate: today, xpEarned: reward.xp })
    .onConflictDoNothing({
      target: [schema.dailyActivity.userId, schema.dailyActivity.activityDate],
    })
    .returning({ activityId: schema.dailyActivity.activityId });

  if (!inserted.length) return { claimed: false }; // already claimed today

  await addXp(userId, reward.xp, {
    source: 'daily_reward',
    idempotencyKey: `daily_reward:${userId}:${today}`,
  });
  await addCoins(userId, reward.coins);
  return { claimed: true };
}

/**
 * Credits XP. When `opts.idempotencyKey` is provided, the credit is recorded in
 * xp_logs with a unique (user_id, idempotency_key) constraint (see the
 * 20261001 migration) so a retried/duplicated call for the same action only
 * pays out once. Without a key, this is an unconditional increment — use only
 * for flows that cannot be retried/duplicated by the client.
 */
export async function addXp(
  userId: number,
  amount: number,
  opts?: { source?: string; idempotencyKey?: string }
): Promise<{ credited: boolean }> {
  const db = getDb();

  if (opts?.idempotencyKey) {
    const inserted = await (db as any)
      .insert(schema.xpLogs)
      .values({
        id: randomId(),
        userId,
        amount,
        source: opts.source || 'unknown',
        idempotencyKey: opts.idempotencyKey,
        timestamp: new Date().toISOString(),
      })
      .onConflictDoNothing({
        target: [schema.xpLogs.userId, schema.xpLogs.idempotencyKey],
      })
      .returning({ id: schema.xpLogs.id });

    if (!inserted.length) return { credited: false };
  }

  await (db as any)
    .update(schema.learnerProfiles)
    .set({ totalXp: sql`total_xp + ${amount}`, dailyXp: sql`daily_xp + ${amount}` })
    .where(eq(schema.learnerProfiles.userId, userId));
  return { credited: true };
}

export async function addCoins(userId: number, amount: number): Promise<void> {
  const db = getDb();
  await (db as any)
    .update(schema.learnerProfiles)
    .set({ coins: sql`coins + ${amount}` })
    .where(eq(schema.learnerProfiles.userId, userId));
}

export async function upsertProfileFromAnalysis(
  email: string,
  analysis: {
    user_level?: string;
    detected_mistakes?: Array<{ pattern: string; correction: string; count: number }>;
    topics?: string[];
  },
  text: string,
  reply: string,
  sessionId: string | null
): Promise<void> {
  const db = getDb();
  const userId = await getUserIdByEmail(email);
  if (!userId) return;

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (isMongoConnected()) {
    let profile: any = await LearnerProfile.findOne({ userId });
    if (!profile) {
      profile = await LearnerProfile.create({ userId });
    }

    const newMistakes = analysis.detected_mistakes || [];
    for (const nm of newMistakes) {
      const existing = profile.commonMistakes.find((m: any) => m.pattern === nm.pattern);
      if (existing) {
        existing.count = (existing.count || 1) + (nm.count || 1);
      } else {
        profile.commonMistakes.push({
          pattern: nm.pattern,
          correction: nm.correction,
          count: nm.count || 1,
        });
      }
    }
    profile.commonMistakes.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
    profile.commonMistakes = profile.commonMistakes.slice(0, 10);

    const topics = analysis.topics || [];
    for (const t of topics) {
      if (analysis.user_level === 'advanced' || !newMistakes.length) {
        if (!profile.strengths.includes(t)) profile.strengths.push(t);
      } else {
        if (!profile.weakAreas.includes(t)) profile.weakAreas.push(t);
      }
    }
    profile.strengths = profile.strengths.slice(-10);
    profile.weakAreas = profile.weakAreas.slice(-10);
    profile.level = analysis.user_level || profile.level;
    profile.totalXp = (profile.totalXp || 0) + 10;
    if (!sessionId) profile.totalSessions = (profile.totalSessions || 0) + 1;
    profile.lastActive = new Date();

    await profile.save();
    return;
  }

  const profileRow: any =
    (await (db as any)
      .select()
      .from(schema.learnerProfiles)
      .where(eq(schema.learnerProfiles.userId, userId))
      .limit(1)
      .then((r: any[]) => r[0])) || {};

  if (!profileRow.userId) {
    await (db as any).insert(schema.learnerProfiles).values({ userId });
  }

  const existingMistakes: any[] = parseJsonField(profileRow.commonMistakes);
  const newMistakes = analysis.detected_mistakes || [];
  for (const nm of newMistakes) {
    const existing = existingMistakes.find((m: any) => m.pattern === nm.pattern);
    if (existing) {
      existing.count = (existing.count || 1) + (nm.count || 1);
    } else {
      existingMistakes.push({
        pattern: nm.pattern,
        correction: nm.correction,
        count: nm.count || 1,
      });
    }
  }
  existingMistakes.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
  const topMistakes = existingMistakes.slice(0, 10);

  const existingStrengths: string[] = parseJsonField(profileRow.strengths);
  const existingWeakAreas: string[] = parseJsonField(profileRow.weakAreas);
  const topics = analysis.topics || [];
  for (const t of topics) {
    if (analysis.user_level === 'advanced' || !newMistakes.length) {
      if (!existingStrengths.includes(t)) existingStrengths.push(t);
    } else {
      if (!existingWeakAreas.includes(t)) existingWeakAreas.push(t);
    }
  }
  const topStrengths = existingStrengths.slice(-10);
  const topWeakAreas = existingWeakAreas.slice(-10);

  await (db as any)
    .update(schema.learnerProfiles)
    .set({
      level: analysis.user_level || profileRow.level || 'beginner',
      strengths: safeStringify(topStrengths),
      weakAreas: safeStringify(topWeakAreas),
      commonMistakes: safeStringify(topMistakes),
      totalXp: sql`total_xp + 10`,
      totalSessions: sessionId ? sql`total_sessions` : sql`total_sessions + 1`,
      lastActive: now,
    })
    .where(eq(schema.learnerProfiles.userId, userId));
}
