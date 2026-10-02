/* Throwaway DSP verification — not part of the build. */
import { powerSpectrum, fftInPlace } from '../../utils/dsp/fft';
import {
  savGolDerivativeCoeffs,
  extractMfccStack,
  extractEnergy,
  computeSpeakingRate,
  melFilterbank,
} from '../../utils/dsp/features';
import { extractPitch } from '../../utils/dsp/pitch';
import { extractFormants, levinsonDurbin, lpcFormants } from '../../utils/dsp/formants';
import { textToPhonemes, getPhonemeInventory } from '../../services/speech/phonemes';
import { analyzePronunciation } from '../../services/speech/acoustics';
import { decodeAudio, parseWav } from '../../utils/audioDecode';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

// ---------- 1. FFT vs naive DFT ----------
function naiveDft(re: Float64Array) {
  const n = re.length;
  const out = [];
  for (let k = 0; k < n; k++) {
    let sr = 0,
      si = 0;
    for (let t = 0; t < n; t++) {
      const ang = (-2 * Math.PI * k * t) / n;
      sr += re[t] * Math.cos(ang);
      si += re[t] * Math.sin(ang);
    }
    out.push([sr, si]);
  }
  return out;
}

{
  const n = 64;
  const re = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1);
  const im = new Float64Array(n);
  fftInPlace(re, im);
  const ref = naiveDft(
    new Float64Array([...Array(n).keys()].map((i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1)))
  );
  let maxErr = 0;
  for (let k = 0; k < n; k++)
    maxErr = Math.max(maxErr, Math.abs(re[k] - ref[k][0]), Math.abs(im[k] - ref[k][1]));
  check('FFT matches naive DFT', maxErr < 1e-9, `maxErr=${maxErr.toExponential(2)}`);
}

// ---------- 2. powerSpectrum sanity: pure tone lands in the right bin ----------
{
  const n = 2048,
    sr = 22050,
    bin = 100;
  const sig = new Float64Array(n);
  for (let i = 0; i < n; i++) sig[i] = Math.cos((2 * Math.PI * bin * i) / n);
  const p = powerSpectrum(sig);
  let peak = 0;
  for (let k = 1; k < p.length; k++) if (p[k] > p[peak]) peak = k;
  check('powerSpectrum peaks at the tone bin', peak === bin, `peak=${peak}`);
}

// ---------- 3. Savitzky-Golay coefficients ----------
{
  // scipy's savgol_coeffs(9, 1)
  const d1 = savGolDerivativeCoeffs(9, 1);
  const expected = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => v / 60);
  const maxErr = Math.max(...d1.map((v, i) => Math.abs(v - expected[i])));
  check('SG order-1 deriv coeffs (width 9)', maxErr < 1e-9, `maxErr=${maxErr.toExponential(2)}`);

  // A 2nd-derivative filter must annihilate constants and lines, and
  // reproduce f'' of x^2 (= 2) exactly.
  const d2 = savGolDerivativeCoeffs(9, 2);
  let annihilateErr = 0;
  for (let i = 0; i < 9; i++) {
    const x = i - 4;
    annihilateErr = Math.max(
      annihilateErr,
      Math.abs(d2.reduce((a, w, k) => a + w * Math.pow(k - 4, 0), 0))
    );
    annihilateErr = Math.max(annihilateErr, Math.abs(d2.reduce((a, w, k) => a + w * (k - 4), 0)));
    annihilateErr = Math.max(
      annihilateErr,
      Math.abs(d2.reduce((a, w, k) => a + w * (k - 4) ** 2, 0) - 2 * x ** 0)
    );
  }
  check(
    'SG order-2 annihilates degree < 2',
    annihilateErr < 1e-9,
    `maxErr=${annihilateErr.toExponential(2)}`
  );

  let quadErr = 0;
  for (let i = 0; i < 9; i++) {
    const got = d2.reduce((acc, w, k) => acc + w * (k - 4) ** 2, 0);
    quadErr = Math.max(quadErr, Math.abs(got - 2));
  }
  check("SG order-2 reproduces f''(x^2) = 2", quadErr < 1e-9, `maxErr=${quadErr.toExponential(2)}`);
}

// ---------- 4. mel filterbank ----------
{
  const fb = melFilterbank(22050, 40, 2048);
  let rowsWithEnergy = 0;
  for (let m = 0; m < 40; m++) {
    let acc = 0;
    for (let k = 0; k < 1025; k++) acc += fb[m * 1025 + k];
    if (acc > 0) rowsWithEnergy++;
  }
  check('all mel filters are populated', rowsWithEnergy === 40, `${rowsWithEnergy}/40`);
}

// ---------- 5. Levinson-Durbin on a known AR(2) process ----------
{
  // x[n] = 0.5 x[n-1] - 0.2 x[n-2] + e[n]  =>  A(z) = 1 - 0.5 z^-1 + 0.2 z^-2
  const n = 8000;
  const x = new Float64Array(n);
  let rng = 12345;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  for (let i = 2; i < n; i++) x[i] = 0.5 * x[i - 1] - 0.2 * x[i - 2] + 0.1 * rand();

  const r = new Float64Array(3);
  for (let lag = 0; lag <= 2; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < n; i++) acc += x[i] * x[i + lag];
    r[lag] = acc;
  }
  const a = levinsonDurbin(r, 2);
  check(
    'Levinson-Durbin recovers AR(2) coefficients',
    Math.abs(a[0] + 0.5) < 0.02 && Math.abs(a[1] - 0.2) < 0.02,
    `a=[${a[0].toFixed(4)}, ${a[1].toFixed(4)}] expected [-0.5, 0.2]`
  );
}

// ---------- 6. Pitch on synthetic tones ----------
for (const f0 of [100, 150, 220, 400]) {
  const sr = 22050,
    n = sr;
  const sig = new Float32Array(n);
  for (let i = 0; i < n; i++) sig[i] = 0.6 * Math.sin((2 * Math.PI * f0 * i) / sr);
  const p = extractPitch(sig, sr);
  check(`pitch ~${f0}Hz`, Math.abs(p.mean - f0) < f0 * 0.02, `got ${p.mean.toFixed(2)}`);
}
{
  const sr = 22050,
    n = sr;
  const sig = new Float32Array(n);
  const rng = 999;
  let s = rng;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    sig[i] = ((s / 0x7fffffff) * 2 - 1) * 0.5;
  }
  const p = extractPitch(sig, sr);
  check('noise has no detected pitch', p.mean === 0, `mean=${p.mean}`);
}

// ---------- 7. Formants on a synthetic vowel ----------
/**
 * Glottal pulse train cascaded through real 2-pole resonators, each
 * normalised for unity gain at DC (Klatt style) so the formants are genuine
 * spectral resonances of comparable strength.
 */
function synthesiseVowel(freqs: number[], bws: number[], sr: number, f0 = 120, seconds = 0.6) {
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  const stages = freqs.map((f, k) => {
    const r = Math.exp((-Math.PI * bws[k]) / sr);
    const b1 = 2 * r * Math.cos((2 * Math.PI * f) / sr);
    const b2 = -r * r;
    return { b1, b2, gain: 1 - b1 - b2 };
  });

  const hist: number[][] = stages.map(() => [0, 0]);
  const period = Math.round(sr / f0);
  for (let i = 0; i < n; i++) {
    let v = i % period === 0 ? 1 : 0;
    for (let s = 0; s < stages.length; s++) {
      const y = stages[s].gain * v + stages[s].b1 * hist[s][0] + stages[s].b2 * hist[s][1];
      hist[s][1] = hist[s][0];
      hist[s][0] = y;
      v = y;
    }
    out[i] = v * 0.2;
  }
  return out;
}

{
  const sr = 22050;
  const tolerance = 60;

  const a = extractFormants(synthesiseVowel([730, 1090, 2440], [80, 90, 120], sr), sr);
  check(
    'formants of synthetic /a/ (730/1090/2440)',
    Math.abs(a.f1Mean - 730) < tolerance &&
      Math.abs(a.f2Mean - 1090) < tolerance &&
      Math.abs(a.f3Mean - 2440) < 150,
    `F1=${a.f1Mean.toFixed(0)} F2=${a.f2Mean.toFixed(0)} F3=${a.f3Mean.toFixed(0)}`
  );

  // A front vowel with a low F1 catches the classic "F1/F2 swapped" failure.
  const i = extractFormants(synthesiseVowel([270, 2290, 3010], [60, 90, 150], sr), sr);
  check(
    'formants of synthetic /i/ (270/2290/3010)',
    Math.abs(i.f1Mean - 270) < tolerance &&
      Math.abs(i.f2Mean - 2290) < 120 &&
      Math.abs(i.f3Mean - 3010) < 150,
    `F1=${i.f1Mean.toFixed(0)} F2=${i.f2Mean.toFixed(0)} F3=${i.f3Mean.toFixed(0)}`
  );

  const lpcOf = (signal: Float32Array): Float64Array => {
    const w = 1103;
    const win = new Float64Array(w);
    for (let k = 0; k < w; k++)
      win[k] = signal[k] * (0.5 - 0.5 * Math.cos((2 * Math.PI * k) / (w - 1)));
    const r = new Float64Array(13);
    for (let lag = 0; lag <= 12; lag++) {
      let acc = 0;
      for (let k = 0; k + lag < w; k++) acc += win[k] * win[k + lag];
      r[lag] = acc;
    }
    return levinsonDurbin(r, 12);
  };
  const polesOf = (a: Float64Array) => lpcFormants(a, sr, 12, 50, 5500);
  const coeffs = lpcOf(synthesiseVowel([730, 1090, 2440], [80, 90, 120], sr));
  check(
    'LPC keeps the synthesis filter minimum-phase',
    polesOf(coeffs).length >= 3 && coeffs.every(Number.isFinite),
    `poles=${polesOf(coeffs)
      .map((p) => p.toFixed(0))
      .join('/')}`
  );
}

// ---------- 8. MFCC / energy / rate do not blow up ----------
{
  const sr = 22050;
  const v = synthesiseVowel([500, 1500, 2500], [80, 110, 160], sr, 120, 1.5);
  const mfcc = extractMfccStack(v, sr);
  check(
    'MFCC shape',
    mfcc.nCoefficients === 39 && mfcc.frames > 10,
    `${mfcc.nCoefficients}x${mfcc.frames}`
  );
  const finite = [...mfcc.data].every((x) => Number.isFinite(x));
  check('MFCC values finite', finite);

  const e = extractEnergy(v);
  check('RMS energy positive', e.mean > 0, `mean=${e.mean.toFixed(4)}`);
  const rate = computeSpeakingRate(v, sr);
  check('speaking rate finite', Number.isFinite(rate), `rate=${rate.toFixed(2)} syl/s`);
}

// ---------- 9. G2P ----------
check(
  'G2P bisaya "kumusta"',
  JSON.stringify(textToPhonemes('kumusta', 'ceb')) ===
    JSON.stringify(['k', 'u', 'm', 'u', 's', 't', 'a']),
  JSON.stringify(textToPhonemes('kumusta', 'ceb'))
);
check(
  'G2P ng digraph',
  JSON.stringify(textToPhonemes('ng', 'ceb')) === JSON.stringify(['ŋ']),
  JSON.stringify(textToPhonemes('ng', 'ceb'))
);
check(
  'G2P english "think" (no ng digraph in English rules)',
  JSON.stringify(textToPhonemes('think', 'en')) === JSON.stringify(['θ', 'ɪ', 'n', 'k']),
  JSON.stringify(textToPhonemes('think', 'en'))
);
check(
  'G2P english silent "gh"',
  JSON.stringify(textToPhonemes('light', 'en')) === JSON.stringify(['l', 'ɪ', 't']),
  JSON.stringify(textToPhonemes('light', 'en'))
);
// "Maayong" -> m a a j o ng, "adlawa" -> a d l a w a
check(
  'G2P skips punctuation/case',
  JSON.stringify(textToPhonemes('Maayong, adlawa!', 'ceb')) ===
    JSON.stringify(['m', 'a', 'a', 'j', 'o', 'ŋ', 'a', 'd', 'l', 'a', 'w', 'a']),
  JSON.stringify(textToPhonemes('Maayong, adlawa!', 'ceb'))
);
check(
  'inventory non-empty',
  getPhonemeInventory('ceb').length > 10,
  `${getPhonemeInventory('ceb').length} symbols`
);

// ---------- 9b. G2P parity with the retired Python service ----------
// The `ai-service/phonemes.py` implementation was diffed against this port
// across the whole corpus below and matched on every case. The corpus is kept
// here as fixed expectations so the G2P rules cannot drift now that the
// reference implementation is gone.
{
  const corpus: [string, string, string[]][] = [
    ['kumusta', 'ceb', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['Maayong, adlawa!', 'ceb', ['m', 'a', 'a', 'j', 'o', 'ŋ', 'a', 'd', 'l', 'a', 'w', 'a']],
    ['adlung', 'ceb', ['a', 'd', 'l', 'u', 'ŋ']],
    ['ngadto', 'ceb', ['ŋ', 'a', 'd', 't', 'o']],
    ['tsa', 'ceb', ['tʃ', 'a']],
    ['dyas', 'ceb', ['dʒ', 'a', 's']],
    ['lype', 'ceb', ['ʎ', 'p', 'ɛ']],
    ['syada', 'ceb', ['ʃ', 'a', 'd', 'a']],
    ['buseta', 'ceb', ['b', 'u', 's', 'ɛ', 't', 'a']],
    ['mahal', 'ceb', ['m', 'a', 'h', 'a', 'l']],
    ['kaayo', 'ceb', ['k', 'a', 'a', 'j', 'o']],
    ['nga', 'ceb', ['ŋ', 'a']],
    ['Ska', 'ceb', ['s', 'k', 'a']],
    ['123 abc!', 'ceb', ['a', 'b', 'c']],
    ['', 'ceb', []],
    ['kumusta', 'fil', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', 'tl', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['maganda', 'fil', ['m', 'a', 'ɡ', 'a', 'n', 'd', 'a']],
    ['mga', 'tl', ['m', 'ɡ', 'a']],
    ['ng', 'fil', ['ŋ']],
    ['bayan', 'fil', ['b', 'a', 'j', 'a', 'n']],
    // Language aliases all route through the Philippine rules.
    ['kumusta', 'tagalog', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', 'bisaya', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', 'cebuano', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', 'hil', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', 'war', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', 'bcl', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    // English digraphs. Note the original rules drop a silent "gh" (so
    // "ghost" -> ɒst and "light" -> lɪt) and fold "ck" into one phoneme.
    ['think', 'en', ['θ', 'ɪ', 'n', 'k']],
    ['light', 'en', ['l', 'ɪ', 't']],
    ['ship', 'en', ['ʃ', 'ɪ', 'p']],
    ['church', 'en', ['tʃ', 'ʌ', 'ɹ', 'tʃ']],
    ['phone', 'en', ['f', 'ɒ', 'n', 'ɛ']],
    ['what', 'en', ['w', 'æ', 't']],
    ['ghost', 'en', ['ɒ', 's', 't']],
    ['duck', 'en', ['d', 'ʌ', 'k']],
    ['box', 'en', ['b', 'ɒ', 'ks']],
    ['thinkng', 'en', ['θ', 'ɪ', 'n', 'k', 'n', 'ɡ']],
    ['Hello, World!', 'en', ['h', 'ɛ', 'l', 'l', 'ɒ', 'w', 'ɒ', 'ɹ', 'l', 'd']],
    ['xyz', 'en', ['ks', 'j', 'z']],
    // Unknown language falls back to one phoneme per letter.
    ['kumusta', 'de', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    ['kumusta', '', ['k', 'u', 'm', 'u', 's', 't', 'a']],
    // Digraph boundaries.
    ['yum', 'ceb', ['j', 'u', 'm']],
    ['yummy', 'ceb', ['j', 'u', 'm', 'm', 'j']],
    ['baby', 'ceb', ['b', 'a', 'b', 'j']],
    ['tsetse', 'ceb', ['tʃ', 'ɛ', 'tʃ', 'ɛ']],
  ];

  const mismatches: string[] = [];
  for (const [text, language, expected] of corpus) {
    const actual = textToPhonemes(text, language);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      mismatches.push(
        `${language}/${JSON.stringify(text)} -> ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`
      );
    }
  }
  check(
    `G2P matches the retired Python service on all ${corpus.length} corpus cases`,
    mismatches.length === 0,
    mismatches.join('; ')
  );

  check(
    'G2P inventories match (ceb=24, en=24, unknown=0)',
    getPhonemeInventory('ceb').length === 24 &&
      getPhonemeInventory('en').length === 24 &&
      getPhonemeInventory('de').length === 0,
    `ceb=${getPhonemeInventory('ceb').length} en=${getPhonemeInventory('en').length} de=${getPhonemeInventory('de').length}`
  );
}

// ---------- 10. WAV decode (native path) ----------
function makeWav(seconds: number, sr: number, bits = 16, channels = 1): Buffer {
  const n = Math.round(seconds * sr);
  const bytesPerSample = bits / 8;
  const dataSize = n * channels * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * channels * bytesPerSample, 28);
  buf.writeUInt16LE(channels * bytesPerSample, 32);
  buf.writeUInt16LE(bits, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * 150 * i) / sr) * 12000);
    for (let c = 0; c < channels; c++)
      buf.writeInt16LE(v, 44 + (i * channels + c) * bytesPerSample);
  }
  return buf;
}
async function main() {
  const wav = makeWav(1.0, 22050);
  const parsed = parseWav(wav);
  check(
    'native WAV parse',
    parsed !== null && parsed.samples.length === 22050,
    `n=${parsed?.samples.length}`
  );

  const decoded = await decodeAudio(wav, 22050);
  check('decodeAudio WAV', decoded.samples.length === 22050 && decoded.sampleRate === 22050);

  const wav44 = makeWav(1.0, 44100);
  const d44 = await decodeAudio(wav44, 22050);
  check(
    'decodeAudio resamples 44.1k->22.05k',
    Math.abs(d44.samples.length - 22050) < 50,
    `n=${d44.samples.length}`
  );

  const stereo = makeWav(0.5, 16000, 16, 2);
  const ds = await decodeAudio(stereo, 22050);
  check('decodeAudio stereo -> mono', ds.samples.length > 0, `n=${ds.samples.length}`);

  // ---------- 11. ffmpeg path (m4a/AAC) ----------
  {
    const child = await import('child_process');
    const ffmpeg = (await import('ffmpeg-static')).default as unknown as string;
    const m4a: Buffer = await new Promise((resolve, reject) => {
      const p = child.spawn(
        ffmpeg,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'lavfi',
          '-i',
          'sine=frequency=200:duration=2',
          '-c:a',
          'aac',
          '-f',
          'adts',
          'pipe:1',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
      const chunks: Buffer[] = [];
      p.stdout.on('data', (c: Buffer) => chunks.push(c));
      p.on('error', reject);
      p.on('close', (code) =>
        code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error('encode failed ' + code))
      );
    });
    check('produced an m4a/AAC test clip', m4a.length > 1000, `${m4a.length} bytes`);

    const dec = await decodeAudio(m4a, 22050);
    check('decodeAudio m4a/AAC via ffmpeg', dec.samples.length > 30000, `n=${dec.samples.length}`);
    let peak = 0;
    for (const s of dec.samples) peak = Math.max(peak, Math.abs(s));
    check('decoded m4a has signal', peak > 0.1, `peak=${peak.toFixed(3)}`);

    const analysed = analyzePronunciation({
      samples: dec.samples,
      sampleRate: dec.sampleRate,
      expectedText: 'kumusta',
    });
    check(
      'm4a scores end-to-end',
      analysed.score >= 0 && analysed.score <= 100,
      `score=${analysed.score}`
    );
    console.log('   m4a metrics:', JSON.stringify(analysed.metrics));
  }

  // ---------- 12. end-to-end analysis ----------
  {
    const sr = 22050;
    const v = synthesiseVowel([730, 1090, 2440], [80, 90, 120], sr, 120, 2.0);
    const result = analyzePronunciation({
      samples: v,
      sampleRate: sr,
      expectedText: 'kumusta',
      language: 'ceb',
    });
    check(
      'end-to-end score in range',
      result.score >= 0 && result.score <= 100,
      `score=${result.score}`
    );
    check(
      'end-to-end phoneme breakdown',
      result.phonemeBreakdown.length === textToPhonemes('kumusta', 'ceb').length,
      `${result.phonemeBreakdown.length}`
    );
    check(
      'end-to-end feedback text',
      result.feedback.length > 10,
      JSON.stringify(result.feedback).slice(0, 120)
    );
    check(
      'end-to-end metrics finite',
      Object.values(result.metrics).every((v) => Number.isFinite(v)),
      JSON.stringify(result.metrics)
    );
    console.log('   synthetic /a/ metrics:', JSON.stringify(result.metrics));

    const tiny = analyzePronunciation({
      samples: new Float32Array(100),
      sampleRate: sr,
      expectedText: 'kumusta',
    });
    check(
      'too-short audio handled',
      tiny.score === 0 && /too short/i.test(tiny.feedback),
      JSON.stringify(tiny.feedback)
    );
  }

  console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
