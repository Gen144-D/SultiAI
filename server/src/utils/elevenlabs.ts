const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || '';
const ELEVENLABS_ALLOW_OVERRIDES = ['1', 'true', 'yes'].includes(
  String(process.env.ELEVENLABS_ALLOW_OVERRIDES || '').toLowerCase()
);

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export type SultiVoiceLanguage = 'bisaya' | 'tagalog' | 'english';

// Maps Sulti language modes to ElevenLabs agent language codes.
// 'fil' (Filipino/Tagalog) and 'en' are first-class agent languages;
// Cebuano is only available on v3 TTS models, so Bisaya falls back to
// Filipino unless the account has Cebuano enabled.
export function mapLanguageToElevenlabs(language: string): string {
  switch (language) {
    case 'tagalog':
      return 'fil';
    case 'english':
      return 'en';
    case 'bisaya':
      return process.env.ELEVENLABS_BISAYA_LANG || 'ceb';
    default:
      return 'fil';
  }
}

export { ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_ALLOW_OVERRIDES };

export function isElevenlabsConfigured(): boolean {
  return !!(ELEVENLABS_API_KEY && ELEVENLABS_AGENT_ID);
}

export interface SignedConversation {
  url: string;
  agent_id: string;
}

export async function getSignedUrl(
  agentId: string = ELEVENLABS_AGENT_ID
): Promise<SignedConversation> {
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');
  if (!agentId) throw new Error('ELEVENLABS_AGENT_ID not configured');

  const res = await fetch(
    `${ELEVENLABS_API_URL}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs signed-url error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  if (!data || !data.signed_url) {
    throw new Error('ElevenLabs signed-url response missing signed_url');
  }
  return { url: data.signed_url, agent_id: agentId };
}
