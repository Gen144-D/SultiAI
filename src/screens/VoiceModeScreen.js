import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ScrollView,
  AppState,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, FadeInDown } from 'react-native-reanimated';
import { XP_VALUES } from '../constants';
import { useAccessibility } from '../hooks/useAccessibility';
import {
  useAudioStream,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioSampleListener,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

import VoiceBackground from '../components/voice/VoiceBackground';
import VoiceOrb from '../components/voice/VoiceOrb';
import SultiTalkingAvatar from '../components/sulti/SultiTalkingAvatar';
import StatusPill from '../components/voice/StatusPill';
import SuggestedChips from '../components/voice/SuggestedChips';
import VoiceControls from '../components/voice/VoiceControls';
import SettingsSheet from '../components/voice/SettingsSheet';
import XpToast from '../components/voice/XpToast';
import { UserMessage, SultiMessage, TypingIndicator } from '../components/voice/MessageBubble';
import { useVoicePalette } from '../components/voice/palette';
import { useGame } from '../context/GameContext';
import { api, BASE_URL } from '../services/api';
import {
  speakTTS,
  stopTTS,
  setTTSMuted,
  getAudioPlayer,
  playTtsUrl as playTtsUrlAudio,
  unlockWebAudio,
  webAudioReady,
  onTtsDebug,
} from '../utils/tts';
import {
  fetchVoiceAgentConfig,
  encodeWavBase64,
  REALTIME_INPUT_RATE,
} from '../services/voiceAgent';
import {
  isDeepgramLiveSupported,
  fetchDeepgramAgentConfig,
  createDeepgramLiveSession,
} from '../services/deepgramAgent';
import {
  hapticMicStart,
  hapticMicEnd,
  hapticAIBeginsSpeaking,
  hapticAIFinished,
  hapticError,
  hapticTap,
  hapticXpGain,
  setHapticsEnabled,
} from '../utils/haptics';

const ORB_INTRO = 192;
const ORB_TALK = 160;
const AVATAR_INTRO = 124;
const AVATAR_TALK = 100;
const VAD_SILENCE_MS = 1500;
const VAD_SPEECH_THRESHOLD = 0.015;

const SULTI_GREETING =
  'Welcome. I am SULTI, your professional AI language assistant. I specialize in speech-to-speech communication, pronunciation enhancement, and conversational fluency. How may I assist you with your language learning journey today?';

const SULTI_GREETING_BISAYA =
  'Maayong pag-abot. Ako si SULTI, imong propesyonal nga AI language assistant. Espesyal ako sa speech-to-speech communication, pagpalambo sa pronunciation, ug pagpauswag sa conversational fluency. Unsaon nako ikaw tabangan sa imong pagkat-on sa pinulongan karon?';
const PREFS = {
  haptics: 'voice_haptics',
  continuous: 'voice_continuous',
  slow: 'voice_slow',
  muted: 'voice_muted',
  lang: 'voice_lang',
  character: 'voice_character',
  deepgram: 'voice_deepgram',
};

const LANG_META = {
  bisaya: { flag: '🇵🇭', label: 'Bisaya' },
  tagalog: { flag: '🇵🇭', label: 'Tagalog' },
  english: { flag: '🇺🇸', label: 'English' },
};

export default function VoiceModeScreen({ navigation }) {
  const { addXp, streak } = useGame();
  const insets = useSafeAreaInsets();
  const { reduceMotion, getAnimationDuration } = useAccessibility();
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  useEffect(() => {
    console.log('[VoiceMode] mounted (VAD+greeting+HTML5 player)');
    console.log('[VoiceMode] BASE_URL:', typeof BASE_URL !== 'undefined' ? BASE_URL : 'n/a');
    console.log(
      '[VoiceMode] Browser:',
      typeof navigator !== 'undefined' ? navigator.userAgent || 'unknown' : 'none'
    );
  }, []);

  const [orbState, setOrbState] = useState('idle');
  const [conversation, setConversation] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [muted, setMuted] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [continuous, setContinuous] = useState(true);
  const [language, setLanguage] = useState('bisaya');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState('blessica');
  const [userAvatarId, setUserAvatarId] = useState('avatar-01');
  const [deepgramAvailable, setDeepgramAvailable] = useState(false);
  const [deepgramEnabled, setDeepgramEnabled] = useState(false);

  // Fix #3: Cancel in-flight speech requests
  const abortControllerRef = useRef(null);

  const amplitude = useSharedValue(0);
  const listRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isConnectingRef = useRef(false);
  const sessionIdRef = useRef(null);
  const continuousRef = useRef(false);
  const mutedRef = useRef(false);
  const slowRef = useRef(false);
  const langRef = useRef('bisaya');
  const lastSampleAt = useRef(0);
  const lastReplyRef = useRef('');
  const durationTimer = useRef(null);
  const xpTimer = useRef(null);
  const restartTimer = useRef(null);
  const stopRecordingRef = useRef(null);
  const abortRecordingRef = useRef(null);
  const audioChunksRef = useRef(null);
  const ttsPlayerRef = useRef(null);
  const ttsListenerRef = useRef(null);
  const vadTimerRef = useRef(null);
  const lastSpeechAtRef = useRef(0);
  const speechSeenRef = useRef(false);
  const greetedRef = useRef(false);
  const stopAfterReplyRef = useRef(false);
  const greetingSafetyTimer = useRef(null);
  const pendingGreetRef = useRef(null);
  const greetingFallbackTimer = useRef(null);
  const relistenSafetyTimer = useRef(null);
  const firstGestureRef = useRef(false);
  const deepgramConfigRef = useRef(null);
  const deepgramSessionRef = useRef(null);
  const deepgramAvailableRef = useRef(false);
  const deepgramEnabledRef = useRef(false);
  const orbStateRef = useRef('idle');
  const pendingDeepgramTextRef = useRef(null);

  const handleStreamBuffer = useCallback(
    (buffer) => {
      try {
        if (buffer && buffer.data) {
          // Accumulate audio chunks for pipeline (keep as Int16Array for WAV encoding)
          if (audioChunksRef.current) {
            const existing = audioChunksRef.current;
            // buffer.data may be a bare ArrayBuffer (web) or a typed-array view (native)
            const raw = buffer.data;
            const isRawBuffer = raw instanceof ArrayBuffer;
            const backing = isRawBuffer ? raw : raw.buffer;
            const byteOffset = isRawBuffer ? 0 : raw.byteOffset;
            const newChunk = new Int16Array(
              backing,
              byteOffset,
              (isRawBuffer ? raw.byteLength : raw.byteLength) / 2
            );
            const merged = new Int16Array(existing.length + newChunk.length);
            merged.set(existing, 0);
            merged.set(newChunk, existing.length);
            audioChunksRef.current = merged;
          }

          const bytes = new Uint8Array(buffer.data);
          const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          const step = Math.max(1, Math.floor(bytes.byteLength / 2 / 128));
          let sum = 0;
          let n = 0;
          for (let i = 0; i + 1 < bytes.byteLength; i += step * 2) {
            const v = view.getInt16(i, true) / 32768;
            sum += v * v;
            n++;
          }
          const rms = n ? Math.sqrt(sum / n) : 0;
          amplitude.value = Math.min(1, rms * 4);
          if (rms > VAD_SPEECH_THRESHOLD) {
            speechSeenRef.current = true;
            lastSpeechAtRef.current = Date.now();
          }
          lastSampleAt.current = Date.now();
        }
      } catch {}
    },
    [amplitude]
  );

  const audioStream = useAudioStream({
    channels: 1,
    encoding: 'int16',
    sampleRate: REALTIME_INPUT_RATE,
    onBuffer: handleStreamBuffer,
  });
  const { stream: nativeStreamObj } = audioStream;

  const webStreamRef = useRef(null);
  const webStreamObj = useRef({
    start: async () => {
      const { createWebAudioStream } = require('../utils/webAudio');
      webStreamRef.current = createWebAudioStream({
        sampleRate: REALTIME_INPUT_RATE,
        onBuffer: handleStreamBuffer,
      });
      await webStreamRef.current.start();
    },
    stop: () => {
      if (webStreamRef.current) {
        try {
          const samples = webStreamRef.current.stop();
          if (samples && samples.length > 0) audioChunksRef.current = samples;
        } catch {}
        webStreamRef.current = null;
      }
    },
  }).current;
  const audioStreamObj = Platform.OS === 'web' ? webStreamObj : nativeStreamObj;

  // Stable ref so unmount-only cleanups can stop the mic without holding a
  // render-scoped identity in their dependency array.
  const audioStreamRef = useRef(audioStreamObj);
  audioStreamRef.current = audioStreamObj;

  const stopVadMonitor = useCallback(() => {
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }, []);

  const startVadMonitor = useCallback(() => {
    stopVadMonitor();
    speechSeenRef.current = false;
    lastSpeechAtRef.current = 0;
    vadTimerRef.current = setInterval(() => {
      if (!isRecordingRef.current) return;
      if (speechSeenRef.current && Date.now() - lastSpeechAtRef.current > VAD_SILENCE_MS) {
        stopVadMonitor();
        stopRecordingRef.current && stopRecordingRef.current();
      }
    }, 200);
  }, [stopVadMonitor]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    slowRef.current = slowMode;
  }, [slowMode]);
  useEffect(() => {
    langRef.current = language;
  }, [language]);
  useEffect(() => {
    orbStateRef.current = orbState;
  }, [orbState]);
  useEffect(() => {
    deepgramEnabledRef.current = deepgramEnabled;
  }, [deepgramEnabled]);

  const charRef = useRef('blessica');
  useEffect(() => {
    charRef.current = selectedCharacter;
  }, [selectedCharacter]);

  // Restore persisted preferences
  useEffect(() => {
    (async () => {
      try {
        const [h, c, s, m, l, ch, mv] = await Promise.all([
          AsyncStorage.getItem(PREFS.haptics),
          AsyncStorage.getItem(PREFS.continuous),
          AsyncStorage.getItem(PREFS.slow),
          AsyncStorage.getItem(PREFS.muted),
          AsyncStorage.getItem(PREFS.lang),
          AsyncStorage.getItem(PREFS.character),
        ]);
        if (h !== null) setHapticsEnabledState(h === '1');
        if (c !== null) setContinuous(c === '1');
        if (s !== null) setSlowMode(s === '1');
        // Force unmuted by default - ignore any stored mute state to ensure audio works
        setMuted(false);
        setTTSMuted(false);
        // Clear any stored muted state to ensure audio works
        AsyncStorage.setItem(PREFS.muted, '0').catch(() => {});
        if (l !== null) setLanguage(l);
        if (ch !== null) setSelectedCharacter(ch);
      } catch {}
    })();
  }, []);

  // Force unmute on component mount to ensure audio works
  useEffect(() => {
    console.log('[VoiceMode] Force unmuting on component mount');
    setMuted(false);
    setTTSMuted(false);
    AsyncStorage.setItem(PREFS.muted, '0').catch(() => {});
    
    // Force unlock AudioContext on web to handle browser autoplay policy
    if (Platform.OS === 'web') {
      console.log('[VoiceMode] Attempting to unlock AudioContext on mount');
      unlockWebAudio();
      // Check if AudioContext is ready
      const ready = webAudioReady();
      console.log('[VoiceMode] AudioContext ready state:', ready);
    }
  }, []);

  // Probe for the Deepgram live agent (web). OFF by default so all speech
  // (intro + replies) uses the verified server/msedge TTS pipeline ("working
  // both" on web and native). Users who want it can opt back in via Settings.
  useEffect(() => {
    if (!isDeepgramLiveSupported()) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchDeepgramAgentConfig();
        if (cancelled) return;
        deepgramConfigRef.current = cfg;
        deepgramAvailableRef.current = true;
        setDeepgramAvailable(true);
        const stored = await AsyncStorage.getItem(PREFS.deepgram);
        const on = stored === '1';
        if (on) {
          deepgramEnabledRef.current = true;
          setDeepgramEnabled(true);
        }
        console.log('[VoiceMode] Deepgram live agent available (' + (on ? 'enabled' : 'off by default') + ')');
      } catch (err) {
        console.warn('[VoiceMode] Deepgram live agent unavailable:', err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real mic/player meter while the Deepgram live agent is connected.
  useEffect(() => {
    if (!isDeepgramLiveSupported()) return;
    const t = setInterval(() => {
      const sess = deepgramSessionRef.current;
      if (!sess) return;
      if (orbStateRef.current === 'speaking') {
        const v = sess.getPlayerVolume();
        if (v > 0.005) amplitude.value = Math.min(1, v * 3);
      } else {
        const v = sess.getMicVolume();
        amplitude.value = Math.max(0.08, Math.min(1, v * 3.5));
      }
    }, 90);
    return () => clearInterval(t);
  }, [amplitude]);

  // Fix #2: Clean up audio on component unmount
  // This prevents audio from bleeding into other screens when navigating away
  useEffect(() => {
    return () => {
      console.log('[VoiceMode] Cleaning up audio on unmount');

      // Fix #3: Cancel in-flight speech requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('[VoiceMode] Aborted in-flight voice request');
        abortControllerRef.current = null;
      }

      // Stop all TTS audio
      stopTTS();

      // Stop the Deepgram live session if active
      if (deepgramSessionRef.current) {
        try {
          deepgramSessionRef.current.stop();
        } catch {}
        deepgramSessionRef.current = null;
        pendingDeepgramTextRef.current = null;
      }

      // Stop audio stream if active
      try {
        if (audioStreamRef.current) {
          audioStreamRef.current.stop();
          console.log('[VoiceMode] Audio stream stopped');
        }
      } catch (error) {
        console.warn('[VoiceMode] Error stopping audio stream:', error);
      }

      // Clear all audio-related timers
      if (durationTimer.current) clearTimeout(durationTimer.current);
      if (xpTimer.current) clearTimeout(xpTimer.current);
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (greetingSafetyTimer.current) clearTimeout(greetingSafetyTimer.current);
      if (greetingFallbackTimer.current) clearTimeout(greetingFallbackTimer.current);
      if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);

      // Reset audio state
      isSpeakingRef.current = false;
      isRecordingRef.current = false;
      isConnectingRef.current = false;

      console.log('[VoiceMode] Audio cleanup complete');
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('user_avatar_id')
      .then((id) => {
        if (id) setUserAvatarId(id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTTSMuted(muted);
    AsyncStorage.setItem(PREFS.muted, muted ? '1' : '0').catch(() => {});
    console.log('[VoiceMode] Muted state changed:', muted);
  }, [muted]);

  useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
    AsyncStorage.setItem(PREFS.haptics, hapticsEnabled ? '1' : '0').catch(() => {});
  }, [hapticsEnabled]);

  useEffect(() => {
    AsyncStorage.setItem(PREFS.continuous, continuous ? '1' : '0').catch(() => {});
  }, [continuous]);
  useEffect(() => {
    AsyncStorage.setItem(PREFS.slow, slowMode ? '1' : '0').catch(() => {});
  }, [slowMode]);
  useEffect(() => {
    AsyncStorage.setItem(PREFS.lang, language).catch(() => {});
  }, [language]);

  useEffect(() => {
    AsyncStorage.setItem(PREFS.character, selectedCharacter).catch(() => {});
  }, [selectedCharacter]);

  // Real-time audio level: mic metering while listening, TTS samples while speaking
  const handleSample = useCallback(
    (sample) => {
      try {
        const ch = sample && sample.channels && sample.channels[0];
        if (ch && ch.frames && ch.frames.length) {
          const frames = ch.frames;
          const step = Math.max(1, Math.floor(frames.length / 256));
          let sum = 0;
          let n = 0;
          for (let i = 0; i < frames.length; i += step) {
            const v = frames[i] || 0;
            sum += v * v;
            n++;
          }
          const rms = Math.sqrt(sum / Math.max(1, n));
          amplitude.value = Math.min(1, rms * 4);
          lastSampleAt.current = Date.now();
        }
      } catch {}
    },
    [amplitude]
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  Platform.OS !== 'web' && useAudioSampleListener(getAudioPlayer(), handleSample);

  useEffect(() => {
    if (deepgramEnabledRef.current && deepgramSessionRef.current) return;
    let timer = null;
    if (orbState === 'listening') {
      timer = setInterval(() => {
        if (Date.now() - lastSampleAt.current > 300) {
          amplitude.value = 0.12 + 0.22 * Math.abs(Math.sin(Date.now() / 240));
        }
      }, 90);
    } else if (orbState === 'speaking') {
      let t = 0;
      timer = setInterval(() => {
        t += 0.32;
        if (Date.now() - lastSampleAt.current > 700) {
          amplitude.value = 0.28 + 0.32 * (Math.sin(t) * 0.5 + 0.5);
        }
      }, 50);
    } else if (orbState === 'thinking') {
      amplitude.value = withTiming(0.08, { duration: getAnimationDuration(300) });
    } else {
      amplitude.value = withTiming(0, { duration: getAnimationDuration(500) });
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [orbState, amplitude]);

  // Stop the mic stream if the app goes to the background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && isRecordingRef.current) {
        abortRecordingRef.current && abortRecordingRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (xpTimer.current) clearTimeout(xpTimer.current);
      if (greetingSafetyTimer.current) clearTimeout(greetingSafetyTimer.current);
      if (greetingFallbackTimer.current) clearTimeout(greetingFallbackTimer.current);
      if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
      stopVadMonitor();
      stopTTS();
      try {
        audioStreamObj && audioStreamObj.stop();
      } catch {}
      // Cleanup TTS player
      try {
        if (ttsPlayerRef.current) {
          if (ttsListenerRef.current) {
            ttsPlayerRef.current.removeListener(ttsListenerRef.current);
            ttsListenerRef.current = null;
          }
          ttsPlayerRef.current.pause();
          ttsPlayerRef.current = null;
        }
      } catch {}
    };
  }, [audioStreamObj]);

  const addMessage = useCallback((role, text, pronunciation) => {
    setConversation((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, pronunciation },
    ]);
    setTimeout(() => listRef.current && listRef.current.scrollToEnd({ animated: true }), 150);
  }, []);

  const playTtsUrl = useCallback(async (ttsUrl, ttsAudioBase64 = null, ttsUrlError = null) => {
    if (!ttsUrl && !ttsAudioBase64) {
      setOrbState('idle');
      return;
    }
    setOrbState('thinking');

    // Ensure audio plays even when device is in silent mode
    try {
      void setAudioModeAsync({ playsInSilentMode: true });
    } catch {}

    const startedSpeaking = () => {
      console.log('[VoiceMode] playback actually started, UI -> speaking');
      setOrbState('speaking');
      hapticAIBeginsSpeaking();
    };

    const relisten = () => {
      if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
      if (stopAfterReplyRef.current) {
        stopAfterReplyRef.current = false;
        return;
      }
      if (!isRecordingRef.current && !isConnectingRef.current) {
        restartTimer.current = setTimeout(
          () => startRecordingRef.current && startRecordingRef.current(),
          650
        );
      }
    };
    const doneCb = () => {
      setOrbState('idle');
      hapticAIFinished();
      relisten();
    };
    const errCb = () => {
      setOrbState('idle');
      hapticAIFinished();
      if (ttsUrlError) {
        ttsUrlError();
        return;
      }
      relisten();
    };

    try {
      if (ttsAudioBase64 && Platform.OS !== 'web') {
        // Native: Meta Voice base64 audio via expo-audio
        const { createAudioPlayer } = require('expo-audio');
        if (ttsPlayerRef.current) {
          if (ttsListenerRef.current) {
            ttsPlayerRef.current.removeListener(ttsListenerRef.current);
            ttsListenerRef.current = null;
          }
          ttsPlayerRef.current.pause();
        }
        const player = createAudioPlayer(null);
        ttsPlayerRef.current = player;
        player.replace({ uri: `data:audio/wav;base64,${ttsAudioBase64}` });
        let b64Started = false;
        ttsListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
          if (status && status.didJustFinish) {
            if (ttsListenerRef.current) {
              player.removeListener(ttsListenerRef.current);
              ttsListenerRef.current = null;
            }
            ttsPlayerRef.current = null;
            doneCb();
            return;
          }
          if (status && status.error) {
            console.warn('[VoiceMode] base64 TTS playback error:', status.error);
            if (ttsListenerRef.current) {
              player.removeListener(ttsListenerRef.current);
              ttsListenerRef.current = null;
            }
            ttsPlayerRef.current = null;
            errCb();
            return;
          }
          if (status && status.isLoaded && !b64Started) {
            b64Started = true;
            player.play();
            startedSpeaking();
          }
        });
        return;
      }

      let url = ttsUrl;
      if (ttsAudioBase64 && Platform.OS === 'web') {
        const binary = atob(ttsAudioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
      }
      playTtsUrlAudio(url, { onStart: startedSpeaking, onDone: doneCb, onError: errCb });
    } catch (e) {
      console.warn('[VoiceMode] TTS playback error:', e.message);
      setOrbState('idle');
      hapticAIFinished();
      if (ttsUrlError) {
        ttsUrlError();
      }
    }
  }, []);

  const abortRecording = useCallback(() => {
    isRecordingRef.current = false;
    setRecording(false);
    stopVadMonitor();
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    try {
      audioStreamObj && audioStreamObj.stop();
    } catch {}
    audioChunksRef.current = null;
    setOrbState('idle');
  }, [audioStreamObj, stopVadMonitor]);

  const startRecording = useCallback(async () => {
    console.log('[VoiceMode] startRecording called', {
      isConnecting: isConnectingRef.current,
      isRecording: isRecordingRef.current,
      hasStream: !!audioStreamObj,
    });
    if (isConnectingRef.current || isRecordingRef.current) return;
    isConnectingRef.current = true;
    if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
    try {
      if (Platform.OS !== 'web') {
        const { granted } = await requestRecordingPermissionsAsync();
        console.log('[VoiceMode] mic permission:', granted);
        if (!granted) {
          Alert.alert('Permission needed', 'Microphone access is required for voice mode.');
          return;
        }
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        console.log('[VoiceMode] audio mode set');
      } else {
        console.log('[VoiceMode] web platform - skipping native audio mode setup');
      }

      setOrbState('thinking');

      // Always use pipeline mode (Groq STT/LLM + OpenRouter TTS)
      audioChunksRef.current = new Int16Array(0);

      if (!audioStreamObj) {
        console.error('[VoiceMode] audioStreamObj is null/undefined - useAudioStream failed');
        Alert.alert('Error', 'Audio stream not available. Please restart the app.');
        setOrbState('idle');
        return;
      }
      console.log('[VoiceMode] calling audioStreamObj.start()');
      await audioStreamObj.start();
      console.log('[VoiceMode] stream started, audioChunksRef ready');
      isRecordingRef.current = true;
      setRecording(true);
      setRecordingDuration(0);
      setOrbState('listening');
      hapticMicStart();
      durationTimer.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
      startVadMonitor();
    } catch (e) {
      console.error('[VoiceMode] startRecording error:', e.message, e);
      setRecording(false);
      setOrbState('idle');
      hapticError();
      Alert.alert('Error', `Could not start the voice session: ${e.message}`);
    } finally {
      isConnectingRef.current = false;
    }
  }, [audioStreamObj, startVadMonitor]);

  const speakReply = useCallback((text, rate = 0.85, autoListen = false) => {
    console.log('[VoiceMode] === speakReply CALLED ===');
    console.log('[VoiceMode] text:', text.substring(0, 50));
    console.log('[VoiceMode] rate:', rate);
    console.log('[VoiceMode] autoListen:', autoListen);
    console.log('[VoiceMode] muted:', mutedRef.current);
    console.log('[VoiceMode] character:', charRef.current);
    console.log('[VoiceMode] language:', langRef.current);
    
    stopTTS();
    isSpeakingRef.current = true;
    lastReplyRef.current = text;
    setOrbState('thinking'); // Only show 'thinking' while generating TTS
    
    const startedSpeaking = () => {
      console.log('[VoiceMode] === AUDIO PLAYBACK STARTED ===');
      console.log('[VoiceMode] UI state -> speaking');
      setOrbState('speaking');
      hapticAIBeginsSpeaking();
    };
    
    const maybeRelisten = () => {
      console.log('[VoiceMode] === MAYBE RELISTEN ===');
      if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
      if (stopAfterReplyRef.current) {
        stopAfterReplyRef.current = false;
        return;
      }
      if (
        (autoListen || continuousRef.current) &&
        !isRecordingRef.current &&
        !isConnectingRef.current
      ) {
        console.log('[VoiceMode] Auto-relisten enabled, scheduling restart');
        restartTimer.current = setTimeout(
          () => startRecordingRef.current && startRecordingRef.current(),
          650
        );
      }
    };
    
    console.log('[VoiceMode] Calling speakTTS with voice:', charRef.current);
    speakTTS(text, {
      voice: charRef.current,
      language: { bisaya: 'ceb', tagalog: 'tl', english: 'en-US' }[langRef.current] || 'en-US',
      rate,
      onStart: startedSpeaking,
      onDone: () => {
        console.log('[VoiceMode] === AUDIO PLAYBACK COMPLETED ===');
        isSpeakingRef.current = false;
        setOrbState('idle');
        hapticAIFinished();
        maybeRelisten();
      },
      onError: (err) => {
        console.log('[VoiceMode] === AUDIO PLAYBACK ERROR ===');
        console.log('[VoiceMode] error:', err);
        isSpeakingRef.current = false;
        setOrbState('idle');
        hapticAIFinished();
        maybeRelisten();
      },
    });
  }, []);

  const stopRecording = useCallback(async () => {
    console.log('[VoiceMode] stopRecording called', { isRecording: isRecordingRef.current });
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    stopVadMonitor();
    setRecording(false);
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    setOrbState('thinking');
    hapticMicEnd();
    try {
      audioStreamObj.stop();
    } catch {}

    // Send accumulated audio to voice pipeline (Groq STT/LLM + OpenRouter TTS)
    const chunks = audioChunksRef.current;
    audioChunksRef.current = null;
    console.log('[VoiceMode] chunks length:', chunks ? chunks.length : 0);
    if (!chunks || chunks.length === 0) {
      console.warn('[VoiceMode] no audio chunks captured');
      setOrbState('idle');
      return;
    }
    try {
      const wavBase64 = encodeWavBase64(chunks, REALTIME_INPUT_RATE);
      console.log(
        '[VoiceMode] WAV base64 length:',
        wavBase64.length,
        'sending to voice pipeline...'
      );

      // Fix #3: Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const data = await api.voiceChat(
        null,
        wavBase64,
        sessionIdRef.current,
        abortControllerRef.current.signal,
        charRef.current
      );
      console.log(
        '[VoiceMode] voice pipeline response:',
        JSON.stringify({
          reply: data.reply?.substring(0, 80),
          tts_url: data.tts_url,
          tts_audio_base64: data.tts_audio_base64 ? 'present' : 'absent',
          transcription: data.transcription?.substring(0, 50),
        })
      );

      if (data.session_id) {
        sessionIdRef.current = data.session_id;
        setSessionId(data.session_id);
      }

      if (data.transcription) {
        setHasSpoken(true);
        addMessage('user', data.transcription, null);
      }

      if (data.reply) {
        addMessage('assistant', data.reply, null);
        const armRelistenSafety = (ms) => {
          if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
          relistenSafetyTimer.current = setTimeout(() => {
            if (
              !isRecordingRef.current &&
              !isSpeakingRef.current &&
              !isConnectingRef.current &&
              !stopAfterReplyRef.current
            ) {
              startRecordingRef.current && startRecordingRef.current();
            }
          }, ms);
        };
        if (!mutedRef.current) {
          if (data.tts_audio_base64) {
            // Use Meta Voice base64 audio
            console.log('[VoiceMode] playing tts_audio_base64');
            playTtsUrl(null, data.tts_audio_base64);
          } else if (data.tts_url) {
            // Use traditional TTS URL, fall back to speakReply on playback failure
            console.log('[VoiceMode] playing tts_url:', data.tts_url);
            playTtsUrl(data.tts_url, null, () => {
              console.warn('[VoiceMode] tts_url playback failed, falling back to speakReply');
              speakReply(data.reply);
            });
          } else if (data.tts_failed) {
            // TTS failed on server, fall back to speakReply
            console.warn('[VoiceMode] server tts_failed, using speakReply');
            speakReply(data.reply);
          } else {
            // No audio source at all — never go silent, always speak the text
            console.warn('[VoiceMode] no audio source, using speakReply fallback');
            speakReply(data.reply);
          }
        } else {
          setOrbState('idle');
        }
        // Guarantee the hands-free loop continues even if TTS callbacks are lost
        armRelistenSafety(mutedRef.current ? 1000 : 15000);
        addXp(XP_VALUES.VOICE_PRACTICE_TURN, 'voice_practice');
        setXpToastVisible(true);
        hapticXpGain();
        if (xpTimer.current) clearTimeout(xpTimer.current);
        xpTimer.current = setTimeout(() => setXpToastVisible(false), 2400);
      } else {
        setOrbState('idle');
      }
    } catch (e) {
      console.error('[VoiceMode] Voice pipeline error:', e.message, e);
      setOrbState('idle');
      hapticError();
      Alert.alert('Error', `Could not process the voice message: ${e.message}`);
    }
  }, [audioStreamObj, addMessage, addXp, playTtsUrl, stopVadMonitor]);

  const startRecordingRef = useRef(null);

  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    abortRecordingRef.current = abortRecording;
  }, [abortRecording]);

  // Play a one-time greeting when Voice Mode opens, then auto-start listening
  useEffect(() => {
    if (greetedRef.current) return;
    // Only skip the client-side greeting if a Deepgram live session is ALREADY
    // connected (i.e. the user pressed the mic). "Enabled but idle" must still
    // speak the greeting through the verified msedge-tts pipeline — otherwise
    // opening Voice Mode is completely silent.
    if (
      deepgramEnabledRef.current &&
      deepgramAvailableRef.current &&
      isDeepgramLiveSupported() &&
      deepgramSessionRef.current
    ) {
      console.log('[VoiceMode] greeting skipped (Deepgram live agent active)');
      return;
    }
    const forceListen = () => {
      console.log('[VoiceMode] greeting safety: forcing listening start');
      if (!isRecordingRef.current && !isSpeakingRef.current && !isConnectingRef.current) {
        startRecordingRef.current && startRecordingRef.current();
      }
    };
    const t = setTimeout(() => {
      greetedRef.current = true;
      console.log('[VoiceMode] greeting: starting');
      if (isRecordingRef.current || isSpeakingRef.current || isConnectingRef.current) {
        console.log('[VoiceMode] greeting skipped (already active)');
        return;
      }
      const greeting = langRef.current === 'bisaya' ? SULTI_GREETING_BISAYA : SULTI_GREETING;
      const speakNow = () => {
        // Single-shot trigger: only the first caller wins.
        if (!pendingGreetRef.current) return;
        pendingGreetRef.current = null;
        if (isSpeakingRef.current || isConnectingRef.current) return;
        if (isRecordingRef.current) {
          // Absorb a mic tap so the greeting can be heard: stop the capture and
          // drop the partial chunks instead of sending them to the pipeline.
          console.log('[VoiceMode] greeting absorbing active mic capture');
          isRecordingRef.current = false;
          setRecording(false);
          stopVadMonitor();
          if (durationTimer.current) {
            clearInterval(durationTimer.current);
            durationTimer.current = null;
          }
          audioChunksRef.current = null;
          try {
            audioStreamRef.current && audioStreamRef.current.stop();
          } catch {}
        }
        speakReply(greeting, 0.9, true);
        greetingSafetyTimer.current = setTimeout(forceListen, 15000);
      };
      // Show the greeting text right away so the screen never sits silent; the
      // AUDIO is what may need a real user gesture on web (autoplay policy).
      addMessage('assistant', greeting, null);
      if (mutedRef.current) {
        console.log('[VoiceMode] greeting muted — text shown, starting listening');
        forceListen();
        return;
      }
      pendingGreetRef.current = speakNow;
      // "Start Voice" already unlocked the AudioContext in a user gesture, so
      // on web we can (and should) produce sound immediately. Only defer when
      // the context is suspended — the first in-screen tap unlocks it.
      const canAutoSpeak = Platform.OS !== 'web' || webAudioReady();
      if (canAutoSpeak) {
        speakNow();
      } else {
        console.log(
          '[VoiceMode] AudioContext not ready — greeting text shown, audio plays on first tap'
        );
        greetingFallbackTimer.current = setTimeout(() => {
          console.log('[VoiceMode] no gesture yet — greeting audio waits for first tap');
        }, 3000);
      }
    }, 700);
    return () => {
      clearTimeout(t);
      if (greetingSafetyTimer.current) clearTimeout(greetingSafetyTimer.current);
      if (greetingFallbackTimer.current) clearTimeout(greetingFallbackTimer.current);
    };
  }, [speakReply, addMessage, stopVadMonitor]);

  // First user gesture unlocks audio playback (browser autoplay policy)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const mark = () => {
      firstGestureRef.current = true;
      // Same real-gesture slot the beep proved audible: resume the SHARED reply
      // context here so it's already running when the deferred greeting fires.
      unlockWebAudio();
      document.removeEventListener('pointerdown', mark);
      document.removeEventListener('touchstart', mark);
      document.removeEventListener('keydown', mark);
      if (pendingGreetRef.current) {
        const cb = pendingGreetRef.current;
        if (greetingFallbackTimer.current) clearTimeout(greetingFallbackTimer.current);
        setTimeout(() => cb(), 300);
      }
    };
    document.addEventListener('pointerdown', mark);
    document.addEventListener('touchstart', mark);
    document.addEventListener('keydown', mark);
    return () => {
      document.removeEventListener('pointerdown', mark);
      document.removeEventListener('touchstart', mark);
      document.removeEventListener('keydown', mark);
    };
  }, []);

  const handleDeepgramEvent = useCallback(
    (ev) => {
      console.log('[VoiceMode] Deepgram event:', ev.type, ev.state || '');
      switch (ev.type) {
        case 'state':
          if (ev.state === 'speaking') {
            setOrbState('speaking');
          } else if (ev.state === 'thinking') {
            setOrbState('thinking');
          } else if (ev.state === 'listening') {
            setOrbState('listening');
            if (pendingDeepgramTextRef.current) {
              const text = pendingDeepgramTextRef.current;
              pendingDeepgramTextRef.current = null;
              const sess = deepgramSessionRef.current;
              if (sess) sess.sendText(text);
            }
          } else if (ev.state === 'connecting') {
            setOrbState('thinking');
          }
          break;
        case 'conversation':
          if (ev.role === 'user') {
            setHasSpoken(true);
            addMessage('user', ev.content, null);
          } else {
            lastReplyRef.current = ev.content;
            addMessage('assistant', ev.content, null);
            addXp(XP_VALUES.VOICE_PRACTICE_TURN, 'voice_practice');
            setXpToastVisible(true);
            hapticXpGain();
            if (xpTimer.current) clearTimeout(xpTimer.current);
            xpTimer.current = setTimeout(() => setXpToastVisible(false), 2400);
          }
          break;
        case 'user-speaking':
          setRecording(false);
          break;
        case 'error':
          console.warn('[VoiceMode] Deepgram error:', ev.message);
          hapticError();
          setRecording(false);
          setOrbState('idle');
          break;
        case 'disconnected':
          console.warn('[VoiceMode] Deepgram disconnected:', ev.reason);
          setRecording(false);
          setOrbState('idle');
          break;
        case 'warning':
          console.warn('[VoiceMode] Deepgram warning:', ev.message);
          break;
      }
    },
    [addMessage, addXp]
  );

  const setDeepgramEnabledState = useCallback((next) => {
    setDeepgramEnabled(next);
    deepgramEnabledRef.current = next;
    AsyncStorage.setItem(PREFS.deepgram, next ? '1' : '0').catch(() => {});
    if (!next && deepgramSessionRef.current) {
      try {
        deepgramSessionRef.current.stop();
      } catch {}
      deepgramSessionRef.current = null;
      pendingDeepgramTextRef.current = null;
      setRecording(false);
      setOrbState('idle');
    }
  }, []);

  const handleDeepgramToggle = useCallback(() => {
    hapticTap();
    const sess = deepgramSessionRef.current;
    if (!sess) {
      // First press: connect the live agent and open the mic.
      setOrbState('thinking');
      setRecording(true);
      unlockWebAudio();
      (async () => {
        try {
          let cfg = deepgramConfigRef.current;
          if (!cfg) cfg = await fetchDeepgramAgentConfig();
          deepgramConfigRef.current = cfg;
          const session = createDeepgramLiveSession({
            settings: cfg.settings,
            url: cfg.url,
            onEvent: handleDeepgramEvent,
          });
          deepgramSessionRef.current = session;
          await session.start();
          console.log('[VoiceMode] Deepgram live session running');
        } catch (err) {
          console.error('[VoiceMode] Deepgram start error:', err.message);
          if (deepgramSessionRef.current) {
            try {
              deepgramSessionRef.current.stop();
            } catch {}
            deepgramSessionRef.current = null;
          }
          pendingDeepgramTextRef.current = null;
          setRecording(false);
          setOrbState('idle');
          hapticError();
          Alert.alert('Error', `Could not start the Deepgram voice agent: ${err.message}`);
        }
      })();
      return;
    }
    // Session exists → toggle the mic (push-to-talk pause).
    if (recording) {
      sess.setMuted(true);
      setRecording(false);
      setOrbState('idle');
    } else {
      sess.setMuted(false);
      setRecording(true);
      setOrbState('listening');
    }
  }, [recording, handleDeepgramEvent]);

  const sendText = useCallback(
    async (message) => {
      console.log('[VoiceMode] sendText called:', message.substring(0, 50));
      if (deepgramEnabledRef.current && deepgramAvailableRef.current && isDeepgramLiveSupported()) {
        addMessage('user', message, null);
        setHasSpoken(true);
        const sess = deepgramSessionRef.current;
        if (sess) {
          sess.sendText(message);
        } else {
          pendingDeepgramTextRef.current = message;
          handleDeepgramToggle();
        }
        return;
      }
      if (isSpeakingRef.current) stopTTS();
      const wasRecording = isRecordingRef.current;
      if (wasRecording) {
        await stopRecording();
        return;
      }
      addMessage('user', message, null);
      setOrbState('thinking');
      try {
        const data = await api.voiceChat(message, null, sessionIdRef.current, null, charRef.current);
        console.log(
          '[VoiceMode] sendText response:',
          JSON.stringify({ reply: data.reply?.substring(0, 80), tts_url: data.tts_url })
        );
        if (data.session_id) {
          sessionIdRef.current = data.session_id;
          setSessionId(data.session_id);
        }
        if (data.reply) {
          setHasSpoken(true);
          addMessage('assistant', data.reply, null);
          if (!mutedRef.current) {
            if (data.tts_url) {
              playTtsUrl(data.tts_url);
            } else if (data.tts_failed) {
              // TTS failed on server, fall back to expo-speech
              speakReply(data.reply);
            } else {
              setOrbState('idle');
            }
          } else {
            setOrbState('idle');
          }
          addXp(XP_VALUES.VOICE_PRACTICE_TURN, 'voice_practice');
          setXpToastVisible(true);
          hapticXpGain();
          if (xpTimer.current) clearTimeout(xpTimer.current);
          xpTimer.current = setTimeout(() => setXpToastVisible(false), 2400);
        } else {
          setOrbState('idle');
        }
      } catch (e) {
        console.error('[VoiceMode] sendText error:', e.message, e);
        setOrbState('idle');
        hapticError();
        Alert.alert('Error', `Could not reach the tutor: ${e.message}`);
      }
    },
    [stopRecording, playTtsUrl, addMessage, addXp, handleDeepgramToggle]
  );

  const toggleRecording = useCallback(() => {
    if (pendingGreetRef.current) {
      // The greeting is waiting for a user gesture on web (autoplay policy).
      // Absorb this tap into speaking it; speakReply auto-listens on finish.
      console.log('[VoiceMode] mic tap absorbed — playing greeting audio first');
      if (greetingFallbackTimer.current) clearTimeout(greetingFallbackTimer.current);
      setTimeout(() => pendingGreetRef.current && pendingGreetRef.current(), 250);
      return;
    }
    if (deepgramEnabledRef.current && deepgramAvailableRef.current && isDeepgramLiveSupported()) {
      handleDeepgramToggle();
      return;
    }
    console.log('[VoiceMode] toggleRecording called', {
      isSpeaking: isSpeakingRef.current,
      isRecording: isRecordingRef.current,
      isConnecting: isConnectingRef.current,
    });
    if (isSpeakingRef.current) {
      stopTTS();
      isSpeakingRef.current = false;
      setOrbState('idle');
      hapticTap();
      startRecording();
      return;
    }
    if (isRecordingRef.current || isConnectingRef.current) {
      stopAfterReplyRef.current = true;
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording, handleDeepgramToggle]);

  const replayLast = useCallback(() => {
    if (!lastReplyRef.current) return;
    hapticTap();
    const sess = deepgramSessionRef.current;
    if (sess) sess.interruptPlayback();
    speakReply(lastReplyRef.current, slowRef.current ? 0.55 : 0.85);
  }, [speakReply]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const newMuted = !m;
      if (newMuted) stopTTS(); // Stop TTS when muting, not when unmuting
      const sess = deepgramSessionRef.current;
      if (sess) sess.setMuted(newMuted);
      hapticTap();
      return newMuted;
    });
  }, []);

  const toggleSlow = useCallback(() => {
    setSlowMode((s) => !s);
    hapticTap();
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((l) => (l === 'bisaya' ? 'tagalog' : l === 'tagalog' ? 'english' : 'bisaya'));
    hapticTap();
  }, []);

  const endSession = useCallback(() => {
    stopTTS();
    isSpeakingRef.current = false;
    isRecordingRef.current = false;
    isConnectingRef.current = false;
    pendingGreetRef.current = null;
    if (greetingFallbackTimer.current) clearTimeout(greetingFallbackTimer.current);
    if (greetingSafetyTimer.current) clearTimeout(greetingSafetyTimer.current);
    if (relistenSafetyTimer.current) clearTimeout(relistenSafetyTimer.current);
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    stopVadMonitor();
    // Stop the Deepgram live session if active
    if (deepgramSessionRef.current) {
      try {
        deepgramSessionRef.current.stop();
      } catch {}
      deepgramSessionRef.current = null;
      pendingDeepgramTextRef.current = null;
    }
    try {
      audioStreamObj && audioStreamObj.stop();
    } catch {}
    // Cleanup TTS player
    try {
      if (ttsPlayerRef.current) {
        if (ttsListenerRef.current) {
          ttsPlayerRef.current.removeListener(ttsListenerRef.current);
          ttsListenerRef.current = null;
        }
        ttsPlayerRef.current.pause();
        ttsPlayerRef.current = null;
      }
    } catch {}
    // Save conversation history to server (memory feature)
    setConversation((prev) => {
      if (prev.length > 0) {
        const messages = prev.map((m) => ({
          type: m.role === 'user' ? 'user' : 'assistant',
          text: m.text,
        }));
        const lang = langRef.current || 'bisaya';
        const title = `Voice ${lang.charAt(0).toUpperCase() + lang.slice(1)} — ${new Date().toLocaleDateString()}`;
        api.saveConversation(messages, title).catch((err) => {
          console.warn('[VoiceMode] Failed to save conversation:', err.message);
        });
      }
      return prev;
    });
    navigation.goBack();
  }, [audioStreamObj, navigation, stopVadMonitor]);

  const onSuggestion = useCallback(
    (label) => {
      hapticTap();
      sendText(label);
    },
    [sendText]
  );

  const speakCard = useCallback(
    (rate) => {
      speakReply(lastReplyRef.current, rate);
    },
    [speakReply]
  );

  const inConversation = conversation.length > 0 || hasSpoken;

  const renderItem = useCallback(
    ({ item, index }) => {
      const isRecent = index >= conversation.length - 2;
      const wrapperStyle = [styles.transcriptItem, !isRecent && styles.transcriptDim];
      if (item.role === 'user') {
        return (
          <View style={wrapperStyle}>
            <UserMessage
              text={item.text}
              pronunciation={item.pronunciation}
              userAvatarId={userAvatarId}
            />
          </View>
        );
      }
      const isLast = index === conversation.length - 1;
      return (
        <View style={wrapperStyle}>
          <SultiMessage
            text={item.text}
            speaking={orbState === 'speaking' && isLast}
            onSpeak={speakCard}
            showRepeat={false}
            emphasis={isLast}
          />
        </View>
      );
    },
    [orbState, speakCard, conversation.length, userAvatarId]
  );

  const isThinking = orbState === 'thinking';

  return (
    <View style={styles.root}>
      <VoiceBackground>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={endSession}
            style={styles.iconBtn}
            accessibilityLabel="Close voice mode"
          >
            <View style={styles.iconInner}>
              <Ionicons name="chevron-down" size={22} color={voice.text} />
            </View>
          </TouchableOpacity>
          <View style={styles.topTitleWrap} accessibilityRole="header">
            <SultiTalkingAvatar
              size={28}
              mood={
                orbState === 'speaking'
                  ? 'speaking'
                  : orbState === 'thinking'
                    ? 'thinking'
                    : orbState === 'listening'
                      ? 'listening'
                      : 'idle'
              }
            />
            <View style={styles.topTitleTextWrap}>
              <Text style={styles.topTitle}>SULTI</Text>
              <Text style={styles.topSubtitle}>Voice Tutor</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={[styles.iconBtn, styles.langBtn]}
            accessibilityRole="button"
            accessibilityLabel={`Language: ${(LANG_META[language] || LANG_META.bisaya).label}. Tap to switch.`}
          >
            <View style={styles.langInner}>
              <Text style={styles.langFlag}>{(LANG_META[language] || LANG_META.bisaya).flag}</Text>
              <Text style={styles.langText}>{(LANG_META[language] || LANG_META.bisaya).label}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <XpToast visible={xpToastVisible} amount={15} streak={streak} offset={insets.top + 58} />

        {/* Main content */}
        {inConversation ? (
          <View style={styles.convLayout}>
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(400)}
              style={styles.convOrbZone}
            >
              <SultiStage
                state={orbState}
                size={ORB_TALK}
                avatarSize={AVATAR_TALK}
                amplitude={amplitude}
                onPress={toggleRecording}
                styles={styles}
              />
              <View style={styles.convPill}>
                <StatusPill state={orbState} />
              </View>
            </Animated.View>
            <FlatList
              ref={listRef}
              data={conversation}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.convList}
              ListFooterComponent={orbState === 'thinking' ? <TypingIndicator /> : null}
              onContentSizeChange={() =>
                listRef.current && listRef.current.scrollToEnd({ animated: true })
              }
              showsVerticalScrollIndicator={false}
              accessibilityLabel="Conversation with SULTI"
            />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.introLayout}
            showsVerticalScrollIndicator={false}
          >
            <StatusPill state={orbState} />
            <SultiStage
              state={orbState}
              size={ORB_INTRO}
              avatarSize={AVATAR_INTRO}
              amplitude={amplitude}
              onPress={toggleRecording}
              styles={styles}
            />
            <View style={styles.tapHintWrap}>
              <Text style={styles.tapHint}>Tap SULTI to start your lesson</Text>
              <Text style={styles.tapSubHint}>
                Hands-free · speak naturally · SULTI listens and replies
              </Text>
            </View>
            <View style={styles.chipsWrap}>
              <SuggestedChips onPick={onSuggestion} disabled={isThinking} />
            </View>
          </ScrollView>
        )}

        {/* Recording indicator */}
        {recording && !deepgramEnabled && (
          <View style={styles.recordingChip}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>{formatTime(recordingDuration)} · listening</Text>
          </View>
        )}

        {/* Bottom controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
          <VoiceControls
            onMic={toggleRecording}
            onReplay={replayLast}
            onToggleMute={toggleMute}
            onToggleSlow={toggleSlow}
            onOpenSettings={() => {
              hapticTap();
              setSettingsVisible(true);
            }}
            onEnd={endSession}
            recording={recording}
            muted={muted}
            slowMode={slowMode}
            canReplay={!!lastReplyRef.current}
            disabled={isThinking}
          />
        </View>

        <SettingsSheet
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          haptics={hapticsEnabled}
          continuous={continuous}
          slowMode={slowMode}
          onHaptics={setHapticsEnabledState}
          onContinuous={setContinuous}
          onSlow={setSlowMode}
          selectedCharacter={selectedCharacter}
          onCharacterChange={setSelectedCharacter}
          deepgramAvailable={deepgramAvailable}
          deepgramEnabled={deepgramEnabled}
          onDeepgramChange={setDeepgramEnabledState}
        />
        <TtsDebugOverlay styles={styles} />
      </VoiceBackground>
    </View>
  );
}

function TtsDebugOverlay({ styles }) {
  const [msg, setMsg] = useState('TTS · waiting…');
  const [audioState, setAudioState] = useState('unknown');
  
  useEffect(() => {
    return onTtsDebug((m) => setMsg(String(m)));
  }, []);
  
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Report readiness from the shared context instead of allocating a
      // throwaway AudioContext every 2s just to read .state.
      const checkAudio = () => {
        setAudioState(webAudioReady() ? 'running' : 'suspended');
      };
      checkAudio();
      const interval = setInterval(checkAudio, 2000);
      return () => clearInterval(interval);
    }
  }, []);
  
  return (
    <View style={styles.ttsDebugHost} pointerEvents="none">
      <Text style={styles.ttsDebugText} numberOfLines={3}>
        {msg} | Audio: {audioState}
      </Text>
    </View>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function SultiStage({ state, size, avatarSize, amplitude, onPress, styles }) {
  const mood =
    state === 'speaking'
      ? 'speaking'
      : state === 'thinking'
        ? 'thinking'
        : state === 'listening'
          ? 'listening'
          : 'idle';
  return (
    <View style={[styles.stage, { width: size * 1.6, height: size * 1.6 }]}>
      <VoiceOrb state={state} size={size} amplitude={amplitude} onPress={onPress} />
      <View pointerEvents="none" style={styles.stageAvatar}>
        <SultiTalkingAvatar size={avatarSize} mood={mood} />
      </View>
    </View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: voice.glass,
    borderWidth: 1,
    borderColor: voice.glassBorder,
  },
  langBtn: { width: 'auto', paddingHorizontal: 4 },
  langInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: voice.glass,
    borderWidth: 1,
    borderColor: voice.glassBorder,
  },
  langFlag: { fontSize: 13 },
  langText: { color: voice.text, fontSize: 12, fontWeight: '700' },
  topTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitleTextWrap: { alignItems: 'center' },
  topTitle: { color: voice.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  topSubtitle: { color: voice.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  introLayout: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  chipsWrap: { marginTop: 16, width: '100%', alignItems: 'center' },
  tapHintWrap: { alignItems: 'center', marginTop: 8, gap: 4, paddingHorizontal: 24 },
  tapHint: { color: voice.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  tapSubHint: { color: voice.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center' },
  stageAvatar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convLayout: { flex: 1 },
  convOrbZone: { alignItems: 'center', paddingTop: 4 },
  convPill: { marginTop: 6 },
  convList: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 28 },
  transcriptItem: { marginBottom: 4 },
  transcriptDim: { opacity: 0.4, transform: [{ scale: 0.985 }] },
  recordingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: voice.danger,
  },
  recordingText: { color: voice.textSecondary, fontSize: 12, fontWeight: '600' },
  bottomBar: { alignItems: 'center', paddingTop: 10 },
  ttsDebugHost: {
    position: 'absolute',
    bottom: 118,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  ttsDebugText: {
    color: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
