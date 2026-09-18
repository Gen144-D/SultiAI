import axios, { AxiosInstance } from 'axios';

const META_VOICE_URL = (process.env.META_VOICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const META_VOICE_TIMEOUT = parseInt(process.env.META_VOICE_TIMEOUT || '30000', 10);

interface SpeechToSpeechRequest {
  audio_base64: string;
  source_lang?: string;
  target_lang?: string;
  task?: string;
}

interface SpeechToSpeechResponse {
  audio_base64: string;
  transcription?: string;
  source_language: string;
  target_language: string;
  format: string;
  sample_rate: number;
}

interface SpeechToTextRequest {
  audio_base64: string;
  source_lang?: string;
}

interface SpeechToTextResponse {
  text: string;
  source_language: string;
}

interface TextToSpeechRequest {
  text: string;
  target_lang?: string;
}

interface TextToSpeechResponse {
  audio_base64: string;
  target_language: string;
  format: string;
  sample_rate: number;
}

interface TranscribeAndTranslateRequest {
  audio_base64: string;
  source_lang?: string;
  target_lang?: string;
}

interface TranscribeAndTranslateResponse {
  transcription: string;
  translation: string;
  source_language: string;
  target_language: string;
}

interface HealthResponse {
  status: string;
  seamless_loaded: boolean;
  spiritlm_enabled: boolean;
  device: string;
}

interface ModelsInfoResponse {
  seamless_model: string;
  seamless_device: string;
  spiritlm_enabled: boolean;
  spiritlm_model: string | null;
  supported_languages: {
    input: string[];
    output: string[];
  };
}

class MetaVoiceService {
  private client: AxiosInstance;
  private enabled: boolean;
  private lastHealthCheck: number = 0;
  private lastHealthOk: boolean = false;
  private readonly HEALTH_TTL_MS = 30_000;

  constructor() {
    this.client = axios.create({
      baseURL: META_VOICE_URL,
      timeout: META_VOICE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.enabled = !!META_VOICE_URL && META_VOICE_URL !== 'http://localhost:8000';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;

    const now = Date.now();
    if (now - this.lastHealthCheck < this.HEALTH_TTL_MS) {
      return this.lastHealthOk;
    }

    this.lastHealthCheck = now;
    try {
      const health = await this.getHealth();
      this.lastHealthOk = health.status === 'healthy' && health.seamless_loaded;
    } catch {
      this.lastHealthOk = false;
    }
    return this.lastHealthOk;
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  async getModelsInfo(): Promise<ModelsInfoResponse> {
    const response = await this.client.get<ModelsInfoResponse>('/models');
    return response.data;
  }

  async speechToSpeech(request: SpeechToSpeechRequest): Promise<SpeechToSpeechResponse> {
    const response = await this.client.post<SpeechToSpeechResponse>('/speech-to-speech', request);
    return response.data;
  }

  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    const response = await this.client.post<SpeechToTextResponse>('/speech-to-text', request);
    return response.data;
  }

  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    const response = await this.client.post<TextToSpeechResponse>('/text-to-speech', request);
    return response.data;
  }

  async transcribeAndTranslate(
    request: TranscribeAndTranslateRequest
  ): Promise<TranscribeAndTranslateResponse> {
    const formData = new FormData();
    formData.append('audio_base64', request.audio_base64);
    formData.append('source_lang', request.source_lang || 'auto');
    formData.append('target_lang', request.target_lang || 'en');

    const response = await this.client.post<TranscribeAndTranslateResponse>(
      '/transcribe-and-translate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  getConfig() {
    return {
      enabled: this.enabled,
      url: META_VOICE_URL,
      timeout: META_VOICE_TIMEOUT,
    };
  }
}

// Export singleton instance
const metaVoiceService = new MetaVoiceService();
export default metaVoiceService;
export type {
  SpeechToSpeechRequest,
  SpeechToSpeechResponse,
  SpeechToTextRequest,
  SpeechToTextResponse,
  TextToSpeechRequest,
  TextToSpeechResponse,
  TranscribeAndTranslateRequest,
  TranscribeAndTranslateResponse,
  HealthResponse,
  ModelsInfoResponse,
};
