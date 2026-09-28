const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const GROQ_URL = 'https://api.groq.com/openai/v1';

import { fetchWithRetry } from './fetchRetry';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqOptions {
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

const REASONING_MODELS = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b']);

function normalizeOutput(raw: string): string {
  return raw
    .replace(/<\/?thinking>/g, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
    .trim();
}

export function isGroqConfigured(): boolean {
  return !!GROQ_API_KEY;
}

export function isConfigured(): boolean {
  return isGroqConfigured();
}

export function isSTTConfigured(): boolean {
  return isGroqConfigured();
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqOptions = {}
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('No LLM configured: set GROQ_API_KEY');
  }

  const isReasoningModel = REASONING_MODELS.has(GROQ_MODEL);

  const res = await fetchWithRetry(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      ...(isReasoningModel ? { reasoning_effort: options.reasoningEffort ?? 'low' } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const message = data.choices[0].message;

  let content: string = message?.content || message?.reasoning_content || '';
  content = normalizeOutput(content);

  if (!content) {
    throw new Error('Groq returned empty content for the given request');
  }

  return content;
}

export async function groqTranscribeAudio(
  audioBase64: string,
  filename = 'recording.m4a',
  mimeType = 'audio/mp4'
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('No STT configured: set GROQ_API_KEY');
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const boundary = `----FormBoundary${Date.now()}`;

  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n--${boundary}--`
  );
  const body = Buffer.concat([header, audioBuffer, footer]);

  const res = await fetchWithRetry(`${GROQ_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq Whisper error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  return data.text;
}

export async function groqVision(
  imageBase64: string,
  scenarioContext: string,
  mimeType = 'image/jpeg'
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Vision requires GROQ_API_KEY');
  }

  const res = await fetchWithRetry(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Identify the main objects visible in this image that are relevant to: ${scenarioContext}. Return ONLY a JSON array of strings like ["object1","object2"]. Max 10 objects.`,
            },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq Vision error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  return data.choices[0].message.content;
}

export async function groqJson<T>(
  systemPrompt: string,
  userContent: string,
  options: GroqOptions = {}
): Promise<T> {
  const content = await groqChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    { temperature: options.temperature ?? 0.1, maxTokens: options.maxTokens ?? 500 }
  );

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Failed to parse LLM JSON response: ${content.substring(0, 200)}`);
  }
}