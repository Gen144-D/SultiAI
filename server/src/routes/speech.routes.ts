import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../middleware/auth';
import { isConfigured, groqChat, groqTranscribeAudio, groqJson } from '../utils/groq';
import { isPythonServiceAvailable, scoreWithPython } from '../utils/pythonService';
import ttsService, { CHARACTER_VOICES } from '../services/ttsService';

const router = Router();

function sanitizeSsml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .slice(0, 500);
}

router.post('/synthesize', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text, voice, rate, pitch } = req.body || {};
    const clean = sanitizeSsml(text);
    if (!clean) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const result = await ttsService.synthesize(clean, voice, rate, pitch);
    res.json(result);
  } catch (err) {
    console.error('TTS synthesis error:', err);
    res.status(500).json({ error: 'Speech synthesis failed' });
  }
});

router.post('/translate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text, from, to } = req.body || {};
    if (!text || !from || !to) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!isConfigured()) {
      res
        .status(500)
        .json({ error: 'AI service not configured: set GROQ_API_KEY or enable local LLM model' });
      return;
    }
    const translatedText = await groqChat(
      [
        {
          role: 'system',
          content: `You are a professional translator. Translate the given text from ${from} to ${to}. Only return the translation, no additional text.`,
        },
        { role: 'user', content: text },
      ],
      { temperature: 0.3, maxTokens: 500 }
    );
    res.json({ translated_text: translatedText });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

router.post('/transcribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { audio, language } = req.body || {};
    if (!audio) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }
    if (!isConfigured()) {
      res
        .status(500)
        .json({ error: 'AI service not configured: set GROQ_API_KEY or enable local LLM model' });
      return;
    }
    const filename = language === 'tl' ? 'recording.mp3' : 'recording.m4a';
    const mimeType = language === 'tl' ? 'audio/mpeg' : 'audio/mp4';
    const text = await groqTranscribeAudio(audio, filename, mimeType);
    res.json({ text });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

router.post('/nlp/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }
    if (!isConfigured()) {
      res
        .status(500)
        .json({ error: 'AI service not configured: set GROQ_API_KEY or enable local LLM model' });
      return;
    }
    const systemPrompt = `You are a natural language processing engine.' Analyze the given text and return ONLY a valid JSON object (no other text) with exactly these fields:\n- "intent": the user's intent (e.g., "greeting", "question", "translation_request", "practice_request", "general_query")\n- "emotion": detected emotion ("neutral", "happy", "frustrated", "curious", "confused")\n- "context": brief context description (e.g., "language learning", "greeting practice", "translation help")\n- "language_detected": what language the text is in\n- "is_bisaya_related": boolean - whether the text relates to Bisaya/Cebuano language\n- "confidence": number between 0.0 and 1.0`;
    try {
      const result = await groqJson(
        systemPrompt,
        `Analyze this text: "${text.substring(0, 1000)}"`,
        { temperature: 0.1, maxTokens: 300 }
      );
      res.json(result);
    } catch {
      const content = await groqChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this text: "${text.substring(0, 1000)}"` },
        ],
        { temperature: 0.1, maxTokens: 300 }
      );
      try {
        res.json(JSON.parse(content));
      } catch {
        res.json({
          intent: 'general_query',
          emotion: 'neutral',
          context: 'language learning',
          language_detected: 'unknown',
          is_bisaya_related: false,
          confidence: 0,
        });
      }
    }
  } catch (err) {
    res.status(500).json({ error: 'NLP analysis failed' });
  }
});

router.post('/detect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }
    if (!isConfigured()) {
      res
        .status(500)
        .json({ error: 'AI service not configured: set GROQ_API_KEY or enable local LLM model' });
      return;
    }
    const systemPrompt = `You are a language detection expert. Analyze the given text and determine what language it is written in.\nReturn ONLY a valid JSON object (no other text) with exactly these fields:\n- "language": full name (e.g., "Bisaya (Cebuano)", "English", "Filipino (Tagalog)")\n- "code": short code ("ceb", "en", "tl", "other")\n- "isBisaya": boolean - true if the text is primarily Bisaya/Cebuano\n- "confidence": number between 0.0 and 1.0`;
    try {
      const result = await groqJson(
        systemPrompt,
        `Analyze this text: "${text.substring(0, 500)}"`,
        { temperature: 0.1, maxTokens: 200 }
      );
      res.json(result);
    } catch {
      const content = await groqChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this text: "${text.substring(0, 500)}"` },
        ],
        { temperature: 0.1, maxTokens: 200 }
      );
      try {
        res.json(JSON.parse(content));
      } catch {
        res.json({ language: 'unknown', code: 'unknown', isBisaya: false, confidence: 0 });
      }
    }
  } catch (err) {
    res.status(500).json({ error: 'Language detection failed' });
  }
});

router.post('/pronunciation/check', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text, audio, expected_text, language } = req.body || {};
    const expectedText = expected_text || text;

    if (!expectedText) {
      res.status(400).json({ error: 'Text or expected_text is required' });
      return;
    }

    // ── Path 1: Python acoustic analysis (if audio + service available) ──
    if (audio) {
      const pythonAvailable = await isPythonServiceAvailable();
      if (pythonAvailable) {
        try {
          const result = await scoreWithPython(
            audio,
            expectedText,
            language || 'ceb',
            language === 'tl' ? 'recording.mp3' : 'recording.m4a'
          );
          if (result) {
            res.json(result);
            return;
          }
        } catch (pyErr) {
          console.warn(
            '[Pronunciation] Python service failed, falling back to LLM:',
            (pyErr as Error).message
          );
        }
      }
    }

    // ── Path 2: LLM-based fallback (text-only) ──
    if (!isConfigured()) {
      res.json({
        score: 85,
        feedback: 'Good pronunciation! Keep practicing the vowel sounds.',
        note: 'AI service not configured - using default assessment',
      });
      return;
    }

    const systemPrompt =
      'You are a Bisaya (Cebuano) pronunciation coach. Analyze the given text.\nReturn ONLY a valid JSON object with exactly these fields:\n- "score": number 0-100\n- "feedback": string with specific sound corrections\n- "phoneme_breakdown": array of {"expected": string, "heard": string, "correct": boolean, "tip": string}\n\nBisaya pronunciation rules:\n- "a" is "ah" like in "father"\n- "e" is "eh" like in "bed"\n- "i" is "ee" like in "see"\n- "o" is "oh" like in "slow"\n- "u" is "oo" like in "food"\n- "ng" is a single sound like in "singing"';

    try {
      const result = await groqJson(systemPrompt, `Pronunciation text: "${expectedText}"`, {
        temperature: 0.5,
        maxTokens: 300,
      });
      res.json(result);
    } catch {
      const content = await groqChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Pronunciation text: "${expectedText}"` },
        ],
        { temperature: 0.5, maxTokens: 300 }
      );
      try {
        res.json(JSON.parse(content));
      } catch {
        res.json({ score: 88, feedback: content });
      }
    }
  } catch (err) {
    res.status(500).json({ error: 'Pronunciation check failed' });
  }
});

router.post('/recommend', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { situation, language } = req.body || {};
    if (!situation || !language) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!isConfigured()) {
      res
        .status(500)
        .json({ error: 'AI service not configured: set GROQ_API_KEY or enable local LLM model' });
      return;
    }
    const content = await groqChat(
      [
        {
          role: 'system',
          content: `You are a language learning assistant. Provide 5 useful phrases for the given situation in ${language}. Return ONLY a JSON array of phrases, no other text.`,
        },
        { role: 'user', content: `Situation: ${situation}` },
      ],
      { temperature: 0.8, maxTokens: 500 }
    );
    try {
      const phrases = JSON.parse(content);
      res.json({ phrases });
    } catch {
      res.json({ phrases: [content] });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;

router.get('/voices', authMiddleware, async (_req: Request, res: Response) => {
  const voices = Object.entries(CHARACTER_VOICES).map(([key, v]) => ({
    id: key,
    name: v.name,
    description: v.description,
    locale: v.locale,
    voiceName: v.voiceName,
    rate: v.rate,
    pitch: v.pitch,
  }));
  res.json({ voices });
});
