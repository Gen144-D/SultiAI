// Removes everything e2e-make-session.ts created: the temporary Supabase user,
// its local SQLite rows, and the e2e-session.json file. Safe to re-run.
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
// Supabase keys live in the repo-root .env, not server/.env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const EMAIL = process.env.VOICE_TEST_EMAIL || 'voice.e2e.test@sulti.ai';

async function admin(pathname: string, init: RequestInit) {
  const res = await fetch(`${SB_URL}/auth/v1${pathname}`, {
    ...init,
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

/** Delete local rows for the test user, matching on email. */
async function purgeLocal() {
  const Database = (await import('better-sqlite3')).default;
  const dbFile = path.join(__dirname, '..', 'sultiai.db');
  if (!fs.existsSync(dbFile)) {
    console.log('local       : no sultiai.db, skipped');
    return;
  }
  const db = new Database(dbFile);
  const email = db.prepare('SELECT user_id FROM users WHERE email = ?').get(EMAIL) as
    | { user_id: number }
    | undefined;
  if (!email) {
    console.log('local       : no local user, skipped');
    db.close();
    return;
  }
  const userId = email.user_id;
  const tables = [
    'pronunciation_attempts',
    'notification_preferences',
    'user_settings',
    'saved_phrases',
    'users',
  ];
  for (const t of tables) {
    try {
      const info = db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
      console.log(`local       : deleted ${info.changes} row(s) from ${t}`);
    } catch (e) {
      console.log(`local       : ${t} skipped (${(e as Error).message})`);
    }
  }
  db.close();
}

async function main() {
  console.log('email       :', EMAIL);

  const listed = await admin('/admin/users?page=1&per_page=200', { method: 'GET' });
  const found = (listed.json?.users || []).find((u: { email: string }) => u.email === EMAIL);
  if (found) {
    const del = await admin(`/admin/users/${found.id}`, { method: 'DELETE' });
    console.log(
      'supabase    :',
      del.status < 300 || del.status === 404
        ? `deleted ${found.id}`
        : `delete returned ${del.status}`
    );
  } else {
    console.log('supabase    : already absent');
  }

  await purgeLocal();

  const session = path.join(__dirname, '..', 'e2e-session.json');
  if (fs.existsSync(session)) {
    fs.unlinkSync(session);
    console.log('session file: removed');
  } else {
    console.log('session file: already absent');
  }
}

main().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
