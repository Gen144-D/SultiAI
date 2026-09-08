import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { buildSultiPrompt } from '../utils/prompts';

const router = Router();

router.get('/status', async (_req, res) => {
  const { isXaiConfigured, XAI_VOICE_MODEL, XAI_VOICE } = require('../utils/xai');
  const { getVoiceboxConfig, isVoiceboxAvailable } = require('../services/voiceboxService');
  const voicebox = getVoiceboxConfig();
  const voiceboxUp = voicebox.enabled ? await isVoiceboxAvailable() : false;

  res.json({
    realtime: isXaiConfigured(),
    model: XAI_VOICE_MODEL,
    voice: XAI_VOICE,
    voicebox: {
      ...voicebox,
      available: voiceboxUp,
    },
    local_available: true,
    message: isXaiConfigured()
      ? 'Realtime voice mode enabled'
      : voiceboxUp
        ? 'Local voice mode enabled (Voicebox TTS/STT)'
        : 'Voice mode uses local STT + LLM + TTS. Set USE_VOICEBOX=true for cloned Bisaya voices.',
  });
});

router.post('/token', authMiddleware, async (req, res) => {
  try {
    const {
      isXaiConfigured,
      getRealtimeClientSecret,
      getRealtimeUrl,
      XAI_VOICE,
      XAI_VOICE_MODEL,
    } = require('../utils/xai');

    if (!isXaiConfigured()) {
      res.status(500).json({
        error:
          'Realtime voice mode requires XAI_API_KEY. Use /api/speech/synthesize for local TTS instead.',
      });
      return;
    }

    const { getFullProfileByEmail } = require('../db/repositories/learner.repo');
    const email = req.user?.email;
    const extra: string[] = [];
    if (email) {
      try {
        const profile = await getFullProfileByEmail(email);
        if (profile && profile.level) {
          extra.push(`The learner is currently at the ${profile.level} level.`);
        }
      } catch {
        // Ignore profile lookup failures; fall back to the default persona.
      }
    }

    const { value, expires_at } = await getRealtimeClientSecret();
    res.json({
      token: value,
      expires_at,
      url: getRealtimeUrl(),
      session: {
        model: XAI_VOICE_MODEL,
        voice: XAI_VOICE,
        instructions: buildSultiPrompt('voice', extra.join('\n')),
      },
    });
  } catch (err) {
    console.error('Agent token error:', err);
    res.status(502).json({
      error: 'Failed to mint xAI realtime token. Check server/.env XAI_API_KEY and xAI credits.',
    });
  }
});

export default router;
