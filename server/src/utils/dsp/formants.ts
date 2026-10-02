/**
 * Formant (F1/F2/F3) estimation via linear-prediction analysis.
 *
 * Replaces the Parselmouth "To Formant (burg)" call the acoustic service used
 * to make. Praat's defaults for that call were order 5, a 5500 Hz ceiling and
 * a 50 ms window stepped every 25 ms, which is what we mirror here.
 *
 * The prediction polynomial comes from Levinson-Durbin on the frame's
 * autocorrelation, i.e. the Yule-Walker solution. That solution is
 * minimum-phase and therefore always yields a stable filter, which keeps the
 * pole positions (and so the formant estimates) usable.
 */

export interface FormantStats {
  f1Mean: number;
  f2Mean: number;
  f3Mean: number;
}

export interface FormantOptions {
  order?: number;
  maxFormant?: number;
  windowSeconds?: number;
  hopSeconds?: number;
  /** Analyse at most this many frames, matching the original service. */
  maxFrames?: number;
}

const DEFAULTS = {
  // ~2 poles per kHz is the usual LPC rule for formant analysis. The old
  // service asked Parselmouth for Praat's "To Formant (burg)" at a 5500 Hz
  // ceiling, which needs well over 5 poles; order 5 cannot resolve F1 and F2
  // at 22 kHz sampling and lands them in the wrong place entirely.
  order: 12,
  maxFormant: 5500,
  minFormant: 50,
  windowSeconds: 0.05,
  hopSeconds: 0.025,
  maxFrames: 100,
};

const EMPTY: FormantStats = { f1Mean: 0, f2Mean: 0, f3Mean: 0 };

export function extractFormants(
  signal: Float32Array,
  sampleRate: number,
  options: FormantOptions = {}
): FormantStats {
  const order = options.order ?? DEFAULTS.order;
  const maxFormant = options.maxFormant ?? DEFAULTS.maxFormant;
  const windowSeconds = options.windowSeconds ?? DEFAULTS.windowSeconds;
  const hopSeconds = options.hopSeconds ?? DEFAULTS.hopSeconds;
  const maxFrames = options.maxFrames ?? DEFAULTS.maxFrames;

  const windowLength = Math.max(order + 1, Math.round(windowSeconds * sampleRate));
  const hop = Math.max(1, Math.round(hopSeconds * sampleRate));
  const frames = Math.min(maxFrames, Math.floor((signal.length - windowLength) / hop) + 1);

  const f1: number[] = [];
  const f2: number[] = [];
  const f3: number[] = [];
  if (frames < 1 || signal.length < windowLength) return EMPTY;

  const window = new Float64Array(windowLength);

  for (let f = 0; f < frames; f++) {
    const offset = f * hop;

    // Hann window. The Yule-Walker solution is scale-invariant, so the taper
    // only shapes how each sample is weighted across the frame.
    for (let i = 0; i < windowLength; i++) {
      window[i] =
        signal[offset + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (windowLength - 1)));
    }

    const a = levinsonDurbin(autocorrelation(window, order), order);
    const formants = lpcFormants(a, sampleRate, order, DEFAULTS.minFormant, maxFormant);
    if (formants.length > 0) f1.push(formants[0]);
    if (formants.length > 1) f2.push(formants[1]);
    if (formants.length > 2) f3.push(formants[2]);
  }

  return { f1Mean: average(f1), f2Mean: average(f2), f3Mean: average(f3) };
}

/** Autocorrelation of `frame` for lags 0..order. */
function autocorrelation(frame: Float64Array, order: number): Float64Array {
  const r = new Float64Array(order + 1);
  for (let lag = 0; lag <= order; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < frame.length; i++) acc += frame[i] * frame[i + lag];
    r[lag] = acc;
  }
  return r;
}

/**
 * Solves the Yule-Walker equations by Levinson-Durbin recursion.
 *
 * Returns the LPC coefficients of `A(z) = 1 + a[0] z^-1 + ... + a[p-1] z^-p`.
 */
export function levinsonDurbin(r: Float64Array, order: number): Float64Array {
  const a = new Float64Array(order);
  if (!(r[0] > 0)) return a;

  // Diagonal loading. Strongly periodic frames (a glottal pulse train is the
  // worst case) make the autocorrelation near-singular, and an unregularised
  // recursion then produces |mu| > 1, which flips the residual-energy
  // accumulator negative and sends the coefficients to infinity.
  const ridge = r[0] * 1e-6;

  let error = r[0] + ridge;
  for (let m = 1; m <= order; m++) {
    let acc = r[m];
    for (let i = 1; i < m; i++) acc += a[i - 1] * r[m - i];
    if (!(Math.abs(error) > 1e-30)) return a;

    // Clamping to just inside the unit circle keeps the resulting filter
    // minimum-phase, so every pole lands inside the unit disk.
    let mu = -acc / error;
    if (!Number.isFinite(mu)) return a;
    mu = Math.max(-(1 - 1e-9), Math.min(1 - 1e-9, mu));

    // a_j = a_j(prev) + mu * a_{m-j}(prev). The mirrored terms must all come
    // from the previous order, so mirror off a copy rather than in place.
    const previous = a.slice();
    for (let j = 1; j < m; j++) {
      a[j - 1] = previous[j - 1] + mu * previous[m - j - 1];
    }
    a[m - 1] = mu;

    error *= 1 - mu * mu;
  }

  return a;
}

/**
 * Finds the formant frequencies implied by an LPC polynomial. The roots of
 * `z^p + a[0] z^(p-1) + ... + a[p-1]` are located with the Durand-Kerner
 * method, then each pole is converted to a frequency.
 */
export function lpcFormants(
  a: Float64Array,
  sampleRate: number,
  order: number,
  minFormant: number,
  maxFormant: number
): number[] {
  const coeffs = new Float64Array(order + 1);
  coeffs[0] = 1;
  for (let i = 0; i < order; i++) coeffs[i + 1] = a[i];

  const found: number[] = [];
  for (const z of durandKerner(coeffs)) {
    const magnitude = Math.hypot(z.re, z.im);
    if (magnitude < 1e-9 || magnitude >= 1) continue;

    // Reject poles too heavily damped to be a real resonance.
    const bandwidth = -(sampleRate / Math.PI) * Math.log(magnitude);
    if (bandwidth > 1000) continue;

    const frequency = (sampleRate / (2 * Math.PI)) * Math.atan2(z.im, z.re);
    if (frequency < minFormant || frequency > maxFormant) continue;

    found.push(frequency);
  }

  found.sort((x, y) => x - y);
  return found;
}

interface Complex {
  re: number;
  im: number;
}

function complexDiv(a: Complex, b: Complex): Complex {
  const den = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den };
}

/**
 * Durand-Kerner (Weierstrass) simultaneous root finder for a monic polynomial
 * given highest-degree-first coefficients. The degree is small (5), so the
 * naive update is cheap.
 */
function durandKerner(coeffs: Float64Array): Complex[] {
  const degree = coeffs.length - 1;
  if (degree < 1) return [];

  const roots: Complex[] = [];
  for (let i = 0; i < degree; i++) {
    const angle = (2 * Math.PI * i) / degree + 0.4;
    const radius = 0.4 + 0.02 * i;
    roots.push({ re: radius * Math.cos(angle), im: radius * Math.sin(angle) });
  }

  const evaluate = (z: Complex): Complex => {
    let re = 0;
    let im = 0;
    for (let i = 0; i <= degree; i++) {
      const nextRe = re * z.re - im * z.im + coeffs[i];
      im = re * z.im + im * z.re;
      re = nextRe;
    }
    return { re, im };
  };

  for (let iteration = 0; iteration < 500; iteration++) {
    let maxStep = 0;
    const next: Complex[] = [];

    for (let i = 0; i < degree; i++) {
      const z = roots[i];
      const value = evaluate(z);

      let denRe = 1;
      let denIm = 0;
      for (let j = 0; j < degree; j++) {
        if (j === i) continue;
        const dr = z.re - roots[j].re;
        const di = z.im - roots[j].im;
        const nextDenRe = denRe * dr - denIm * di;
        denIm = denRe * di + denIm * dr;
        denRe = nextDenRe;
      }

      const delta = complexDiv(value, { re: denRe, im: denIm });
      const step = Math.hypot(delta.re, delta.im);
      if (step > maxStep) maxStep = step;
      next.push({ re: z.re - delta.re, im: z.im - delta.im });
    }

    for (let i = 0; i < degree; i++) roots[i] = next[i];
    if (maxStep < 1e-13) break;
  }

  return roots;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  let acc = 0;
  for (const v of values) acc += v;
  return acc / values.length;
}
