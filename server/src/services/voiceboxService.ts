import fs from 'fs';
import path from 'path';

const VOICEBOX_URL = (process.env.VOICEBOX_URL || 'http://127.0.0.1:17493').replace(/\/$/, '');
const VOICEBOX_PROFILE = process.env.VOICEBOX_PROFILE || '';
const USE_VOICEBOX = ['1', 'true', 'yes'].includes(
  String(process.env.USE_VOICEBOX || '').toLowerCase()
);
const VOICEBOX_STT_MODEL = process.env.VOICEBOX_STT_MODEL || 'whisper-turbo';
const VOICEBOX_CLIENT_ID = process.env.VOICEBOX_CLIENT_ID || 'sultiai-server';

const LANGUAGE_MAP: Record<string, string> = {
  bisaya: 'ceb',
  cebuano: 'ceb',
  ceb: 'ceb',
  tagalog: 'tl',
  fil: 'tl',
  tl: 'tl',
  english: 'en',
  en: 'en',
};

let _lastHealthCheck = 0;
let _lastHealthOk = false;
const HEALTH_TTL_MS = 30_000;

export function isVoiceboxEnabled(): boolean {
  return USE_VOICEBOX && !!VOICEBOX_PROFILE;
}

export function getVoiceboxConfig() {
  return {
    enabled: isVoiceboxEnabled(),
    url: VOICEBOX_URL,
    profile: VOICEBOX_PROFILE || null,
    stt_model: VOICEBOX_STT_MODEL,
  };
}

function mapLanguage(language?: string): string {
  if (!language) return 'ceb';
  const key = language.toLowerCase();
  return LANGUAGE_MAP[key] || key;
}

async function voiceboxFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('X-Voicebox-Client-Id', VOICEBOX_CLIENT_ID);
  return fetch(`${VOICEBOX_URL}${endpoint}`, { ...init, headers });
}

export async function isVoiceboxAvailable(): Promise<boolean> {
  if (!isVoiceboxEnabled()) return false;

  const now = Date.now();
  if (now - _lastHealthCheck < HEALTH_TTL_MS) {
    return _lastHealthOk;
  }

  _lastHealthCheck = now;
  try {
    const res = await voiceboxFetch('/profiles', { method: 'GET' });
    _lastHealthOk = res.ok;
  } catch {
    _lastHealthOk = false;
  }
  return _lastHealthOk;
}

export interface VoiceboxSynthesizeResult {
  buffer: Buffer;
  ext: string;
  contentType: string;
}

export async function voiceboxSynthesize(
  text: string,
  language = 'bisaya',
  profile = VOICEBOX_PROFILE
): Promise<VoiceboxSynthesizeResult> {
  if (!profile) {
    throw new Error('VOICEBOX_PROFILE is not configured');
  }

  const lang = mapLanguage(language);
  const res = await voiceboxFetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      profile_id: profile,
      language: lang,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Voicebox /generate error ${res.status}: ${detail}`);
  }

  return parseVoiceboxAudioResponse(res);
}

export async function voiceboxTranscribe(
  audioBase64: string,
  mimeType = 'audio/wav',
  model = VOICEBOX_STT_MODEL
): Promise<string> {
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const ext = mimeType.includes('wav')
    ? 'wav'
    : mimeType.includes('mpeg') || mimeType.includes('mp3')
      ? 'mp3'
      : 'm4a';

  const form = new FormData();
  form.append('audio', new Blob([audioBuffer], { type: mimeType }), `recording.${ext}`);
  form.append('model', model);

  const res = await voiceboxFetch('/transcribe', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Voicebox /transcribe error ${res.status}: ${detail}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data: any = await res.json();
    return String(data.text || data.transcript || data.transcription || '').trim();
  }

  const text = await res.text();
  return text.trim();
}

async function parseVoiceboxAudioResponse(res: Response): Promise<VoiceboxSynthesizeResult> {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data: any = await res.json();

    if (data.audio_base64 || data.audio) {
      const b64 = data.audio_base64 || data.audio;
      const buffer = Buffer.from(b64, 'base64');
      const ext = data.format === 'mp3' ? 'mp3' : 'wav';
      return {
        buffer,
        ext,
        contentType: ext === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      };
    }

    if (data.url || data.audio_url) {
      const audioRes = await fetch(data.url || data.audio_url);
      if (!audioRes.ok) {
        throw new Error(`Voicebox audio URL fetch failed: ${audioRes.status}`);
      }
      const buffer = Buffer.from(await audioRes.arrayBuffer());
      const ext = (data.format || 'wav') === 'mp3' ? 'mp3' : 'wav';
      return {
        buffer,
        ext,
        contentType: ext === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      };
    }

    throw new Error('Voicebox JSON response missing audio payload');
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new Error('Voicebox returned empty audio');
  }

  const ext = contentType.includes('mpeg') || contentType.includes('mp3') ? 'mp3' : 'wav';
  return {
    buffer,
    ext,
    contentType: ext === 'mp3' ? 'audio/mpeg' : 'audio/wav',
  };
}

export function saveVoiceboxAudio(
  buffer: Buffer,
  cacheDir: string,
  hash: string,
  ext: string
): string {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const filePath = path.join(cacheDir, `${hash}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
