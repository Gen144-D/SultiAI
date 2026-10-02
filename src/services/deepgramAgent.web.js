import { Platform } from 'react-native';
import { api } from './api';

export const DEEPGRAM_INPUT_RATE = 48000;
export const DEEPGRAM_OUTPUT_RATE = 24000;

/** Deepgram's live streaming agent (web-first: Mic worklet + Web Audio). */
export function isDeepgramLiveSupported() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

/**
 * Fetch a short-lived Deepgram access token plus the inline agent settings
 * (including the GenTech AI prompt + greeting) from our own server. The API
 * key never reaches the browser.
 */
export async function fetchDeepgramAgentConfig() {
  const data = await api.agentDeepgramToken();
  const settings = data && data.settings;
  if (!settings || !settings.agent) {
    throw new Error('Deepgram agent settings missing from server response');
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    url: data.url || '',
    settings,
  };
}

/**
 * Wraps the @deepgram/agents browser SDK (AgentSession + worklet mic + Web
 * Audio player) behind a small event bus tailored to SultiAI's Voice Mode.
 *
 * Events emitted via onEvent({ type, ...payload }):
 *  - { type: 'state', state: 'connecting'|'listening'|'thinking'|'speaking' }
 *  - { type: 'conversation', role: 'user'|'assistant', content: string }
 *  - { type: 'user-speaking' }
 *  - { type: 'error', message: string }
 *  - { type: 'disconnected', reason: string }
 *  - { type: 'warning', message: string }
 */
export function createDeepgramLiveSession({ settings, url = '', onEvent }) {
  let session = null;
  let mic = null;
  let player = null;
  let disposed = false;
  let playbackCheckTimer = null;

  const inputRate = settings?.audio?.input?.sample_rate || DEEPGRAM_INPUT_RATE;
  const outputRate = settings?.audio?.output?.sample_rate || DEEPGRAM_OUTPUT_RATE;
  const outputEncoding = settings?.audio?.output?.encoding || 'linear16';

  const emit = (type, payload) => {
    if (onEvent && !disposed) onEvent({ type, ...payload });
  };

  const tokenFactory = async () => {
    const data = await api.agentDeepgramToken();
    return data.access_token;
  };

  return {
    async start() {
      if (!isDeepgramLiveSupported()) {
        throw new Error('Deepgram live agent is only available in the browser');
      }

      const dg = require('@deepgram/agents');
      const { AgentSession, AgentMicrophone, AgentPlayer } = dg;

      player = new AgentPlayer({ sampleRate: outputRate });
      mic = new AgentMicrophone(
        (frame) => {
          if (session) session.sendAudio(frame);
        },
        {
          sampleRate: inputRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      );

      const sessionConfig = {
        auth: { tokenFactory },
        agent: settings.agent,
        audio: {
          input: { encoding: 'linear16', sampleRate: inputRate },
          output: { encoding: outputEncoding, sampleRate: outputRate },
        },
        reconnect: { enabled: true, maxAttempts: 3, baseDelay: 600, maxDelay: 6000 },
        keepAliveInterval: 10000,
      };
      if (url) sessionConfig.url = url;

      session = new AgentSession(sessionConfig);

      session.on('connected', () => emit('state', { state: 'connecting' }));
      session.on('settings-applied', () => emit('state', { state: 'listening' }));

      session.on('user-started-speaking', () => {
        if (player) player.interrupt();
        emit('user-speaking');
        emit('state', { state: 'listening' });
      });

      session.on('agent-thinking', () => emit('state', { state: 'thinking' }));
      session.on('agent-started-speaking', () => emit('state', { state: 'speaking' }));

      session.on('agent-audio-done', () => {
        const waitForPlayback = () => {
          if (disposed) return;
          const remaining =
            player && player.getRemainingPlaybackTime ? player.getRemainingPlaybackTime() : 0;
          if (remaining > 0.06) {
            if (playbackCheckTimer) clearTimeout(playbackCheckTimer);
            playbackCheckTimer = setTimeout(waitForPlayback, 150);
            return;
          }
          emit('state', { state: 'listening' });
        };
        waitForPlayback();
      });

      session.on('conversation-text', (msg) => {
        if (msg && msg.role && msg.content) {
          emit('conversation', { role: msg.role, content: msg.content });
        }
      });

      session.on('audio', (chunk) => {
        if (player) player.queue(chunk);
      });

      session.on('error', (msg) =>
        emit('error', { message: (msg && msg.message) || 'Agent error' })
      );
      session.on('warning', (msg) =>
        emit('warning', { message: (msg && msg.message) || 'Agent warning' })
      );
      session.on('sdk-error', (err) =>
        emit('error', { message: (err && err.message) || 'Connection failed' })
      );
      session.on('disconnected', (reason) => emit('disconnected', { reason }));

      emit('state', { state: 'connecting' });
      await session.connect();
      await mic.start();
      emit('state', { state: 'listening' });
    },

    stop() {
      disposed = true;
      if (playbackCheckTimer) clearTimeout(playbackCheckTimer);
      if (mic) {
        try {
          mic.stop();
        } catch {}
        mic = null;
      }
      if (session) {
        try {
          session.disconnect();
        } catch {}
        session = null;
      }
      if (player) {
        try {
          player.dispose();
        } catch {}
        player = null;
      }
    },

    sendText(text) {
      if (session && text) session.injectUserMessage(String(text));
    },

    setMuted(muted) {
      if (player) {
        if (muted) player.mute();
        else player.unmute();
      }
    },

    isMuted() {
      return !!player && player.muted;
    },

    interruptPlayback() {
      if (player) player.interrupt();
    },

    getMicVolume() {
      return mic ? mic.getInputVolume() : 0;
    },

    getPlayerVolume() {
      return player ? player.getOutputVolume() : 0;
    },
  };
}
