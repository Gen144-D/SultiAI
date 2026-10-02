import { decodeAudio } from '../../utils/audioDecode';
import { groqJson } from '../../utils/groq';
import logger from '../../utils/logger';
import { analyzePronunciation } from '../speech/acoustics';
import type { PronunciationResult } from '../../types/ai';

export interface ScorePronunciationParams {
  /** Base64-encoded recording bytes. */
  audioBase64: string;
  filename: string;
  mimeType: string;
  /** The phrase/word the learner was expected to say (or their transcript, in free chat). */
  expectedText: string;
  /** ISO-ish language hint understood by the phoneme G2P ("bisaya", "tl", "en", ...). */
  language?: string;
}

interface GroqPronunciationGuess {
  score: number;
  feedback: string;
  phoneme_breakdown?: { expected: string; heard: string; correct: boolean; tip?: string }[];
}

/**
 * Scores a learner's pronunciation from their actual recorded audio.
 *
 * Primary path: decode the recording and run the acoustic analysis in-process
 * (MFCC, pitch, formants, and rule-based phoneme scoring against the expected
 * text). No microservice and no network hop.
 *
 * Degraded fallback: if the audio cannot be decoded, fall back to asking the
 * Groq LLM to guess a plausible score from the text alone. This never throws —
 * a pronunciation-scoring failure should not fail the surrounding tutor turn.
 */
export async function scorePronunciationAudio(
  params: ScorePronunciationParams
): Promise<PronunciationResult | undefined> {
  const { audioBase64, filename, mimeType, expectedText, language = 'bisaya' } = params;

  if (audioBase64) {
    const startTime = Date.now();
    try {
      const decoded = await decodeAudio(Buffer.from(audioBase64, 'base64'));
      const result = analyzePronunciation({
        samples: decoded.samples,
        sampleRate: decoded.sampleRate,
        expectedText,
        language,
      });
      logger.ai('acoustic', 'pronunciation', Date.now() - startTime, true);

      return {
        score: result.score,
        feedback: result.feedback,
        phonemeBreakdown: result.phonemeBreakdown.map((p) => ({
          expected: p.expected,
          heard: p.heard,
          correct: p.correct,
          tip: p.tip,
        })),
      };
    } catch (err) {
      logger.ai('acoustic', 'pronunciation', Date.now() - startTime, false);
      logger.warn('Acoustic pronunciation scoring unavailable, falling back to Groq text guess', {
        error: (err as Error).message,
        filename,
        mimeType,
      });
    }
  }

  return groqTextGuessFallback(expectedText);
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
