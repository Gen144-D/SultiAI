import { env } from '../config/env';

const XAI_API_KEY = env.XAI_API_KEY;
const XAI_VOICE_MODEL = process.env.XAI_VOICE_MODEL || 'grok-voice-latest';
const XAI_VOICE = process.env.XAI_VOICE || 'eve';

const XAI_API_URL = 'https://api.x.ai';

import { fetchWithRetry } from './fetchRetry';

export { XAI_VOICE, XAI_VOICE_MODEL };

export function isXaiConfigured(): boolean {
  return !!XAI_API_KEY;
}

export function getRealtimeUrl(model: string = XAI_VOICE_MODEL): string {
  return `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(model)}`;
}

export interface RealtimeClientSecret {
  value: string;
  expires_at: number;
  model: string;
}

export async function getRealtimeClientSecret(): Promise<RealtimeClientSecret> {
  if (!XAI_API_KEY) throw new Error('XAI_API_KEY not configured');

  const res = await fetchWithRetry(`${XAI_API_URL}/v1/realtime/client_secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expires_after: { seconds: 1800 },
      session: { model: XAI_VOICE_MODEL },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xAI client_secrets error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  return { value: data.value, expires_at: data.expires_at, model: XAI_VOICE_MODEL };
}
