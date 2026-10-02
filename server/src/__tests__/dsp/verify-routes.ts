// Mounts the real speech router with auth stubbed out and exercises the
// pronunciation endpoints over HTTP, asserting the response contract still
// matches what the deleted Python service returned.
import express from 'express';
import request from 'supertest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The router applies authMiddleware; swap it for a pass-through in the module
// cache before loading the router, so the endpoints can be hit unauthenticated.
const authPath = require.resolve('../../middleware/auth');
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: { authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next() },
} as unknown as NodeModule;

const router = require('../../routes/speech.routes').default as express.Router;
import ffmpegPath from 'ffmpeg-static';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`PASS  ${name}${detail ? `  ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}  ${detail}`);
  }
}

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use('/api/speech', router);

async function main(): Promise<void> {
  // ---- /pronunciation/phonemes ----
  const ph = await request(app)
    .post('/api/speech/pronunciation/phonemes')
    .send({ text: 'Maayong, adlawa!', language: 'ceb' });

  check('phonemes: 200', ph.status === 200, `status=${ph.status}`);
  check(
    'phonemes: returns text/language/phonemes/inventory',
    ph.body?.text === 'Maayong, adlawa!' &&
      ph.body?.language === 'ceb' &&
      Array.isArray(ph.body?.phonemes) &&
      Array.isArray(ph.body?.inventory),
    JSON.stringify(ph.body).slice(0, 160)
  );
  check(
    'phonemes: G2P matches the verified output',
    JSON.stringify(ph.body?.phonemes) ===
      JSON.stringify(['m', 'a', 'a', 'j', 'o', 'ŋ', 'a', 'd', 'l', 'a', 'w', 'a']),
    JSON.stringify(ph.body?.phonemes)
  );
  check(
    'phonemes: rejects missing text',
    (await request(app).post('/api/speech/pronunciation/phonemes').send({})).status === 400
  );
  check(
    'phonemes: unknown language -> empty inventory, chars passthrough',
    (
      await request(app)
        .post('/api/speech/pronunciation/phonemes')
        .send({ text: 'abc', language: 'zz' })
    ).body.inventory.length === 0
  );

  // ---- build a real m4a/AAC clip to score ----
  const tmp = path.join(os.tmpdir(), `sulti-test-${process.pid}.m4a`);
  // A vowel-ish tone sweep so the acoustic path has something to chew on.
  const wav = path.join(os.tmpdir(), `sulti-test-${process.pid}.wav`);
  const pcm = Buffer.alloc(22050 * 2);
  for (let i = 0; i < 22050; i++) {
    const t = i / 22050;
    const env = Math.sin(Math.PI * t) ** 2;
    const v =
      0.5 * env * Math.sin(2 * Math.PI * 120 * t) +
      0.3 * env * Math.sin(2 * Math.PI * 730 * t) +
      0.2 * env * Math.sin(2 * Math.PI * 1090 * t) +
      0.1 * env * Math.sin(2 * Math.PI * 2440 * t);
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), i * 2);
  }
  fs.writeFileSync(
    wav,
    Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(36)])
  );
  // Rewrite properly using ffmpeg from raw input.
  execFileSync(
    ffmpegPath as string,
    [
      '-y',
      '-f',
      's16le',
      '-ar',
      '22050',
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      tmp,
    ],
    { input: pcm, stdio: ['pipe', 'ignore', 'ignore'] }
  );
  const m4a = fs.readFileSync(tmp);
  check('built an m4a test clip', m4a.length > 100, `${m4a.length} bytes`);

  // ---- /pronunciation/score with base64 ----
  const b64 = m4a.toString('base64');
  const sc = await request(app)
    .post('/api/speech/pronunciation/score')
    .send({ audio_base64: b64, expected_text: 'kumusta', language: 'ceb' });

  check(
    'score(base64): 200',
    sc.status === 200,
    `status=${sc.status} body=${JSON.stringify(sc.body).slice(0, 200)}`
  );
  const scoreKeys = Object.keys(sc.body ?? {}).sort();
  check(
    'score: top-level contract (score/feedback/phoneme_breakdown/metrics)',
    JSON.stringify(scoreKeys) ===
      JSON.stringify(['feedback', 'metrics', 'phoneme_breakdown', 'score']),
    JSON.stringify(scoreKeys)
  );
  const m = sc.body?.metrics ?? {};
  check(
    'score: metrics contract uses the snake_case keys main.py returned',
    [
      'duration_seconds',
      'energy_consistency',
      'formant_accuracy',
      'pitch_accuracy',
      'pitch_mean',
      'pitch_std',
      'speaking_rate',
    ].every((k) => k in m) && Object.keys(m).length === 7,
    JSON.stringify(Object.keys(m))
  );
  check(
    'score: phoneme_breakdown entries carry confidence',
    Array.isArray(sc.body?.phoneme_breakdown) &&
      sc.body.phoneme_breakdown.length > 0 &&
      sc.body.phoneme_breakdown.every(
        (p: Record<string, unknown>) => 'confidence' in p && 'tip' in p
      ),
    JSON.stringify(sc.body?.phoneme_breakdown?.[0])
  );
  check(
    'score: score is a number in range',
    typeof sc.body?.score === 'number' && sc.body.score >= 0 && sc.body.score <= 100,
    `score=${sc.body?.score}`
  );
  check(
    'score: metrics are finite numbers',
    Object.values(m).every((v) => typeof v === 'number' && Number.isFinite(v)),
    JSON.stringify(m)
  );

  // ---- /pronunciation/score with multipart upload ----
  const up = await request(app)
    .post('/api/speech/pronunciation/score')
    .field('expected_text', 'kumusta')
    .field('language', 'ceb')
    .attach('audio', m4a, { filename: 'recording.m4a', contentType: 'audio/mp4' });
  check(
    'score(multipart): 200',
    up.status === 200,
    `status=${up.status} body=${JSON.stringify(up.body).slice(0, 160)}`
  );
  check(
    'score: multipart and base64 agree on the score',
    up.body?.score === sc.body?.score,
    `multipart=${up.body?.score} base64=${sc.body?.score}`
  );

  // ---- validation ----
  check(
    'score: rejects missing expected_text',
    (await request(app).post('/api/speech/pronunciation/score').send({ audio_base64: b64 }))
      .status === 400
  );
  check(
    'score: rejects missing audio',
    (await request(app).post('/api/speech/pronunciation/score').send({ expected_text: 'kumusta' }))
      .status === 400
  );
  check(
    'score: rejects too-small audio',
    (
      await request(app)
        .post('/api/speech/pronunciation/score')
        .send({ audio_base64: Buffer.alloc(10).toString('base64'), expected_text: 'kumusta' })
    ).status === 400
  );
  check(
    'score: corrupt audio -> 500 with a message, not a hang',
    (
      await request(app)
        .post('/api/speech/pronunciation/score')
        .send({ audio_base64: Buffer.alloc(5000, 7).toString('base64'), expected_text: 'kumusta' })
    ).status === 500
  );

  fs.rmSync(tmp, { force: true });
  fs.rmSync(wav, { force: true });

  console.log(failures === 0 ? '\nROUTES OK' : `\n${failures} FAILURE(S)`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
