import { env } from '../config/env';
import { fetchWithRetry } from './fetchRetry';

export const DEEPGRAM_AGENT_URL =
  env.DEEPGRAM_AGENT_URL || 'wss://agent.deepgram.com/v1/agent/converse';

export function isDeepgramConfigured(): boolean {
  return !!env.DEEPGRAM_API_KEY;
}

export const DEEPGRAM_SULTI_PROMPT = `┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Logo] SultiAI                         [🔔] [👤]              │
│  AI-Powered Community Language Hub                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  # SultiAI                                                      │
│  ## Speak Confidently. Connect Naturally.                      │
│                                                                 │
│  SultiAI helps you navigate multilingual conversations with:   │
│  🎙️ Real-time Speech Recognition (Whisper)                     │
│  🧠 Context-Aware Language Understanding (BERT)                │
│  🔄 Smart Translation Assistance                               │
│  💬 Intelligent Phrase Recommendations                         │
│  🌍 Community Language Support                                 │
│                                                                 │
│  *Empowering non-native speakers to communicate with           │
│   confidence.*                                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  [🌟 Sulti - AI Voice Companion]                         │ │
│  │                                                           │ │
│  │  ┌───────────────────────────────────────────────────┐    │ │
│  │  │                                                   │    │ │
│  │  │          🎤 Tap or say "Sulti"                    │    │ │
│  │  │          to start voice chat                      │    │ │
│  │  │                                                   │    │ │
│  │  │          [Audio Wave Animation]                   │    │ │
│  │  │                                                   │    │ │
│  │  └───────────────────────────────────────────────────┘    │ │
│  │                                                           │ │
│  │  [🚀 Get Started]  [🎤 Try Voice Mode]                   │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─── Quick Actions ───                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 👋       │ │ 🗣️       │ │ 📚       │                     │
│  │ Greetings │ │ Translate │ │ Practice  │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 💬       │ │ 🏥       │ │ 👥       │                     │
│  │ Phrases   │ │ Emergency │ │ Community│                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                                 │
│  ─── Your Progress ───                                        │
│  Daily Goal: 0/50 XP   Level: Beginner   Streak: 0 Days      │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  [🏠 Home] [🎯 Practice] [🗣️ Tutor] [👥 Community] [👤 Profile]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘`;

export const DEEPGRAM_GREETING =
  '“Hi! I’m GenTech AI from SultiAI, your voice AI assistant. I’m here to help you learn, practice, and improve your communication through real conversations. What would you like to do today?”';

export interface DeepgramAgentSettings {
  type: 'Settings';
  audio: {
    input: { encoding: string; sample_rate: number };
    output: { encoding: string; sample_rate: number; container: string };
  };
  agent: {
    speak: { provider: { type: string; version: string; model: string } };
    listen: { provider: { type: string; version: string; model: string } };
    think: {
      provider: { type: string; model: string };
      prompt: string;
    };
    greeting: string;
  };
}

export function buildDeepgramAgentSettings(): DeepgramAgentSettings {
  return {
    type: 'Settings',
    audio: {
      input: {
        encoding: 'linear16',
        sample_rate: 48000,
      },
      output: {
        encoding: 'linear16',
        sample_rate: 24000,
        container: 'none',
      },
    },
    agent: {
      speak: {
        provider: {
          type: 'deepgram',
          version: 'v2',
          model: 'flux-hannah-en',
        },
      },
      listen: {
        provider: {
          type: 'deepgram',
          version: 'v2',
          model: 'flux-general-en',
        },
      },
      think: {
        provider: {
          type: 'google',
          model: 'gemini-3.1-flash-lite',
        },
        prompt: DEEPGRAM_SULTI_PROMPT,
      },
      greeting: DEEPGRAM_GREETING,
    },
  };
}

export interface DeepgramAccessToken {
  access_token: string;
  expires_in: number;
}

export async function mintDeepgramAccessToken(
  ttlSeconds = 300
): Promise<DeepgramAccessToken> {
  if (!isDeepgramConfigured()) {
    throw new Error('DEEPGRAM_API_KEY not configured');
  }

  const res = await fetchWithRetry(
    'https://api.deepgram.com/v1/auth/grant',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl_seconds: ttlSeconds }),
    },
    { retries: 2 }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Deepgram auth grant failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as DeepgramAccessToken;
  if (!data?.access_token) {
    throw new Error('Deepgram auth grant returned no access_token');
  }
  return data;
}