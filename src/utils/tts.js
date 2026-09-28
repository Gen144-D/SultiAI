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
let audioCtx = null;
let activeBufferSource = null;
let ttsAbortCtl = null;
let fallbackGuardTimer = null;

function getAudioCtx() {
  if (!audioCtx && typeof window !== 'undefined') {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

// Unlock the shared web AudioContext from within a user gesture. The greeting
// orb tile fires on a tap; calling this there puts the context in 'running'
// state so decodeAudioData playback is audible — the same path the Test Sound
// beep already proved works on the phone.
export function unlockWebAudio() {
  if (typeof window === 'undefined') return;
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// True when the web AudioContext exists and is 'running' — i.e. audio can be
// produced right now without needing a fresh user gesture. After the user taps
// "Start Voice" (which unlocks the context) this lets the greeting play
// immediately on mount instead of being deferred until another tap.
export function webAudioReady() {
  if (typeof window === 'undefined') return false;
  const ctx = getAudioCtx();
  return !!(ctx && ctx.state === 'running');
}

const ttsDebugSubs = new Set();

export function onTtsDebug(fn) {
  ttsDebugSubs.add(fn);
  return () => ttsDebugSubs.delete(fn);
}

function notifyWeb(msg) {
  if (typeof window !== 'undefined') {
    try {
      const cb = window.__sultiTtsLog;
      if (typeof cb === 'function') cb(msg);
    } catch {}
  }
  ttsDebugSubs.forEach((fn) => {
    try {
      fn(msg);
    } catch {}
  });
}

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
  console.log('[TTS] Muted state set to:', muted);
}

export function isTTSMuted() {
  return muted;
}

function stopActiveWebSource() {
  // Halt a BufferSourceNode that is already sounding so navigation away from
  // the voice screen never leaves audio bleeding into the next screen.
  if (activeBufferSource) {
    try {
      activeBufferSource.stop();
    } catch {}
    try {
      activeBufferSource.disconnect();
    } catch {}
    activeBufferSource = null;
  }
}

export function stopTTS() {
  currentToken++;
  // Cancel any in-flight TTS audio fetch
  if (ttsAbortCtl) {
    try {
      ttsAbortCtl.abort();
    } catch {}
    ttsAbortCtl = null;
  }
  // Stop a BufferSourceNode that is already playing
  stopActiveWebSource();
  // Clear the expo-speech fallback watchdog
  if (fallbackGuardTimer) {
    clearTimeout(fallbackGuardTimer);
    fallbackGuardTimer = null;
  }
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

function speakFallback(clean, { language, rate, onStart, onDone, onError }) {
  notifyWeb('speech synthesis fallback');
  console.log('[TTS] Using expo-speech fallback for:', clean.substring(0, 30));
  fallbackGuardTimer = setTimeout(
    () => {
      fallbackGuardTimer = null;
      notifyWeb('speech fallback timed out');
      console.log('[TTS] Speech fallback timed out');
      if (onDone) onDone();
    },
    Math.min(20000, 2500 + clean.length * 110)
  );
  const finishFb = () => {
    if (fallbackGuardTimer) {
      clearTimeout(fallbackGuardTimer);
      fallbackGuardTimer = null;
    }
    console.log('[TTS] Speech fallback completed');
    if (onDone) onDone();
  };
  Speech.speak(clean, {
    language: language || 'ceb',
    rate,
    onStart: () => {
      console.log('[AUDIO] speech-synthesis started');
      if (onStart) onStart();
    },
    onDone: finishFb,
    onError: (error) => {
      console.error('[TTS] Speech fallback error:', error);
      if (fallbackGuardTimer) {
        clearTimeout(fallbackGuardTimer);
        fallbackGuardTimer = null;
      }
      if (onError) onError();
    },
  });
}

function playWebDecoded(audioUri, token, { done, failed, started }, retryCount = 0) {
  console.log('[TTS] === playWebDecoded CALLED ===');
  const ctx = getAudioCtx();
  if (!ctx) {
    console.error('[TTS] No AudioContext available');
    failed();
    return;
  }
  console.log('[TTS] Playing via decodeAudioData (Android-audible path)');
  console.log('[TTS] Audio URI:', audioUri);
  console.log('[TTS] Retry attempt:', retryCount);
  console.log('[TTS] AudioContext state:', ctx.state);
  notifyWeb('decodeAudioData play: ' + audioUri);

  // Ensure context is running
  if (ctx.state === 'suspended') {
    console.log('[TTS] AudioContext suspended, attempting to resume...');
    ctx
      .resume()
      .then(() => {
        console.log('[TTS] AudioContext resumed successfully');
      })
      .catch((err) => {
        console.error('[TTS] Failed to resume AudioContext:', err);
        notifyWeb('AudioContext resume FAILED: ' + err.message);
      });
  }

  // Cancel any previous in-flight fetch so its buffered audio never resolves
  if (ttsAbortCtl) {
    try {
      ttsAbortCtl.abort();
    } catch {}
  }
  ttsAbortCtl = new AbortController();

  console.log('[TTS] Starting fetch for audio...');
  fetch(audioUri, { signal: ttsAbortCtl.signal })
    .then((r) => {
      console.log('[TTS] === FETCH RESPONSE RECEIVED ===');
      console.log('[TTS] Fetch response status:', r.status, r.statusText);
      console.log('[TTS] Response headers:', Object.fromEntries(r.headers.entries()));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      notifyWeb('fetch ok ' + r.status);
      return r.arrayBuffer();
    })
    .then((buf) => {
      console.log('[TTS] === AUDIO BUFFER RECEIVED ===');
      console.log('[TTS] Audio buffer size:', buf.byteLength, 'bytes');
      if (buf.byteLength === 0) {
        throw new Error('Empty audio buffer received');
      }
      notifyWeb('fetched ' + buf.byteLength + ' bytes');
      console.log('[TTS] Starting audio decode...');
      return ctx.decodeAudioData(buf);
    })
    .then((decoded) => {
      console.log('[TTS] === AUDIO DECODED SUCCESSFULLY ===');
      if (token !== currentToken) {
        console.log('[TTS] Token mismatch, aborting playback');
        return;
      }
      if (ctx.state !== 'running') {
        console.error('[TTS] AudioContext not running at play time — audio will be inaudible');
        console.log('[TTS] Current AudioContext state:', ctx.state);
        notifyWeb('NOT RUNNING at play time');
        failed();
        return;
      }
      console.log('[TTS] Audio decoded successfully, playing...');
      console.log('[TTS] Audio duration:', decoded.duration, 'seconds');
      console.log('[TTS] Audio channels:', decoded.numberOfChannels);
      console.log('[TTS] Audio sample rate:', decoded.sampleRate);
      stopActiveWebSource();
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      activeBufferSource = src;
      src.onended = () => {
        console.log('[TTS] === AUDIO PLAYBACK FINISHED ===');
        if (activeBufferSource === src) activeBufferSource = null;
        if (token !== currentToken) return;
        console.log('[TTS] decode audio finished');
        notifyWeb('decode audio finished');
        done();
      };
      src.start(0);
      console.log('[TTS] === AUDIO PLAYBACK STARTED ===');
      notifyWeb('decode audio started');
      if (started) started();
    })
    .catch((e) => {
      console.log('[TTS] === AUDIO PLAYBACK ERROR ===');
      if (e && e.name === 'AbortError') {
        console.log('[TTS] Request was aborted');
        return;
      }
      console.error('[TTS] decodeAudioData failed:', e.message);
      console.error('[TTS] Full error:', e);
      console.error('[TTS] Error stack:', e.stack);
      notifyWeb('decode failed: ' + e.message);
      
      // Retry logic for network errors
      if (retryCount < 2 && (e.message.includes('network') || e.message.includes('fetch'))) {
        console.log('[TTS] Retrying audio fetch (attempt', retryCount + 1, ')');
        setTimeout(() => {
          if (token === currentToken) {
            playWebDecoded(audioUri, token, { done, failed, started }, retryCount + 1);
          }
        }, 1000 * (retryCount + 1));
        return;
      }
      
      if (token !== currentToken) return;
      failed();
    });
}

function retryViaBlob(fullUrl, token, { done, failed }) {
  // Play through decodeAudioData on the gesture-unlocked AudioContext ? the
  // SAME pipeline the Test Sound beep proved audible in this exact browser.
  // HTML5 <audio> elements are silently muted on Android Chrome here.
  playWebDecoded(fullUrl, token, { done, failed });
  return;
  if (typeof window === 'undefined') {
    failed();
    return;
  }
  const audio = new window.Audio();
  audio.preload = 'auto';
  const cleanup = () => {
    if (webAudio === audio) webAudio = null;
    audio.onended = null;
    audio.onerror = null;
    audio.removeAttribute('src');
    audio.load();
  };
  audio.onended = () => {
    if (token !== currentToken) return;
    cleanup();
    done();
  };
  audio.onerror = () => {
    console.warn('[TTS] Blob audio load error');
    notifyWeb('blob retry failed to load');
    cleanup();
    failed();
  };
  fetch(fullUrl)
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      notifyWeb('blob retry fetched ' + r.status);
      return r.blob();
    })
    .then((blob) => {
      if (token !== currentToken) return;
      const url = URL.createObjectURL(new Blob([blob], { type: blob.type || 'audio/mpeg' }));
      audio.src = url;
      webAudio = audio;
      notifyWeb('blob retry playing');
      audio.play().catch((e) => {
        console.warn('[TTS] Blob play blocked:', e.message);
        notifyWeb('blob play blocked: ' + e.message);
        cleanup();
        failed();
      });
    })
    .catch((e) => {
      console.warn('[TTS] Blob fetch failed:', e.message);
      notifyWeb('blob fetch failed: ' + e.message);
      failed();
    });
}

function playWebAudio(audioUri, token, finish, clean, language, rate, started) {
  console.log('[TTS] playWebAudio called with:', audioUri);
  playWebDecoded(audioUri, token, {
    done: finish,
    started,
    failed: () =>
      speakFallback(clean, { language, rate, onStart: started, onDone: finish, onError: finish }),
  }, 0);
  return;
  if (webAudio) {
    webAudio.pause();
    webAudio = null;
  }
  const audio = new window.Audio(audioUri);
  webAudio = audio;

  audio.onended = () => {
    if (token !== currentToken) return;
    webAudio = null;
    notifyWeb('playback finished');
    finish();
  };

  audio.onerror = (e) => {
    console.warn('[TTS] Web audio error:', e);
    notifyWeb('web audio error');
    if (token !== currentToken) return;
    webAudio = null;
    speakFallback(clean, { language, rate, onDone: finish, onError: finish });
  };

  notifyWeb('playing web audio: ' + audioUri);
  audio.play().catch((e) => {
    console.warn('[TTS] Web audio autoplay blocked:', e.message);
    notifyWeb('autoplay blocked: ' + e.message);
    if (token !== currentToken) return;
    webAudio = null;
    speakFallback(clean, { language, rate, onDone: finish, onError: finish });
  });
}

function playSourceOnNative(uri, { onStart, onDone, onError } = {}) {
  console.log('[TTS] === playSourceOnNative CALLED ===');
  console.log('[TTS] URI:', uri);
  
  // Force the media/loudspeaker route before playback. Recording sets
  // allowsRecording:true, which leaves the audio session on the
  // earpiece/communication path and can make TTS inaudible afterwards.
  if (Platform.OS !== 'web') {
    try {
      console.log('[TTS] Setting audio mode for native playback');
      const { setAudioModeAsync } = require('expo-audio');
      setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    } catch {}
  }
  notifyWeb('[AUDIO] loading: ' + uri);
  const p = getPlayer();
  try {
    p.pause();
    p.seekTo(0);
  } catch {}
  if (listener) {
    try {
      p.removeListener(listener);
    } catch {}
    listener = null;
  }
  let started = false;
  listener = p.addListener('playbackStatusUpdate', (status) => {
    console.log('[TTS] Native audio status update:', JSON.stringify(status));
    if (!status) return;
    if (status.error) {
      console.warn('[AUDIO] === NATIVE PLAYBACK ERROR ===');
      console.warn('[AUDIO] playback error:', status.error);
      notifyWeb('[AUDIO] playback error: ' + status.error);
      if (listener) {
        try {
          p.removeListener(listener);
        } catch {}
        listener = null;
      }
      if (onError) onError();
      return;
    }
    if (status.didJustFinish) {
      console.log('[AUDIO] === NATIVE PLAYBACK FINISHED ===');
      if (listener) {
        try {
          p.removeListener(listener);
        } catch {}
        listener = null;
      }
      console.log('[AUDIO] playback finished');
      notifyWeb('[AUDIO] playback finished');
      if (onDone) onDone();
      return;
    }
    if (!started && status.isLoaded) {
      started = true;
      console.log('[AUDIO] === NATIVE AUDIO LOADED ===');
      console.log('[AUDIO] loaded, starting playback');
      notifyWeb('[AUDIO] loaded, starting playback');
      p.play();
      console.log('[AUDIO] === NATIVE PLAYBACK STARTED ===');
      console.log('[AUDIO] playback started');
      notifyWeb('[AUDIO] playback started');
      if (onStart) onStart();
    }
  });
  try {
    console.log('[TTS] Loading audio into native player');
    p.replace({ uri });
  } catch (e) {
    console.warn('[TTS] === NATIVE PLAYER REPLACE FAILED ===');
    console.warn('[TTS] Audio player replace failed:', e.message);
    notifyWeb('[AUDIO] replace failed: ' + e.message);
    if (!started && listener) {
      try {
        p.removeListener(listener);
      } catch {}
      listener = null;
    }
    if (onError) onError();
  }
}

export function playTtsUrl(url, { onStart, onDone, onError } = {}) {
  if (!url) {
    if (onError) onError();
    return;
  }
  const token = ++currentToken;
  let fullUrl = url;

  console.log('[TTS] playTtsUrl called with:', url);
  console.log('[TTS] IS_WEB:', IS_WEB);
  console.log('[TTS] BASE_URL:', BASE_URL);

  if (IS_WEB) {
    if (webAudio) {
      webAudio.pause();
      webAudio.currentTime = 0;
      webAudio = null;
    }

    // For web, the server returns URLs like /audio/tts/filename.mp3
    // We need to construct the full URL based on the BASE_URL
    if (!url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('data:')) {
      // Remove leading slash if present to avoid double slashes
      const cleanPath = url.startsWith('/') ? url.substring(1) : url;
      fullUrl = `${BASE_URL}/${cleanPath}`;
      console.log('[TTS] Constructed web audio URL:', fullUrl);
    }

    // Use decodeAudioData directly for better browser compatibility
    playWebDecoded(fullUrl, token, {
      started: () => {
        console.log('[TTS] playTtsUrl playback started');
        if (onStart) onStart();
      },
      done: () => {
        console.log('[TTS] playTtsUrl completed successfully');
        if (onDone) onDone();
      },
      failed: () => {
        console.error('[TTS] playTtsUrl failed, trying fallback');
        if (onError) onError();
      },
    }, 0);
    return;
  }

  // For native platforms, use the original URL construction
  if (!url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('data:')) {
    fullUrl = `${BASE_URL}${url}`;
  }

  playSourceOnNative(fullUrl, {
    onStart: () => {
      console.log('[TTS] playTtsUrl playback started');
      if (onStart) onStart();
    },
    onDone,
    onError,
  });
}

export function speakTTS(text, { voice = 'blessica', rate = 0.9, language, onStart, onDone, onError } = {}) {
  const clean = sanitizeForSpeech(text);
  if (!clean) {
    console.log('[TTS] No text to speak after sanitization');
    if (onDone) onDone();
    return;
  }
  console.log('[TTS] === TTS REQUEST STARTED ===');
  console.log('[TTS] text:', clean.substring(0, 100));
  console.log('[TTS] voice:', voice);
  console.log('[TTS] rate:', rate);
  console.log('[TTS] language:', language);
  console.log('[TTS] muted:', muted);
  console.log('[TTS] platform:', IS_WEB ? 'web' : 'native');
  console.log('[TTS] BASE_URL:', BASE_URL);

  const token = ++currentToken;
  let finished = false;
  const finish = (err) => {
    if (finished) return;
    finished = true;
    if (token !== currentToken) return;
    if (err) {
      console.log('[TTS] speakTTS finished with error', err);
      if (onError) onError();
    } else {
      console.log('[TTS] speakTTS finished successfully');
      if (onDone) onDone();
    }
  };

  if (muted) {
    console.log('[TTS] Skipping playback due to mute state');
    const simulatedMs = Math.min(3000, 500 + clean.length * 55);
    setTimeout(() => finish(), simulatedMs);
    return;
  }

  console.log('[TTS] Calling API ttsSynthesize...');
  api
    .ttsSynthesize(clean, voice, rate, undefined, language)
    .then((result) => {
      console.log('[TTS] === API RESPONSE RECEIVED ===');
      console.log('[TTS] full result:', JSON.stringify(result));
      const url = result && result.url;
      if (!url) {
        console.warn('[TTS] Server returned no URL, falling back to expo-speech');
        speakFallback(clean, {
          language,
          rate,
          onStart: () => {
            if (onStart) onStart();
          },
          onDone: finish,
          onError: finish,
        });
        return;
      }
      if (token !== currentToken) return;
      // Construct proper audio URL for web vs native
      let audioUri;
      if (IS_WEB) {
        // For web, the server returns /audio/tts/filename.mp3
        const cleanPath = url.startsWith('/') ? url.substring(1) : url;
        audioUri = `${BASE_URL}/${cleanPath}`;
      } else {
        audioUri = `${BASE_URL}${url}`;
      }
      console.log('[TTS] response status: url=', url, 'size bytes=', result.size_bytes ?? result.audio_size ?? 'n/a');
      console.log('[TTS] constructed audio URI:', audioUri);
      console.log('[AUDIO] loading:', audioUri);

      if (IS_WEB) {
        playWebAudio(audioUri, token, finish, clean, language, rate, () => {
          console.log('[AUDIO] playback started');
          if (onStart) onStart();
        });
        return;
      }

      playSourceOnNative(audioUri, {
        onStart: () => {
          console.log('[AUDIO] playback started');
          if (onStart) onStart();
        },
        onDone: finish,
        onError: () => {
          console.warn('[TTS] Native playback failed, falling back to expo-speech');
          speakFallback(clean, {
            language,
            rate,
            onStart: () => {
              if (onStart) onStart();
            },
            onDone: finish,
            onError: finish,
          });
        },
      });
    })
    .catch((err) => {
      console.error('[TTS] === API REQUEST FAILED ===');
      console.error('[TTS] error:', err?.message || err);
      console.error('[TTS] full error:', err);
      console.warn('[TTS] Server TTS failed, falling back to expo-speech');
      if (token !== currentToken) return;
      speakFallback(clean, {
        language,
        rate,
        onStart: () => {
          if (onStart) onStart();
        },
        onDone: finish,
        onError: finish,
      });
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
