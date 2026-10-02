/**
 * Acoustic pronunciation analysis.
 *
 * Extracts MFCC, pitch, formant, and energy features from a recording, then
 * scores the learner against the expected phrase using per-phoneme analysis
 * and a weighted composite. This is the in-process replacement for the former
 * `ai-service` Python microservice.
 */

import { extractPitch, type PitchStats } from '../../utils/dsp/pitch';
import { extractFormants, type FormantStats } from '../../utils/dsp/formants';
import {
  computeSpeakingRate,
  extractEnergy,
  extractMfccStack,
  mean,
  type MfccMatrix,
} from '../../utils/dsp/features';
import { textToPhonemes } from './phonemes';

export interface PhonemeResult {
  expected: string;
  heard: string;
  correct: boolean;
  confidence: number;
  tip: string;
}

export interface AcousticMetrics {
  pitchAccuracy: number;
  formantAccuracy: number;
  energyConsistency: number;
  /** Syllables per second. */
  speakingRate: number;
  pitchMean: number;
  pitchStd: number;
  durationSeconds: number;
}

export interface PronunciationScore {
  /** 0-100. */
  score: number;
  feedback: string;
  phonemeBreakdown: PhonemeResult[];
  metrics: AcousticMetrics;
}

/** Minimum usable recording length, in seconds. */
const MIN_DURATION_SECONDS = 0.3;

/** Typical F1/F2 centres and spreads for Philippine-language vowels (Hz). */
const VOWEL_FORMANTS: Record<string, { f1: number; f2: number; f1Std: number; f2Std: number }> = {
  a: { f1: 730, f2: 1090, f1Std: 80, f2Std: 120 },
  ɛ: { f1: 530, f2: 1840, f1Std: 70, f2Std: 150 },
  e: { f1: 530, f2: 1840, f1Std: 70, f2Std: 150 },
  i: { f1: 270, f2: 2290, f1Std: 50, f2Std: 130 },
  o: { f1: 570, f2: 840, f1Std: 60, f2Std: 100 },
  u: { f1: 300, f2: 870, f1Std: 50, f2Std: 100 },
  ə: { f1: 500, f2: 1500, f1Std: 60, f2Std: 120 },
};

const FRICATIVES = new Set(['s', 'ʃ', 'f', 'h', 'θ']);
const PLOSIVES = new Set(['p', 't', 'k', 'b', 'd', 'ɡ']);

export interface AnalyzePronunciationParams {
  /** Mono PCM, nominally in [-1, 1]. */
  samples: Float32Array;
  sampleRate: number;
  /** The text the learner was asked to say. */
  expectedText: string;
  language?: string;
}

/** Analyses a recording and returns a detailed score with per-phoneme notes. */
export function analyzePronunciation(params: AnalyzePronunciationParams): PronunciationScore {
  const { samples, sampleRate, expectedText, language = 'ceb' } = params;

  const duration = samples.length / sampleRate;
  if (duration < MIN_DURATION_SECONDS) {
    return {
      score: 0,
      feedback: 'Audio is too short. Please speak for at least 1 second.',
      phonemeBreakdown: [],
      metrics: emptyMetrics(duration),
    };
  }

  const mfcc = extractMfccStack(samples, sampleRate);
  const pitch = extractPitch(samples, sampleRate);
  const formants = extractFormants(samples, sampleRate);
  const energy = extractEnergy(samples);
  const speakingRate = computeSpeakingRate(samples, sampleRate);

  const expectedPhonemes = textToPhonemes(expectedText, language);

  const [mfccScore, phonemeResults] = scoreMfccMatch(mfcc, expectedPhonemes);
  const vowelAccuracy = scoreVowelAccuracy(expectedPhonemes, formants);
  const pitchAccuracy = scorePitchAccuracy(pitch);
  const energyScore = scoreEnergyConsistency(energy.mean, energy.std);

  const composite =
    mfccScore * 0.35 + // phoneme-level acoustic match
    vowelAccuracy * 0.25 + // formant accuracy for vowels
    pitchAccuracy * 0.15 + // pitch stability
    energyScore * 0.15 + // energy consistency
    Math.min(1, speakingRate / 5) * 0.1; // ideal pace is ~4-6 syllables/second

  const score = Math.max(0, Math.min(100, Math.floor(composite * 100)));

  return {
    score,
    feedback: generateFeedback(score, phonemeResults, pitch, formants, speakingRate),
    phonemeBreakdown: phonemeResults,
    metrics: {
      pitchAccuracy: round(pitchAccuracy, 2),
      formantAccuracy: round(vowelAccuracy, 2),
      energyConsistency: round(energyScore, 2),
      speakingRate: round(speakingRate, 1),
      pitchMean: round(pitch.mean, 1),
      pitchStd: round(pitch.std, 1),
      durationSeconds: round(duration, 2),
    },
  };
}

/** How closely the measured formants match the expected vowels. */
function scoreVowelAccuracy(expectedPhonemes: string[], formants: FormantStats): number {
  const vowels = expectedPhonemes.filter((p) => VOWEL_FORMANTS[p]);
  if (vowels.length === 0 || formants.f1Mean === 0) {
    // Neutral score when there is nothing to compare against.
    return 0.7;
  }

  let totalDistance = 0;
  for (const vowel of vowels) {
    const ref = VOWEL_FORMANTS[vowel];
    const f1Distance = Math.abs(formants.f1Mean - ref.f1) / ref.f1Std;
    const f2Distance = Math.abs(formants.f2Mean - ref.f2) / ref.f2Std;
    totalDistance += (f1Distance + f2Distance) / 2;
  }

  const averageDistance = totalDistance / vowels.length;
  // Zero distance is perfect; beyond 4 standard deviations scores bottom out.
  return Math.max(0, Math.min(1, 1 - averageDistance / 4));
}

/**
 * Pitch stability. Philippine languages are far less tonal than Chinese or
 * Japanese, so wide F0 variation counts against the score.
 */
function scorePitchAccuracy(pitch: PitchStats): number {
  if (pitch.mean === 0 || pitch.std === 0) return 0.5;

  const coefficientOfVariation = pitch.std / pitch.mean;
  if (coefficientOfVariation < 0.15) return 0.95;
  if (coefficientOfVariation < 0.25) return 0.85;
  if (coefficientOfVariation < 0.4) return 0.7;
  return 0.5;
}

/** Volume consistency, penalising both quiet recordings and wide swings. */
function scoreEnergyConsistency(meanEnergy: number, stdEnergy: number): number {
  if (meanEnergy === 0) return 0.5;
  if (meanEnergy < 0.01) return 0.4;

  const coefficientOfVariation = stdEnergy / meanEnergy;
  if (coefficientOfVariation < 0.3) return 0.9;
  if (coefficientOfVariation < 0.5) return 0.75;
  return 0.55;
}

/**
 * Segments the MFCC timeline into one slice per expected phoneme and scores
 * each slice on the acoustic signature its phoneme class should produce.
 */
function scoreMfccMatch(mfcc: MfccMatrix, expectedPhonemes: string[]): [number, PhonemeResult[]] {
  if (expectedPhonemes.length === 0) return [0.5, []];

  const nMfcc = 13;
  if (mfcc.frames < 2) {
    return [
      0.5,
      expectedPhonemes.map((p) => ({
        expected: p,
        heard: p,
        correct: false,
        confidence: 0.5,
        tip: 'Audio too short',
      })),
    ];
  }

  const frames = mfcc.frames;

  // Per-frame energy proxy: mean squared magnitude of the base MFCC coefficients.
  const frameEnergy = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let acc = 0;
    for (let c = 0; c < nMfcc; c++) {
      const v = mfcc.data[c * frames + f];
      acc += v * v;
    }
    frameEnergy[f] = acc / nMfcc;
  }
  const overallEnergy = mean(frameEnergy);

  const segmentSize = Math.max(1, Math.floor(frames / expectedPhonemes.length));
  const results: PhonemeResult[] = [];

  for (let i = 0; i < expectedPhonemes.length; i++) {
    const phoneme = expectedPhonemes[i];
    const start = i * segmentSize;
    const end = Math.min((i + 1) * segmentSize, frames);

    if (start >= frames) {
      results.push({
        expected: phoneme,
        heard: '∅',
        correct: false,
        confidence: 0.2,
        tip: `Phoneme '${phoneme}' not detected — audio may be too short`,
      });
      continue;
    }

    const slice = new Float64Array(end - start);
    for (let f = start; f < end; f++) slice[f - start] = frameEnergy[f];

    // The phoneme was spoken at all?
    if (mean(slice) <= overallEnergy * 0.3) {
      results.push({
        expected: phoneme,
        heard: '∅',
        correct: false,
        confidence: 0.3,
        tip: `Phoneme '${phoneme}' appears silent or very weak`,
      });
      continue;
    }

    results.push(classifySegment(phoneme, mfcc, start, end, slice, overallEnergy));
  }

  const correctCount = results.filter((r) => r.correct).length;
  const averageConfidence = mean(results.map((r) => r.confidence));
  const overall = (correctCount / results.length) * 0.6 + averageConfidence * 0.4;

  return [overall, results];
}

/** Scores one time slice against the expected acoustic signature of a phoneme. */
function classifySegment(
  phoneme: string,
  mfcc: MfccMatrix,
  start: number,
  end: number,
  frameEnergy: Float64Array,
  overallEnergy: number
): PhonemeResult {
  const frames = mfcc.frames;
  const width = end - start;

  /** Mean squared magnitude of MFCC rows [rowStart, rowEnd). */
  const bandEnergy = (rowStart: number, rowEnd: number): number => {
    let acc = 0;
    for (let c = rowStart; c < rowEnd; c++) {
      for (let f = start; f < end; f++) {
        const v = mfcc.data[c * frames + f];
        acc += v * v;
      }
    }
    return acc / (Math.max(1, rowEnd - rowStart) * width);
  };

  if (VOWEL_FORMANTS[phoneme]) {
    // Vowels carry strong low-order (formant) structure.
    const formantStrength = bandEnergy(0, 5) / (bandEnergy(5, mfcc.nCoefficients) + 1e-6);
    if (formantStrength > 2) {
      return {
        expected: phoneme,
        heard: phoneme,
        correct: true,
        confidence: round(Math.min(0.95, 0.6 + formantStrength * 0.05), 2),
        tip: '',
      };
    }
    return {
      expected: phoneme,
      heard: phoneme,
      correct: false,
      confidence: round(Math.max(0.3, 0.6 - formantStrength * 0.05), 2),
      tip: `Vowel '${phoneme}' may need more open mouth position`,
    };
  }

  if (FRICATIVES.has(phoneme)) {
    // Fricatives need high-frequency energy.
    if (bandEnergy(10, mfcc.nCoefficients) > overallEnergy * 0.1) {
      return { expected: phoneme, heard: phoneme, correct: true, confidence: 0.8, tip: '' };
    }
    return {
      expected: phoneme,
      heard: phoneme,
      correct: false,
      confidence: 0.5,
      tip: `Fricative '${phoneme}' needs more air flow`,
    };
  }

  if (PLOSIVES.has(phoneme)) {
    // Plosives need a sharp release: a burst in the energy envelope.
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of frameEnergy) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (hi - lo > overallEnergy * 0.3) {
      return { expected: phoneme, heard: phoneme, correct: true, confidence: 0.75, tip: '' };
    }
    return {
      expected: phoneme,
      heard: phoneme,
      correct: false,
      confidence: 0.5,
      tip: `Plosive '${phoneme}' needs a sharper release`,
    };
  }

  // Anything else counts as correct once it has measurable energy.
  return { expected: phoneme, heard: phoneme, correct: true, confidence: 0.7, tip: '' };
}

/** Builds human-readable coaching notes from the analysis. */
function generateFeedback(
  score: number,
  phonemes: PhonemeResult[],
  pitch: PitchStats,
  formants: FormantStats,
  speakingRate: number
): string {
  const parts: string[] = [];

  if (score >= 90) parts.push('Excellent pronunciation!');
  else if (score >= 75) parts.push('Good pronunciation overall.');
  else if (score >= 55) parts.push('Decent attempt — a few areas to work on.');
  else parts.push('Keep practicing — focus on the tips below.');

  const wrong = phonemes.filter((p) => !p.correct && p.tip);
  if (wrong.length > 0) {
    parts.push(
      wrong
        .slice(0, 3)
        .map((p) => `• ${p.expected}: ${p.tip}`)
        .join(' ')
    );
  }

  if (speakingRate < 2.5) {
    parts.push('Try speaking a bit faster — your pace was slow.');
  } else if (speakingRate > 7) {
    parts.push('Try slowing down slightly for clearer pronunciation.');
  }

  if (pitch.std > 0 && pitch.mean > 0 && pitch.std / pitch.mean > 0.35) {
    parts.push('Your pitch varies a lot — try to keep a steadier tone.');
  }

  if (formants.f1Mean > 0) {
    const wrongVowels = phonemes.filter((p) => VOWEL_FORMANTS[p.expected] && !p.correct);
    if (wrongVowels.length > phonemes.length * 0.3) {
      parts.push("Focus on vowel sounds — open your mouth more for 'a' and round it for 'o'/'u'.");
    }
  }

  return parts.join(' ');
}

function emptyMetrics(duration: number): AcousticMetrics {
  return {
    pitchAccuracy: 0,
    formantAccuracy: 0,
    energyConsistency: 0,
    speakingRate: 0,
    pitchMean: 0,
    pitchStd: 0,
    durationSeconds: round(duration, 2),
  };
}

function round(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
