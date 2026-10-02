/**
 * Grapheme-to-phoneme (G2P) conversion for Bisaya, Tagalog, and English.
 *
 * Philippine languages have very regular orthography, so a lookup + rule
 * approach works well without an external G2P model.
 */

/** Filipino / Bisaya phoneme set (simplified IPA). */
const PHILIPPINE_PHONEMES: Record<string, string> = {
  // vowels
  a: 'a',
  e: 'ɛ',
  i: 'i',
  o: 'o',
  u: 'u',
  // single consonants
  b: 'b',
  d: 'd',
  g: 'ɡ',
  h: 'h',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  p: 'p',
  r: 'ɾ',
  s: 's',
  t: 't',
  w: 'w',
  y: 'j',
  // digraphs
  ng: 'ŋ',
  ts: 'tʃ',
  dy: 'dʒ',
  ly: 'ʎ',
  sy: 'ʃ',
};

const PHILIPPINE_DIGRAPHS = new Set(['ng', 'ts', 'dy', 'ly', 'sy']);

/**
 * Language codes and aliases routed through the Philippine-language rules.
 * "bisaya"/"cebuano" are the human-friendly names the app sends; "ceb" is the
 * ISO 639-2 code.
 */
const PHILIPPINE_LANGUAGE_CODES = new Set([
  'ceb',
  'bisaya',
  'cebuano',
  'fil',
  'tl',
  'tagalog',
  'filipino',
  'hil',
  'hiligaynon',
  'war',
  'waray',
  'bcl',
  'bikol',
]);

/** Rule-based English fallback. */
const ENGLISH_PHONEMES: Record<string, string> = {
  a: 'æ',
  b: 'b',
  c: 'k',
  d: 'd',
  e: 'ɛ',
  f: 'f',
  g: 'ɡ',
  h: 'h',
  i: 'ɪ',
  j: 'dʒ',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'ɒ',
  p: 'p',
  q: 'k',
  r: 'ɹ',
  s: 's',
  t: 't',
  u: 'ʌ',
  v: 'v',
  w: 'w',
  x: 'ks',
  y: 'j',
  z: 'z',
};

const ENGLISH_DIGRAPHS: Record<string, string> = {
  th: 'θ',
  sh: 'ʃ',
  ch: 'tʃ',
  ph: 'f',
  wh: 'w',
  ck: 'k',
};

/**
 * Converts a word or short phrase to an ordered list of IPA phoneme symbols.
 *
 * @param text  the word or phrase to convert
 * @param language ISO 639 code: "ceb"/"bisaya", "fil"/"tl", or "en"
 */
export function textToPhonemes(text: string, language = 'ceb'): string[] {
  const normalised = text.toLowerCase().trim();
  const lang = language.toLowerCase();

  if (PHILIPPINE_LANGUAGE_CODES.has(lang)) return philippineG2p(normalised);
  if (lang === 'en') return englishG2p(normalised);

  // Unknown language: treat each alphabetic character as a phoneme.
  return [...normalised].filter((c) => /^\p{L}$/u.test(c));
}

function philippineG2p(text: string): string[] {
  const phonemes: string[] = [];
  let i = 0;

  while (i < text.length) {
    if (i + 1 < text.length) {
      const digraph = text.slice(i, i + 2);
      if (PHILIPPINE_DIGRAPHS.has(digraph)) {
        phonemes.push(PHILIPPINE_PHONEMES[digraph]);
        i += 2;
        continue;
      }
    }

    const ch = text[i];
    const mapped = PHILIPPINE_PHONEMES[ch];
    if (mapped) {
      phonemes.push(mapped);
    } else if (isLetter(ch)) {
      // Unknown letter — pass through as-is.
      phonemes.push(ch);
    }
    i += 1;
  }

  return phonemes;
}

function englishG2p(text: string): string[] {
  const phonemes: string[] = [];
  let i = 0;

  while (i < text.length) {
    if (i + 1 < text.length) {
      const two = text.slice(i, i + 2);
      const digraph = ENGLISH_DIGRAPHS[two];
      if (digraph) {
        phonemes.push(digraph);
        i += 2;
        continue;
      }
      if (two === 'gh') {
        i += 2; // silent
        continue;
      }
    }

    const ch = text[i];
    const mapped = ENGLISH_PHONEMES[ch];
    if (mapped) {
      phonemes.push(mapped);
    } else if (isLetter(ch)) {
      phonemes.push(ch);
    }
    i += 1;
  }

  return phonemes;
}

/** Returns the full phoneme inventory for a language. */
export function getPhonemeInventory(language = 'ceb'): string[] {
  const lang = language.toLowerCase();
  const source = PHILIPPINE_LANGUAGE_CODES.has(lang)
    ? PHILIPPINE_PHONEMES
    : lang === 'en'
      ? ENGLISH_PHONEMES
      : null;
  if (!source) return [];
  return [...new Set(Object.values(source))].sort();
}

function isLetter(ch: string): boolean {
  return /^\p{L}$/u.test(ch);
}
