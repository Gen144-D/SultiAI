import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { buildSultiPrompt } from '../utils/prompts';
import { isDeepgramConfigured } from '../utils/deepgram';

const router = Router();

router.get('/status', async (_req, res) => {
  const { isXaiConfigured, XAI_VOICE_MODEL, XAI_VOICE } = require('../utils/xai');
  const { getVoiceboxConfig, isVoiceboxAvailable } = require('../services/voiceboxService');
  const { DEEPGRAM_AGENT_URL } = require('../utils/deepgram');
  const voicebox = getVoiceboxConfig();
  const voiceboxUp = voicebox.enabled ? await isVoiceboxAvailable() : false;

  res.json({
    realtime: isXaiConfigured(),
    model: XAI_VOICE_MODEL,
    voice: XAI_VOICE,
    deepgram: {
      configured: isDeepgramConfigured(),
      url: DEEPGRAM_AGENT_URL,
    },
    voicebox: {
      ...voicebox,
      available: voiceboxUp,
    },
    local_available: voiceboxUp,
    message: isXaiConfigured()
      ? 'Realtime voice mode enabled'
      : isDeepgramConfigured()
        ? 'Deepgram live voice agent available (web)'
        : voiceboxUp
          ? 'Local voice mode enabled (Voicebox TTS/STT)'
          : 'No live streaming voice provider configured. Voice mode falls back to push-to-talk (Groq STT/LLM + Edge TTS). Set USE_VOICEBOX=true for cloned Bisaya voices.',
  });
});

// Mint a short-lived Deepgram access token + the agent settings so browsers
// can connect to the Agent API directly without ever seeing the API key.
router.get('/deepgram-token', authMiddleware, async (req, res) => {
  try {
    const { mintDeepgramAccessToken, buildDeepgramAgentSettings, DEEPGRAM_AGENT_URL } =
      require('../utils/deepgram');

    if (!isDeepgramConfigured()) {
      res.status(500).json({
        error:
          'Deepgram live agent requires DEEPGRAM_API_KEY. Add it to server/.env to enable real-time voice.',
      });
      return;
    }

    const { access_token, expires_in } = await mintDeepgramAccessToken(300);
    res.json({
      access_token,
      expires_in,
      url: DEEPGRAM_AGENT_URL,
      settings: buildDeepgramAgentSettings(),
    });
  } catch (err) {
    console.error('Deepgram token error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      error: `Failed to mint Deepgram agent token: ${detail}`,
    });
  }
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
