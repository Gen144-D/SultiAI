import { eq } from 'drizzle-orm';
import { getDb, getSchema } from '../connection';

const schema = getSchema();

export async function getSettings(userEmail: string): Promise<any> {
  const db = getDb();
  const rows = await (db as any)
    .select({
      settingId: schema.userSettings.settingId,
      userId: schema.userSettings.userId,
      darkMode: schema.userSettings.darkMode,
      speechSpeed: schema.userSettings.speechSpeed,
      voiceGender: schema.userSettings.voiceGender,
    })
    .from(schema.userSettings)
    .innerJoin(schema.users, eq(schema.userSettings.userId, schema.users.userId))
    .where(eq(schema.users.email, userEmail))
    .limit(1);
  return rows[0] || { dark_mode: false, speech_speed: 1.0, voice_gender: 'neutral' };
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

export async function updateSettings(
  userId: number,
  data: { darkMode?: number | null; speechSpeed?: number | null; voiceGender?: string | null }
): Promise<void> {
  const db = getDb();
  const updateData: any = {};
  if (data.darkMode !== undefined && data.darkMode !== null) updateData.darkMode = data.darkMode;
  if (data.speechSpeed !== undefined && data.speechSpeed !== null)
    updateData.speechSpeed = data.speechSpeed;
  if (data.voiceGender !== undefined && data.voiceGender !== null)
    updateData.voiceGender = data.voiceGender;

  if (Object.keys(updateData).length > 0) {
    await (db as any)
      .update(schema.userSettings)
      .set(updateData)
      .where(eq(schema.userSettings.userId, userId));
  }
}
