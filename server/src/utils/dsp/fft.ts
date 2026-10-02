/**
 * Minimal in-place radix-2 Cooley-Tukey FFT.
 *
 * Only power-of-two sizes are supported, which is all the feature extractors
 * need (n_fft = 2048). Kept dependency-free so the acoustic pipeline stays
 * inside the Node process.
 */

export interface Spectrum {
  /** Number of frequency bins (n / 2 + 1). */
  bins: number;
  /** Real part of each bin. */
  re: Float64Array;
  /** Imaginary part of each bin. */
  im: Float64Array;
}

const twiddleCache = new Map<number, { cos: Float64Array; sin: Float64Array }>();

function twiddles(n: number): { cos: Float64Array; sin: Float64Array } {
  const cached = twiddleCache.get(n);
  if (cached) return cached;

  const half = n / 2;
  const cos = new Float64Array(half);
  const sin = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    const angle = (-2 * Math.PI * i) / n;
    cos[i] = Math.cos(angle);
    sin[i] = Math.sin(angle);
  }

  const entry = { cos, sin };
  twiddleCache.set(n, entry);
  return entry;
}

function assertPowerOfTwo(n: number): void {
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two, got ${n}`);
  }
}

/**
 * Transforms `input` (length n) in place into its complex DFT.
 *
 * `re` and `im` must be distinct Float64Arrays of length n.
 */
export function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  assertPowerOfTwo(n);

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i];
      re[i] = re[j];
      re[j] = tmp;
      tmp = im[i];
      im[i] = im[j];
      im[j] = tmp;
    }
  }

  const { cos, sin } = twiddles(n);

  for (let len = 2; len <= n; len <<= 1) {
    const step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const w = k * step;
        const wr = cos[w];
        const wi = sin[w];
        const a = i + k;
        const b = a + len / 2;

        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/**
 * Real-input power spectrum, shaped like `numpy.fft.rfft(signal) ** 2`.
 *
 * `power[k]` is the squared magnitude of bin k, for k in [0, n / 2].
 */
export function powerSpectrum(frame: Float64Array | Float32Array): Float64Array {
  const n = frame.length;
  assertPowerOfTwo(n);

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = frame[i];

  fftInPlace(re, im);

  const bins = n / 2 + 1;
  const power = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    power[k] = re[k] * re[k] + im[k] * im[k];
  }
  return power;
}
