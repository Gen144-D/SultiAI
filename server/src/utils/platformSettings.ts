import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/connection';
import * as schema from '../db/schema-pg';

export interface PlatformSettings {
  maintenanceMode: boolean;
  allowSignups: boolean;
  allowCommunity: boolean;
  requireVerificationForCommunity: boolean;
  dailyXpGoal: number;
  maxDailyAiRequests: number;
  aiProvider: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  allowSignups: true,
  allowCommunity: true,
  requireVerificationForCommunity: false,
  dailyXpGoal: 50,
  maxDailyAiRequests: 100,
  aiProvider: 'auto',
};

let cachedSettings: PlatformSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }

  try {
    const db = getDb();
    const rows = await (db as any)
      .select({ details: schema.auditLogs.details })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, 'update_settings'))
      .orderBy(desc(schema.auditLogs.timestamp))
      .limit(1);

    if (rows.length > 0 && rows[0].details) {
      const parsed = JSON.parse(rows[0].details);
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }

  cacheExpiry = now + CACHE_TTL_MS;
  return cachedSettings;
}

export function invalidateSettingsCache(): void {
  cachedSettings = null;
  cacheExpiry = 0;
}
