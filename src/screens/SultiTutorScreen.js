import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { XP_VALUES } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCrossPlatformRecorder } from '../hooks/useCrossPlatformRecorder';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { speakTTS, stopTTS, playTtsUrl } from '../utils/tts';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import SultiTalkingAvatar from '../components/sulti/SultiTalkingAvatar';
import AuroraBackground from '../components/AuroraBackground';
import UnifiedHeroCard from '../components/sulti/UnifiedHeroCard';
import TopicCard from '../components/sulti/TopicCard';
import DailyStreakCard from '../components/sulti/DailyStreakCard';
import RoleplayCard from '../components/sulti/RoleplayCard';
import BottomSheet from '../components/BottomSheet';
import { spacing, borderRadius, getTabBarClearance, shadows, typography } from '../theme';
import { readableOnGradient, ensureContrast, ensureContrastAcross } from '../theme/moduleColors';
import { SITUATIONS as SITUATION_CATALOG, getTutorRoleplayScenarios } from '../utils/situations';
import useAdaptiveTutor from '../hooks/useAdaptiveTutor';

const CHAT_HISTORY_KEY = 'sultiai_chat_history';
const ROLEPLAY_CHIPS_LIMIT = 6;

const SUGGESTED_PROMPTS = [
  { text: 'Teach me everyday Bisaya', icon: 'language' },
  { text: 'Help me practice English', icon: 'chatbubbles' },
  { text: 'How do I order food in Cebuano?', icon: 'restaurant' },
  { text: 'Correct my sentence', icon: 'checkmark-circle' },
];

const SITUATIONS = SITUATION_CATALOG;
const ROLEPLAY_SITUATIONS = getTutorRoleplayScenarios();

// Animated shadow colours need a real alpha channel, and the mic's glow ramps
// continuously as the button pulses, so a precomputed token cannot cover it.
const withAlpha = (hex, alpha) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

function AnimatedMessage({ children, index }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { stiffness: 200, damping: 20 }));
    scale.value = withDelay(delay, withSpring(1, { stiffness: 200, damping: 20 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function TypingDots({ color }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = (dot, delay) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(delay, withTiming(-6, { duration: 300, easing: Easing.inOut(Easing.sin) })),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    };
    anim(dot1, 0);
    anim(dot2, 200);
    anim(dot3, 400);
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 8, paddingLeft: 4 }}>
      <Animated.View
        style={[
          { width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: 0.6 },
          style1,
        ]}
      />
      <Animated.View
        style={[
          { width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: 0.6 },
          style2,
        ]}
      />
      <Animated.View
        style={[
          { width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: 0.6 },
          style3,
        ]}
      />
    </View>
  );
}

function AnimatedWaveform({ color = '#fff' }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <WaveformBar key={i} index={i} color={color} />
      ))}
    </View>
  );
}

function WaveformBar({ index, color }) {
  const height = useSharedValue(8);

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(6 + ((index * 3) % 12) + 4, { duration: 300 + index * 40 }),
        withTiming(6, { duration: 300 + index * 40 })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    width: 3,
    height: height.value,
    borderRadius: 1.5,
    backgroundColor: color,
    opacity: 0.8,
  }));

  return <Animated.View style={style} />;
}

export default function SultiTutorScreen({ navigation, route }) {
  const { colors, isDark, onPrimary } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { addXp, hearts } = useGame();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const adaptiveTutor = useAdaptiveTutor();
  const isCompactHeader = screenWidth < 390;

  // The hub header is painted with the theme's own gradient, so its ink and
  // translucent overlays have to be derived from that gradient rather than
  // pinned to Midnight Teal's mint.
  const hubInk = readableOnGradient([colors.gradientStart, colors.gradientEnd]);
  const hubOverlay = isDark ? `${hubInk}38` : `${colors.text}33`;
  const hubOverlayStrong = isDark ? `${hubInk}4D` : `${colors.text}40`;
  // The header gradient is a theme colour, so the heart has to be measured
  // against its harshest stop rather than against the page surface.
  const hubHeartInk = ensureContrastAcross(
    colors.coral,
    [colors.gradientStart, colors.gradientEnd],
    4.5
  );

  // SULTI paints a lot of icon-only controls straight onto saturated fills
  // (the primary composer buttons, the speaking/success mic, the recording
  // status bar). Those icons used to be a hardcoded white, which clears 4.5:1
  // on only one of the four themes — white on Midnight Teal's mint is 1.88:1,
  // so the mic and send glyphs were effectively invisible. `onPrimary` is the
  // app-wide ink for a primary fill; it is measured here so a fill that
  // onPrimary happens to fail still gets a readable glyph.
  const inkOn = (fill) => ensureContrast(onPrimary, fill, 4.5);
  const primaryInk = inkOn(colors.primary);
  const secondaryFillInk = inkOn(colors.secondary);
  const successFillInk = inkOn(colors.success);
  const errorFillInk = inkOn(colors.error);
  // The composer sits on the page. On light themes it needs a real drop shadow
  // so it lifts off the surface; on dark themes the surface is already darker
  // than the card, so a soft shadow tinted to the theme's own deepest background
  // reads as depth without muddying the border. This must be an object, not a
  // string, or the spread below produces numeric character keys, not a shadow.
  const composerShadow = isDark
    ? {
        boxShadow: `0 2px 10px ${withAlpha(colors.backgroundDeep, 0.55)}, 0 1px 3px ${withAlpha(colors.backgroundDeep, 0.4)}`,
        elevation: 3,
      }
    : shadows.xl;

  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: `Kumusta! I'm Sulti, your Bisaya language companion.\n\nTap a topic below to start learning, or type/speak anything!`,
      quickActions: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [level, setLevel] = useState(null);
  const [sultiMode, setSultiMode] = useState('hub');
  const [showRoleplay, setShowRoleplay] = useState(false);
  const [showRoleplaySheet, setShowRoleplaySheet] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [webViewportHeight, setWebViewportHeight] = useState(null);
  const inputRef = useRef(null);
  // Practice Topics scroll pagination state
  const [topicViewWidth, setTopicViewWidth] = useState(0);
  const [topicContentWidth, setTopicContentWidth] = useState(0);
  const [topicPage, setTopicPage] = useState(0);
  const flatListRef = useRef(null);
  const isRecordingRef = useRef(false);
  const durationInterval = useRef(null);
  const messagesRef = useRef(messages);
  // Stable identity for the chat currently on screen: the AsyncStorage record
  // key and, once created, the server-side conversation id.
  const activeConversationRef = useRef(null);
  const activeServerIdRef = useRef(null);
  const serverSyncRef = useRef(Promise.resolve());

  // Single source of truth for message mutations. Computes the next array from
  // the ref and syncs it synchronously, so callers that add an assistant reply
  // and persist in the same tick don't read the previous render's array.
  const applyMessages = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(messagesRef.current) : updater;
    messagesRef.current = next;
    setMessages(next);
    return next;
  }, []);

  const crossRecorder = useCrossPlatformRecorder();

  const micGlow = useSharedValue(0);
  // Send button mini-scale animation (grows slightly when text is present)
  const sendScale = useSharedValue(0.92);

  useEffect(() => {
    sendScale.value = withSpring(input.trim() ? 1 : 0.92, { stiffness: 380, damping: 22 });
  }, [input]);

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  useEffect(() => {
    if (crossRecorder.isRecording || isSpeaking) {
      micGlow.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    } else {
      micGlow.value = withTiming(0, { duration: 300 });
    }
  }, [crossRecorder.isRecording, isSpeaking]);

  // The glow tints to whatever the mic button is currently filled with, so the
  // recording (error) and speaking (success) states both halo correctly instead
  // of always flaring the old fixed teal.
  const micGlowFill = crossRecorder.isRecording ? colors.error : colors.primary;
  const micGlowStyle = useAnimatedStyle(() => ({
    boxShadow: `0 0 ${8 + micGlow.value * 12}px ${withAlpha(micGlowFill, 0.4 + micGlow.value * 0.4)}`,
    elevation: 4 + micGlow.value * 6,
  }));

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = () => setIsKeyboardVisible(true);
    const onKeyboardHide = () => setIsKeyboardVisible(false);

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Web: track the soft keyboard via the Visual Viewport API. Keyboard events
  // never fire in React Native Web, and in the Messenger in-app browser the
  // layout viewport may not resize, so we track the visible viewport height
  // and shrink the app so the composer floats directly above the keyboard.
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;
    let mounted = true;
    const initialH = window.innerHeight;
    const vv = window.visualViewport;

    const update = () => {
      if (!mounted) return;
      if (vv && typeof vv.height === 'number') {
        setWebViewportHeight(vv.height);
        setIsKeyboardVisible(Math.max(0, window.innerHeight - vv.height) > 150);
      } else {
        setIsKeyboardVisible(Math.max(0, initialH - window.innerHeight) > 150);
      }
    };

    if (vv) vv.addEventListener('resize', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    return () => {
      mounted = false;
      if (vv) vv.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Web: lock the document to the dynamic viewport (dvh) so the soft keyboard
  // resizes the layout instead of the browser scrolling/repositioning the
  // page, and strip the default <textarea>/<input> chrome (border, focus
  // outline, resize grabber) from the composer fields.
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return undefined;
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      html, body, #root {
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
        overscroll-behavior: none;
      }
      textarea[data-testid='sulti-chat-input'],
      textarea[data-testid='sulti-hub-input'] {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        resize: none !important;
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, []);

  // Keep the latest message pinned just above the keyboard whenever the
  // keyboard appears (works on web via the Visual Viewport listener).
  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 260);
    }
  }, [isKeyboardVisible]);

  const inChatMode = sultiMode === 'chat';
  const composerBottomInset = inChatMode
    ? isKeyboardVisible
      ? spacing.sm
      : insets.bottom + spacing.md
    : isKeyboardVisible
      ? spacing.xs
      : getTabBarClearance(insets);

  const webShrinkHeight =
    isWeb && inChatMode && isKeyboardVisible && webViewportHeight ? webViewportHeight : null;

  // Hide the 5-item tab bar while the user is inside the active chat thread so
  // it never collides with the message composer (Messenger/WhatsApp pattern).
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: inChatMode ? { display: 'none' } : {},
    });
  }, [inChatMode, navigation]);

  async function loadLevel() {
    try {
      const d = await api.getTutorLevel();
      setLevel(d);
    } catch (e) {
      console.warn('[SultiTutor] Failed to load level:', e.message);
    }
  }

  async function loadChatHistory() {
    try {
      const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) setChatHistory(JSON.parse(raw));
    } catch (e) {
      console.warn('[SultiTutor] Failed to load chat history:', e.message);
    }
  }

  /**
   * Mirror a local history record into the server database. The first turn
   * creates the row and stores its numeric id; later turns replace the stored
   * transcript so the DB always holds the same full thread as the device.
   */
  const syncConversationToServer = async (record) => {
    if (!record?.messages?.length) return;
    const payload = record.messages
      .filter((m) => m.text || m.transcription)
      .map((m) => ({
        role: m.role || 'user',
        text: m.text || m.transcription || '',
      }));
    if (payload.length === 0) return;
    try {
      // Serialize syncs: two quick turns would otherwise both miss
      // activeServerIdRef and each create a separate server conversation.
      serverSyncRef.current = serverSyncRef.current
        .then(async () => {
          const serverId = activeServerIdRef.current || record.serverId;
          if (serverId) {
            await api.updateConversation(serverId, payload, record.title);
            return;
          }
          const created = await api.saveConversation(payload, record.title);
          if (!created?.id) return;
          const newId = String(created.id);
          activeServerIdRef.current = newId;
          record.serverId = newId;
          setChatHistory((prev) => prev.map((h) => (h.id === record.id ? record : h)));
          const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
          if (raw) {
            const list = JSON.parse(raw);
            const index = list.findIndex((h) => h.id === record.id);
            if (index !== -1) {
              list[index] = record;
              await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(list));
            }
          }
        })
        .catch((e) => {
          // Offline or server unavailable: local history is still saved.
          console.warn('[SultiTutor] Server sync failed:', e.message);
        });
      await serverSyncRef.current;
    } catch (e) {
      console.warn('[SultiTutor] Server sync failed:', e.message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLevel();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChatHistory();
    adaptiveTutor.loadState();
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current);
      stopTTS();
    };
  }, []);

  const persistChatHistory = async (snapshot) => {
    const current = snapshot || messagesRef.current;
    const real = current.filter((m) => m.role !== 'assistant' || !m.quickActions);
    if (real.length === 0) return;
    const firstUser = real.find((m) => m.role === 'user' || m.role === 'user_voice');
    // Keep one stable key for the whole chat. sessionId only becomes available
    // after the first reply, so keying on it would fork a new history entry
    // (and a new DB conversation) on the second turn.
    const key = activeConversationRef.current || sessionId || `local_${Date.now()}`;
    activeConversationRef.current = key;
    const existing = chatHistory.find((h) => h.id === key);
    const record = {
      ...existing,
      id: key,
      title: existing?.title || firstUser?.text || firstUser?.transcription || 'Voice conversation',
      date: new Date().toISOString(),
      messages: current.slice(0, 80),
      count: real.length,
    };
    const merged = [record, ...chatHistory.filter((h) => h.id !== key)].slice(0, 10);
    setChatHistory(merged);
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('[SultiTutor] Failed to persist chat history:', e.message);
    }
    syncConversationToServer(record);
  };

  const loadConversation = (record) => {
    setShowHistory(false);
    if (record?.messages?.length) {
      applyMessages(record.messages);
      setSessionId(record.id?.startsWith('local_') ? null : record.id);
      activeConversationRef.current = record.id;
      activeServerIdRef.current = record.serverId || null;
    }
  };

  const deleteHistoryItem = (id) => {
    const target = chatHistory.find((h) => h.id === id);
    const next = chatHistory.filter((h) => h.id !== id);
    setChatHistory(next);
    AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('[SultiTutor] Failed to persist chat history:', e.message)
    );
    // Drop the server copy too, otherwise deleted chats keep coming back.
    if (target?.serverId) {
      api.deleteHistory(target.serverId).catch((e) =>
        console.warn('[SultiTutor] Failed to delete server conversation:', e.message)
      );
    }
    if (activeConversationRef.current === id) {
      activeConversationRef.current = null;
      activeServerIdRef.current = null;
    }
  };

  const clearAllHistory = () => {
    Alert.alert(
      'Clear all conversations?',
      'This permanently deletes every past conversation saved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setChatHistory([]);
            activeConversationRef.current = null;
            activeServerIdRef.current = null;
            AsyncStorage.removeItem(CHAT_HISTORY_KEY).catch((e) =>
              console.warn('[SultiTutor] Failed to clear chat history:', e.message)
            );
            chatHistory.forEach((h) => {
              if (h.serverId) {
                api.deleteHistory(h.serverId).catch(() => {});
              }
            });
          },
        },
      ]
    );
  };

  const clearConversation = () => {
    setChatMenuVisible(false);
    if (messages.length === 0) return;
    Alert.alert(
      'Clear conversation?',
      'This clears the current chat and removes it from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const firstUser = messages.find((m) => m.role === 'user' || m.role === 'user_voice');
            const realCount = messages.filter(
              (m) => m.role !== 'assistant' || !m.quickActions
            ).length;
            const title = firstUser?.text || firstUser?.transcription || undefined;
            const target = chatHistory.find(
              (h) => h.count === realCount && (!title || h.title === title)
            );
            const next = target ? chatHistory.filter((h) => h.id !== target.id) : chatHistory;
            setChatHistory(next);
            applyMessages([]);
            setSessionId(null);
            activeConversationRef.current = null;
            activeServerIdRef.current = null;
            setInput('');
            AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next)).catch((e) =>
              console.warn('[SultiTutor] Failed to persist chat history:', e.message)
            );
          },
        },
      ]
    );
  };

  const startRecording = async () => {
    try {
      const started = await crossRecorder.startRecording();
      if (!started) return Alert.alert('Permission Denied', 'Microphone access is needed.');
      isRecordingRef.current = true;
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current && !crossRecorder.isRecording) return;
    isRecordingRef.current = false;
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    setRecordingDuration(0);
    setLoading(true);

    try {
      const audioBase64 = await crossRecorder.stopRecording();
      if (!audioBase64 || audioBase64.length < 100) {
        addMessage('assistant', 'Recording too short.');
        setLoading(false);
        return;
      }

      addMessage('user_voice', '', { audio: true, transcription: '' });

      const data = await api.voiceChat('', audioBase64, sessionId);
      if (data.session_id) setSessionId(data.session_id);

      addMessage('assistant', data.reply, {
        pronunciation: data.pronunciation,
        transcription: data.transcription,
        analysis: data.analysis,
      });

      if (data.analysis?.user_level) setLevel((p) => ({ ...p, level: data.analysis.user_level }));
      const topic = data.analysis?.topics?.[0] || 'general';
      const pronScore = data.pronunciation?.score || 80;
      adaptiveTutor.recordInteraction(topic, pronScore >= 60, pronScore);
      addXp(XP_VALUES.VOICE_PRACTICE_TURN, 'voice_practice');
      if (data.reply) playVoiceReply(data.reply, data.tts_url, data.tts_failed);

      // Attach the transcript to the voice turn, then persist. Matching the
      // last *user_voice* entry (not the last entry) keeps this correct now
      // that the assistant reply has already been appended.
      const withTranscript = applyMessages((prev) => {
        let target = -1;
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          if (prev[i].role === 'user_voice') {
            target = i;
            break;
          }
        }
        if (target === -1) return prev;
        return prev.map((m, i) =>
          i === target ? { ...m, transcription: data.transcription || 'Voice message' } : m
        );
      });
      persistChatHistory(withTranscript);
    } catch (e) {
      addMessage('assistant', `Could not process audio: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
      if (continuousMode) setTimeout(() => startRecording(), 300);
      return;
    }
    if (isRecordingRef.current || crossRecorder.isRecording) stopRecording();
    else startRecording();
  };

  const speakReply = (text) => {
    if (!text) return;
    setIsSpeaking(true);
    speakTTS(text, {
      voice: 'blessica',
      language: 'ceb',
      rate: 0.9,
      onDone: () => {
        setIsSpeaking(false);
        if (continuousMode) setTimeout(() => startRecording(), 600);
      },
      onError: () => setIsSpeaking(false),
    });
  };

  const playVoiceReply = (reply, ttsUrl, ttsFailed) => {
    if (!reply) return;
    if (ttsUrl && !ttsFailed) {
      setIsSpeaking(true);
      playTtsUrl(ttsUrl, {
        onDone: () => {
          setIsSpeaking(false);
          if (continuousMode) setTimeout(() => startRecording(), 600);
        },
        onError: () => {
          setIsSpeaking(false);
          speakReply(reply);
        },
      });
    } else {
      speakReply(reply);
    }
  };

  const addMessage = (role, text, extra = {}) =>
    applyMessages((prev) => [...prev, { id: Date.now().toString(), role, text, ...extra }]);

  const sendMessage = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    if (hearts <= 0) {
      Alert.alert('No Hearts', "You're out of hearts! Refill to continue.");
      return;
    }
    setSultiMode('chat');
    const msgId = Date.now().toString();
    addMessage('user', text, { _msgId: msgId });
    setInput('');
    setLoading(true);

    try {
      console.log('[SultiChat] Sending:', text.substring(0, 60));
      const data = await api.tutorChat(text, null, sessionId);
      console.log('[SultiChat] Response received, length:', data.reply?.length || 0);
      if (data.session_id) setSessionId(data.session_id);
      addMessage('assistant', data.reply, {
        pronunciation: data.pronunciation,
        analysis: data.analysis,
      });
      if (data.analysis?.user_level) setLevel((p) => ({ ...p, level: data.analysis.user_level }));
      const chatTopic = data.analysis?.topics?.[0] || 'general';
      adaptiveTutor.recordInteraction(chatTopic, true, 85);
      addXp(XP_VALUES.TUTOR_CHAT, 'chat');
      if (data.reply) speakReply(data.reply);
      persistChatHistory(messagesRef.current);
    } catch (err) {
      console.warn('[SultiChat] Error:', err.message);
      applyMessages((prev) =>
        prev.map((m) => (m._msgId === msgId ? { ...m, error: err.message } : m))
      );
    } finally {
      setLoading(false);
    }
  };

  const retryMessage = (msgId, text) => {
    applyMessages((prev) => prev.map((m) => (m._msgId === msgId ? { ...m, error: undefined } : m)));
    sendMessage(text);
  };

  const handleSuggestedPrompt = (prompt) => {
    sendMessage(prompt.text);
  };

  const pickSituation = async (situation) => {
    setSultiMode('chat');
    setLoading(true);
    addMessage('user', `Teach me about: ${situation}`);
    try {
      const data = await api.generateLesson(situation);
      addMessage('lesson', data.reply || data.lesson, { ...data });
      addXp(XP_VALUES.TUTOR_LESSON, 'lesson');
    } catch (err) {
      addMessage('assistant', `Sorry: ${err.message}`);
    } finally {
      persistChatHistory(messagesRef.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    const situation = route?.params?.situation;
    if (situation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      pickSituation(situation);
      navigation.setParams({ situation: undefined, label: undefined });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [route?.params?.situation]);

  const startRoleplay = async (rp) => {
    setSultiMode('chat');
    setShowRoleplay(false);
    setLoading(true);
    const characterLine = rp.character ? ` (${rp.character})` : '';
    addMessage('user', `Let's roleplay: ${rp.prompt}${characterLine}`);
    const instruction = `Let's start a role-play scenario: ${rp.prompt}.${rp.character ? ' ' + rp.character : ''}\n\nAct as the local person in this situation and stay in character for the WHOLE role-play:\n- Open the conversation in Bisaya with an English translation.\n- Keep each line short and natural, like a real back-and-forth conversation.\n- Gently correct me in character if I make a mistake.\n- Do not break character or switch into teaching mode.\n- Start now with your opening line.`;
    try {
      const data = await api.tutorChat(instruction, null, sessionId);
      if (data.session_id) setSessionId(data.session_id);
      addMessage('assistant', data.reply);
      addXp(XP_VALUES.ROLEPLAY_START, 'roleplay');
    } catch (err) {
      addMessage('assistant', `Sorry: ${err.message}`);
    } finally {
      persistChatHistory(messagesRef.current);
      setLoading(false);
    }
  };

  const openVoiceMode = () => {
    navigation.navigate('VoiceMode', { sessionId });
  };

  const startChat = () => {
    applyMessages([]);
    setSultiMode('chat');
  };

  const startNewChat = () => {
    applyMessages([]);
    setSessionId(null);
    // A new chat needs a fresh key and a fresh server conversation, otherwise
    // the next turn would overwrite the previous thread.
    activeConversationRef.current = null;
    activeServerIdRef.current = null;
    setInput('');
    setChatMenuVisible(false);
  };

  const backToHub = () => {
    setSultiMode('hub');
  };

  const renderMessage = useCallback(
    ({ item, index }) => {
      if (item.role === 'lesson')
        return <AnimatedMessage index={index}>{renderLessonCard(item)}</AnimatedMessage>;
      if (item.role === 'assistant' && item.quickActions)
        return <AnimatedMessage index={index}>{renderWelcomeCard(item)}</AnimatedMessage>;

      const isUser = item.role === 'user' || item.role === 'user_voice';
      const bubbleBg = isUser ? colors.primary : colors.surfaceSecondary;
      const bubbleText = isUser ? primaryInk : colors.text;

      return (
        <AnimatedMessage index={index}>
          <View style={styles.chatMsgWrapper}>
            {!isUser && (
              <View style={styles.chatMsgAvatar}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chatBubbleAvatar}
                >
                  <Ionicons name="sparkles" size={10} color={secondaryFillInk} />
                </LinearGradient>
              </View>
            )}
            <View style={[isUser ? styles.chatMsgRight : styles.chatMsgLeft, { maxWidth: '78%' }]}>
              <View
                style={[
                  styles.chatBubble,
                  { backgroundColor: bubbleBg },
                  isUser ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                ]}
              >
                {item.role === 'user_voice' && (
                  <View style={styles.chatVoiceLabel}>
                    <Ionicons name="mic" size={12} color={bubbleText} style={{ opacity: 0.7 }} />
                    <Text style={[styles.chatVoiceLabelText, { color: bubbleText, opacity: 0.7 }]}>
                      Voice
                    </Text>
                  </View>
                )}
                <Text style={[styles.chatBubbleText, { color: bubbleText }]} selectable>
                  {item.role === 'user_voice' ? item.transcription || 'Voice message' : item.text}
                </Text>
                {!isUser && item.text && item.text.length > 60 && (
                  <TouchableOpacity
                    style={styles.chatCopyBtn}
                    onPress={() => Alert.alert('Message', item.text, [{ text: 'OK' }])}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {/* Error state with retry */}
              {isUser && item.error && (
                <TouchableOpacity
                  style={styles.chatErrorRow}
                  onPress={() => retryMessage(item._msgId, item.text)}
                >
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.chatErrorText, { color: colors.error }]} numberOfLines={2}>
                    {item.error}
                  </Text>
                  <Text style={[styles.chatRetryText, { color: colors.primary }]}>Retry</Text>
                </TouchableOpacity>
              )}
              {/* eslint-disable-next-line */}
              {item.role === 'assistant' &&
                item.pronunciation &&
                renderPronunciationCard(item.pronunciation, item.transcription)}
              {!isUser && !item.pronunciation && !item.quickActions && (
                <TouchableOpacity
                  style={styles.chatListenBtn}
                  onPress={() => item.text && speakReply(item.text)}
                >
                  <Ionicons name="volume-medium-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.chatListenText, { color: colors.textMuted }]}>Listen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </AnimatedMessage>
      );
    },
    [colors, onPrimary, level, adaptiveTutor.difficulty, loading, showRoleplay]
  );

  const renderWelcomeCard = (msg) => (
    <GlassCard variant="elevated" style={styles.welcomeCard}>
      <View style={styles.welcomeHeader}>
        <SultiTalkingAvatar size={56} mood="idle" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeName, { color: colors.text }]}>Sulti!</Text>
          <Text style={[styles.welcomeTitle, { color: colors.textMuted }]}>
            Your Bisaya Companion
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {level && (
              <Badge
                title={
                  level.level === 'advanced'
                    ? 'Abante'
                    : level.level === 'intermediate'
                      ? 'Tunga'
                      : 'Sugod'
                }
                variant={
                  level.level === 'advanced'
                    ? 'error'
                    : level.level === 'intermediate'
                      ? 'warning'
                      : 'success'
                }
                size="sm"
              />
            )}
            {adaptiveTutor.difficulty && (
              <Badge
                title={`A-${adaptiveTutor.difficulty[0].toUpperCase()}`}
                variant="info"
                size="sm"
              />
            )}
          </View>
        </View>
      </View>
      <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>{msg.text}</Text>
      <Text style={[styles.promptLabel, { color: colors.textMuted }]}>
        Choose a topic to practice
      </Text>
      <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
        Tap a topic for key phrases and a mini-lesson
      </Text>
      <View style={styles.situationGrid}>
        {SITUATIONS.map((s) => (
          <TouchableOpacity
            key={s.label}
            style={[
              styles.situationChip,
              { backgroundColor: s.color + '15', borderColor: s.color + '30' },
            ]}
            onPress={() => pickSituation(s.situation || s.label)}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.chipLabel, { color: s.color }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.roleplayToggle}
        onPress={() => setShowRoleplay(!showRoleplay)}
        activeOpacity={0.7}
      >
        <Ionicons name="game-controller" size={16} color={colors.primary} />
        <Text style={[styles.roleplayText, { color: colors.primary }]}>Role-Play Scenarios</Text>
        <Ionicons
          name={showRoleplay ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.primary}
        />
      </TouchableOpacity>
      <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
        Sulti plays a local character — you act out the scene together
      </Text>
      {showRoleplay && (
        <View style={styles.roleplayGrid}>
            {ROLEPLAY_SITUATIONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleplayChip, { backgroundColor: colors.primary + '15' }]}
                onPress={() => startRoleplay(r)}
                disabled={loading}
                activeOpacity={0.7}

            >
              <Text style={styles.roleplayEmoji}>{r.emoji}</Text>
              <Text style={[styles.roleplayLabel, { color: colors.primary }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </GlassCard>
  );

  const renderPronunciationCard = (pron, transcription) => {
    if (!pron) return null;
    const scoreColor =
      pron.score >= 80 ? colors.success : pron.score >= 50 ? colors.warning : colors.error;
    return (
      <GlassCard style={styles.pronCard} padding="md">
        <View style={styles.pronHeader}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pronIcon}
          >
            <Ionicons name="mic-outline" size={12} color={secondaryFillInk} />
          </LinearGradient>
          <Text style={[styles.pronLabel, { color: colors.primary }]}>Pronunciation Score</Text>
        </View>
        <View style={styles.pronScoreRow}>
          <Text style={[styles.pronScoreValue, { color: scoreColor }]}>{pron.score}</Text>
          <Text style={[styles.pronScoreUnit, { color: colors.textSecondary }]}>/100</Text>
          <View style={[styles.pronScoreBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.pronScoreFill,
                { width: `${pron.score}%`, backgroundColor: scoreColor },
              ]}
            />
          </View>
        </View>
        {transcription && (
          <View style={styles.pronTranscription}>
            <Text style={[styles.pronLabelSmall, { color: colors.textSecondary }]}>You said:</Text>
            <Text style={[styles.pronValue, { color: colors.text }]}>{transcription}</Text>
          </View>
        )}
        {pron.feedback && (
          <View
            style={[
              styles.pronFeedbackBox,
              { backgroundColor: scoreColor + '10', borderColor: scoreColor + '20' },
            ]}
          >
            <Ionicons
              name={pron.score >= 80 ? 'checkmark-circle' : 'information-circle'}
              size={14}
              color={scoreColor}
            />
            <Text style={[styles.pronFeedback, { color: colors.text }]}>{pron.feedback}</Text>
          </View>
        )}
        {pron.phoneme_breakdown?.length > 0 && (
          <View style={[styles.phonemeContainer, { borderTopColor: colors.border }]}>
            {pron.phoneme_breakdown.map((p, i) => (
              <View
                key={i}
                style={[
                  styles.phonemeRow,
                  p.correct && { backgroundColor: colors.success + '08', borderRadius: 6 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={p.correct ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={p.correct ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      styles.phonemeText,
                      { color: colors.text },
                      !p.correct && { color: colors.error },
                    ]}
                  >
                    {p.expected}
                  </Text>
                </View>
                {!p.correct && (
                  <Text style={[styles.phonemeTip, { color: colors.textSecondary }]}>{p.tip}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </GlassCard>
    );
  };

  const renderLessonCard = (msg) => {
    const phrases = msg.phrases || [];
    const dialogue = msg.dialogue || [];
    return (
      <GlassCard variant="elevated" style={styles.lessonCard}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lessonHeader}
        >
          <View style={styles.lessonHeaderIcon}>
            <Ionicons name="school-outline" size={16} color={primaryInk} />
          </View>
          <Text style={styles.lessonTitle}>{msg.situation || 'Practice Lesson'}</Text>
        </LinearGradient>
        {msg.text && <Text style={[styles.lessonIntro, { color: colors.text }]}>{msg.text}</Text>}
        {phrases.length > 0 && (
          <View style={styles.lessonSection}>
            <View style={styles.sectionBadge}>
              <Badge title="Key Phrases" variant="info" size="sm" />
            </View>
            {phrases.map((p, i) => (
              <View key={i} style={[styles.phraseRow, { backgroundColor: colors.glassBg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.phraseBisaya, { color: colors.text }]}>{p.bisaya}</Text>
                  <Text style={[styles.phraseEnglish, { color: colors.textSecondary }]}>
                    {p.english}
                  </Text>
                  {p.pronunciation && (
                    <Text style={[styles.phrasePron, { color: colors.textMuted }]}>
                      {p.pronunciation}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.phraseListenBtn, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => p.bisaya && speakReply(p.bisaya)}
                >
                  <Ionicons name="volume-high" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {dialogue.length > 0 && (
          <View style={styles.lessonSection}>
            <View style={styles.sectionBadge}>
              <Badge title="Practice Dialogue" variant="warning" size="sm" />
            </View>
            {dialogue.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.dialogueRow,
                  { borderLeftColor: i % 2 === 0 ? colors.primary : colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.dialogueSpeaker,
                    { color: i % 2 === 0 ? colors.primary : colors.accent },
                  ]}
                >
                  {d.speaker}:
                </Text>
                <Text style={[styles.dialogueText, { color: colors.text }]}>{d.bisaya}</Text>
                <Text style={[styles.dialogueEnglish, { color: colors.textSecondary }]}>
                  {d.english}
                </Text>
              </View>
            ))}
          </View>
        )}
        {msg.cultural_note && (
          <View
            style={[
              styles.cultureNote,
              { backgroundColor: colors.accentLight, borderColor: colors.accent + '20' },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: spacing.xs,
              }}
            >
              <Ionicons name="leaf-outline" size={14} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>
                Culture Tip
              </Text>
            </View>
            <Text style={[styles.cultureText, { color: colors.text }]}>{msg.cultural_note}</Text>
          </View>
        )}
      </GlassCard>
    );
  };

  const renderTypingIndicator = () => (
    <View style={styles.chatTypingRow}>
      <View style={styles.chatMsgAvatar}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chatBubbleAvatar}
        >
          <Ionicons name="sparkles" size={10} color={secondaryFillInk} />
        </LinearGradient>
      </View>
      <View style={[styles.chatTypingBubble, { backgroundColor: colors.surfaceSecondary }]}>
        <TypingDots color={colors.primary} />
      </View>
    </View>
  );

  const renderHub = () => (
    <>
      {/* Compact Gradient Header with Improved Stats */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrapper}>
              <SultiTalkingAvatar
                size={34}
                mood={
                  crossRecorder.isRecording
                    ? 'listening'
                    : isSpeaking
                      ? 'speaking'
                      : loading
                        ? 'thinking'
                        : 'idle'
                }
              />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.headerTitle, { color: hubInk }]}>Sulti</Text>
              <View style={[styles.headerStatusPill, { backgroundColor: hubOverlayStrong }]}>
                <View
                  style={[
                    styles.headerStatusDot,
                    { backgroundColor: hubInk, opacity: 0.9 },
                  ]}
                />
                <Text style={[styles.headerStatusText, { color: hubInk }]}>
                  {isSpeaking
                    ? 'Speaking...'
                    : loading
                      ? 'Thinking...'
                      : level?.level || 'Beginner'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* History Button (icon with high contrast + generous hit area) */}
            <TouchableOpacity
              style={styles.headerIconGroup}
              onPress={() => setShowHistory(true)}
              accessibilityLabel="Chat history"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={[styles.headerIconBtn, { backgroundColor: hubOverlay }]}>
                <Ionicons name="time-outline" size={18} color={hubInk} />
              </View>
            </TouchableOpacity>
            {/* Stats — one merged pill rather than two competing badges */}
            {level && (
              <View style={[styles.headerStatPill, { backgroundColor: hubOverlay }]}>
                <Ionicons name="flame" size={12} color={hubInk} />
                <Text style={[styles.headerStatPillText, { color: hubInk }]}>
                  {isCompactHeader
                    ? `${level.total_sessions || 0}s`
                    : `${level.total_sessions || 0} Sessions`}
                </Text>
                <View style={[styles.headerStatDivider, { backgroundColor: `${hubInk}33` }]} />
                <Ionicons name="star" size={12} color={hubInk} />
                <Text style={[styles.headerStatPillText, { color: hubInk }]}>
                  {level.total_xp || 0} XP
                </Text>
              </View>
            )}
            {/* Hearts — coral is unreadable on a bright gradient, so it is
                pulled to a guaranteed-contrast ink for the active header. */}
            <View style={[styles.headerHeartPill, { backgroundColor: `${hubHeartInk}2E` }]}>
              <Ionicons name="heart" size={12} color={hubHeartInk} />
              <Text style={[styles.headerHeartText, { color: hubHeartInk }]}>{hearts}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.hubScroll}
        contentContainerStyle={styles.hubContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card with Improved Visual Balance */}
        <GlassCard variant="elevated" style={styles.welcomeCard} padding="xl">
          <View style={styles.welcomeHeader}>
            {/* Text on the left */}
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.welcomeName}>Kumusta! 👋</Text>
              <Text style={[styles.welcomeTitle, { color: colors.textMuted }]}>
                Your Bisaya language companion
              </Text>
            </View>
            {/* Mascot on the right */}
            <View style={styles.avatarWrapperLarge}>
              <SultiTalkingAvatar size={72} mood="idle" />
            </View>
          </View>

          {/* Primary action spans the full card width; the difficulty chip stays
              a small inline secondary control. */}
          <View style={styles.welcomeBadges}>
            {level && (
              <TouchableOpacity
                style={[styles.levelCtaBtn, { backgroundColor: colors.primary }]}
                onPress={() =>
                  sendMessage(
                    `Let's practice at my current level. What should I focus on today?`
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Practice at ${level.level === 'advanced' ? 'Abante' : level.level === 'intermediate' ? 'Tunga' : 'Sugod'} level`}
                activeOpacity={0.8}
              >
                <Text style={[styles.levelCtaText, { color: onPrimary }]}>
                  {level.level === 'advanced'
                    ? 'Abante'
                    : level.level === 'intermediate'
                      ? 'Tunga'
                      : 'Sugod'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={onPrimary} />
              </TouchableOpacity>
            )}
            {adaptiveTutor.difficulty && (
              <View style={[styles.levelBadgeOutline, { borderColor: colors.primary + '59' }]}>
                <Text style={[styles.levelBadgeText, { color: colors.primary }]}>
                  A-{adaptiveTutor.difficulty[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Unified Practice Hero (Text / Voice toggle) */}
        <View style={styles.hubHeroWrap}>
          <UnifiedHeroCard onChat={startChat} onVoice={openVoiceMode} />
        </View>

        {/* Topic Practice */}
        <View style={styles.hubSection}>
          <Text style={[styles.hubSectionTitle, { color: colors.text }]}>Practice Topics</Text>
          <View
            style={styles.topicScroller}
            onLayout={(e) => setTopicViewWidth(e.nativeEvent.layout.width)}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hubTopicGrid}
              onContentSizeChange={(w) => setTopicContentWidth(w)}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const viewW = Math.max(e.nativeEvent.layoutMeasurement.width, 1);
                setTopicPage(Math.max(0, Math.round(x / viewW)));
                setTopicViewWidth(viewW);
              }}
              scrollEventThrottle={32}
              keyboardShouldPersistTaps="handled"
            >
              {SITUATIONS.map((s) => (
                <TopicCard
                  key={s.label}
                  label={s.label}
                  icon={s.icon}
                  color={s.color}
                  desc={s.desc}
                  onPress={() => pickSituation(s.label)}
                  disabled={loading}
                />
              ))}
            </ScrollView>

            {/* Right-edge fade affordance */}
            {topicContentWidth > topicViewWidth && (
              <LinearGradient
                colors={['transparent', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                pointerEvents="none"
                style={styles.topicFade}
              />
            )}
          </View>

          {/* Pagination dots */}
          {topicContentWidth > 0 && topicViewWidth > 0 && topicContentWidth > topicViewWidth && (
            <View style={styles.topicDots}>
              {Array.from({ length: Math.ceil(topicContentWidth / topicViewWidth) }).map((_, i) => (
                <View
                  key={i}
            style={[
              styles.topicDot,
              { backgroundColor: colors.borderHover },
              i === topicPage && [styles.topicDotActive, { backgroundColor: colors.primary }],
            ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Daily Streak & Word of the Day */}
        <View style={styles.hubSection}>
          <DailyStreakCard
            streak={Math.max(
              1,
              Math.min(
                30,
                Math.floor((level?.total_sessions || 0) / 5) + (level?.total_sessions ? 3 : 1)
              )
            )}
            onPractice={(word) =>
              sendMessage(
                `Let's practice the word "${word.word}" (${word.meaning}) — teach me how to use it in a real sentence.`
              )
            }
          />
        </View>

        {/* Role-Play (limited to 6 chips, full list in bottom sheet) */}
        <RoleplayCard
          onPress={() => setShowRoleplay(!showRoleplay)}
          onViewAll={() => setShowRoleplaySheet(true)}
          expanded={showRoleplay}
          colors={colors}
        >
          <View style={styles.hubRoleplayGrid}>
            {ROLEPLAY_SITUATIONS.slice(0, ROLEPLAY_CHIPS_LIMIT).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.hubRoleplayChip, { backgroundColor: colors.primary + '15' }]}
                onPress={() => startRoleplay(r)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.hubRoleplayEmoji}>{r.emoji}</Text>
                <Text style={[styles.hubRoleplayLabel, { color: colors.primary }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </RoleplayCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Full role-play list */}
      <BottomSheet
        visible={showRoleplaySheet}
        onClose={() => setShowRoleplaySheet(false)}
        title="All Role-Play Scenarios"
        bottomInset={getTabBarClearance(insets)}
      >
        <View style={styles.roleplaySheetGrid}>
          {ROLEPLAY_SITUATIONS.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[
                styles.roleplaySheetRow,
                shadows.sm,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                setShowRoleplaySheet(false);
                startRoleplay(r);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.roleplaySheetIcon, { backgroundColor: r.color + '1F' }]}>
                <Text style={styles.roleplaySheetEmoji}>{r.emoji}</Text>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.roleplaySheetLabel, { color: colors.text }]}
              >
                {r.label}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* Quick Chat Input */}
      <BlurView
        intensity={100}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.composerContainer,
          { borderTopColor: colors.glassBorder, paddingBottom: composerBottomInset },
        ]}
      >
        <View
        style={[
          styles.composerWrap,
          {
            backgroundColor: isInputFocused ? colors.surface : colors.surfaceStrong,
            borderColor: isInputFocused ? `${colors.primary}66` : colors.borderHover,
            ...composerShadow,
          },
        ]}
        >
          <View style={styles.inputWrap}>
            <TextInput
              testID="sulti-hub-input"
              style={[styles.input, { color: colors.text }]}
              placeholder="Ask Sulti anything..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              onFocus={() => {
                setIsInputFocused(true);
                // Jump straight into the full chat thread so the dashboard
                // cards never sit behind the active conversation.
                setSultiMode('chat');
                setTimeout(() => inputRef.current?.focus(), 180);
              }}
              onBlur={() => setIsInputFocused(false)}
              editable={!loading}
              multiline
              autoComplete="off"
              autoCorrect={false}
              blurOnSubmit={false}
            />
          </View>
          <View style={styles.composerActions}>
            <Animated.View style={micGlowStyle}>
              <TouchableOpacity
                style={[
                  styles.composerMic,
                  { backgroundColor: colors.primary },
                  crossRecorder.isRecording && { backgroundColor: colors.error },
                  isSpeaking && { backgroundColor: colors.success },
                ]}
                onPress={toggleRecording}
                disabled={loading}
                accessibilityLabel="Record voice"
                hitSlop={10}
              >
        <Ionicons
          name={isSpeaking ? 'volume-high' : crossRecorder.isRecording ? 'stop' : 'mic'}
          size={22}
          color={crossRecorder.isRecording ? errorFillInk : isSpeaking ? successFillInk : primaryInk}
        />
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={sendAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.composerSend,
                  { backgroundColor: colors.primary },
                  (!input.trim() || loading) && { opacity: 0.5 },
                ]}
                onPress={sendMessage}
                disabled={loading || !input.trim()}
                accessibilityLabel="Send message"
                hitSlop={10}
              >
                <Ionicons name="arrow-up" size={22} color={primaryInk} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </BlurView>
    </>
  );

  const renderChat = () => {
    const hasRealConvo = messages.some(
      (m) =>
        m.role === 'user' || m.role === 'user_voice' || (m.role === 'assistant' && !m.quickActions)
    );

    return (
      <>
        {/* Clean Chat Header */}
        <View
          style={[
            styles.chatHeader,
            {
              paddingTop: insets.top + spacing.sm,
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.chatHeaderRow}>
            <TouchableOpacity
              onPress={backToHub}
              style={styles.chatBackBtn}
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.chatAvatarSmall}>
              <SultiTalkingAvatar
                size={36}
                mood={
                  crossRecorder.isRecording
                    ? 'listening'
                    : isSpeaking
                      ? 'speaking'
                      : loading
                        ? 'thinking'
                        : 'idle'
                }
              />
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={[styles.chatHeaderName, { color: colors.text }]}>SULTI</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.chatHeaderSubtitle, { color: colors.textSecondary }]}>
                  {isSpeaking ? 'Speaking…' : loading ? 'Thinking…' : 'Online · AI tutor'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.chatMenuBtn}
              onPress={() => setChatMenuVisible(true)}
              accessibilityLabel="Chat options"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State */}
        {!hasRealConvo && !loading ? (
          <ScrollView
            style={styles.chatEmptyScroll}
            contentContainerStyle={styles.chatEmptyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.chatEmptyAvatar}>
              <SultiTalkingAvatar size={64} mood="idle" />
            </View>
            <Text style={[styles.chatEmptyGreeting, { color: colors.text }]}>
              {"Hi! I'm SULTI"}
            </Text>
            <Text style={[styles.chatEmptySubtitle, { color: colors.textSecondary }]}>
              What would you like to practice today?
            </Text>
            <Text style={[styles.chatEmptyHint, { color: colors.textMuted }]}>
              Your AI language tutor for Bisaya and English
            </Text>
            <View style={styles.suggestedPrompts}>
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.suggestedPromptChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handleSuggestedPrompt(prompt)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name={prompt.icon} size={16} color={colors.primary} />
                  <Text style={[styles.suggestedPromptText, { color: colors.text }]}>
                    {prompt.text}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.textMuted}
                    style={{ marginLeft: 'auto' }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            onContentSizeChange={() => {
              if (flatListRef.current) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
              }
            }}
            contentContainerStyle={styles.chatMessageList}
            renderItem={renderMessage}
            ListFooterComponent={
              loading ? renderTypingIndicator() : <View style={{ height: spacing.md }} />
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* Recording / Speaking Status */}
        {(crossRecorder.isRecording || isSpeaking) && (
          <View
            style={[
              styles.statusBar,
              { backgroundColor: crossRecorder.isRecording ? colors.error : colors.primary },
            ]}
          >
            <Ionicons
              name={crossRecorder.isRecording ? 'mic' : 'volume-high'}
              size={14}
              color={crossRecorder.isRecording ? errorFillInk : primaryInk}
            />
            <Text
              style={[
                styles.statusText,
                { color: crossRecorder.isRecording ? errorFillInk : primaryInk },
              ]}
            >
              {crossRecorder.isRecording
                ? `Listening ${String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:${String(recordingDuration % 60).padStart(2, '0')}`
                : isSpeaking
                  ? 'SULTI is speaking...'
                  : ''}
            </Text>
            {crossRecorder.isRecording && <AnimatedWaveform color={errorFillInk} />}
            {isSpeaking && (
              <TouchableOpacity
                onPress={() => {
                  stopTTS();
                  setIsSpeaking(false);
                }}
              >
                <Text style={[styles.statusActionText, { color: primaryInk }]}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Message Composer */}
        <Animated.View
          style={[
            styles.composerOuter,
            {
              paddingBottom: composerBottomInset,
              backgroundColor: colors.surface,
              borderTopColor: isInputFocused ? colors.primary + '30' : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.composerInner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: isInputFocused ? colors.primary + '40' : colors.border,
              },
              isInputFocused && { ...shadows.md },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.composerAddBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
              onPress={() => setChatMenuVisible(true)}
              accessibilityLabel="Chat options"
              hitSlop={8}
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              testID="sulti-chat-input"
              style={[styles.composerInput, { color: colors.text }]}
              placeholder="Message SULTI..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              onFocus={() => {
                setIsInputFocused(true);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
              }}
              onBlur={() => setIsInputFocused(false)}
              editable={!loading}
              multiline
              maxLength={2000}
              autoComplete="off"
              autoCorrect={false}
              textAlignVertical="center"
              returnKeyType="default"
              blurOnSubmit={false}
            />
            {input.trim() || loading ? (
              <Animated.View entering={FadeIn.duration(150)}>
                <TouchableOpacity
                  style={[
                    styles.composerSendBtn,
                    { backgroundColor: input.trim() && !loading ? colors.primary : colors.border },
                    input.trim() && !loading && { ...shadows.md },
                  ]}
                  onPress={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  accessibilityLabel="Send message"
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="arrow-up"
                    size={22}
                    color={input.trim() && !loading ? primaryInk : colors.textMuted}
                  />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(150)}>
                <TouchableOpacity
                  style={[
                    styles.composerMicBtn,
                    crossRecorder.isRecording && { backgroundColor: colors.error },
                    isSpeaking && { backgroundColor: colors.success },
                  ]}
                  onPress={toggleRecording}
                  disabled={loading}
                  accessibilityLabel="Voice input"
                  hitSlop={8}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name={
                      isSpeaking
                        ? 'volume-high'
                        : crossRecorder.isRecording
                          ? 'stop'
                          : 'mic-outline'
                    }
                    size={22}
                    color={
          crossRecorder.isRecording
            ? errorFillInk
            : isSpeaking
            ? successFillInk
            : colors.textSecondary
        }
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Chat Menu Modal */}
        <Modal
          visible={chatMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setChatMenuVisible(false)}
        >
          <TouchableOpacity
            style={[styles.chatMenuOverlay]}
            activeOpacity={1}
            onPress={() => setChatMenuVisible(false)}
          >
            <View
              style={[
                styles.chatMenuSheet,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[styles.chatMenuItem, { borderBottomColor: colors.border }]}
                onPress={startNewChat}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.chatMenuItemText, { color: colors.text }]}>New Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chatMenuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setChatMenuVisible(false);
                  setShowHistory(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.chatMenuItemText, { color: colors.text }]}>Chat History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chatMenuItem, { borderBottomColor: colors.border }]}
                onPress={clearConversation}
              >
                <Ionicons name="trash-outline" size={20} color={colors.coral} />
                <Text style={[styles.chatMenuItemText, { color: colors.text }]}>
                  Clear Conversation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatMenuItem}
                onPress={() => setChatMenuVisible(false)}
              >
                <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.chatMenuItemText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  return (
    <AuroraBackground style={styles.container} atmosphere="sulti">
      <KeyboardAvoidingView
        style={[{ flex: 1 }, webShrinkHeight != null && { height: webShrinkHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {sultiMode === 'hub' ? renderHub() : renderChat()}

        <Modal
          visible={showHistory}
          transparent
          animationType="slide"
          onRequestClose={() => setShowHistory(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
            <View
              style={[
                styles.modalSheet,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Sulti&apos;s Memory
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    History & what Sulti remembers about you
                  </Text>
                </View>
                <View style={styles.modalHeaderActions}>
                  {chatHistory.length > 0 ? (
                    <TouchableOpacity
                      style={[styles.clearAllBtn, { backgroundColor: colors.coral + '18' }]}
                      onPress={clearAllHistory}
                      accessibilityLabel="Clear all chat history"
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.coral} />
                      <Text style={[styles.clearAllText, { color: colors.coral }]}>Clear All</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => setShowHistory(false)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={[
                  styles.memorySection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>AI MEMORY</Text>
                <View style={styles.memoryChips}>
                  {[
                    user?.fullname ? `Name: ${user.fullname.split(' ')[0]}` : null,
                    user?.native_language ? `Native: ${user.native_language}` : null,
                    user?.target_language ? `Learning: ${user.target_language}` : null,
                    adaptiveTutor.difficulty ? `Level: ${adaptiveTutor.difficulty}` : null,
                    level?.level ? `Tutor: ${level.level}` : null,
                    level?.total_xp ? `${level.total_xp} total XP` : null,
                  ]
                    .filter(Boolean)
                    .map((m) => (
                      <View
                        key={m}
                        style={[styles.memoryChip, { backgroundColor: colors.primary + '15' }]}
                      >
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                        <Text style={[styles.memoryChipText, { color: colors.primary }]}>{m}</Text>
                      </View>
                    ))}
                </View>
              </View>

              <Text
                style={[styles.memoryLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}
              >
                CONVERSATIONS
              </Text>
              {chatHistory.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.historyEmptyText, { color: colors.textSecondary }]}>
                    No past conversations yet
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={chatHistory}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.historyRow,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.historyRowMain}
                        onPress={() => {
                          loadConversation(item);
                          setSultiMode('chat');
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.historyIcon, { backgroundColor: colors.softPurple }]}>
                          <Ionicons name="chatbubbles" size={16} color={colors.primary} />
                        </View>
                        <View style={styles.historyInfo}>
                          <Text
                            style={[styles.historyTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                            {item.count} msgs · {new Date(item.date).toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.historyDeleteBtn}
                        onPress={() => deleteHistoryItem(item.id)}
                        accessibilityLabel={`Delete ${item.title}`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.coral} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </AuroraBackground>
  );
}

// Baseline for the composer. The themed inline `composerShadow` overrides this at
// the render site; this stays as the neutral token value so the static
// StyleSheet does not carry a hardcoded blue-grey that belongs to no theme.
const INPUT_BAR_SHADOW = shadows.xl;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: spacing.sm,
  },
  avatarWrapper: {
    borderRadius: borderRadius.xxl,
    ...shadows.soft,
    overflow: 'hidden',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
    fontWeight: '500',
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  headerStatusDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Header icon button (label removed - icon only with generous hit area)
  headerIconGroup: { alignItems: 'center' },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // New stat pills
  headerStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  headerStatPillText: { fontSize: 11, fontWeight: '600' },
  headerStatDivider: {
    width: 1,
    height: 12,
    borderRadius: 0.5,
    marginHorizontal: 2,
  },
  headerHeartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  headerHeartText: { fontSize: 12, fontWeight: '700' },
  // Legacy styles for compatibility
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  headerPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerStat: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1, marginLeft: 50 },
  // ---- Chat Screen Styles ----
  chatHeader: { borderBottomWidth: 1 },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  chatBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarSmall: { borderRadius: borderRadius.full, overflow: 'hidden' },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { ...typography.h4, fontSize: 17, fontWeight: '700' },
  chatHeaderSubtitle: { ...typography.caption, fontSize: 12, fontWeight: '500', marginTop: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5 },
  chatMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state
  chatEmptyScroll: { flex: 1 },
  chatEmptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.lg,
  },
  chatEmptyAvatar: { marginBottom: spacing.md },
  chatEmptyGreeting: {
    ...typography.h2,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  chatEmptySubtitle: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  chatEmptyHint: {
    ...typography.caption,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  suggestedPrompts: { width: '100%', gap: spacing.sm + 2 },
  suggestedPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  suggestedPromptText: { ...typography.body, fontSize: 16, fontWeight: '500', flex: 1 },
  // Message list
  chatMessageList: { padding: spacing.md, paddingBottom: spacing.md, flexGrow: 1 },
  chatList: { flex: 1, minHeight: 0 },
  // Message bubbles
  chatMsgWrapper: { flexDirection: 'row', marginBottom: spacing.sm + 2, alignItems: 'flex-end' },
  chatMsgAvatar: { marginRight: spacing.sm - 2, marginBottom: 2 },
  chatMsgRight: { alignItems: 'flex-end', marginLeft: 'auto' },
  chatMsgLeft: { alignItems: 'flex-start' },
  chatBubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBubble: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    position: 'relative',
  },
  chatBubbleUser: { borderBottomRightRadius: borderRadius.sm - 2 },
  chatBubbleAssistant: { borderBottomLeftRadius: borderRadius.sm - 2 },
  chatBubbleText: { ...typography.body, fontSize: 16, lineHeight: 24 },
  chatVoiceLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  chatVoiceLabelText: { ...typography.caption, fontSize: 11, fontWeight: '600' },
  chatCopyBtn: { position: 'absolute', bottom: 2, right: 4, padding: 4 },
  chatListenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 6,
  },
  chatListenText: { ...typography.caption, fontSize: 11 },
  chatErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: spacing.sm,
  },
  chatErrorText: { ...typography.caption, fontSize: 12, flex: 1 },
  chatRetryText: { ...typography.caption, fontSize: 12, fontWeight: '700' },
  // Typing indicator
  chatTypingRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md },
  chatTypingBubble: {
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // Composer
  composerOuter: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1 },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderWidth: 1.5,
    ...shadows.sm,
    ...INPUT_BAR_SHADOW,
  },
  composerMicBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerAddBtn: {
    width: 44,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  composerInput: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
    maxHeight: 100,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
  },
  composerSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Chat menu
  chatMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: spacing.lg,
  },
  chatMenuSheet: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 180,
    ...shadows.lg,
  },
  chatMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatMenuItemText: { ...typography.body, fontSize: 15, fontWeight: '500' },
  // ---- End Chat Screen Styles ----
  // Status bar (recording/speaking)
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusActionText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  welcomeCard: { marginBottom: spacing.lg + 4, borderRadius: borderRadius.xxl, ...shadows.premium },
  welcomeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatarWrapperLarge: {
    borderRadius: borderRadius.xxl,
    ...shadows.premium,
    overflow: 'hidden',
  },
  welcomeName: { ...typography.h2, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  welcomeTitle: { ...typography.body, fontSize: 14, marginTop: 4, lineHeight: 19, opacity: 0.85 },
  welcomeText: { ...typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
  promptLabel: { ...typography.body, fontSize: 14, fontWeight: '600', marginTop: spacing.md },
  welcomeBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  levelBadgeOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  levelCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  levelCtaText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  levelBadgeText: { fontSize: 11, fontWeight: '700' },
  hubHeroWrap: { marginBottom: spacing.xl },
  hubSection: { marginBottom: spacing.xxl },
  sectionHeader: { marginBottom: spacing.md },
  hubSectionTitle: {
    ...typography.h4,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  hubSectionSubtitle: { ...typography.body, fontSize: 14, lineHeight: 19 },
  hubTopicGrid: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xs },
  // Practice Topics scroll affordances
  topicScroller: { marginTop: spacing.xs, position: 'relative' },
  topicFade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 48 },
  topicDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  topicDot: { width: 6, height: 6, borderRadius: 3 },
  topicDotActive: { width: 18 },
  // Welcome card styles
  situationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  situationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  chipLabel: { fontSize: 12, fontWeight: '700' },
  roleplayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  roleplayText: { fontSize: 13, fontWeight: '700' },
  sectionHint: { ...typography.caption, fontSize: 12, fontWeight: '500', marginTop: spacing.xs },
  hubRoleplayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  hubRoleplayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    minHeight: 56,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  hubRoleplayEmoji: { fontSize: 18 },
  hubRoleplayLabel: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  roleplaySheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    rowGap: spacing.sm,
  },
  roleplaySheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '48%',
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  roleplaySheetIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleplaySheetEmoji: { fontSize: 17, lineHeight: 22 },
  roleplaySheetLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  // Styles for welcome card roleplay section
  roleplayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  roleplayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  roleplayEmoji: { fontSize: 16 },
  roleplayLabel: { fontSize: 12, fontWeight: '700' },
  // Clean Input Bar Styles
  composerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    ...shadows.lg,
    ...INPUT_BAR_SHADOW,
    borderWidth: 1,
  },
  composerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // Mic button - outlined secondary
  composerMic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  // Send button - primary teal filled
  composerSend: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  continuousToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  inputWrap: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    ...typography.body,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    lineHeight: 20,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  clearAllText: { fontSize: 12, fontWeight: '700' },
  modalTitle: { ...typography.h3, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalSubtitle: { ...typography.caption, fontSize: 12, fontWeight: '500', marginTop: 2 },
  modalClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memorySection: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  memoryLabel: { ...typography.small, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  memoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  memoryChipText: { ...typography.caption, fontSize: 12, fontWeight: '600' },
  historyEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  historyEmptyText: { ...typography.body, fontSize: 14, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  historyRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: { flex: 1 },
  historyTitle: { ...typography.body, fontSize: 14, fontWeight: '600' },
  historyMeta: { ...typography.caption, fontSize: 12, marginTop: 2 },
  hubScroll: { flex: 1 },
  hubContent: { padding: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.xs },
  typingBubble: { borderWidth: 1 },
});
