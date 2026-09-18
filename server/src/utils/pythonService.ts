/**
 * HTTP client for the Python AI Service.
 *
 * Provides access to:
 * - Pronunciation analysis (acoustic scoring)
 * - RoBERTa Tagalog Base (fill-mask, vocabulary exercises)
 *
 * Falls back gracefully when the Python service is unavailable —
 * callers receive null and should use the LLM-based fallback.
 */

const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

export interface PythonPhonemeResult {
  expected: string;
  heard: string;
  correct: boolean;
  confidence: number;
  tip: string;
}

export interface PythonPronunciationResult {
  score: number;
  feedback: string;
  phoneme_breakdown: PythonPhonemeResult[];
  metrics: {
    pitch_accuracy: number;
    formant_accuracy: number;
    energy_consistency: number;
    speaking_rate: number;
    pitch_mean: number;
    pitch_std: number;
    duration_seconds: number;
  };
}

// RoBERTa Tagalog Base interfaces
export interface RobertaPrediction {
  word: string;
  score: number;
  sequence: string;
}

export interface RobertaFillMaskResult {
  input_text: string;
  predictions: RobertaPrediction[];
  top_k: number;
  processing_time: number;
}

export interface VocabularyExerciseResult {
  difficulty: string;
  topic: string | null;
  exercise: {
    template: string;
    predictions: Array<{
      word: string;
      score: number;
      is_correct: boolean;
    }>;
    correct_answer: string | null;
  };
  alternative_exercises: string[];
  processing_time: number;
}

export interface SentenceCompletionResult {
  original_text: string;
  context: string | null;
  completions: Array<{
    completed_sentence: string;
    predicted_word: string;
    confidence: number;
  }>;
  best_completion: {
    completed_sentence: string;
    predicted_word: string;
    confidence: number;
  } | null;
  processing_time: number;
}

/**
 * Check if the Python AI service is reachable.
 */
export async function isPythonServiceAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json() as { status?: string };
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Check if RoBERTa Tagalog model is available in the Python service.
 */
export async function isRobertaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json() as { roberta_tagalog?: string };
    return data?.roberta_tagalog === 'loaded';
  } catch {
    return false;
  }
}

/**
 * Score pronunciation using the Python acoustic analysis service.
 *
 * @param audioBase64 - Base64-encoded audio (M4A, WAV, MP3)
 * @param expectedText - The text the user was supposed to say
 * @param language - ISO 639 code (ceb, fil, tl, en)
 * @param filename - Original filename for format detection
 * @returns PronunciationScore or null if service is unavailable
 */
export async function scoreWithPython(
  audioBase64: string,
  expectedText: string,
  language: string = 'ceb',
  filename: string = 'recording.m4a'
): Promise<PythonPronunciationResult | null> {
  try {
    const formData = new URLSearchParams();
    formData.append('audio_base64', audioBase64);
    formData.append('expected_text', expectedText);
    formData.append('language', language);
    formData.append('filename', filename);

    const res = await fetch(`${PYTHON_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000), // 30s timeout for audio processing
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[PythonService] Score error ${res.status}: ${text}`);
      return null;
    }

    const data = await res.json();
    return data as PythonPronunciationResult;
  } catch (err) {
    console.warn('[PythonService] Unavailable:', (err as Error).message);
    return null;
  }
}

/**
 * Convert text to phonemes using the Python service (for debugging/UI).
 */
export async function textToPhonemes(
  text: string,
  language: string = 'ceb'
): Promise<{ phonemes: string[]; inventory: string[] } | null> {
  try {
    const res = await fetch(`${PYTHON_URL}/phonemes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json() as { phonemes: string[]; inventory: string[] };
    return { phonemes: data.phonemes, inventory: data.inventory };
  } catch {
    return null;
  }
}

// ==================== RoBERTa Tagalog Base Functions ====================

/**
 * Fill masked words in Tagalog sentences using RoBERTa Tagalog Base.
 * Use <mask> token for the word to predict.
 */
export async function robertaFillMask(
  text: string,
  topK: number = 5
): Promise<RobertaFillMaskResult | null> {
  try {
    const url = new URL(`${PYTHON_URL}/roberta/fill-mask`);
    url.searchParams.append('text', text);
    url.searchParams.append('top_k', topK.toString());

    const res = await fetch(url.toString(), {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data as RobertaFillMaskResult;
  } catch {
    return null;
  }
}

/**
 * Generate vocabulary exercises using RoBERTa Tagalog Base.
 * Returns fill-mask exercises with answers for vocabulary practice.
 */
export async function generateVocabularyExercise(
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  topic?: string
): Promise<VocabularyExerciseResult | null> {
  try {
    const url = new URL(`${PYTHON_URL}/roberta/vocabulary-exercise`);
    url.searchParams.append('difficulty', difficulty);
    if (topic) url.searchParams.append('topic', topic);

    const res = await fetch(url.toString(), {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data as VocabularyExerciseResult;
  } catch {
    return null;
  }
}

/**
 * Complete Tagalog sentences using RoBERTa fill-mask predictions.
 * Useful for sentence completion exercises.
 */
export async function completeSentence(
  text: string,
  context?: string
): Promise<SentenceCompletionResult | null> {
  try {
    const url = new URL(`${PYTHON_URL}/roberta/sentence-completion`);
    url.searchParams.append('text', text);
    if (context) url.searchParams.append('context', context);

    const res = await fetch(url.toString(), {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data as SentenceCompletionResult;
  } catch {
    return null;
  }
}
