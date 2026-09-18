import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CHARACTER_VOICES, CharacterVoice } from '../utils/prompts';
import { isOpenRouterConfigured, openrouterTTS } from '../utils/openrouter';
import {
  isVoiceboxEnabled,
  voiceboxSynthesize,
} from './voiceboxService';

export { CHARACTER_VOICES, CharacterVoice };

const TTS_CACHE_DIR = path.join(process.cwd(), 'audio-cache');
const TTS_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const VOICE_LANGUAGE_HINT: Record<string, string> = {
  blessica: 'bisaya',
  angel: 'bisaya',
  sultan: 'tagalog',
  lola: 'bisaya',
  bryan: 'en',
  jenny: 'en',
};

function sanitizeSsml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .slice(0, 500);
}

async function synthesizeWithMsEdge(
  cleanText: string,
  voice: CharacterVoice,
  rate?: number,
  pitch?: number
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice.voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const effectiveRate = rate !== undefined ? rate : (voice.rate ?? 1);
  const effectivePitch = pitch !== undefined ? pitch : (voice.pitch ?? 1);

  const { audioStream } = await tts.toStream(cleanText, {
    rate: String(effectiveRate),
    pitch: `${Math.round((effectivePitch - 1) * 100)}%`,
  });

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on('data', (d: Buffer) => chunks.push(Buffer.from(d)));
    audioStream.on('close', () => resolve());
    audioStream.on('error', (e: Error) => reject(e));
  });

  tts.close();
  return Buffer.concat(chunks);
}

class LocalTTSService {
  private cacheDir: string;
  private lastEvictionTime = 0;
  private readonly EVICTION_INTERVAL_MS = 60 * 60 * 1000;

  constructor() {
    this.cacheDir = TTS_CACHE_DIR;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private evictOldFiles(): void {
    const now = Date.now();
    if (now - this.lastEvictionTime < this.EVICTION_INTERVAL_MS) {
      return;
    }
    this.lastEvictionTime = now;

    try {
      const files = fs.readdirSync(this.cacheDir);
      let evictedCount = 0;
      const nowMs = Date.now();

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        const ageMs = nowMs - stat.mtimeMs;

        if (ageMs > TTS_CACHE_MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          evictedCount++;
        }
      }

      if (evictedCount > 0) {
        console.log(`[TTS] Evicted ${evictedCount} cached audio files older than 7 days`);
      }
    } catch (error) {
      console.warn('[TTS] Cache eviction error:', error);
    }
  }

  async getCacheStats(): Promise<{ totalFiles: number; totalSizeBytes: number; oldestFile?: string }> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let totalSizeBytes = 0;
      let oldestTime = Date.now();
      let oldestFile: string | undefined;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        totalSizeBytes += stat.size;
        if (stat.mtimeMs < oldestTime) {
          oldestTime = stat.mtimeMs;
          oldestFile = file;
        }
      }

      return { totalFiles: files.length, totalSizeBytes, oldestFile };
    } catch {
      return { totalFiles: 0, totalSizeBytes: 0 };
    }
  }

  getVoices(): Record<string, CharacterVoice> {
    return CHARACTER_VOICES;
  }

  async synthesize(
    text: string,
    voiceKey: string = 'blessica',
    rate?: number,
    pitch?: number,
    language?: string
  ): Promise<{ url: string; cached: boolean; voice: string; provider?: string }> {
    this.evictOldFiles();

    const voice = CHARACTER_VOICES[voiceKey] || CHARACTER_VOICES.blessica;
    const cleanText = sanitizeSsml(text);
    const lang = (language || VOICE_LANGUAGE_HINT[voiceKey] || 'bisaya').toLowerCase();

    const hash = crypto
      .createHash('sha1')
      .update(
        `v5|${voice.voiceName}|${rate ?? voice.rate ?? 1}|${pitch ?? voice.pitch ?? 1}|${lang}|${isOpenRouterConfigured() ? 'openrouter' : 'msedge'}|${cleanText}`
      )
      .digest('hex');

    const filePath = path.join(this.cacheDir, `${hash}.mp3`);

    if (fs.existsSync(filePath)) {
      return {
        url: `/audio/tts/${hash}.mp3`,
        cached: true,
        voice: voice.voiceName,
        provider: 'cache',
      };
    }

    // Filipino content (bisaya/tagalog/filipino) MUST use a real Filipino voice.
    // Deepgram flux-tts only speaks English ("accents spanning ... Filipino English"),
    // so it is NOT suitable for the primary Filipino languages — it would sound
    // like a generic English AI. Prefer msedge-tts fil-PH neural voices, then
    // Voicebox (cloned Bisaya voice), and only fall back to OpenRouter.
    const isFilipino =
      lang === 'bisaya' ||
      lang === 'ceb' ||
      lang === 'cebuano' ||
      lang === 'tl' ||
      lang === 'tagalog' ||
      lang === 'fil' ||
      lang === 'fil-ph' ||
      voice.locale.toLowerCase().startsWith('fil');

    interface TtsAttempt {
      name: string;
      run: () => Promise<{ buffer: Buffer; ext: string; provider: string }>;
    }

    const attempts: TtsAttempt[] = [];

    const msEdge = (): TtsAttempt => ({
      name: 'msedge-tts',
      run: () =>
        synthesizeWithMsEdge(cleanText, voice, rate, pitch).then((b) => ({
          buffer: b,
          ext: 'mp3',
          provider: 'msedge-tts',
        })),
    });

    const voicebox = (): TtsAttempt => ({
      name: 'voicebox',
      run: async () => {
        const { buffer, ext: voiceboxExt } = await voiceboxSynthesize(cleanText, lang);
        return { buffer, ext: voiceboxExt, provider: 'voicebox' };
      },
    });

    const openRouter = (): TtsAttempt => ({
      name: 'openrouter-deepgram',
      run: async () => ({
        buffer: await openrouterTTS(cleanText),
        ext: 'mp3',
        provider: 'openrouter-deepgram',
      }),
    });

    if (isFilipino) {
      attempts.push(msEdge());
      if (isVoiceboxEnabled()) attempts.push(voicebox());
      if (isOpenRouterConfigured()) attempts.push(openRouter());
    } else {
      if (isOpenRouterConfigured()) attempts.push(openRouter());
      attempts.push(msEdge());
      if (isVoiceboxEnabled()) attempts.push(voicebox());
    }

    for (const attempt of attempts) {
      try {
        const result = await attempt.run();
        const target = path.join(this.cacheDir, `${hash}.${result.ext}`);
        fs.writeFileSync(target, result.buffer);
        return {
          url: `/audio/tts/${hash}.${result.ext}`,
          cached: false,
          voice: voice.voiceName,
          provider: result.provider,
        };
      } catch (err) {
        console.warn(`[TTS] ${attempt.name} failed, trying next provider:`, (err as Error)?.message);
      }
    }

    throw new Error('All TTS providers failed');
  }
}

const ttsService = new LocalTTSService();
export default ttsService;
export { sanitizeSsml };
