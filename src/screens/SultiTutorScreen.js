import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Modal, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { XP_VALUES } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCrossPlatformRecorder } from '../hooks/useCrossPlatformRecorder';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, withRepeat, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { speakTTS, stopTTS } from '../utils/tts';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import SultiTalkingAvatar from '../components/sulti/SultiTalkingAvatar';
import AuroraBackground from '../components/AuroraBackground';
import SultiModeCard from '../components/sulti/SultiModeCard';
import TopicCard from '../components/sulti/TopicCard';
import RoleplayCard from '../components/sulti/RoleplayCard';
import { spacing, borderRadius, getTabBarClearance, shadows, typography } from '../theme';
import useAdaptiveTutor from '../hooks/useAdaptiveTutor';

const CHAT_HISTORY_KEY = 'sultiai_chat_history';

const SITUATIONS = [
  { label: 'Greetings', icon: 'hand-left', desc: 'Meeting someone new', color: '#14B8A6' },
  { label: 'Market', icon: 'cart', desc: 'Buying at the market', color: '#10B981' },
  { label: 'Restaurant', icon: 'restaurant', desc: 'Ordering food', color: '#F59E0B' },
  { label: 'Directions', icon: 'compass', desc: 'Asking for directions', color: '#8B5CF6' },
  { label: 'Jeepney', icon: 'bus', desc: 'Riding jeepney', color: '#EF4444' },
  { label: 'Emergency', icon: 'warning', desc: 'Emergency situations', color: '#FF6B6B' },
  { label: 'Friends', icon: 'people', desc: 'Casual conversation', color: '#EC4899' },
  { label: 'Travel', icon: 'airplane', desc: 'Travel & tourism', color: '#2563EB' },
];

const ROLEPLAY_SITUATIONS = [
  { label: 'Restaurant', emoji: '\u{1F37D}\uFE0F', prompt: 'Ordering food at a restaurant in Cebu', character: 'Sulti is your waiter at a busy restaurant in Cebu. You want to order lechon and rice.' },
  { label: 'Market', emoji: '\u{1F6D2}', prompt: 'Bargaining at the local market', character: 'Sulti is a market vendor at Carbon Market. You are bargaining for fresh mangoes.' },
  { label: 'Jeepney', emoji: '\u{1F68C}', prompt: 'Riding the jeepney', character: 'Sulti is your jeepney driver. Tell him where you are getting off.' },
  { label: 'Hospital', emoji: '\u{1F3E5}', prompt: 'At the hospital', character: 'Sulti is the receptionist at a hospital. You need to describe your symptoms.' },
  { label: 'Interview', emoji: '\u{1F4BC}', prompt: 'Job interview in Bisaya', character: 'Sulti is the interviewer at a job interview. You are applying for a customer service job.' },
  { label: 'Friends', emoji: '\u{1F44B}', prompt: 'Meeting new friends', character: 'Sulti is a friendly local you just met at a gathering in Cebu. Get to know each other.' },
  { label: 'Travel', emoji: '\u2708\uFE0F', prompt: 'Traveling around Cebu', character: 'Sulti is a tour guide showing you around Cebu. Ask about places to visit.' },
  { label: 'Emergency', emoji: '\u{1F6A8}', prompt: 'Emergency situation', character: 'Sulti is a 911 dispatcher. Describe the emergency clearly and calmly.' },
];

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

function TypingDots() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = (dot, delay) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(delay, withTiming(-6, { duration: 300, easing: Easing.inOut(Easing.sin) })),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false
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
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#14B8A6', opacity: 0.6 }, style1]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#14B8A6', opacity: 0.6 }, style2]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#14B8A6', opacity: 0.6 }, style3]} />
    </View>
  );
}

function AnimatedWaveform() {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <WaveformBar key={i} index={i} />
      ))}
    </View>
  );
}

function WaveformBar({ index }) {
  const height = useSharedValue(8);

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(6 + (index * 3) % 12 + 4, { duration: 300 + index * 40 }),
        withTiming(6, { duration: 300 + index * 40 }),
      ),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    width: 3, height: height.value, borderRadius: 1.5, backgroundColor: '#fff', opacity: 0.8,
  }));

  return <Animated.View style={style} />;
}

export default function SultiTutorScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { addXp, hearts } = useGame();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const adaptiveTutor = useAdaptiveTutor();

  const [messages, setMessages] = useState([{
    id: '0', role: 'assistant',
    text: `Kumusta! I'm Sulti, your Bisaya language companion.\n\nTap a topic below to start learning, or type/speak anything!`,
    quickActions: true,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [level, setLevel] = useState(null);
  const [sultiMode, setSultiMode] = useState('hub');
  const [showRoleplay, setShowRoleplay] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef(null);
  const isRecordingRef = useRef(false);
  const durationInterval = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const crossRecorder = useCrossPlatformRecorder();

  const micGlow = useSharedValue(0);

  useEffect(() => {
    if (crossRecorder.isRecording || isSpeaking) {
      micGlow.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      micGlow.value = withTiming(0, { duration: 300 });
    }
  }, [crossRecorder.isRecording, isSpeaking]);

  const micGlowStyle = useAnimatedStyle(() => ({
    boxShadow: `0 0 ${8 + micGlow.value * 12}px ${crossRecorder.isRecording ? 'rgba(239,68,68,' : 'rgba(20,184,166,'}${0.4 + micGlow.value * 0.4})`,
    elevation: 4 + micGlow.value * 6,
  }));

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

  const persistChatHistory = async () => {
    const current = messagesRef.current;
    const real = current.filter((m) => m.role !== 'assistant' || !m.quickActions);
    if (real.length === 0) return;
    const firstUser = real.find((m) => m.role === 'user' || m.role === 'user_voice');
    const record = {
      id: sessionId || `local_${Date.now()}`,
      title: firstUser?.text || firstUser?.transcription || 'Voice conversation',
      date: new Date().toISOString(),
      messages: current.slice(0, 80),
      count: real.length,
    };
    const merged = [record, ...chatHistory.filter((h) => h.id !== record.id)].slice(0, 10);
    setChatHistory(merged);
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('[SultiTutor] Failed to persist chat history:', e.message);
    }
  };

  const loadConversation = (record) => {
    setShowHistory(false);
    if (record?.messages?.length) {
      setMessages(record.messages);
      setSessionId(record.id?.startsWith('local_') ? null : record.id);
    }
  };

  const startRecording = async () => {
    try {
      const started = await crossRecorder.startRecording();
      if (!started) return Alert.alert('Permission Denied', 'Microphone access is needed.');
      isRecordingRef.current = true;
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => { setRecordingDuration(prev => prev + 1); }, 1000);
    } catch { Alert.alert('Error', 'Could not start recording'); }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current && !crossRecorder.isRecording) return;
    isRecordingRef.current = false;
    if (durationInterval.current) { clearInterval(durationInterval.current); durationInterval.current = null; }
    setRecordingDuration(0);
    setLoading(true);

    try {
      const audioBase64 = await crossRecorder.stopRecording();
      if (!audioBase64 || audioBase64.length < 100) { addMessage('assistant', 'Recording too short.'); setLoading(false); return; }

      addMessage('user_voice', '', { audio: true, transcription: '' });

      const data = await api.tutorChat('', audioBase64, sessionId);
      if (data.session_id) setSessionId(data.session_id);

      addMessage('assistant', data.reply, { pronunciation: data.pronunciation, transcription: data.transcription, analysis: data.analysis });

      if (data.analysis?.user_level) setLevel(p => ({ ...p, level: data.analysis.user_level }));
      const topic = data.analysis?.topics?.[0] || 'general';
      const pronScore = data.pronunciation?.score || 80;
      adaptiveTutor.recordInteraction(topic, pronScore >= 60, pronScore);
      addXp(XP_VALUES.VOICE_PRACTICE_TURN, 'voice_practice');
      if (data.reply) speakReply(data.reply);
      persistChatHistory();

      if (messages.length > 0) {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'user_voice'
            ? { ...m, transcription: data.transcription || 'Voice message' }
            : m
        ));
      }
    } catch (e) { addMessage('assistant', `Could not process audio: ${e.message}`); }
    finally { setLoading(false); }
  };

  const toggleRecording = () => {
    if (isSpeaking) { stopTTS(); setIsSpeaking(false); if (continuousMode) setTimeout(() => startRecording(), 300); return; }
    if (isRecordingRef.current || crossRecorder.isRecording) stopRecording();
    else startRecording();
  };

  const speakReply = (text) => {
    if (!text) return;
    setIsSpeaking(true);
    speakTTS(text, {
      language: 'ceb', rate: 0.85,
      onDone: () => { setIsSpeaking(false); if (continuousMode) setTimeout(() => startRecording(), 600); },
      onError: () => setIsSpeaking(false),
    });
  };

  const addMessage = (role, text, extra = {}) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, text, ...extra }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (hearts <= 0) { Alert.alert('No Hearts', "You're out of hearts! Refill to continue."); return; }
    setSultiMode('chat');
    addMessage('user', text);
    setInput('');
    setLoading(true);

    try {
      const data = await api.tutorChat(text, null, sessionId);
      if (data.session_id) setSessionId(data.session_id);
      addMessage('assistant', data.reply, { pronunciation: data.pronunciation, analysis: data.analysis });
      if (data.analysis?.user_level) setLevel(p => ({ ...p, level: data.analysis.user_level }));
      const chatTopic = data.analysis?.topics?.[0] || 'general';
      adaptiveTutor.recordInteraction(chatTopic, true, 85);
      addXp(XP_VALUES.TUTOR_CHAT, 'chat');
      if (data.reply) speakReply(data.reply);
      persistChatHistory();
    } catch (err) { addMessage('assistant', `Sorry: ${err.message}`); }
    finally { setLoading(false); }
  };

  const pickSituation = async (situation) => {
    setSultiMode('chat');
    setLoading(true);
    addMessage('user', `Teach me about: ${situation}`);
    try {
      const data = await api.generateLesson(situation);
      addMessage('lesson', data.reply || data.lesson, { ...data });
      addXp(XP_VALUES.TUTOR_LESSON, 'lesson');
    } catch (err) { addMessage('assistant', `Sorry: ${err.message}`); }
    finally { setLoading(false); }
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
    } catch (err) { addMessage('assistant', `Sorry: ${err.message}`); }
    finally { setLoading(false); }
  };

  const openVoiceMode = () => {
    navigation.navigate('VoiceMode', { sessionId });
  };

  const startChat = () => {
    setSultiMode('chat');
  };

  const backToHub = () => {
    setSultiMode('hub');
  };

  // eslint-disable-next-line
  const renderMessage = useCallback(({ item, index }) => {
    // eslint-disable-next-line
    if (item.role === 'lesson') return <AnimatedMessage index={index}>{renderLessonCard(item)}</AnimatedMessage>;
    // eslint-disable-next-line
    if (item.role === 'assistant' && item.quickActions) return <AnimatedMessage index={index}>{renderWelcomeCard(item)}</AnimatedMessage>;

    const isUser = item.role === 'user' || item.role === 'user_voice';
    return (
      <AnimatedMessage index={index}>
        <View style={{ marginBottom: spacing.sm, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          {!isUser && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 4, gap: 4 }}>
              <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubbleAvatar}>
                <Ionicons name="sparkles" size={10} color="#fff" />
              </LinearGradient>
              <Text style={[styles.bubbleSender, { color: colors.primary }]}>Sulti</Text>
            </View>
          )}
          <LinearGradient
            colors={isUser ? [colors.primary, colors.primaryDark] : [colors.glassBg, colors.glassHighlight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[
              styles.bubble,
              isUser ? styles.userBubble : styles.assistantBubble,
              { borderColor: isUser ? 'transparent' : colors.glassBorder },
            ]}
          >
            {item.role === 'user_voice' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: item.transcription ? 4 : 0, gap: 4 }}>
                <Ionicons name="mic" size={14} color="#fff" />
                {item.transcription ? <Text style={[styles.voiceLabel, { color: 'rgba(255,255,255,0.7)' }]}>Voice</Text> : null}
              </View>
            )}
            <Text style={[styles.bubbleText, { color: isUser ? '#fff' : colors.text }]}>
              {item.role === 'user_voice' ? (item.transcription || 'Voice message') : item.text}
            </Text>
          </LinearGradient>
          {/* eslint-disable-next-line */}
          {item.role === 'assistant' && item.pronunciation && renderPronunciationCard(item.pronunciation, item.transcription)}
          {!isUser && !item.pronunciation && !item.quickActions && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: 4 }}
              onPress={() => item.text && speakReply(item.text)}
            >
              <Ionicons name="volume-medium-outline" size={14} color={colors.textLight} />
              <Text style={[styles.listenLabel, { color: colors.textLight }]}>Listen</Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedMessage>
    );
  }, [colors, level, adaptiveTutor.difficulty, loading, showRoleplay]);

  const renderWelcomeCard = (msg) => (
    <GlassCard variant="elevated" style={styles.welcomeCard}>
      <View style={styles.welcomeHeader}>
        <SultiTalkingAvatar size={56} mood="idle" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeName, { color: colors.text }]}>Sulti!</Text>
          <Text style={[styles.welcomeTitle, { color: colors.textSecondary }]}>Your Bisaya Companion</Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {level && (
              <Badge
                title={level.level === 'advanced' ? 'Abante' : level.level === 'intermediate' ? 'Tunga' : 'Sugod'}
                variant={level.level === 'advanced' ? 'error' : level.level === 'intermediate' ? 'warning' : 'success'}
                size="sm"
              />
            )}
            {adaptiveTutor.difficulty && (
              <Badge title={`A-${adaptiveTutor.difficulty[0].toUpperCase()}`} variant="info" size="sm" />
            )}
          </View>
        </View>
      </View>
      <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>{msg.text}</Text>
      <Text style={[styles.promptLabel, { color: colors.textLight }]}>Choose a topic to practice</Text>
      <Text style={[styles.sectionHint, { color: colors.textLight }]}>Tap a topic for key phrases and a mini-lesson</Text>
      <View style={styles.situationGrid}>
        {SITUATIONS.map((s) => (
          <TouchableOpacity
            key={s.label}
            style={[styles.situationChip, { backgroundColor: s.color + '15', borderColor: s.color + '30' }]}
            onPress={() => pickSituation(s.situation || s.label)}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.chipLabel, { color: s.color }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.roleplayToggle} onPress={() => setShowRoleplay(!showRoleplay)} activeOpacity={0.7}>
        <Ionicons name="game-controller" size={16} color={colors.primary} />
        <Text style={[styles.roleplayText, { color: colors.primary }]}>Role-Play Scenarios</Text>
        <Ionicons name={showRoleplay ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.sectionHint, { color: colors.textLight }]}>Sulti plays a local character — you act out the scene together</Text>
      {showRoleplay && (
        <View style={styles.roleplayGrid}>
          {ROLEPLAY_SITUATIONS.map((r) => (
            <TouchableOpacity
              key={r.label}
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
    const scoreColor = pron.score >= 80 ? colors.success : pron.score >= 50 ? colors.warning : colors.error;
    return (
      <GlassCard style={styles.pronCard} padding="md">
        <View style={styles.pronHeader}>
          <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pronIcon}>
            <Ionicons name="mic-outline" size={12} color="#fff" />
          </LinearGradient>
          <Text style={[styles.pronLabel, { color: colors.primary }]}>Pronunciation Score</Text>
        </View>
        <View style={styles.pronScoreRow}>
          <Text style={[styles.pronScoreValue, { color: scoreColor }]}>{pron.score}</Text>
          <Text style={[styles.pronScoreUnit, { color: colors.textSecondary }]}>/100</Text>
          <View style={[styles.pronScoreBar, { backgroundColor: colors.border }]}>
            <View style={[styles.pronScoreFill, { width: `${pron.score}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>
        {transcription && (
          <View style={styles.pronTranscription}>
            <Text style={[styles.pronLabelSmall, { color: colors.textSecondary }]}>You said:</Text>
            <Text style={[styles.pronValue, { color: colors.text }]}>{transcription}</Text>
          </View>
        )}
        {pron.feedback && (
          <View style={[styles.pronFeedbackBox, { backgroundColor: scoreColor + '10', borderColor: scoreColor + '20' }]}>
            <Ionicons name={pron.score >= 80 ? 'checkmark-circle' : 'information-circle'} size={14} color={scoreColor} />
            <Text style={[styles.pronFeedback, { color: colors.text }]}>{pron.feedback}</Text>
          </View>
        )}
        {pron.phoneme_breakdown?.length > 0 && (
          <View style={[styles.phonemeContainer, { borderTopColor: colors.border }]}>
            {pron.phoneme_breakdown.map((p, i) => (
              <View key={i} style={[styles.phonemeRow, p.correct && { backgroundColor: colors.success + '08', borderRadius: 6 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={p.correct ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={p.correct ? colors.success : colors.error}
                  />
                  <Text style={[styles.phonemeText, { color: colors.text }, !p.correct && { color: colors.error }]}>
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
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lessonHeader}>
          <View style={styles.lessonHeaderIcon}>
            <Ionicons name="school-outline" size={16} color="#fff" />
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
                  <Text style={[styles.phraseEnglish, { color: colors.textSecondary }]}>{p.english}</Text>
                  {p.pronunciation && (
                    <Text style={[styles.phrasePron, { color: colors.textLight }]}>{p.pronunciation}</Text>
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
              <View key={i} style={[styles.dialogueRow, { borderLeftColor: i % 2 === 0 ? colors.primary : colors.accent }]}>
                <Text style={[styles.dialogueSpeaker, { color: i % 2 === 0 ? colors.primary : colors.accent }]}>
                  {d.speaker}:
                </Text>
                <Text style={[styles.dialogueText, { color: colors.text }]}>{d.bisaya}</Text>
                <Text style={[styles.dialogueEnglish, { color: colors.textSecondary }]}>{d.english}</Text>
              </View>
            ))}
          </View>
        )}
        {msg.cultural_note && (
          <View style={[styles.cultureNote, { backgroundColor: colors.accentLight, borderColor: colors.accent + '20' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs }}>
              <Ionicons name="leaf-outline" size={14} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>Culture Tip</Text>
            </View>
            <Text style={[styles.cultureText, { color: colors.text }]}>{msg.cultural_note}</Text>
          </View>
        )}
      </GlassCard>
    );
  };

  const renderTypingIndicator = () => (
    <View style={{ marginBottom: spacing.sm, alignItems: 'flex-start' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 4, gap: 4 }}>
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubbleAvatar}>
          <Ionicons name="sparkles" size={10} color="#fff" />
        </LinearGradient>
        <Text style={[styles.bubbleSender, { color: colors.primary }]}>Sulti</Text>
      </View>
      <GlassCard padding="md" style={[styles.typingBubble, { borderColor: colors.glassBorder }]}>
        <TypingDots />
      </GlassCard>
    </View>
  );

  const renderHub = () => (
    <>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrapper}>
              <SultiTalkingAvatar size={38} mood={crossRecorder.isRecording ? 'listening' : isSpeaking ? 'speaking' : loading ? 'thinking' : 'idle'} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Sulti</Text>
              <Text style={styles.headerSubtitle}>
                {isSpeaking ? 'Speaking...' : loading ? 'Thinking...' : level?.level || 'Learning'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn} onPress={openVoiceMode} accessibilityLabel="Open voice mode">
              <Ionicons name="mic-circle" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowHistory(true)} accessibilityLabel="Chat history">
              <Ionicons name="time-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerPill}>
              <Ionicons name="heart" size={12} color={colors.error} />
              <Text style={styles.headerPillText}>{hearts}</Text>
            </View>
          </View>
        </View>
        {level && (
          <Text style={styles.headerStat}>
            {level.total_sessions || 0} sessions · {level.total_xp || 0} XP
          </Text>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.hubScroll}
        contentContainerStyle={styles.hubContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <GlassCard variant="elevated" style={styles.welcomeCard} padding="xxl">
          <View style={styles.welcomeHeader}>
            <View style={styles.avatarWrapperLarge}>
              <SultiTalkingAvatar size={68} mood="idle" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <Text style={styles.welcomeName}>Kumusta! 👋</Text>
              <Text style={[styles.welcomeTitle, { color: colors.textSecondary }]}>
                Your Bisaya language companion
              </Text>
              <View style={styles.welcomeBadges}>
                {level && (
                  <Badge
                    title={level.level === 'advanced' ? 'Abante' : level.level === 'intermediate' ? 'Tunga' : 'Sugod'}
                    variant={level.level === 'advanced' ? 'error' : level.level === 'intermediate' ? 'warning' : 'success'}
                    size="sm"
                  />
                )}
                {adaptiveTutor.difficulty && (
                  <Badge title={`A-${adaptiveTutor.difficulty[0].toUpperCase()}`} variant="info" size="sm" />
                )}
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Two AI Mode Cards */}
        <View style={styles.hubModeSection}>
          <SultiModeCard
            title="Chat with SULTI"
            subtitle="Type or speak and get instant responses."
            icon="chatbubble-ellipses"
            gradient={[colors.primary, colors.gradientA]}
            badge="AI CHAT"
            badgeColor="rgba(255,255,255,0.2)"
            variant="chat"
            onPress={startChat}
          />
          <SultiModeCard
            title="Voice AI Agent"
            subtitle="Speak naturally and chat with Sulti by voice."
            icon="mic"
            gradient={['#0D9488', '#06B6D4']}
            badge="VOICE AGENT"
            badgeColor="rgba(255,255,255,0.2)"
            variant="voice"
            onPress={openVoiceMode}
          />
        </View>

        {/* Topic Practice */}
        <View style={styles.hubSection}>
          <Text style={[styles.hubSectionTitle, { color: colors.text }]}>Practice Topics</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hubTopicGrid}
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
        </View>

        {/* Role-Play */}
        <RoleplayCard
          onPress={() => setShowRoleplay(!showRoleplay)}
          expanded={showRoleplay}
          colors={colors}
        >
          <View style={styles.hubRoleplayGrid}>
            {ROLEPLAY_SITUATIONS.map((r) => (
              <TouchableOpacity
                key={r.label}
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

      {/* Quick Chat Input */}
      <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={[styles.composerContainer, { borderTopColor: colors.glassBorder, paddingBottom: getTabBarClearance(insets) }]}>
        <View style={[styles.composerWrap, { borderColor: colors.border }]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSecondary, borderColor: 'transparent' }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Type in Bisaya or English..."
              placeholderTextColor={colors.textLight}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              editable={!loading}
              multiline
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
          <View style={styles.composerActions}>
            <TouchableOpacity
              style={[styles.composerMic, { backgroundColor: colors.primary }, crossRecorder.isRecording && { backgroundColor: colors.error }, isSpeaking && { backgroundColor: colors.success }]}
              onPress={toggleRecording}
              disabled={loading}
              accessibilityLabel="Record voice"
              hitSlop={8}
            >
              <Ionicons
                name={isSpeaking ? 'volume-high' : crossRecorder.isRecording ? 'stop' : 'mic'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerSend, { backgroundColor: colors.primary }, (!input.trim() || loading) && { opacity: 0.5 }]}
              onPress={sendMessage}
              disabled={loading || !input.trim()}
              accessibilityLabel="Send message"
              hitSlop={8}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </>
  );

  const renderChat = () => (
    <>
      {/* Chat Header with back button */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={backToHub} style={styles.headerBtn} accessibilityLabel="Back to Sulti hub">
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.avatarWrapper}>
              <SultiTalkingAvatar size={34} mood={crossRecorder.isRecording ? 'listening' : isSpeaking ? 'speaking' : loading ? 'thinking' : 'idle'} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.headerTitle}>Sulti</Text>
              <Text style={styles.headerSubtitle}>
                {isSpeaking ? 'Speaking...' : loading ? 'Thinking...' : level?.level || 'Learning'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn} onPress={openVoiceMode} accessibilityLabel="Open voice mode">
              <Ionicons name="mic-circle" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowHistory(true)} accessibilityLabel="Chat history">
              <Ionicons name="time-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerPill}>
              <Ionicons name="heart" size={12} color={colors.error} />
              <Text style={styles.headerPillText}>{hearts}</Text>
            </View>
          </View>
        </View>
        {level && (
          <Text style={styles.headerStat}>
            {level.total_sessions || 0} sessions · {level.total_xp || 0} XP
          </Text>
        )}
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.messageList}
        renderItem={renderMessage}
        ListFooterComponent={loading ? renderTypingIndicator() : null}
        showsVerticalScrollIndicator={false}
      />

      {(crossRecorder.isRecording || isSpeaking) && (
        <View style={[styles.statusBar, { backgroundColor: crossRecorder.isRecording ? colors.error : colors.primary }]}>
          <Ionicons name={crossRecorder.isRecording ? 'mic' : 'volume-high'} size={14} color="#fff" />
          <Text style={styles.statusText}>
            {crossRecorder.isRecording
              ? `Listening ${String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:${String(recordingDuration % 60).padStart(2, '0')}`
              : isSpeaking ? 'Sulti is speaking...' : ''}
          </Text>
          {crossRecorder.isRecording && <AnimatedWaveform />}
          {isSpeaking && (
            <TouchableOpacity onPress={() => { stopTTS(); setIsSpeaking(false); }}>
              <Text style={styles.statusActionText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={[styles.composerContainer, { borderTopColor: colors.glassBorder, paddingBottom: getTabBarClearance(insets) }]}>
        <View style={[styles.composerWrap, { borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.continuousToggle, { borderColor: colors.border }, continuousMode && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setContinuousMode(!continuousMode)}
          >
            <Ionicons name="infinite" size={16} color={continuousMode ? '#fff' : colors.textLight} />
          </TouchableOpacity>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSecondary, borderColor: 'transparent' }]}>
            <TextInput
              id="tutorInput"
              name="tutorInput"
              testID="tutor-input"
              style={[styles.input, { color: colors.text }]}
              placeholder="Type in Bisaya or English..."
              placeholderTextColor={colors.textLight}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              editable={!loading}
              multiline
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
          <Animated.View style={micGlowStyle}>
          <TouchableOpacity
            style={[styles.composerMic, { backgroundColor: colors.primary }, crossRecorder.isRecording && { backgroundColor: colors.error }, isSpeaking && { backgroundColor: colors.success }]}
            onPress={toggleRecording}
            disabled={loading}
            accessibilityLabel="Record voice"
            hitSlop={8}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : crossRecorder.isRecording ? 'stop' : 'mic'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity
            style={[styles.composerSend, (!input.trim() || loading) && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={loading || !input.trim()}
            accessibilityLabel="Send message"
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </BlurView>
    </>
  );

  return (
    <AuroraBackground style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {sultiMode === 'hub' ? renderHub() : renderChat()}

        <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Sulti&apos;s Memory</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>History & what Sulti remembers about you</Text>
                </View>
                <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setShowHistory(false)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.memorySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.memoryLabel, { color: colors.textSecondary }]}>AI MEMORY</Text>
                <View style={styles.memoryChips}>
                  {[
                    user?.fullname ? `Name: ${user.fullname.split(' ')[0]}` : null,
                    user?.native_language ? `Native: ${user.native_language}` : null,
                    user?.target_language ? `Learning: ${user.target_language}` : null,
                    adaptiveTutor.difficulty ? `Level: ${adaptiveTutor.difficulty}` : null,
                    level?.level ? `Tutor: ${level.level}` : null,
                    level?.total_xp ? `${level.total_xp} total XP` : null,
                  ].filter(Boolean).map((m) => (
                    <View key={m} style={[styles.memoryChip, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="sparkles" size={12} color={colors.primary} />
                      <Text style={[styles.memoryChipText, { color: colors.primary }]}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={[styles.memoryLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>CONVERSATIONS</Text>
              {chatHistory.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textLight} />
                  <Text style={[styles.historyEmptyText, { color: colors.textSecondary }]}>No past conversations yet</Text>
                </View>
              ) : (
                <FlatList
                  data={chatHistory}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => { loadConversation(item); setSultiMode('chat'); }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.historyIcon, { backgroundColor: colors.softPurple }]}>
                        <Ionicons name="chatbubbles" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                          {item.count} msgs · {new Date(item.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: spacing.xs, paddingHorizontal: spacing.xl },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: {
    borderRadius: borderRadius.xxl,
    ...shadows.soft,
    overflow: 'hidden',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  headerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  headerPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerStat: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1, marginLeft: 50 },
  messageList: { padding: spacing.lg, paddingBottom: spacing.md },
  bubble: { maxWidth: '82%', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: 2, borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4, borderWidth: 0 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleAvatar: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  bubbleSender: { ...typography.bodyBold, fontSize: 12 },
  bubbleText: { ...typography.body, fontSize: 15, lineHeight: 22, letterSpacing: -0.24 },
  voiceLabel: { ...typography.caption, fontSize: 11, fontWeight: '600' },
  listenLabel: { ...typography.caption, fontSize: 11 },
  welcomeCard: { marginBottom: spacing.lg, borderRadius: borderRadius.xxl, ...shadows.premium },
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
  welcomeBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  hubModeSection: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl },
  hubSection: { marginBottom: spacing.xxl },
  sectionHeader: { marginBottom: spacing.md },
  hubSectionTitle: { ...typography.h4, fontSize: 18, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  hubSectionSubtitle: { ...typography.body, fontSize: 14, lineHeight: 19 },
  hubTopicGrid: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xs },
  // Welcome card styles
  situationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  situationChip: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chipLabel: { fontSize: 12, fontWeight: '700' },
  roleplayToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  roleplayText: { fontSize: 13, fontWeight: '700' },
  sectionHint: { ...typography.caption, fontSize: 12, fontWeight: '500', marginTop: spacing.xs },
  hubRoleplayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  hubRoleplayChip: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  hubRoleplayEmoji: { fontSize: 16 },
  hubRoleplayLabel: { fontSize: 12, fontWeight: '700' },
  // Styles for welcome card roleplay section
  roleplayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  roleplayChip: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  roleplayEmoji: { fontSize: 16 },
  roleplayLabel: { fontSize: 12, fontWeight: '700' },
  composerContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...shadows.lg,
    ...shadows.premium,
  },
  composerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  composerMic: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  composerSend: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...shadows.md },
  continuousToggle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  inputWrap: { flex: 1, borderRadius: borderRadius.xl, borderWidth: 1, paddingHorizontal: spacing.lg, minHeight: 48, justifyContent: 'center' },
  input: { ...typography.body, fontSize: 15, maxHeight: 100, paddingVertical: 10, lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '80%', borderWidth: 1,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { ...typography.h3, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalSubtitle: { ...typography.caption, fontSize: 12, fontWeight: '500', marginTop: 2 },
  modalClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memorySection: { borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, gap: spacing.sm },
  memoryLabel: { ...typography.small, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  memoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memoryChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.full },
  memoryChipText: { ...typography.caption, fontSize: 12, fontWeight: '600' },
  historyEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  historyEmptyText: { ...typography.body, fontSize: 14, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  historyIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyTitle: { ...typography.body, fontSize: 14, fontWeight: '600' },
  historyMeta: { ...typography.caption, fontSize: 12, marginTop: 2 },
  hubScroll: { flex: 1 },
  hubContent: { padding: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.xs },
  typingBubble: { borderWidth: 1 },
});
