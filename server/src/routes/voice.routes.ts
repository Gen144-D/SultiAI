import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { groqChat, groqTranscribeAudio, isGroqConfigured } from '../utils/groq';
import { isOpenRouterConfigured } from '../utils/openrouter';
import { buildSultiPrompt, resolveCharacterKey, DEFAULT_CHARACTER } from '../utils/prompts';
import { getFullProfileByEmail } from '../db/repositories/learner.repo';
import ttsService from '../services/ttsService';
import { success, errors } from '../utils/apiResponse';
import logger from '../utils/logger';

const router = Router();

router.get('/status', authMiddleware, async (_req: Request, res: Response) => {
  success(res, {
    groq: isGroqConfigured(),
    openrouter_tts: isOpenRouterConfigured(),
    mode: isGroqConfigured() ? 'full_pipeline' : 'not_configured',
  });
});

router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { message, audio, session_id, voice } = req.body || {};

    if (!message && !audio) {
      errors.validation(res, 'Message or audio is required');
      return;
    }

    let text = message || '';
    let transcription: string | null = null;

    // Resolve which character the learner picked in Voice Settings. Unknown ids
    // fall back to the default rather than failing the whole turn.
    const characterId = resolveCharacterKey(voice);

    // Step 1: STT - transcribe audio if provided
    if (audio) {
      const sttStart = Date.now();
      try {
        if (!isGroqConfigured()) {
          errors.aiError(res, 'Groq API not configured for STT/LLM');
          return;
        }
        let filename = 'recording.webm';
        let mimeType = 'audio/webm';
        if (audio.startsWith('Ukl') || audio.startsWith('SUk')) {
          filename = 'recording.wav';
          mimeType = 'audio/wav';
        }
        text = await groqTranscribeAudio(audio, filename, mimeType);
        transcription = text;
        console.log(`[VoicePipeline] Groq STT done in ${Date.now() - sttStart}ms: "${text.substring(0, 80)}"`);
        logger.ai('voice-pipeline', 'stt', Date.now() - sttStart, true);
      } catch (err) {
        logger.ai('voice-pipeline', 'stt', Date.now() - sttStart, false);
        console.error(`[VoicePipeline] STT error: ${(err as Error).message}`);
        errors.aiError(res, 'Speech transcription failed');
        return;
      }
    }

    if (!text) {
      errors.validation(res, 'Could not transcribe audio and no text provided');
      return;
    }

    // Step 2: LLM - build prompt and generate reply
    let extra = '';
    if (req.user?.email) {
      try {
        const profile = await getFullProfileByEmail(req.user.email);
        if (profile?.level) {
          extra = `The learner is currently at the ${profile.level} level.`;
        }
      } catch {}
    }

    const systemPrompt = buildSultiPrompt('voice', extra);
    const llmStart = Date.now();
    let reply: string;
    try {
      reply = await groqChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        { temperature: 0.9, maxTokens: 512, reasoningEffort: 'low' }
      );
      console.log(`[VoicePipeline] LLM done in ${Date.now() - llmStart}ms: "${reply.substring(0, 80)}"`);
      logger.ai('voice-pipeline', 'llm', Date.now() - llmStart, true);
    } catch (err) {
      logger.ai('voice-pipeline', 'llm', Date.now() - llmStart, false);
      console.error(`[VoicePipeline] LLM error: ${(err as Error).message}`);
      errors.aiError(res, 'LLM response generation failed');
      return;
    }

    // Step 3: TTS - synthesize reply audio
    let ttsUrl: string | null = null;
    let ttsFailed = false;
    if (reply) {
      const ttsStart = Date.now();
      try {
        const ttsResult = await ttsService.synthesize(reply, characterId, 0.9);
        ttsUrl = ttsResult.url;
        console.log(`[VoicePipeline] TTS done in ${Date.now() - ttsStart}ms character=${characterId} provider=${ttsResult.provider}`);
        logger.ai('voice-pipeline', 'tts', Date.now() - ttsStart, true);
      } catch (err) {
        console.error(`[VoicePipeline] TTS error: ${(err as Error).message}`);
        logger.ai('voice-pipeline', 'tts', Date.now() - ttsStart, false);
        logger.error('TTS error', { error: (err as Error).message });
        ttsFailed = true;
      }
    }

    const totalMs = Date.now() - startTime;
    console.log(`[VoicePipeline] total=${totalMs}ms stt=${transcription ? 'yes' : 'text'} tts=${ttsUrl ? 'yes' : 'no'}`);

    success(res, {
      transcription,
      reply,
      tts_url: ttsUrl,
      tts_failed: ttsFailed,
      character: characterId,
      session_id: session_id || null,
    });
  } catch (err) {
    console.error(`[VoicePipeline] Fatal error: ${(err as Error).message}`, (err as Error).stack);
    logger.error('Voice chat error', { error: (err as Error).message, stack: (err as Error).stack });
    errors.internal(res, 'Voice chat failed');
  }
});

export default router;
