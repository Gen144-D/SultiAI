// Creates (or reuses) a temporary verified test user and prints the session
// + the localStorage key the web app expects. Delete the user afterwards.
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
// Supabase keys live in the repo-root .env, not server/.env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const REF = new URL(SB_URL).hostname.split('.')[0];
const STORAGE_KEY = `sb-${REF}-auth-token`;

const EMAIL = process.env.VOICE_TEST_EMAIL || 'voice.e2e.test@sulti.ai';
const PASSWORD = 'VoiceE2E!2026';

async function admin(pathname: string, init: RequestInit) {
  const res = await fetch(`${SB_URL}/auth/v1${pathname}`, {
    ...init,
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

async function main() {
  console.log('ref        :', REF);
  console.log('storageKey :', STORAGE_KEY);
  console.log('email      :', EMAIL);

  // Ensure a confirmed user exists
  const created = await admin('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'Voice E2E', avatar_id: 'avatar-01' } }),
  });
  if (created.status < 300) {
    console.log('user       : created');
  } else {
    console.log('user       : create returned', created.status, JSON.stringify(created.json).slice(0, 160));
    const listed = await admin(`/admin/users?page=1&per_page=200`, { method: 'GET' });
    const found = (listed.json?.users || []).find((u: any) => u.email === EMAIL);
    if (found) {
      await admin(`/admin/users/${found.id}`, { method: 'PUT', body: JSON.stringify({ password: PASSWORD, email_confirm: true }) });
      console.log('user       : password reset, id', found.id);
    }
  }

  // Sign in with the anon key to get a real access token
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const session = await res.json();
  if (!session.access_token) {
    console.log('LOGIN FAILED', res.status, JSON.stringify(session).slice(0, 300));
    process.exit(1);
  }
  console.log('login      : OK, user id', session.user?.id);
  console.log('expires_at :', session.expires_at, new Date(session.expires_at * 1000).toISOString());

  const out = { storageKey: STORAGE_KEY, session, email: EMAIL, password: PASSWORD };
  const dest = path.join(process.cwd(), 'e2e-session.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log('written    :', dest);
}

main().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});

