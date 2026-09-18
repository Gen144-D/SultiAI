import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, FlatList,
  ScrollView, AppState, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, withTiming, FadeInDown,
} from 'react-native-reanimated';
import { XP_VALUES } from '../constants';
import { useAccessibility } from '../hooks/useAccessibility';
import {
  useAudioStream, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioSampleListener,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

import VoiceBackground from '../components/voice/VoiceBackground';
import SultiTalkingAvatar from '../components/sulti/SultiTalkingAvatar';
import StatusPill from '../components/voice/StatusPill';
import Greeting from '../components/voice/Greeting';
import SuggestedChips from '../components/voice/SuggestedChips';
import VoiceControls from '../components/voice/VoiceControls';
import SettingsSheet from '../components/voice/SettingsSheet';
import XpToast from '../components/voice/XpToast';
import { UserMessage, SultiMessage, TypingIndicator } from '../components/voice/MessageBubble';
import { voice } from '../components/voice/palette';
import { useGame } from '../context/GameContext';
import { api } from '../services/api';
import { speakTTS, stopTTS, setTTSMuted, getAudioPlayer } from '../utils/tts';
import {
  fetchVoiceAgentConfig, encodeWavBase64, REALTIME_INPUT_RATE,
} from '../services/voiceAgent';
import {
  hapticMicStart, hapticMicEnd, hapticAIBeginsSpeaking, hapticAIFinished,
  hapticError, hapticTap, hapticXpGain, setHapticsEnabled,
} from '../utils/haptics';

const ORB_INTRO = 200;
const ORB_TALK = 150;
const PREFS = {
  haptics: 'voice_haptics',
  continuous: 'voice_continuous',
  slow: 'voice_slow',
  muted: 'voice_muted',
  lang: 'voice_lang',
  character: 'voice_character',
  metaVoice: 'voice_meta_voice',
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
  console.log('[VoiceMode] component mounted');

  const [orbState, setOrbState] = useState('idle');
  const [conversation, setConversation] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [muted, setMuted] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [continuous, setContinuous] = useState(false);
  const [language, setLanguage] = useState('bisaya');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState('blessica');
  const [userAvatarId, setUserAvatarId] = useState('avatar-01');
  const [useMetaVoice, setUseMetaVoice] = useState(false);

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
  const characterRef = useRef('blessica');
  const useMetaVoiceRef = useRef(false);
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

  const handleStreamBuffer = useCallback((buffer) => {
    try {
      if (buffer && buffer.data) {
        console.log('[VoiceMode] onBuffer fired, byteLength:', buffer.data.byteLength);
        // Accumulate audio chunks for pipeline (keep as Int16Array for WAV encoding)
        if (audioChunksRef.current) {
          const existing = audioChunksRef.current;
          const newChunk = new Int16Array(buffer.data.buffer, buffer.data.byteOffset, buffer.data.byteLength / 2);
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
        lastSampleAt.current = Date.now();
      }
    } catch {}
  }, [amplitude]);

  const audioStream = useAudioStream({
    channels: 1,
    encoding: 'int16',
    sampleRate: REALTIME_INPUT_RATE,
    onBuffer: handleStreamBuffer,
  });
  const { stream: nativeStreamObj } = audioStream;

  const webStreamRef = useRef(null);
  const audioStreamObj = Platform.OS === 'web'
    ? { start: async () => { const { createWebAudioStream } = require('../utils/webAudio'); webStreamRef.current = createWebAudioStream({ sampleRate: REALTIME_INPUT_RATE, onBuffer: handleStreamBuffer }); await webStreamRef.current.start(); }, stop: () => { if (webStreamRef.current) { webStreamRef.current.stop(); webStreamRef.current = null; } } }
    : nativeStreamObj;

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
    useMetaVoiceRef.current = useMetaVoice;
  }, [useMetaVoice]);

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
          AsyncStorage.getItem(PREFS.metaVoice),
        ]);
        if (h !== null) setHapticsEnabledState(h === '1');
        if (c !== null) setContinuous(c === '1');
        if (s !== null) setSlowMode(s === '1');
        if (m !== null) setMuted(m === '1');
        if (l !== null) setLanguage(l);
        if (ch !== null) setSelectedCharacter(ch);
        if (mv !== null) setUseMetaVoice(mv === '1');
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('user_avatar_id').then((id) => {
      if (id) setUserAvatarId(id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setTTSMuted(muted);
    AsyncStorage.setItem(PREFS.muted, muted ? '1' : '0').catch(() => {});
  }, [muted]);

  useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
    AsyncStorage.setItem(PREFS.haptics, hapticsEnabled ? '1' : '0').catch(() => {});
  }, [hapticsEnabled]);

  useEffect(() => {
    AsyncStorage.setItem(PREFS.metaVoice, useMetaVoice ? '1' : '0').catch(() => {});
  }, [useMetaVoice]);

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
  const handleSample = useCallback((sample) => {
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
  }, [amplitude]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  Platform.OS !== 'web' && useAudioSampleListener(getAudioPlayer(), handleSample);

  useEffect(() => {
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
      stopTTS();
      try { audioStreamObj && audioStreamObj.stop(); } catch {}
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

  const playTtsUrl = useCallback(async (ttsUrl, ttsAudioBase64 = null) => {
    if (!ttsUrl && !ttsAudioBase64) {
      setOrbState('idle');
      return;
    }
    setOrbState('speaking');
    hapticAIBeginsSpeaking();

    // Ensure audio plays even when device is in silent mode
    try {
      void setAudioModeAsync({ playsInSilentMode: true });
    } catch {}

    try {
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

      if (ttsAudioBase64) {
        // Play base64 audio directly from Meta Voice
        const audioSource = { uri: `data:audio/wav;base64,${ttsAudioBase64}` };
        player.replace(audioSource);
      } else {
        // Play from URL (traditional TTS)
        const { BASE_URL } = require('../services/api');
        const fullUrl = `${BASE_URL}${ttsUrl}`;
        player.replace({ uri: fullUrl });
      }

      ttsListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (status && status.didJustFinish) {
          if (ttsListenerRef.current) {
            player.removeListener(ttsListenerRef.current);
            ttsListenerRef.current = null;
          }
          ttsPlayerRef.current = null;
          setOrbState('idle');
          hapticAIFinished();
          if (continuousRef.current && !isRecordingRef.current) {
            restartTimer.current = setTimeout(() => startRecordingRef.current && startRecordingRef.current(), 650);
          }
        }
      });
      player.play();
    } catch (e) {
      console.warn('[VoiceMode] TTS playback error:', e.message);
      setOrbState('idle');
      hapticAIFinished();
    }
  }, []);

  const abortRecording = useCallback(() => {
    isRecordingRef.current = false;
    setRecording(false);
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    try { audioStreamObj && audioStreamObj.stop(); } catch {}
    audioChunksRef.current = null;
    setOrbState('idle');
  }, [audioStreamObj]);

  const startRecording = useCallback(async () => {
    console.log('[VoiceMode] startRecording called', { isConnecting: isConnectingRef.current, isRecording: isRecordingRef.current, hasStream: !!audioStreamObj });
    if (isConnectingRef.current || isRecordingRef.current) return;
    isConnectingRef.current = true;
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
    } catch (e) {
      console.error('[VoiceMode] startRecording error:', e.message, e);
      setRecording(false);
      setOrbState('idle');
      hapticError();
      Alert.alert('Error', `Could not start the voice session: ${e.message}`);
    } finally {
      isConnectingRef.current = false;
    }
  }, [audioStreamObj]);

  const speakReply = useCallback((text, rate = 0.85) => {
    stopTTS();
    isSpeakingRef.current = true;
    lastReplyRef.current = text;
    setOrbState('speaking');
    hapticAIBeginsSpeaking();
    speakTTS(text, {
      voice: charRef.current,
      language: { bisaya: 'ceb', tagalog: 'tl', english: 'en-US' }[langRef.current] || 'en-US',
      rate,
      onDone: () => {
        isSpeakingRef.current = false;
        setOrbState('idle');
        hapticAIFinished();
        if (continuousRef.current && !isRecordingRef.current) {
          restartTimer.current = setTimeout(() => startRecordingRef.current && startRecordingRef.current(), 650);
        }
      },
      onError: () => {
        isSpeakingRef.current = false;
        setOrbState('idle');
        hapticAIFinished();
      },
    });
  }, []);

  const stopRecording = useCallback(async () => {
    console.log('[VoiceMode] stopRecording called', { isRecording: isRecordingRef.current });
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setRecording(false);
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    setOrbState('thinking');
    hapticMicEnd();
    try { audioStreamObj.stop(); } catch {}

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
      console.log('[VoiceMode] WAV base64 length:', wavBase64.length, 'sending to voice pipeline...');
      
      // Use Meta Voice if enabled, otherwise use traditional pipeline
      const useMeta = useMetaVoiceRef.current;
      const sourceLang = langRef.current === 'bisaya' ? 'ceb' : langRef.current === 'tagalog' ? 'tl' : 'en';
      const targetLang = 'en'; // Default to English for responses
      
      const data = await api.voiceChat(null, wavBase64, sessionIdRef.current, useMeta);
      console.log('[VoiceMode] voice pipeline response:', JSON.stringify({ 
        reply: data.reply?.substring(0, 80), 
        tts_url: data.tts_url, 
        tts_audio_base64: data.tts_audio_base64 ? 'present' : 'absent',
        transcription: data.transcription?.substring(0, 50),
        meta_voice_used: data.meta_voice_used 
      }));

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
        if (!mutedRef.current) {
          if (data.tts_audio_base64) {
            // Use Meta Voice base64 audio
            playTtsUrl(null, data.tts_audio_base64);
          } else if (data.tts_url) {
            // Use traditional TTS URL
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
      console.error('[VoiceMode] Voice pipeline error:', e.message, e);
      setOrbState('idle');
      hapticError();
      Alert.alert('Error', `Could not process the voice message: ${e.message}`);
    }
  }, [audioStreamObj, addMessage, addXp, playTtsUrl]);

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

  const sendText = useCallback(async (message) => {
    console.log('[VoiceMode] sendText called:', message.substring(0, 50));
    if (isSpeakingRef.current) stopTTS();
    const wasRecording = isRecordingRef.current;
    if (wasRecording) {
      await stopRecording();
      return;
    }
    addMessage('user', message, null);
    setOrbState('thinking');
    try {
      const data = await api.voiceChat(message, null, sessionIdRef.current);
      console.log('[VoiceMode] sendText response:', JSON.stringify({ reply: data.reply?.substring(0, 80), tts_url: data.tts_url }));
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
  }, [stopRecording, playTtsUrl, addMessage, addXp]);

  const toggleRecording = useCallback(() => {
    console.log('[VoiceMode] toggleRecording called', { isSpeaking: isSpeakingRef.current, isRecording: isRecordingRef.current, isConnecting: isConnectingRef.current });
    if (isSpeakingRef.current) {
      stopTTS();
      isSpeakingRef.current = false;
      setOrbState('idle');
      hapticTap();
      return;
    }
    if (isRecordingRef.current || isConnectingRef.current) stopRecording();
    else startRecording();
  }, [startRecording, stopRecording]);

  const replayLast = useCallback(() => {
    if (!lastReplyRef.current) return;
    hapticTap();
    speakReply(lastReplyRef.current, slowRef.current ? 0.55 : 0.85);
  }, [speakReply]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) stopTTS();
      hapticTap();
      return !m;
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
    try { audioStreamObj && audioStreamObj.stop(); } catch {}
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
        const messages = prev.map((m) => ({ type: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
        const lang = langRef.current || 'bisaya';
        const title = `Voice ${lang.charAt(0).toUpperCase() + lang.slice(1)} — ${new Date().toLocaleDateString()}`;
        api.saveConversation(messages, title).catch((err) => {
          console.warn('[VoiceMode] Failed to save conversation:', err.message);
        });
      }
      return prev;
    });
    navigation.goBack();
  }, [audioStreamObj, navigation]);

  const onSuggestion = useCallback((label) => {
    hapticTap();
    sendText(label);
  }, [sendText]);

  const speakCard = useCallback((rate) => {
    speakReply(lastReplyRef.current, rate);
  }, [speakReply]);

  const inConversation = conversation.length > 0 || hasSpoken;

  const renderItem = useCallback(({ item, index }) => {
    if (item.role === 'user') {
      return <UserMessage text={item.text} pronunciation={item.pronunciation} userAvatarId={userAvatarId} />;
    }
    const isLast = index === conversation.length - 1;
    return <SultiMessage text={item.text} speaking={orbState === 'speaking' && isLast} onSpeak={speakCard} />;
  }, [orbState, speakCard, conversation.length, userAvatarId]);

  const isThinking = orbState === 'thinking';

  return (
    <View style={styles.root}>
      <VoiceBackground>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={endSession} style={styles.iconBtn} accessibilityLabel="Close voice mode">
            <View style={styles.iconInner}>
              <Ionicons name="chevron-down" size={22} color={voice.text} />
            </View>
          </TouchableOpacity>
          <View style={styles.topTitleWrap} accessibilityRole="header">
            <SultiTalkingAvatar size={28} mood={orbState === 'speaking' ? 'speaking' : orbState === 'thinking' ? 'thinking' : orbState === 'listening' ? 'listening' : 'idle'} />
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
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(400)} style={styles.convOrbZone}>
              <StatusPill state={orbState} />
              <View style={styles.convOrb}>
                <SultiTalkingAvatar size={ORB_TALK} mood={orbState === 'speaking' ? 'speaking' : orbState === 'thinking' ? 'thinking' : orbState === 'listening' ? 'listening' : 'idle'} />
              </View>
            </Animated.View>
            <FlatList
              ref={listRef}
              data={conversation}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.convList}
              ListFooterComponent={orbState === 'thinking' ? <TypingIndicator /> : null}
              onContentSizeChange={() => listRef.current && listRef.current.scrollToEnd({ animated: true })}
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
            <View style={styles.introOrb}>
              <SultiTalkingAvatar size={ORB_INTRO} mood={orbState === 'speaking' ? 'speaking' : orbState === 'thinking' ? 'thinking' : orbState === 'listening' ? 'listening' : 'idle'} />
            </View>
            <Greeting visible />
            <View style={styles.chipsWrap}>
              <SuggestedChips onPick={onSuggestion} disabled={isThinking} />
            </View>
          </ScrollView>
        )}

        {/* Recording indicator */}
        {recording && (
          <View style={styles.recordingChip}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>{formatTime(recordingDuration)} · tap orb to finish</Text>
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
          useMetaVoice={useMetaVoice}
          onMetaVoiceChange={setUseMetaVoice}
        />
      </VoiceBackground>
    </View>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconInner: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: voice.glass, borderWidth: 1, borderColor: voice.glassBorder,
  },
  langBtn: { width: 'auto', paddingHorizontal: 4 },
  langInner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    backgroundColor: voice.glass, borderWidth: 1, borderColor: voice.glassBorder,
  },
  langFlag: { fontSize: 13 },
  langText: { color: voice.text, fontSize: 12, fontWeight: '700' },
  topTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitleTextWrap: { alignItems: 'center' },
  topTitle: { color: voice.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  topSubtitle: { color: voice.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  introLayout: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, paddingVertical: 16,
  },
  introOrb: { alignItems: 'center', marginTop: 18, marginBottom: 8 },
  chipsWrap: { marginTop: 16, width: '100%', alignItems: 'center' },
  convLayout: { flex: 1 },
  convOrbZone: { alignItems: 'center', paddingTop: 12 },
  convOrb: { alignItems: 'center', marginTop: 6 },
  convList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  recordingChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingBottom: 4,
  },
  recordingDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: voice.danger,
  },
  recordingText: { color: voice.textSecondary, fontSize: 12, fontWeight: '600' },
  bottomBar: { alignItems: 'center', paddingTop: 12 },
});
