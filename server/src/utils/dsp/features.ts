/**
 * Acoustic feature extraction: framing, RMS energy, and MFCCs.
 *
 * The constants and the mel/DCT maths deliberately mirror `librosa`'s defaults
 * (`n_fft=2048`, `hop_length=512`, periodic Hann, Slaney-normalised mel scale,
 * orthonormal DCT-II, Savitzky-Golay deltas) so the scores produced here stay
 * comparable with the analysis this module replaced.
 */

import { powerSpectrum } from './fft';

export const N_FFT = 2048;
export const HOP_LENGTH = 512;
export const N_MFCC = 13;
export const FRAME_LENGTH = 2048;

const LOG_FLOOR = 1e-10;

/** Periodic Hann window — `scipy.signal.get_window('hann', n, fftbins=True)`. */
export function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

/**
 * Splits `signal` into overlapping frames, zero-padding `pad` samples on both
 * ends first (librosa's `center=True` behaviour).
 */
export function frameSignal(
  signal: Float32Array,
  frameLength: number,
  hopLength: number,
  pad: number
): { frames: number; data: Float64Array } {
  const padded = new Float32Array(signal.length + 2 * pad);
  padded.set(signal, pad);

  const frames = Math.max(0, Math.floor((padded.length - frameLength) / hopLength) + 1);
  const data = new Float64Array(frames * frameLength);
  for (let f = 0; f < frames; f++) {
    const offset = f * hopLength;
    for (let i = 0; i < frameLength; i++) {
      const idx = offset + i;
      data[f * frameLength + i] = idx < padded.length ? padded[idx] : 0;
    }
  }

  return { frames, data };
}

/** Slaney mel scale — `librosa.hz_to_mel(..., htk=False)`. */
export function hzToMel(hz: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logStep = Math.log(6.4) / 27;
  if (hz >= minLogHz) return minLogMel + Math.log(hz / minLogHz) / logStep;
  return hz / fSp;
}

/** Slaney mel scale inverse — `librosa.mel_to_hz(..., htk=False)`. */
export function melToHz(mel: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logStep = Math.log(6.4) / 27;
  if (mel >= minLogMel) return minLogHz * Math.exp(logStep * (mel - minLogMel));
  return fSp * mel;
}

/**
 * Triangular mel filterbank, one row per filter, Slaney-normalised so each
 * band carries roughly constant energy.
 */
export function melFilterbank(
  sampleRate: number,
  nMels: number,
  nFft: number,
  fMin = 0,
  fMax?: number
): Float64Array {
  const top = fMax ?? sampleRate / 2;
  const bins = nFft / 2 + 1;

  const minMel = hzToMel(fMin);
  const maxMel = hzToMel(top);

  const points = new Float64Array(nMels + 2);
  for (let i = 0; i < points.length; i++) {
    points[i] = melToHz(minMel + ((maxMel - minMel) * i) / (nMels + 1));
  }

  const freqs = new Float64Array(bins);
  for (let k = 0; k < bins; k++) freqs[k] = (k * sampleRate) / nFft;

  const weights = new Float64Array(nMels * bins);
  for (let m = 0; m < nMels; m++) {
    const lower = points[m];
    const upper = points[m + 1];
    const centre = points[m + 2];
    const denomLow = upper - lower;
    const denomHigh = centre - upper;

    for (let k = 0; k < bins; k++) {
      const rise = denomLow !== 0 ? (freqs[k] - lower) / denomLow : 0;
      const fall = denomHigh !== 0 ? (centre - freqs[k]) / denomHigh : 0;
      weights[m * bins + k] = Math.max(0, Math.min(rise, fall));
    }

    const enorm = 2 / (points[m + 2] - points[m]);
    for (let k = 0; k < bins; k++) weights[m * bins + k] *= enorm;
  }

  return weights;
}

/**
 * Orthonormal DCT-II (`scipy.fftpack.dct(x, type=2, norm='ortho')`) of `input`
 * (length `n`), writing the first `maxK` coefficients into `out`.
 */
function dct2Into(input: Float64Array, n: number, out: Float64Array, maxK: number): void {
  for (let k = 0; k < maxK; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += input[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    }
    out[k] = (k === 0 ? 1 / Math.sqrt(n) : Math.sqrt(2 / n)) * sum;
  }
}

/** MFCC matrix, stored coefficient-major: `data[coefficient * frames + frame]`. */
export interface MfccMatrix {
  nCoefficients: number;
  frames: number;
  data: Float64Array;
}

export function extractMfcc(
  signal: Float32Array,
  sampleRate: number,
  nMfcc: number = N_MFCC,
  nFft: number = N_FFT,
  hopLength: number = HOP_LENGTH
): MfccMatrix {
  const nMels = nMfcc;
  const bins = nFft / 2 + 1;
  const { frames, data } = frameSignal(signal, nFft, hopLength, nFft / 2);

  const window = hannWindow(nFft);
  const fb = melFilterbank(sampleRate, nMels, nFft);
  const frame = new Float64Array(nFft);

  // power_to_db(mel_spectrogram): 10 * log10(max(S, 1e-10))
  const logMel = new Float64Array(frames * nMels);
  for (let f = 0; f < frames; f++) {
    const offset = f * hopLength;
    for (let i = 0; i < nFft; i++) frame[i] = data[offset + i] * window[i];

    const power = powerSpectrum(frame);
    for (let m = 0; m < nMels; m++) {
      const base = m * bins;
      let acc = 0;
      for (let k = 0; k < bins; k++) acc += fb[base + k] * power[k];
      logMel[f * nMels + m] = 10 * Math.log10(Math.max(acc, LOG_FLOOR));
    }
  }

  // DCT-II along the mel axis, keeping the first nMfcc coefficients.
  const mfcc = new Float64Array(frames * nMfcc);
  const column = new Float64Array(nMels);
  const transformed = new Float64Array(nMfcc);
  for (let f = 0; f < frames; f++) {
    for (let m = 0; m < nMels; m++) column[m] = logMel[f * nMels + m];
    dct2Into(column, nMels, transformed, nMfcc);
    for (let c = 0; c < nMfcc; c++) mfcc[c * frames + f] = transformed[c];
  }

  return { nCoefficients: nMfcc, frames, data: mfcc };
}

/**
 * Savitzky-Golay derivative coefficients for a window of `width` samples,
 * reproducing `scipy.signal.savgol_coeffs(width, order)`.
 *
 * Fits a degree-`order` polynomial to the window by least squares, then
 * evaluates its `order`-th derivative at the window centre. The fit solves the
 * normal equations A m = b with `A[k1][k2] = sum(x^(k1+k2))`, and the filter is
 * `w[i] = sum_k m_k x_i^k`.
 */
export function savGolDerivativeCoeffs(width: number, order: number): Float64Array {
  const half = (width - 1) / 2;
  const size = order + 1;

  // Normal-equation matrix for a degree-`order` least-squares fit.
  const powers: number[] = [];
  for (let e = 0; e <= 2 * order; e++) {
    let acc = 0;
    for (let i = 0; i < width; i++) acc += Math.pow(i - half, e);
    powers.push(acc);
  }

  const a = new Float64Array(size * size);
  for (let k1 = 0; k1 < size; k1++) {
    for (let k2 = 0; k2 < size; k2++) a[k1 * size + k2] = powers[k1 + k2];
  }

  const b = new Float64Array(size);
  b[order] = factorial(order);

  const m = solveLinearSystem(a, b, size);

  const out = new Float64Array(width);
  for (let i = 0; i < width; i++) {
    const x = i - half;
    let acc = 0;
    for (let k = 0; k < size; k++) acc += m[k] * Math.pow(x, k);
    out[i] = acc;
  }
  return out;
}

function factorial(n: number): number {
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  return acc;
}

/** Gaussian elimination with partial pivoting for a small dense system. */
function solveLinearSystem(a: Float64Array, b: Float64Array, n: number): Float64Array {
  const m = Float64Array.from(a);
  const x = Float64Array.from(b);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row * n + col]) > Math.abs(m[pivot * n + col])) pivot = row;
    }
    if (Math.abs(m[pivot * n + col]) < 1e-12) continue;
    if (pivot !== col) {
      for (let k = 0; k < n; k++) {
        const tmp = m[col * n + k];
        m[col * n + k] = m[pivot * n + k];
        m[pivot * n + k] = tmp;
      }
      const tmp = x[col];
      x[col] = x[pivot];
      x[pivot] = tmp;
    }

    const diag = m[col * n + col];
    for (let row = col + 1; row < n; row++) {
      const factor = m[row * n + col] / diag;
      if (factor === 0) continue;
      for (let k = col; k < n; k++) m[row * n + k] -= factor * m[col * n + k];
      x[row] -= factor * x[col];
    }
  }

  const out = new Float64Array(n);
  for (let row = n - 1; row >= 0; row--) {
    let acc = x[row];
    for (let k = row + 1; k < n; k++) acc -= m[row * n + k] * out[k];
    out[row] = Math.abs(m[row * n + row]) < 1e-12 ? 0 : acc / m[row * n + row];
  }
  return out;
}

/**
 * `librosa.feature.delta` — Savitzky-Golay derivative across the time axis,
 * with edge values extended (librosa's `mode='interp'`).
 */
export function delta(mfcc: MfccMatrix, order: 1 | 2, width = 9): Float64Array {
  const nFrames = mfcc.frames;
  const half = Math.floor(width / 2);
  const filter = savGolDerivativeCoeffs(width, order);

  const out = new Float64Array(mfcc.data.length);
  for (let c = 0; c < mfcc.nCoefficients; c++) {
    const base = c * nFrames;
    for (let f = 0; f < nFrames; f++) {
      let acc = 0;
      for (let k = 0; k < width; k++) {
        const idx = Math.min(nFrames - 1, Math.max(0, f + k - half));
        acc += filter[k] * mfcc.data[base + idx];
      }
      out[base + f] = acc;
    }
  }
  return out;
}

/** Full 39-coefficient MFCC + delta + delta-delta stack used for scoring. */
export function extractMfccStack(
  signal: Float32Array,
  sampleRate: number,
  nMfcc: number = N_MFCC
): MfccMatrix {
  const base = extractMfcc(signal, sampleRate, nMfcc);
  const d1 = delta(base, 1);
  const d2 = delta({ nCoefficients: base.nCoefficients, frames: base.frames, data: base.data }, 2);

  const total = nMfcc * 3;
  const data = new Float64Array(total * base.frames);
  data.set(base.data, 0);
  data.set(d1, nMfcc * base.frames);
  data.set(d2, 2 * nMfcc * base.frames);
  return { nCoefficients: total, frames: base.frames, data };
}

export interface EnergyStats {
  mean: number;
  std: number;
  max: number;
  /** Per-frame RMS values. */
  envelope: Float64Array;
}

/** Frame-wise RMS energy — `librosa.feature.rms(y=y)`. */
export function extractEnergy(
  signal: Float32Array,
  frameLength: number = FRAME_LENGTH,
  hopLength: number = HOP_LENGTH
): EnergyStats {
  const { frames, data } = frameSignal(signal, frameLength, hopLength, Math.floor(frameLength / 2));
  const envelope = new Float64Array(frames);

  for (let f = 0; f < frames; f++) {
    let acc = 0;
    for (let i = 0; i < frameLength; i++) {
      const v = data[f * frameLength + i];
      acc += v * v;
    }
    envelope[f] = Math.sqrt(acc / frameLength);
  }

  return { mean: mean(envelope), std: stddev(envelope), max: maxOf(envelope), envelope };
}

/**
 * Speaking rate in syllables/second, estimated from peaks in the smoothed RMS
 * envelope (each peak is treated as one syllable).
 */
export function computeSpeakingRate(
  signal: Float32Array,
  sampleRate: number,
  frameLength: number = FRAME_LENGTH,
  hopLength: number = HOP_LENGTH
): number {
  const { envelope } = extractEnergy(signal, frameLength, hopLength);
  if (envelope.length < 3) return 0;

  // uniform_filter1d(size=5) with reflect padding.
  const smoothed = new Float64Array(envelope.length);
  for (let i = 0; i < envelope.length; i++) {
    let acc = 0;
    for (let k = -2; k <= 2; k++) acc += envelope[reflect(i + k, envelope.length)];
    smoothed[i] = acc / 5;
  }

  const threshold = mean(smoothed) * 0.6;
  let peaks = 0;
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] > threshold &&
      smoothed[i] > smoothed[i - 1] &&
      smoothed[i] >= smoothed[i + 1]
    ) {
      peaks++;
    }
  }

  const duration = signal.length / sampleRate;
  return duration > 0 ? peaks / duration : 0;
}

function reflect(index: number, length: number): number {
  if (length === 1) return 0;
  const period = 2 * (length - 1);
  let i = ((index % period) + period) % period;
  if (i >= length) i = period - i;
  return i;
}

export function mean(values: ArrayLike<number>): number {
  if (values.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < values.length; i++) acc += values[i];
  return acc / values.length;
}

export function stddev(values: ArrayLike<number>): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - m;
    acc += d * d;
  }
  return Math.sqrt(acc / values.length);
}

export function maxOf(values: ArrayLike<number>): number {
  let out = -Infinity;
  for (let i = 0; i < values.length; i++) if (values[i] > out) out = values[i];
  return values.length === 0 ? 0 : out;
}

export function minOf(values: ArrayLike<number>): number {
  let out = Infinity;
  for (let i = 0; i < values.length; i++) if (values[i] < out) out = values[i];
  return values.length === 0 ? 0 : out;
}
