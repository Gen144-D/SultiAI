import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { api, BASE_URL } from '../services/api';
import { sanitizeForSpeech } from './speech';

const IS_WEB = Platform.OS === 'web';

let player = null;
let listener = null;
let currentToken = 0;
let muted = false;

let webAudio = null;

function getPlayer() {
  if (!player) {
    const { createAudioPlayer } = require('expo-audio');
    player = createAudioPlayer(null);
  }
  return player;
}

export function getAudioPlayer() {
  if (IS_WEB) {
    return {
      setAudioSamplingEnabled: () => {},
      addListener: () => ({ remove: () => {} }),
      removeListener: () => {},
      pause: () => {},
      play: () => {},
      replace: () => {},
      seekTo: () => {},
    };
  }
  return getPlayer();
}

export function setTTSMuted(value) {
  muted = !!value;
}

export function isTTSMuted() {
  return muted;
}

export function stopTTS() {
  currentToken++;
  if (IS_WEB) {
    if (webAudio) {
      webAudio.pause();
      webAudio.currentTime = 0;
      webAudio = null;
    }
  } else {
    try {
      if (player) {
        if (listener) {
          player.removeListener(listener);
          listener = null;
        }
        player.pause();
        player.seekTo(0);
      }
    } catch {}
  }
  Speech.stop();
}

function speakFallback(clean, { language, rate, onDone, onError }) {
  Speech.speak(clean, {
    language: language || 'ceb',
    rate,
    onDone: onDone || (() => {}),
    onError: onError || (() => {}),
  });
}

function playWebAudio(audioUri, token, finish, clean, language, rate) {
  if (webAudio) {
    webAudio.pause();
    webAudio = null;
  }
  const audio = new window.Audio(audioUri);
  webAudio = audio;

  audio.onended = () => {
    if (token !== currentToken) return;
    webAudio = null;
    finish();
  };

  audio.onerror = (e) => {
    console.warn('[TTS] Web audio error:', e);
    if (token !== currentToken) return;
    webAudio = null;
    speakFallback(clean, { language, rate, onDone: finish, onError: finish });
  };

  audio.play().catch((e) => {
    console.warn('[TTS] Web audio autoplay blocked:', e.message);
    if (token !== currentToken) return;
    webAudio = null;
    speakFallback(clean, { language, rate, onDone: finish, onError: finish });
  });
}

export function speakTTS(text, { voice = 'fil', rate = 0.9, language, onDone, onError } = {}) {
  const clean = sanitizeForSpeech(text);
  if (!clean) {
    if (onDone) onDone();
    return;
  }
  const token = ++currentToken;
  let finished = false;
  const finish = (err) => {
    if (finished) return;
    finished = true;
    if (token !== currentToken) return;
    if (err) {
      if (onError) onError();
    } else if (onDone) {
      onDone();
    }
  };

  if (muted) {
    const simulatedMs = Math.min(3000, 500 + clean.length * 55);
    setTimeout(() => finish(), simulatedMs);
    return;
  }

  api
    .ttsSynthesize(clean, voice, rate, undefined, language)
    .then((result) => {
      const url = result && result.url;
      if (!url) {
        console.warn('[TTS] Server returned no URL, falling back to expo-speech');
        speakFallback(clean, { language, rate, onDone: finish, onError: finish });
        return;
      }
      if (token !== currentToken) return;
      const audioUri = `${BASE_URL}${url}`;
      console.log('[TTS] Playing audio:', audioUri);

      if (IS_WEB) {
        playWebAudio(audioUri, token, finish, clean, language, rate);
        return;
      }

      try {
        const p = getPlayer();
        p.pause();
        if (listener) p.removeListener(listener);
        p.replace({ uri: audioUri });
        listener = p.addListener('playbackStatusUpdate', (status) => {
          if (status && status.didJustFinish) finish();
          if (status && status.error) {
            console.warn('[TTS] Audio player error:', status.error);
            speakFallback(clean, { language, rate, onDone: finish, onError: finish });
          }
        });
        p.play();
      } catch (e) {
        console.warn('[TTS] Audio player failed, falling back to expo-speech:', e.message);
        speakFallback(clean, { language, rate, onDone: finish, onError: finish });
      }
    })
    .catch((err) => {
      console.warn('[TTS] Server TTS failed, falling back to expo-speech:', err?.message || err);
      if (token !== currentToken) return;
      speakFallback(clean, { language, rate, onDone: finish, onError: finish });
    });
}

export function speakTTSPromise(text, opts = {}) {
  return new Promise((resolve) => {
    speakTTS(text, {
      ...opts,
      onDone: () => resolve(true),
      onError: () => resolve(false),
    });
  });
}
