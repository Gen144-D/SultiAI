import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const BASE = process.env.TEST_BASE || 'http://localhost:8081';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const header = b64url({ alg: 'HS256', typ: 'JWT' });
// NB: the server's verifyWithSecret compares exp against Date.now() (ms),
// and signToken() also writes exp in ms -- so use ms here too.
const now = Date.now();
const payload = b64url({
  email: 'voice.test@sulti.ai',
  userId: 0,
  iat: now,
  exp: now + 60 * 60 * 1000,
  type: 'access',
});
const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
const token = `${header}.${payload}.${sig}`;

const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

async function hit(label: string, path: string, init: RequestInit = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
    const text = await res.text();
    const ms = Date.now() - t0;
    let brief = text.slice(0, 220).replace(/\s+/g, ' ');
    let ok = res.status < 400;
    if (path.includes('synthesize') && ok) {
      try {
        const j = JSON.parse(text);
        const d: any = j.data ?? j;
        const url = d.url || d.audio_url || '';
        if (url) {
          const a = await fetch(`${BASE}${url}`);
          const buf = Buffer.from(await a.arrayBuffer());
          brief = `url=${url} audioStatus=${a.status} bytes=${buf.length} provider=${d.provider} voice=${d.voice}`;
          if (a.status !== 200 || buf.length < 1000) ok = false;
        }
      } catch (e: any) {
        brief = 'parse fail: ' + e.message + ' :: ' + brief;
      }
    }
    console.log(`${ok ? 'PASS' : 'FAIL'} [${res.status}] ${String(ms).padStart(6)}ms  ${label}\n        ${brief}`);
    return ok;
  } catch (e: any) {
    console.log(`FAIL [ERR ]        ${label}\n        ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n=== VOICE ENDPOINT SWEEP via ${BASE} ===\n`);
  const r: Record<string, boolean> = {};

  r.health = await hit('GET /api/health', '/api/health');
  r.agentStatus = await hit('GET /api/agent/status', '/api/agent/status');
  r.deepgramToken = await hit('GET /api/agent/deepgram-token', '/api/agent/deepgram-token');
  r.synthesize = await hit(
    'POST /api/speech/synthesize (blessica/en)',
    '/api/speech/synthesize',
    { method: 'POST', body: JSON.stringify({ text: 'Kumusta ka? Nindot kaayo.', voice: 'blessica', rate: 0.9, language: 'ceb' }) }
  );
  r.synthesizeEn = await hit(
    'POST /api/speech/synthesize (english)',
    '/api/speech/synthesize',
    { method: 'POST', body: JSON.stringify({ text: 'Welcome. I am SULTI, your AI language assistant.', voice: 'en-US-AnaNeural', rate: 0.9, language: 'en-US' }) }
  );
  r.voiceChat = await hit(
    'POST /api/voice/chat (text only)',
    '/api/voice/chat',
    { method: 'POST', body: JSON.stringify({ message: 'Say hello in Bisaya', session_id: 'test-session-1' }) }
  );
  r.voices = await hit('GET /api/speech/voices', '/api/speech/voices');

  console.log(`\n--- summary ---`);
  for (const [k, v] of Object.entries(r)) console.log(`${v ? 'ok  ' : 'FAIL'}  ${k}`);
  const failed = Object.entries(r).filter(([, v]) => !v).map(([k]) => k);
  console.log(failed.length ? `\nFAILED: ${failed.join(', ')}` : '\nALL VOICE ENDPOINTS PASS');
}

main();
