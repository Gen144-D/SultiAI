import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';

function b64url(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

const header = b64url({ alg: 'HS256', typ: 'JWT' });
const now = Date.now();
const payload = b64url({
  email: 'test@sulti.ai',
  userId: 1,
  iat: now,
  exp: now + 15 * 60 * 1000,
  type: 'access',
});
const sig = crypto
  .createHmac('sha256', JWT_SECRET)
  .update(`${header}.${payload}`)
  .digest('base64url');

const token = `${header}.${payload}.${sig}`;

// Synthesize a 1s 440Hz tone as 16-bit mono 16kHz PCM WAV so this test is
// self-contained (the old ai-service/test_audio.wav fixture was removed).
function makeTestWav(): Buffer {
  const sampleRate = 16000;
  const numSamples = sampleRate;
  const wav = Buffer.alloc(44 + numSamples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + numSamples * 2, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    wav.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000), 44 + i * 2);
  }
  return wav;
}

const audioB64 = makeTestWav().toString('base64');
console.log('Synthesized test WAV, base64 bytes:', audioB64.length);

async function main() {
  // Step 1: verify the Node backend is reachable
  const health = await fetch('http://localhost:3001/api/health');
  console.log('Backend /api/health:', await health.json());

  // Step 2: call the pronunciation check with audio
  const res = await fetch('http://localhost:3001/api/speech/pronunciation/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      audio: audioB64,
      expected_text: 'Kumusta',
      language: 'ceb',
    }),
  });

  console.log('Node status:', res.status);
  const contentType = res.headers.get('content-type');
  console.log('Content-Type:', contentType);
  const raw = await res.text();
  console.log('Raw response:', raw.slice(0, 1500));
  let data: any = {};
  try { data = JSON.parse(raw); } catch {}

  // Detect which path was used
  if (data?.metrics) {
    console.log('\n>>> Acoustic metrics present');
  } else {
    console.log('\n>>> Used LLM fallback (no metrics)');
  }
}

main().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
