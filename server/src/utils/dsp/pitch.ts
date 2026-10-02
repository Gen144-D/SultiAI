/**
 * Fundamental-frequency (F0) estimation via normalised autocorrelation.
 *
 * Replaces the Parselmouth "To Pitch" call the acoustic service used to make.
 * Frames are analysed over the same 25 ms grid used for formants, and the
 * search range defaults to the 75–600 Hz span that service requested.
 */

import { stddev, mean } from './features';

export interface PitchStats {
  /** Mean F0 over voiced frames, in Hz. 0 when nothing was voiced. */
  mean: number;
  /** Standard deviation of voiced F0, in Hz. */
  std: number;
  /** Max minus min voiced F0, in Hz. */
  range: number;
  /** Per-frame F0 on the analysis grid; 0 marks unvoiced frames. */
  contour: Float64Array;
}

export interface PitchOptions {
  f0Floor?: number;
  f0Ceiling?: number;
  frameSeconds?: number;
  hopSeconds?: number;
  /** Normalised-autocorrelation threshold for accepting a frame as voiced. */
  threshold?: number;
}

const DEFAULTS = {
  f0Floor: 75,
  f0Ceiling: 600,
  frameSeconds: 0.04,
  hopSeconds: 0.025,
  threshold: 0.35,
};

export function extractPitch(
  signal: Float32Array,
  sampleRate: number,
  options: PitchOptions = {}
): PitchStats {
  const f0Floor = options.f0Floor ?? DEFAULTS.f0Floor;
  const f0Ceiling = options.f0Ceiling ?? DEFAULTS.f0Ceiling;
  const frameSeconds = options.frameSeconds ?? DEFAULTS.frameSeconds;
  const hopSeconds = options.hopSeconds ?? DEFAULTS.hopSeconds;
  const threshold = options.threshold ?? DEFAULTS.threshold;

  const frameLength = Math.max(2, Math.round(frameSeconds * sampleRate));
  const hop = Math.max(1, Math.round(hopSeconds * sampleRate));
  const minLag = Math.max(2, Math.floor(sampleRate / f0Ceiling));
  const maxLag = Math.min(frameLength - 1, Math.ceil(sampleRate / f0Floor));

  const frames =
    signal.length < frameLength ? 0 : Math.floor((signal.length - frameLength) / hop) + 1;
  const contour = new Float64Array(frames);
  if (maxLag <= minLag) {
    return { mean: 0, std: 0, range: 0, contour };
  }

  // Remove the DC offset per frame so autocorrelation is not dominated by it.
  const frame = new Float64Array(frameLength);
  const centred = new Float64Array(frameLength);

  for (let f = 0; f < frames; f++) {
    const offset = f * hop;
    for (let i = 0; i < frameLength; i++) frame[i] = signal[offset + i];

    const m = mean(frame);
    let energy = 0;
    for (let i = 0; i < frameLength; i++) {
      centred[i] = frame[i] - m;
      energy += centred[i] * centred[i];
    }
    if (energy < 1e-10) continue;
    const best = bestLag(centred, frameLength, minLag, maxLag, threshold);
    if (best >= 0) {
      const refined = parabolicRefine(centred, frameLength, best);
      contour[f] = sampleRate / refined;
    }
  }

  const voiced: number[] = [];
  for (let i = 0; i < contour.length; i++) if (contour[i] > 0) voiced.push(contour[i]);

  if (voiced.length === 0) return { mean: 0, std: 0, range: 0, contour };

  const f0Mean = mean(voiced);
  const f0Std = stddev(voiced);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of voiced) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { mean: f0Mean, std: f0Std, range: hi - lo, contour };
}

/**
 * Picks the period of the frame from its normalised autocorrelation.
 *
 * Finds the global maximum, then halves the lag while a sub-multiple stays
 * within `peakRatio` of that maximum. That collapses the common octave error
 * where a harmonic peak outscores the true period.
 */
function bestLag(
  frame: Float64Array,
  frameLength: number,
  minLag: number,
  maxLag: number,
  threshold: number,
  peakRatio = 0.9
): number {
  const span = maxLag - minLag + 1;
  if (span < 3) return -1;

  // Prefix sums of energy let each lag be normalised against exactly the two
  // overlapping windows its correlation compares.
  const prefix = new Float64Array(frameLength + 1);
  for (let i = 0; i < frameLength; i++) prefix[i + 1] = prefix[i] + frame[i] * frame[i];
  const totalEnergy = prefix[frameLength];

  // Normalised square difference: bounded to [-1, 1] and equal to 1 for a
  // perfectly periodic frame, so unlike a raw energy ratio it cannot blow up
  // at the shortest lags.
  const norm = new Float64Array(span);
  for (let k = 0; k < span; k++) {
    const lag = minLag + k;
    const n = frameLength - lag;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += frame[i] * frame[i + lag];

    const headEnergy = prefix[n];
    const tailEnergy = totalEnergy - prefix[n];
    norm[k] = (2 * sum) / (headEnergy + tailEnergy + 1e-12);
  }

  let best = 0;
  for (let k = 1; k < span; k++) if (norm[k] > norm[best]) best = k;
  if (norm[best] < threshold) return -1;

  // Prefer the shortest lag that is nearly as strong, to halve octave errors.
  while (best > 0 && best % 2 === 0 && norm[best / 2] >= norm[best] * peakRatio) {
    best /= 2;
  }

  return minLag + best;
}

/** Sub-sample lag estimate from the autocorrelation peak's curvature. */
function parabolicRefine(frame: Float64Array, frameLength: number, lag: number): number {
  const at = (l: number): number => {
    if (l < 1 || l >= frameLength - 1) return 0;
    let sum = 0;
    const n = frameLength - l;
    for (let i = 0; i < n; i++) sum += frame[i] * frame[i + l];
    return sum / n;
  };

  const y0 = at(lag - 1);
  const y1 = at(lag);
  const y2 = at(lag + 1);
  const denom = y0 - 2 * y1 + y2;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return lag;

  // A flat peak gives a wild vertex, so keep the shift within half a lag.
  const shift = (0.5 * (y0 - y2)) / denom;
  if (!Number.isFinite(shift)) return lag;
  return lag + Math.max(-0.5, Math.min(0.5, shift));
}
