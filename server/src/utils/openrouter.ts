import { fetchWithRetry } from './fetchRetry';

function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

function getConfig() {
  return {
    apiKey: getEnv('OPENROUTER_API_KEY'),
    ttsModel: getEnv('OPENROUTER_TTS_MODEL', 'deepgram/flux-tts:free'),
    ttsVoice: getEnv('OPENROUTER_TTS_VOICE', 'flux-alexis-en'),
  };
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export function isOpenRouterConfigured(): boolean {
  return !!getEnv('OPENROUTER_API_KEY');
}

export async function openrouterTTS(text: string): Promise<Buffer> {
  const { apiKey, ttsModel, ttsVoice } = getConfig();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const res = await fetchWithRetry(`${OPENROUTER_BASE}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ttsModel,
      input: text,
      voice: ttsVoice,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter TTS error ${res.status}: ${errBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
