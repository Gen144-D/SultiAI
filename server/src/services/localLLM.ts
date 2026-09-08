import path from 'path';
import fs from 'fs';
import { pipeline, PipelineType } from '@xenova/transformers';

let _model: any = null;
let _initialized = false;
let _initError: string | null = null;

const MODELS_DIR = path.join(process.cwd(), 'models');
const MODEL_NAME = 'Xenova/llama-2-7b-chat-q4f16-awq';
const LOCAL_MODEL_PATH = path.join(MODELS_DIR, 'llama-2-7b-chat-q4f16-awq');

interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class LocalLLMService {
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

      const useLocal = fs.existsSync(LOCAL_MODEL_PATH);

      const pipe = await pipeline(
        'text-generation' as PipelineType,
        useLocal ? LOCAL_MODEL_PATH : MODEL_NAME,
        {
          quantized: useLocal,
          lazy: false,
          cache_dir: MODELS_DIR,
        }
      );

      _model = pipe;
      _initError = null;
    } catch (err: any) {
      _initError = err.message || String(err);
      console.error('[LocalLLM] Failed to initialize model:', _initError);

      _model = await pipeline(
        'text-generation' as PipelineType,
        'Xenova/TinyLlama-1.1B-Chat-v1.0',
        {
          quantized: true,
          cache_dir: MODELS_DIR,
        }
      );
      _initError = null;
    }
  }

  isReady(): boolean {
    return _model !== null && _initError === null;
  }

  getError(): string | null {
    return _initError;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    await this.ready;

    if (!_model) {
      throw new Error('Local LLM model not initialized');
    }

    const result = await _model(prompt, {
      temperature: options.temperature ?? 0.7,
      max_new_tokens: options.maxTokens ?? 512,
      do_sample: true,
      top_p: 0.9,
      repetition_penalty: 1.1,
    });

    if (Array.isArray(result)) {
      return result[0]?.generated_text || '';
    }
    return result?.generated_text || '';
  }

  async chat(messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
    await this.ready;

    if (!_model) {
      throw new Error('Local LLM model not initialized');
    }

    let prompt = '';
    for (const msg of messages) {
      const role = msg.role;
      prompt += `[${role.toUpperCase()}] ${msg.content}\n`;
    }
    prompt += '[ASSISTANT] ';

    const result = await _model(prompt, {
      temperature: options.temperature ?? 0.7,
      max_new_tokens: options.maxTokens ?? 512,
      do_sample: true,
      top_p: 0.9,
      repetition_penalty: 1.1,
    });

    let output = '';
    if (Array.isArray(result)) {
      output = result[0]?.generated_text || '';
    } else {
      output = result?.generated_text || '';
    }

    const match = output.match(/\[ASSISTANT\]\s*([\s\S]*?)(?:\n\[|$)/);
    return match ? match[1].trim() : output.trim();
  }

  async generateJSON(
    systemPrompt: string,
    userContent: string,
    options: GenerateOptions = {}
  ): Promise<any> {
    const fullPrompt = `${systemPrompt}\n\n${userContent}\n\n`;
    const text = await this.generate(fullPrompt, options);

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = text.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}

const localLLM = new LocalLLMService();

export async function ensureLocalLLM(): Promise<void> {
  await localLLM.ready;
}

export function isLocalLLMReady(): boolean {
  return localLLM.isReady();
}

export function getLocalLLMError(): string | null {
  return localLLM.getError();
}

export async function localLLMChat(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  return localLLM.chat(messages, options);
}

export async function localLLMGenerate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  return localLLM.generate(prompt, options);
}

export async function localLLMJSON(
  systemPrompt: string,
  userContent: string,
  options: GenerateOptions = {}
): Promise<any> {
  return localLLM.generateJSON(systemPrompt, userContent, options);
}

export default localLLM;
