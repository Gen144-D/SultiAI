import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/apiKey';
import { errors } from '../utils/apiResponse';
import { textToPhonemes, getPhonemeInventory } from '../services/speech/phonemes';
import { scorePronunciationAudio } from '../services/ai/pronunciationService';
import {
  getPreservedWords,
  getLexiconCount,
  getDialectalVariations,
} from '../db/repositories/preservation.repo';
import { API_KEY_SCOPES, type ApiKeyScope } from '../db/repositories/apiKey.repo';
import { env } from '../config';

const router = Router();

/** Keeps the public contract stable if the internal list grows. */
const MAX_LIMIT = 100;

function clampLimit(raw: unknown, fallback: number): number {
  const parsed = parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Self-describing root. Lets an integrator confirm a key works and discover
 * which scopes it holds without reading any docs.
 */
router.get('/v1', apiKeyAuth(), (req: Request, res: Response) => {
  res.json({
    name: 'SultiAI Public API',
    version: 'v1',
    key: {
      name: req.apiKey?.name,
      scopes: (req.apiKey?.scopes ?? '').split(',').filter(Boolean),
    },
    availableScopes: API_KEY_SCOPES,
    endpoints: [
      { path: 'GET /v1', scopes: [], description: 'This document' },
      {
        path: 'GET /v1/lexicon',
        scopes: ['lexicon:read'],
        description: 'Search the Living Lexicon',
      },
      {
        path: 'GET /v1/lexicon/count',
        scopes: ['lexicon:read'],
        description: 'Approved word count',
      },
      {
        path: 'GET /v1/lexicon/variations',
        scopes: ['lexicon:read'],
        description: 'Dialectal forms of one word',
      },
      { path: 'POST /v1/g2p', scopes: ['g2p:read'], description: 'Grapheme to phoneme conversion' },
      {
        path: 'GET /v1/phonemes',
        scopes: ['g2p:read'],
        description: 'Supported phoneme inventory',
      },
      {
        path: 'POST /v1/pronunciation/score',
        scopes: ['pronunciation:write'],
        description: 'Score a recording against a target phrase',
      },
    ],
  });
});

router.get(
  '/v1/lexicon',
  apiKeyAuth('lexicon:read' as ApiKeyScope),
  async (req: Request, res: Response) => {
    try {
      const status = str(req.query.status) || 'approved';
      const limit = clampLimit(req.query.limit, 50);
      const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);

      const words = await getPreservedWords(status, limit, offset);
      const totalApproved = await getLexiconCount();

      res.json({ words, count: words.length, totalApproved, limit, offset });
    } catch (err) {
      errors.internal(res, (err as Error).message);
    }
  }
);

router.get(
  '/v1/lexicon/count',
  apiKeyAuth('lexicon:read' as ApiKeyScope),
  async (_req: Request, res: Response) => {
    try {
      res.json({ count: await getLexiconCount() });
    } catch (err) {
      errors.internal(res, (err as Error).message);
    }
  }
);

router.get(
  '/v1/lexicon/variations',
  apiKeyAuth('lexicon:read' as ApiKeyScope),
  async (req: Request, res: Response) => {
    const word = str(req.query.word).trim();
    if (!word) {
      errors.validation(res, 'Query parameter "word" is required');
      return;
    }
    try {
      res.json({ word, variations: await getDialectalVariations(word) });
    } catch (err) {
      errors.internal(res, (err as Error).message);
    }
  }
);

router.post('/v1/g2p', apiKeyAuth('g2p:read' as ApiKeyScope), (req: Request, res: Response) => {
  const { text, language } = (req.body || {}) as { text?: string; language?: string };
  if (typeof text !== 'string' || text.trim().length === 0) {
    errors.validation(res, 'Field "text" is required');
    return;
  }
  try {
    const lang = language || 'bisaya';
    res.json({
      text,
      language: lang,
      phonemes: textToPhonemes(text, lang),
      inventory: getPhonemeInventory(lang),
    });
  } catch (err) {
    errors.internal(res, (err as Error).message);
  }
});

router.get('/v1/phonemes', apiKeyAuth('g2p:read' as ApiKeyScope), (req: Request, res: Response) => {
  const lang = str(req.query.language) || 'bisaya';
  res.json({ language: lang, phonemes: getPhonemeInventory(lang) });
});

/**
 * Score a recording. Accepts raw base64 audio in the body so it works from
 * curl and MCP clients without multipart handling.
 */
router.post(
  '/v1/pronunciation/score',
  apiKeyAuth('pronunciation:write' as ApiKeyScope),
  async (req: Request, res: Response) => {
    const {
      audio,
      expected_text: expectedText,
      language,
      filename,
    } = (req.body || {}) as Record<string, string | undefined>;

    if (!expectedText || !expectedText.trim()) {
      errors.validation(res, 'Field "expected_text" is required');
      return;
    }
    if (!audio) {
      errors.validation(res, 'Field "audio" is required: base64-encoded WAV, M4A, MP3 or OGG');
      return;
    }

    const name = filename || (audio.startsWith('UklGR') ? 'recording.wav' : 'recording.m4a');
    const mime = name.endsWith('.wav')
      ? 'audio/wav'
      : name.endsWith('.ogg')
        ? 'audio/ogg'
        : name.endsWith('.mp3')
          ? 'audio/mpeg'
          : 'audio/mp4';

    try {
      const scored = await scorePronunciationAudio({
        audioBase64: audio,
        filename: name,
        mimeType: mime,
        expectedText,
        language: language || 'bisaya',
      });

      if (!scored) {
        errors.internal(res, 'Could not analyse that recording');
        return;
      }

      res.json({
        expectedText,
        language: language || 'bisaya',
        score: scored.score,
        feedback: scored.feedback,
        phonemeBreakdown: scored.phonemeBreakdown,
      });
    } catch (err) {
      errors.internal(res, (err as Error).message);
    }
  }
);

router.get('/v1/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', apiKeysEnabled: env.API_KEYS_ENABLED === 'true' });
});

export default router;
