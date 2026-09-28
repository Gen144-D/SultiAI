import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { speakTTSPromise } from '../utils/tts';
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, withRepeat, FadeIn, FadeInRight, FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { DIALECTS } from '../data/pronunciationPhrases';
import { hapticTap } from '../utils/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STATS_KEY = 'sultiai_pronunciation_stats';

const PHRASES = [
  { bisaya: 'maayong buntag', english: 'Good morning', pronunciation: 'mah-AH-yong boon-TAG', category: 'Greetings' },
  { bisaya: 'maayong udto', english: 'Good noon', pronunciation: 'mah-AH-yong OOD-toh', category: 'Greetings' },
  { bisaya: 'maayong hapon', english: 'Good afternoon', pronunciation: 'mah-AH-yong HAH-pon', category: 'Greetings' },
  { bisaya: 'maayong gabii', english: 'Good evening', pronunciation: 'mah-AH-yong gah-BEE-ee', category: 'Greetings' },
  { bisaya: 'kumusta', english: 'How are you', pronunciation: 'koo-MOOS-tah', category: 'Greetings' },
  { bisaya: 'salamat', english: 'Thank you', pronunciation: 'sah-LAH-mat', category: 'Politeness' },
  { bisaya: 'palihug', english: 'Please', pronunciation: 'pah-LEE-hoog', category: 'Politeness' },
  { bisaya: 'pasensya', english: 'Sorry', pronunciation: 'pah-SEN-sha', category: 'Politeness' },
  { bisaya: 'oo', english: 'Yes', pronunciation: 'oh-OH', category: 'Essentials' },
  { bisaya: 'dili', english: 'No', pronunciation: 'DEE-lee', category: 'Essentials' },
  { bisaya: 'ako', english: 'I / me', pronunciation: 'ah-KOH', category: 'Essentials' },
  { bisaya: 'ikaw', english: 'You', pronunciation: 'ee-KAW', category: 'Essentials' },
  { bisaya: 'unsa', english: 'What', pronunciation: 'oon-SAH', category: 'Essentials' },
  { bisaya: 'asa', english: 'Where', pronunciation: 'ah-SAH', category: 'Essentials' },
  { bisaya: 'kanus-a', english: 'When', pronunciation: 'kah-NOOS-ah', category: 'Essentials' },
  { bisaya: 'ngano', english: 'Why', pronunciation: 'ngah-NOH', category: 'Essentials' },
  { bisaya: 'usa', english: 'One', pronunciation: 'OO-sah', category: 'Numbers' },
  { bisaya: 'duha', english: 'Two', pronunciation: 'DOO-hah', category: 'Numbers' },
  { bisaya: 'tulo', english: 'Three', pronunciation: 'TOO-loh', category: 'Numbers' },
  { bisaya: 'upat', english: 'Four', pronunciation: 'OO-pat', category: 'Numbers' },
  { bisaya: 'lima', english: 'Five', pronunciation: 'LEE-mah', category: 'Numbers' },
  { bisaya: 'gihigugma', english: 'Love', pronunciation: 'gee-hee-GOOG-mah', category: 'Feelings' },
  { bisaya: 'kalipay', english: 'Happiness', pronunciation: 'kah-LEE-pigh', category: 'Feelings' },
  { bisaya: 'palangga', english: 'Beloved', pronunciation: 'pah-LANG-gah', category: 'Feelings' },
  { bisaya: 'tubig', english: 'Water', pronunciation: 'TOO-big', category: 'Food & Home' },
  { bisaya: 'pagkaon', english: 'Food', pronunciation: 'pag-KAH-on', category: 'Food & Home' },
  { bisaya: 'balay', english: 'House', pronunciation: 'BAH-ligh', category: 'Food & Home' },
  { bisaya: 'eskwela', english: 'School', pronunciation: 'es-KWEH-lah', category: 'Places & Life' },
  { bisaya: 'kauban', english: 'Friend', pronunciation: 'kah-OO-ban', category: 'Places & Life' },
  { bisaya: 'salapi', english: 'Money', pronunciation: 'sah-LAH-pee', category: 'Places & Life' },
  { bisaya: 'gawas', english: 'Outside', pronunciation: 'GAH-was', category: 'Places & Life' },
  { bisaya: 'merkado', english: 'Market', pronunciation: 'mehr-KAH-doh', category: 'Places & Life' },
  { bisaya: 'sakto', english: 'Correct', pronunciation: 'SAK-toh', category: 'Places & Life' },
  { bisaya: 'maayo', english: 'Good', pronunciation: 'mah-AH-yoh', category: 'Places & Life' },
  { bisaya: 'nindot', english: 'Nice', pronunciation: 'NEEN-dot', category: 'Places & Life' },
];

const CATEGORIES = ['Greetings', 'Politeness', 'Essentials', 'Numbers', 'Feelings', 'Food & Home', 'Places & Life'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ScoreRing({ score, size = 100 }) {
  const { colors } = useTheme();
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(300, withTiming(Math.max(0.08, score / 100), { duration: 1000 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${circumference * progress.value} ${circumference}`,
  }));

  const color = score >= 85 ? colors.success : score >= 60 ? colors.warning : colors.error;

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.primary + '33'} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
      <Text style={[styles.scoreText, { color: colors.text }]}>{score}</Text>
      <Text style={[styles.scoreCaption, { color: colors.textSecondary }]}>avg</Text>
    </View>
  );
}

function DialectCard({ dialect, onSelect, index }) {
  const { colors } = useTheme();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 100, withSpring(1, { stiffness: 200, damping: 15 }));
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 300 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.dialectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => { hapticTap(); onSelect(dialect); }}
        activeOpacity={0.7}
      >
        <View style={[styles.dialectIcon, { backgroundColor: colors.primary + '1F' }]}>
          <Ionicons name={dialect.icon} size={24} color={colors.accent} />
        </View>
        <View style={styles.dialectInfo}>
          <Text style={[styles.dialectName, { color: colors.text }]}>{dialect.name}</Text>
          <Text style={[styles.dialectDesc, { color: colors.textSecondary }]}>{dialect.tagline}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function PhraseCard({ phrase, onListen, isListening }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInRight.duration(400)} style={[styles.phraseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.phraseLabel, { color: colors.textSecondary }]}>Say this phrase:</Text>
      <Text style={[styles.phraseBisaya, { color: colors.text }]}>{phrase.bisaya}</Text>
      <Text style={[styles.phraseEnglish, { color: colors.textSecondary }]}>{phrase.english}</Text>
      <View style={styles.pronunciationRow}>
        <TouchableOpacity
          style={[
            styles.listenBtn,
            { backgroundColor: colors.primary + '26', borderColor: colors.primary + '4D' },
            isListening && { backgroundColor: colors.primary + '4D' },
          ]}
          onPress={onListen}
        >
          <Ionicons name={isListening ? 'volume-high' : 'volume-medium'} size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.phrasePron, { color: colors.textSecondary }]}>{phrase.pronunciation}</Text>
      </View>
    </Animated.View>
  );
}

function MicButton({ isRecording, onPress }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1, true,
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 600 }), withTiming(0.2, { duration: 600 })),
        -1, true,
      );
    } else {
      pulse.value = withSpring(1);
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={styles.micContainer}>
      <Animated.View style={[styles.micGlow, glowStyle, { backgroundColor: colors.primary + '4D' }]} />
      <Animated.View
        style={[
          styles.micBtn,
          btnStyle,
          isRecording
            ? { backgroundColor: colors.error, boxShadow: `0 4px 16px ${colors.error}66` }
            : { backgroundColor: colors.primary, boxShadow: `0 4px 16px ${colors.primary}66` },
        ]}
      >
        <TouchableOpacity style={styles.micTouch} onPress={onPress} activeOpacity={0.8}>
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={40} color={colors.onPrimary} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function FeedbackScreen({ result, phrase, onNext, onDone }) {
  const { colors } = useTheme();
  const isCorrect = result.score >= 85;
  const flashOpacity = useSharedValue(0.3);

  useEffect(() => {
    flashOpacity.value = withSequence(
      withTiming(0.15, { duration: 400 }),
      withTiming(0, { duration: 600 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.feedbackContainer}>
      <Animated.View style={[styles.feedbackFlash, { backgroundColor: isCorrect ? colors.success : colors.error }, flashStyle]} />
      <View style={styles.feedbackHeader}>
        <ScoreRing score={result.score} size={100} />
        <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.success : colors.error }]}>
          {isCorrect ? 'Perfect!' : 'Almost!'}
        </Text>
        <Text style={[styles.feedbackSubtitle, { color: colors.textSecondary }]}>
          {isCorrect ? 'Excellent pronunciation' : `Try saying \u2018${phrase.bisaya}\u2019 again`}
        </Text>
      </View>

      {result.transcription && (
        <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>You said</Text>
          <Text style={[styles.feedbackValue, { color: colors.text }]}>{result.transcription}</Text>
        </View>
      )}

      {result.feedback && (
        <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>Feedback</Text>
          <Text style={[styles.feedbackText, { color: colors.text }]}>{result.feedback}</Text>
        </View>
      )}

      {result.phoneme_breakdown && result.phoneme_breakdown.length > 0 && (
        <View style={styles.phonemeSection}>
          <Text style={[styles.phonemeLabel, { color: colors.textSecondary }]}>Breakdown</Text>
          <View style={styles.phonemeList}>
            {result.phoneme_breakdown.slice(0, 6).map((p, i) => (
              <View key={i} style={[styles.phonemeChip, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.phonemeExpected, { color: colors.text }]}>{p.expected}</Text>
                <Ionicons name={p.correct ? 'checkmark-circle' : 'close-circle'} size={14} color={p.correct ? colors.success : colors.error} />
                <Text style={[styles.phonemeHeard, { color: colors.textLight }]}>{p.heard}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {result.metrics && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackLabel}>Acoustic Analysis</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {[
              { label: 'Pitch', value: `${Math.round(result.metrics.pitch_accuracy * 100)}%` },
              { label: 'Formants', value: `${Math.round(result.metrics.formant_accuracy * 100)}%` },
              { label: 'Volume', value: `${Math.round(result.metrics.energy_consistency * 100)}%` },
              { label: 'Pace', value: `${result.metrics.speaking_rate?.toFixed(1)} syl/s` },
            ].map((m, i) => (
              <View key={i} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: colors.textLight, fontSize: 11 }}>{m.label}</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.feedbackActions}>
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary + '1F', borderColor: colors.primary + '59' }]} onPress={onDone} activeOpacity={0.8}>
          <Ionicons name="grid-outline" size={18} color={colors.primary} />
          <Text style={[styles.doneBtnText, { color: colors.primary }]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary, boxShadow: `0 4px 12px ${colors.primary}66` }]} onPress={onNext} activeOpacity={0.8}>
          <Text style={[styles.nextBtnText, { color: colors.onPrimary }]}>Next Phrase</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function LibraryRow({ phrase, onPlay, onPractice }) {
  const { colors } = useTheme();
  const [playing, setPlaying] = useState(false);
  const play = async () => {
    if (playing) return;
    setPlaying(true);
    onPlay();
    try {
      await speakTTSPromise(phrase.bisaya, { language: 'ceb', rate: 0.8 });
    } catch (_) {}
    setPlaying(false);
  };

  return (
    <Animated.View entering={FadeInUp.duration(350)} style={[styles.libraryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.libraryRowMain} onPress={onPractice} activeOpacity={0.7}>
        <View>
          <Text style={[styles.libraryBisaya, { color: colors.text }]}>{phrase.bisaya}</Text>
          <Text style={[styles.libraryEnglish, { color: colors.textSecondary }]}>{phrase.english}</Text>
          <Text style={[styles.libraryPron, { color: colors.textLight }]}>{phrase.pronunciation}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.libraryPlay, { backgroundColor: colors.primary + '1F', borderColor: colors.primary + '4D' }]} onPress={play} activeOpacity={0.8} accessibilityLabel={`Listen to ${phrase.bisaya}`}>
        <Ionicons name={playing ? 'volume-high' : 'volume-medium'} size={20} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.libraryPractice, { backgroundColor: colors.primary }]} onPress={onPractice} activeOpacity={0.8} accessibilityLabel={`Practice ${phrase.bisaya}`}>
        <Ionicons name="mic" size={20} color={colors.onPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PronunciationScreen({ navigation }) {
  const { colors } = useTheme();
  const [step, setStep] = useState('home');
  const [selectedDialect, setSelectedDialect] = useState(DIALECTS[0]);
  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [shuffledPhrases, setShuffledPhrases] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [stats, setStats] = useState({ bestScore: 0, totalScore: 0, sessions: 0, practiced: 0 });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATS_KEY);
        if (raw) setStats(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const selectDialect = useCallback((dialect) => {
    hapticTap();
    setSelectedDialect(dialect);
    const s = shuffle(PHRASES);
    setShuffledPhrases(s);
    setCurrentPhrase(s[0]);
    setPhraseIndex(0);
    setStep('phrase');
  }, []);

  const startSession = useCallback(() => {
    hapticTap();
    const s = shuffle(PHRASES);
    setShuffledPhrases(s);
    setCurrentPhrase(s[0]);
    setPhraseIndex(0);
    setResult(null);
    setStep('dialect');
  }, []);

  const practicePhrase = useCallback((phrase) => {
    hapticTap();
    setCurrentPhrase(phrase);
    setResult(null);
    setStep('phrase');
  }, []);

  const listenToPhrase = useCallback(async () => {
    if (!currentPhrase) return;
    hapticTap();
    setIsListening(true);
    try {
      await speakTTSPromise(currentPhrase.bisaya, { language: selectedDialect?.language || 'ceb', rate: 0.8 });
    } catch (_) {
      /* TTS unavailable */
    } finally {
      setIsListening(false);
    }
  }, [currentPhrase, selectedDialect]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission denied', 'Microphone permission is needed');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setStep('recording');
    } catch (e) {
      setIsRecording(false);
      Alert.alert('Error', `Could not start recording: ${e.message}`);
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStep('analyzing');
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No audio was captured');
      const audioBase64 = await readAsStringAsync(uri, { encoding: 'base64' });

      // Send audio + expected text so the server can transcribe and score the match
      const expectedText = currentPhrase?.text || currentPhrase?.phrase || '';
      const pronunciation = await api.checkPronunciationAudio(
        audioBase64,
        expectedText,
        selectedDialect?.language || 'ceb',
      );

      // The server transcribes as part of scoring, so no extra round-trip.
      const transcription = pronunciation.transcription || '';

      setResult({ transcription, ...pronunciation });
      setStep('result');
      const score = pronunciation.score || 0;
      setStats((prev) => {
        const next = {
          bestScore: Math.max(prev.bestScore, score),
          totalScore: prev.totalScore + score,
          sessions: prev.sessions + 1,
          practiced: prev.practiced + 1,
        };
        try { AsyncStorage.setItem(STATS_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (e) {
      Alert.alert('Error', `Failed to analyze pronunciation: ${e.message}`);
      setStep('phrase');
    }
  }, [audioRecorder, isRecording, selectedDialect, currentPhrase]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording(); else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const nextPhrase = useCallback(() => {
    hapticTap();
    const nextIndex = phraseIndex + 1;
    if (nextIndex < shuffledPhrases.length) {
      setPhraseIndex(nextIndex);
      setCurrentPhrase(shuffledPhrases[nextIndex]);
    } else {
      const s = shuffle(PHRASES);
      setShuffledPhrases(s);
      setPhraseIndex(0);
      setCurrentPhrase(s[0]);
    }
    setResult(null);
    setStep('phrase');
  }, [phraseIndex, shuffledPhrases]);

  const goHome = useCallback(() => {
    hapticTap();
    if (isRecording) audioRecorder.stop().catch(() => {});
    setIsRecording(false);
    setStep('home');
    setCurrentPhrase(null);
    setResult(null);
  }, [isRecording, audioRecorder]);

  useEffect(() => () => {
    if (audioRecorder.isRecording) audioRecorder.stop().catch(() => {});
  }, [audioRecorder]);

  const avgScore = stats.sessions ? Math.round(stats.totalScore / stats.sessions) : 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PHRASES.filter((p) => {
      const inCat = category === 'All' || p.category === category;
      const inQuery = !q || p.bisaya.toLowerCase().includes(q) || p.english.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [query, category]);

  const renderHeader = () => (
    <Header
      title="Pronunciation Lab"
      subtitle={step === 'home' ? 'Master the sounds of Bisaya' : 'Record yourself speaking'}
      leftIcon={step === 'home' ? 'arrow-back' : 'chevron-down'}
      onLeftPress={step === 'home' ? () => navigation?.goBack() : goHome}
      gradient={false}
    >
      {stats.sessions > 0 && (
        <View style={[styles.headerStat, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="flame" size={14} color={colors.warning} />
          <Text style={[styles.headerStatText, { color: colors.text }]}>{stats.practiced}</Text>
        </View>
      )}
    </Header>
  );

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeContent}>
      <Animated.View entering={FadeInUp.duration(400)} style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroRing}>
          <ScoreRing score={avgScore} size={120} />
        </View>
        <View style={styles.heroInfo}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {avgScore >= 85 ? 'Outstanding' : avgScore >= 60 ? 'Keep pushing' : 'Getting started'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Your average pronunciation score across {stats.sessions} session{stats.sessions === 1 ? '' : 's'}.</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Ionicons name="trophy" size={16} color={colors.warning} />
              <Text style={[styles.heroStatValue, { color: colors.text }]}>{stats.bestScore}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.textLight }]}>Best</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStatItem}>
              <Ionicons name="mic" size={16} color={colors.accent} />
              <Text style={[styles.heroStatValue, { color: colors.text }]}>{stats.practiced}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.textLight }]}>Practiced</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStatItem}>
              <Ionicons name="time" size={16} color={colors.secondary} />
              <Text style={[styles.heroStatValue, { color: colors.text }]}>{stats.sessions}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.textLight }]}>Sessions</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary, boxShadow: `0 6px 18px ${colors.primary}59`, elevation: 6 }]} onPress={startSession} activeOpacity={0.85}>
        <View style={[styles.startBtnIcon, { backgroundColor: `${colors.onPrimary}38` }]}>
          <Ionicons name="mic" size={22} color={colors.onPrimary} />
        </View>
        <View style={styles.startBtnTextWrap}>
          <Text style={[styles.startBtnTitle, { color: colors.onPrimary }]}>Start Practicing</Text>
          <Text style={[styles.startBtnSubtitle, { color: colors.onPrimary, opacity: 0.75 }]}>Pick a dialect and speak aloud for instant feedback</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color={colors.onPrimary} />
      </TouchableOpacity>

      <View style={styles.dialectStrip}>
        {DIALECTS.map((d) => (
          <TouchableOpacity key={d.id} style={[styles.dialectChip, { backgroundColor: colors.primary + '1F', borderColor: colors.primary + '4D' }]} onPress={() => selectDialect(d)} activeOpacity={0.8} hitSlop={{ top: 6, bottom: 6 }}>
            <Ionicons name={d.icon} size={16} color={colors.primary} />
            <Text style={[styles.dialectChipText, { color: colors.primary }]}>{d.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.libraryHeader}>
        <Text style={[styles.libraryTitle, { color: colors.text }]}>Phrase Library</Text>
        <Text style={[styles.libraryCount, { color: colors.textLight }]}>{filtered.length} phrases</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search phrases..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} accessibilityLabel="Clear search" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.categoryRow}>
        {['All', ...CATEGORIES].map((c) => {
          const active = category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.categoryChip,
                active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setCategory(c)}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6 }}
            >
              <Text style={[styles.categoryChipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyLibrary}>
          <Ionicons name="search-outline" size={40} color={colors.textLight} />
          <Text style={[styles.emptyLibraryText, { color: colors.textLight }]}>No phrases match your search.</Text>
        </View>
      ) : (
        filtered.map((p) => (
          <LibraryRow key={p.bisaya} phrase={p} onPlay={listenToPhrase} onPractice={() => practicePhrase(p)} />
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderDialect = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.dialectContainer}>
        <Text style={[styles.dialectTitle, { color: colors.text }]}>Choose your dialect</Text>
        <Text style={[styles.dialectSubtitle, { color: colors.textSecondary }]}>Select a Bisaya dialect to practice</Text>
        {DIALECTS.map((d, i) => (
          <DialectCard key={d.id} dialect={d} onSelect={selectDialect} index={i} />
        ))}
      </View>
    </ScrollView>
  );

  const renderPractice = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.practiceContainer}>
        <TouchableOpacity style={[styles.dialectBadge, { backgroundColor: colors.primary + '26', borderColor: colors.primary + '4D' }]} onPress={() => setStep('dialect')} hitSlop={{ top: 6, bottom: 6 }}>
          <Ionicons name={selectedDialect?.icon} size={16} color={colors.primary} />
          <Text style={[styles.dialectBadgeText, { color: colors.primary }]}>{selectedDialect?.name}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        {currentPhrase && (
          <PhraseCard phrase={currentPhrase} onListen={listenToPhrase} isListening={isListening} />
        )}

        <MicButton isRecording={isRecording} onPress={toggleRecording} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>{isRecording ? 'Tap to stop' : 'Tap to record'}</Text>

        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: colors.textLight }]}>{phraseIndex + 1} / {shuffledPhrases.length}</Text>
          <TouchableOpacity onPress={goHome} style={styles.exitPractice} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.exitPracticeText, { color: colors.primary }]}>Exit practice</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep = () => {
    switch (step) {
      case 'home': return renderHome();
      case 'dialect': return renderDialect();
      case 'phrase':
      case 'recording': return renderPractice();
      case 'analyzing':
        return (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.analyzingText, { color: colors.textSecondary }]}>Analyzing pronunciation...</Text>
            </View>
          </ScrollView>
        );
      case 'result':
        return (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <FeedbackScreen result={result} phrase={currentPhrase} onNext={nextPhrase} onDone={goHome} />
          </ScrollView>
        );
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerStat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  headerStatText: { fontSize: 13, fontWeight: '800' },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  homeContent: { padding: 16, paddingBottom: 40 },

  // Hero
  heroCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22, padding: 20, marginBottom: 16,
  },
  heroRing: { marginRight: 16 },
  heroInfo: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  heroStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatValue: { fontSize: 16, fontWeight: '800' },
  heroStatLabel: { fontSize: 10 },
  heroStatDivider: { width: 1, height: 26 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 16, marginBottom: 12,
  },
  startBtnIcon: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  startBtnTextWrap: { flex: 1 },
  startBtnTitle: { fontSize: 16, fontWeight: '800' },
  startBtnSubtitle: { fontSize: 11, marginTop: 2 },

  dialectStrip: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dialectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  dialectChipText: { fontSize: 12, fontWeight: '700' },

  libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  libraryTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  libraryCount: { fontSize: 12 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  clearBtn: { padding: 2 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontWeight: '700' },

  libraryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  libraryRowMain: { flex: 1 },
  libraryBisaya: { fontSize: 16, fontWeight: '800' },
  libraryEnglish: { fontSize: 13, marginTop: 2 },
  libraryPron: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  libraryPlay: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  libraryPractice: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },

  emptyLibrary: { alignItems: 'center', paddingVertical: 40 },
  emptyLibraryText: { fontSize: 14, marginTop: 10 },

  // Practice flow
  dialectContainer: { paddingTop: 20 },
  dialectTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  dialectSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  dialectCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  dialectIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  dialectInfo: { flex: 1 },
  dialectName: { fontSize: 16, fontWeight: '700' },
  dialectDesc: { fontSize: 12, marginTop: 2 },

  practiceContainer: { alignItems: 'center', paddingTop: 20 },
  dialectBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24, gap: 6,
  },
  dialectBadgeText: { fontSize: 14, fontWeight: '600' },

  phraseCard: {
    borderWidth: 1,
    borderRadius: 18, padding: 20, width: '100%', marginBottom: 32,
  },
  phraseLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  phraseBisaya: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  phraseEnglish: { fontSize: 16, marginBottom: 16 },
  pronunciationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listenBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  listenBtnActive: {},
  phrasePron: { fontSize: 15, fontStyle: 'italic', flex: 1 },

  micContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  micGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  micBtn: {
    width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center',
  },
  micBtnRecording: {},
  micTouch: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },

  statusText: { fontSize: 14, marginBottom: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  progressText: { fontSize: 13 },
  exitPractice: { paddingHorizontal: 10, paddingVertical: 4 },
  exitPracticeText: { fontSize: 13, fontWeight: '600' },

  analyzingContainer: { alignItems: 'center', paddingTop: 80 },
  analyzingText: { fontSize: 16, marginTop: 16 },

  // Feedback
  feedbackContainer: { alignItems: 'center', paddingTop: 20 },
  feedbackFlash: { position: 'absolute', top: 0, left: -16, right: -16, bottom: 0 },
  feedbackHeader: { alignItems: 'center', marginBottom: 24 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scoreText: { position: 'absolute', fontSize: 24, fontWeight: '800' },
  scoreCaption: { position: 'absolute', bottom: 18, fontSize: 9, fontWeight: '600' },
  feedbackTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  feedbackSubtitle: { fontSize: 16 },

  feedbackCard: {
    borderWidth: 1,
    borderRadius: 16, padding: 16, width: '100%', marginBottom: 16,
  },
  feedbackLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  feedbackText: { fontSize: 15, lineHeight: 22 },
  feedbackValue: { fontSize: 18, fontWeight: '700' },

  phonemeSection: { width: '100%', marginBottom: 24 },
  phonemeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  phonemeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phonemeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  phonemeExpected: { fontSize: 14, fontWeight: '700' },
  phonemeHeard: { fontSize: 13, fontStyle: 'italic' },

  feedbackActions: { flexDirection: 'row', gap: 12, width: '100%' },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 20, paddingVertical: 16,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, paddingVertical: 16, gap: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700' },
});
