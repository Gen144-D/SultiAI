import { pipeline, PipelineType } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';

let _model: any = null;
let _initialized = false;
let _initError: string | null = null;

const MODELS_DIR = path.join(process.cwd(), 'models');
const WHISPER_MODEL = 'Xenova/whisper-tiny.en';

class LocalSTTService {
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  async init(): Promise<void> {
    if (_initialized) return;
    _initialized = true;

    try {
      if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
      }

      _model = await pipeline('automatic-speech-recognition' as PipelineType, WHISPER_MODEL, {
        quantized: true,
        cache_dir: MODELS_DIR,
      });
      _initError = null;
    } catch (err: any) {
      _initError = err.message || String(err);
      console.error('[LocalSTT] Failed to initialize:', _initError);
    }
  }

  isReady(): boolean {
    return _model !== null && _initError === null;
  }

  getError(): string | null {
    return _initError;
  }

  async transcribe(base64Audio: string, mimeType = 'audio/wav'): Promise<string> {
    await this.ready;

    if (!_model) {
      throw new Error('STT model not initialized');
    }

    let audioBuffer = Buffer.from(base64Audio, 'base64');

    // If the audio is WAV format, the transformers pipeline handles it directly
    // If it's raw PCM or other formats, try to transcribe directly
    const result = await _model(audioBuffer, {
      language: 'en',
      task: 'transcribe',
      chunk_length_ms: 30000,
    });

    if (Array.isArray(result)) {
      return result
        .map((r: any) => r?.text || '')
        .join('')
        .trim();
    }
    return result?.text || '';
  }
}

const sttService = new LocalSTTService();

export async function ensureLocalSTT(): Promise<void> {
  await sttService.ready;
}

export function isLocalSTTReady(): boolean {
  return sttService.isReady();
}

export function getLocalSTTError(): string | null {
  return sttService.getError();
}

export async function localTranscribe(base64Audio: string, mimeType?: string): Promise<string> {
  return sttService.transcribe(base64Audio, mimeType);
}

export default sttService;
