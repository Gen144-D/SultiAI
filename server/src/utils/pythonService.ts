/**
 * HTTP client for the Python AI Pronunciation Service.
 *
 * Falls back gracefully when the Python service is unavailable —
 * callers receive null and should use the LLM-based fallback.
 */

const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

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

/**
 * Check if the Python pronunciation service is reachable.
 */
export async function isPythonServiceAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === 'ok';
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
    const data = await res.json();
    return { phonemes: data.phonemes, inventory: data.inventory };
  } catch {
    return null;
  }
}
