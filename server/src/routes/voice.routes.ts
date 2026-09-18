import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { groqChat, groqTranscribeAudio, isGroqConfigured } from '../utils/groq';
import { buildSultiPrompt } from '../utils/prompts';
import { getFullProfileByEmail } from '../db/repositories/learner.repo';
import ttsService from '../services/ttsService';
import metaVoiceService from '../services/metaVoiceService';
import { success, errors } from '../utils/apiResponse';
import logger from '../utils/logger';

const router = Router();

router.get('/status', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const metaVoiceAvailable = await metaVoiceService.isAvailable();
    const metaVoiceHealth = metaVoiceAvailable ? await metaVoiceService.getHealth() : null;
    
    success(res, {
      groq: isGroqConfigured(),
      openrouter_tts: true,
      meta_voice: {
        enabled: metaVoiceService.isEnabled(),
        available: metaVoiceAvailable,
        health: metaVoiceHealth,
      },
      mode: isGroqConfigured() ? 'full_pipeline' : 'not_configured',
    });
  } catch (error) {
    console.error('[VoiceRoutes] Status check error:', error);
    success(res, {
      groq: isGroqConfigured(),
      openrouter_tts: true,
      meta_voice: {
        enabled: metaVoiceService.isEnabled(),
        available: false,
        health: null,
      },
      mode: isGroqConfigured() ? 'full_pipeline' : 'not_configured',
    });
  }
});

router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { message, audio, session_id, use_meta_voice = false } = req.body || {};

    if (!message && !audio) {
      errors.validation(res, 'Message or audio is required');
      return;
    }

    // Check if Meta Voice should be used
    const metaVoiceEnabled = use_meta_voice && await metaVoiceService.isAvailable();
    
    let text = message || '';
    let transcription: string | null = null;

    // Step 1: STT — transcribe audio if provided
    if (audio) {
      const sttStart = Date.now();
      try {
        if (metaVoiceEnabled) {
          // Use Meta Voice for STT
          const { source_lang = 'auto' } = req.body;
          const sttResult = await metaVoiceService.speechToText({
            audio_base64: audio,
            source_lang,
          });
          text = sttResult.text;
          transcription = text;
          console.log(`[VoicePipeline] Meta Voice STT done in ${Date.now() - sttStart}ms: "${text.substring(0, 80)}"`);
        } else {
          // Use Groq for STT
          if (!isGroqConfigured()) {
            errors.aiError(res, 'Groq API not configured for STT/LLM');
            return;
          }
          text = await groqTranscribeAudio(audio, 'recording.wav', 'audio/wav');
          transcription = text;
          console.log(`[VoicePipeline] Groq STT done in ${Date.now() - sttStart}ms: "${text.substring(0, 80)}"`);
        }
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

    // Step 2: LLM — build prompt and generate reply
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
        { temperature: 0.9, maxTokens: 200 }
      );
      console.log(`[VoicePipeline] LLM done in ${Date.now() - llmStart}ms: "${reply.substring(0, 80)}"`);
      logger.ai('voice-pipeline', 'llm', Date.now() - llmStart, true);
    } catch (err) {
      logger.ai('voice-pipeline', 'llm', Date.now() - llmStart, false);
      console.error(`[VoicePipeline] LLM error: ${(err as Error).message}`);
      errors.aiError(res, 'LLM response generation failed');
      return;
    }

    // Step 3: TTS — synthesize reply audio
    let ttsUrl: string | null = null;
    let ttsAudioBase64: string | null = null;
    let ttsFailed = false;
    if (reply) {
      const ttsStart = Date.now();
      try {
        if (metaVoiceEnabled) {
          // Use Meta Voice for TTS
          const { target_lang = 'en' } = req.body;
          const ttsResult = await metaVoiceService.textToSpeech({
            text: reply,
            target_lang,
          });
          ttsAudioBase64 = ttsResult.audio_base64;
          console.log(`[VoicePipeline] Meta Voice TTS done in ${Date.now() - ttsStart}ms`);
        } else {
          // Use existing TTS service
          const ttsResult = await ttsService.synthesize(reply, 'blessica', 0.9);
          ttsUrl = ttsResult.url;
          console.log(`[VoicePipeline] Traditional TTS done in ${Date.now() - ttsStart}ms provider=${ttsResult.provider}`);
        }
        logger.ai('voice-pipeline', 'tts', Date.now() - ttsStart, true);
      } catch (err) {
        console.error(`[VoicePipeline] TTS error: ${(err as Error).message}`);
        logger.ai('voice-pipeline', 'tts', Date.now() - ttsStart, false);
        logger.error('TTS error', { error: (err as Error).message });
        ttsFailed = true;
      }
    }

    const totalMs = Date.now() - startTime;
    console.log(`[VoicePipeline] total=${totalMs}ms meta_voice=${metaVoiceEnabled} stt=${transcription ? 'yes' : 'text'} tts=${ttsUrl || ttsAudioBase64 ? 'yes' : 'no'}`);

    success(res, {
      transcription,
      reply,
      tts_url: ttsUrl,
      tts_audio_base64: ttsAudioBase64,
      tts_failed: ttsFailed,
      session_id: session_id || null,
      meta_voice_used: metaVoiceEnabled,
    });
  } catch (err) {
    console.error(`[VoicePipeline] Fatal error: ${(err as Error).message}`, (err as Error).stack);
    logger.error('Voice chat error', { error: (err as Error).message, stack: (err as Error).stack });
    errors.internal(res, 'Voice chat failed');
  }
});

router.post('/speech-to-speech', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { audio, source_lang = 'auto', target_lang = 'en' } = req.body || {};

    if (!audio) {
      errors.validation(res, 'Audio is required');
      return;
    }

    if (!await metaVoiceService.isAvailable()) {
      errors.aiError(res, 'Meta Voice service is not available');
      return;
    }

    const startTime = Date.now();
    try {
      const result = await metaVoiceService.speechToSpeech({
        audio_base64: audio,
        source_lang,
        target_lang,
        task: 'S2ST',
      });

      console.log(`[VoiceRoutes] S2ST done in ${Date.now() - startTime}ms`);
      
      success(res, {
        audio_base64: result.audio_base64,
        transcription: result.transcription,
        source_language: result.source_language,
        target_language: result.target_language,
        format: result.format,
        sample_rate: result.sample_rate,
      });
    } catch (err) {
      console.error(`[VoiceRoutes] S2ST error: ${(err as Error).message}`);
      errors.aiError(res, `Speech-to-speech failed: ${(err as Error).message}`);
    }
  } catch (err) {
    console.error(`[VoiceRoutes] Fatal error: ${(err as Error).message}`);
    errors.internal(res, 'Speech-to-speech request failed');
  }
});

router.post('/transcribe-translate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { audio, source_lang = 'auto', target_lang = 'en' } = req.body || {};

    if (!audio) {
      errors.validation(res, 'Audio is required');
      return;
    }

    if (!await metaVoiceService.isAvailable()) {
      errors.aiError(res, 'Meta Voice service is not available');
      return;
    }

    const startTime = Date.now();
    try {
      const result = await metaVoiceService.transcribeAndTranslate({
        audio_base64: audio,
        source_lang,
        target_lang,
      });

      console.log(`[VoiceRoutes] Transcribe+translate done in ${Date.now() - startTime}ms`);
      
      success(res, {
        transcription: result.transcription,
        translation: result.translation,
        source_language: result.source_language,
        target_language: result.target_language,
      });
    } catch (err) {
      console.error(`[VoiceRoutes] Transcribe+translate error: ${(err as Error).message}`);
      errors.aiError(res, `Transcription and translation failed: ${(err as Error).message}`);
    }
  } catch (err) {
    console.error(`[VoiceRoutes] Fatal error: ${(err as Error).message}`);
    errors.internal(res, 'Transcribe and translate request failed');
  }
});

export default router;
