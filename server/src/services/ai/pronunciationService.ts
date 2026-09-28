import { fetchWithRetry } from '../../utils/fetchRetry';
import { groqJson } from '../../utils/groq';
import logger from '../../utils/logger';
import { env } from '../../config/env';
import type { PronunciationResult } from '../../types/ai';

export interface ScorePronunciationParams {
  /** Base64-encoded recording bytes. */
  audioBase64: string;
  filename: string;
  mimeType: string;
  /** The phrase/word the learner was expected to say (or their transcript, in free chat). */
  expectedText: string;
  /** ISO-ish language hint understood by ai-service's phoneme G2P ("bisaya", "tl", "en", ...). */
  language?: string;
}

interface AiServicePhoneme {
  expected: string;
  heard: string;
  correct: boolean;
  confidence?: number;
  tip?: string;
}

interface AiServiceScoreResponse {
  score: number;
  feedback: string;
  phoneme_breakdown: AiServicePhoneme[];
  metrics?: Record<string, number>;
}

interface GroqPronunciationGuess {
  score: number;
  feedback: string;
  phoneme_breakdown?: AiServicePhoneme[];
}

/**
 * Scores a learner's pronunciation from their actual recorded audio.
 *
 * Primary path: POST the audio to the ai-service microservice (ai-service/),
 * which runs real acoustic analysis (librosa MFCC, Parselmouth pitch/formant
 * extraction, rule-based phoneme scoring against the expected text).
 *
 * Degraded fallback: if AI_SERVICE_URL isn't configured, or the call fails
 * (service down, timeout, bad response), fall back to asking the Groq LLM to
 * guess a plausible score from the transcript text alone. This never throws —
 * a pronunciation-scoring failure should not fail the surrounding tutor turn.
 */
export async function scorePronunciationAudio(
  params: ScorePronunciationParams
): Promise<PronunciationResult | undefined> {
  const { audioBase64, filename, mimeType, expectedText, language = 'bisaya' } = params;

  if (env.AI_SERVICE_URL && audioBase64) {
    const startTime = Date.now();
    try {
      const result = await callAiService({ audioBase64, filename, mimeType, expectedText, language });
      logger.ai('ai-service', 'pronunciation_acoustic', Date.now() - startTime, true);
      return result;
    } catch (err) {
      logger.ai('ai-service', 'pronunciation_acoustic', Date.now() - startTime, false);
      logger.warn('Acoustic pronunciation scoring unavailable, falling back to Groq text guess', {
        error: (err as Error).message,
      });
    }
  }

  return groqTextGuessFallback(expectedText);
}

async function callAiService(params: {
  audioBase64: string;
  filename: string;
  mimeType: string;
  expectedText: string;
  language: string;
}): Promise<PronunciationResult> {
  const { audioBase64, filename, mimeType, expectedText, language } = params;

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const form = new FormData();
  form.append('audio', new Blob([audioBuffer], { type: mimeType }), filename);
  form.append('expected_text', expectedText);
  form.append('language', language);

  const res = await fetchWithRetry(
    `${env.AI_SERVICE_URL}/score`,
    {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(20000),
    },
    { retries: 1 }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ai-service /score responded ${res.status}: ${body.substring(0, 300)}`);
  }

  const data = (await res.json()) as AiServiceScoreResponse;

  return {
    score: data.score,
    feedback: data.feedback,
    phonemeBreakdown: (data.phoneme_breakdown || []).map((p) => ({
      expected: p.expected,
      heard: p.heard,
      correct: p.correct,
      tip: p.tip,
    })),
  };
}

async function groqTextGuessFallback(text: string): Promise<PronunciationResult | undefined> {
  const startTime = Date.now();
  const systemPrompt = `You are a Bisaya pronunciation coach. Analyze the given text.
Return ONLY a valid JSON object with: "score" (0-100), "feedback" (string), "phoneme_breakdown" (array of {expected, heard, correct, tip}).`;

  try {
    const result = await groqJson<GroqPronunciationGuess>(
      systemPrompt,
      `Analyze pronunciation for this Bisaya text: "${text}"`,
      { temperature: 0.3, maxTokens: 500 }
    );
    logger.ai('groq', 'pronunciation_fallback', Date.now() - startTime, true);
    return {
      score: result.score,
      feedback: result.feedback,
      phonemeBreakdown: (result.phoneme_breakdown || []).map((p) => ({
        expected: p.expected,
        heard: p.heard,
        correct: p.correct,
        tip: p.tip,
      })),
    };
  } catch {
    logger.ai('groq', 'pronunciation_fallback', Date.now() - startTime, false);
    return undefined;
  }
}
