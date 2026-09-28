import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { XP_VALUES } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { readAsStringAsync } from 'expo-file-system/legacy';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { speakTTS, stopTTS } from '../utils/tts';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import AuroraBackground from '../components/AuroraBackground';
import Header from '../components/Header';
import { spacing, borderRadius } from '../theme';
import { ensureContrast } from '../theme/moduleColors';

const PHILIPPINE_LANGUAGES = [
  { id: 'tagalog', label: 'Tagalog', native: 'Tagalog', region: 'Central/Southern Luzon', flag: '\u{1F1F5}\u{1F1ED}', color: '#2563EB', speakers: '28M+' },
  { id: 'cebuano', label: 'Cebuano', native: 'Bisaya', region: 'Visayas & Mindanao', flag: '\u{1F1F5}\u{1F1ED}', color: '#14B8A6', speakers: '21M+' },
  { id: 'ilocano', label: 'Ilocano', native: 'Ilokano', region: 'Northern Luzon', flag: '\u{1F1F5}\u{1F1ED}', color: '#8B5CF6', speakers: '9M+' },
  { id: 'hiligaynon', label: 'Hiligaynon', native: 'Ilonggo', region: 'Western Visayas', flag: '\u{1F1F5}\u{1F1ED}', color: '#10B981', speakers: '7M+' },
  { id: 'bikol', label: 'Bikol', native: 'Bikolano', region: 'Bicol Peninsula', flag: '\u{1F1F5}\u{1F1ED}', color: '#F59E0B', speakers: '5M+' },
  { id: 'waray', label: 'Waray', native: 'Winaray', region: 'Eastern Visayas', flag: '\u{1F1F5}\u{1F1ED}', color: '#EF4444', speakers: '3M+' },
  { id: 'kapampangan', label: 'Kapampangan', native: 'Kapampangan', region: 'Central Luzon', flag: '\u{1F1F5}\u{1F1ED}', color: '#EC4899', speakers: '2M+' },
  { id: 'pangasinan', label: 'Pangasinan', native: 'Pangasinan', region: 'Pangasinan', flag: '\u{1F1F5}\u{1F1ED}', color: '#06B6D4', speakers: '1M+' },
];

const stripDetectedLine = (text) =>
  (text || '').replace(/^\s*[🗣️]\s*Detected:[^\n]*\n?/i, '').trim();

const TOPICS = [
  { label: 'Greetings', icon: 'hand-left', desc: 'Maayong adlaw! Hello!' },
  { label: 'Family', icon: 'people', desc: 'Pamilya terms' },
  { label: 'Food', icon: 'restaurant', desc: 'Kain na! Let\'s eat!' },
  { label: 'Market', icon: 'cart', desc: 'Bargaining phrases' },
  { label: 'Directions', icon: 'compass', desc: 'Asking for directions' },
  { label: 'Transport', icon: 'bus', desc: 'Jeepney & tricycle' },
  { label: 'Numbers', icon: 'calculator', desc: 'Counting & money' },
  { label: 'Weather', icon: 'sunny', desc: 'Talking about weather' },
  { label: 'Emergency', icon: 'warning', desc: 'Emergency phrases' },
  { label: 'Love', icon: 'heart', desc: 'Gugma & romance' },
];

function AnimatedMessage({ children, index }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { stiffness: 200, damping: 20 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function TypingDots() {
  const { colors } = useTheme();
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
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.6 }, style1]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.6 }, style2]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.6 }, style3]} />
    </View>
  );
}

export default function WhisperAIScreen({ navigation }) {
  const { colors, isDark, onPrimary } = useTheme();
  const { addXp } = useGame();

  const [selectedLanguage, setSelectedLanguage] = useState(PHILIPPINE_LANGUAGES[0]);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [phrases, setPhrases] = useState([]);
  const [showPhrases, setShowPhrases] = useState(false);
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const flatListRef = useRef(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(30);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 600 });
    slideUp.value = withSpring(0, { stiffness: 120, damping: 15 });
    return () => { stopTTS(); };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setMessages([{
        id: '0', role: 'assistant',
        text: `Maayong adlaw! I'm Whisper AI, your Philippine dialect companion! \u{1F1F5}\u{1F1ED}\n\nI currently teach **${selectedLanguage.native} (${selectedLanguage.label})** from ${selectedLanguage.region}.\n\nYou can:\n\u{1F4AC} Chat with me to learn phrases\n\u{1F3A4} Use voice to practice speaking\n\u{1F4D6} Tap a topic below to learn situational phrases\n\n*Switch languages anytime using the selector above!*`,
        quickActions: true,
      }]);
    }
  }, [selectedLanguage.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.whisperChat(msg, selectedLanguage.id);
      const reply = data.reply || 'Pasayloa ko, wala ko kasabot. Please try again!';
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }]);
      addXp(XP_VALUES.WHISPER_INTERACTION, 'whisper');
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const loadPhrases = async (topic) => {
    setActiveTopic(topic);
    setPhraseLoading(true);
    setShowPhrases(true);
    try {
      const data = await api.whisperPhrases(topic.label, selectedLanguage.id);
      setPhrases(data.phrases || []);
    } catch {
      setPhrases([]);
    } finally {
      setPhraseLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return Alert.alert('Permission Denied', 'Microphone access is needed.');
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
    } catch {
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    setRecording(false);
    setLoading(true);
    try {
      if (recorderState.isRecording) await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        setLoading(false);
        return;
      }
      const audioBase64 = await readAsStringAsync(uri, { encoding: 'base64' });
      if (!audioBase64 || audioBase64.length < 100) {
        setLoading(false);
        return;
      }

      const data = await api.whisperVoice(audioBase64, selectedLanguage.id);
      if (data.transcription) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text: data.transcription }]);
      }
      if (data.reply) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: data.reply, detected: data.detected || null }]);
        addXp(XP_VALUES.WHISPER_INTERACTION, 'whisper');
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Sorry, I couldn\'t process that audio. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const speakPhrase = (text, langId) => {
    const langMap = {
      tagalog: 'fil', cebuano: 'ceb', ilocano: 'ilo', hiligaynon: 'hil',
      bikol: 'bik', waray: 'war', kapampangan: 'pam', pangasinan: 'pag',
    };
    speakTTS(text, { language: langMap[langId] || 'fil', rate: 0.8 });
  };

  const currentLang = selectedLanguage;

  const renderHeader = () => (
    <Header
      title="Whisper AI"
      subtitle="Philippine Dialect Companion"
      leftIcon="chevron-back"
      onLeftPress={() => navigation.goBack()}
    >
      <TouchableOpacity onPress={() => setShowLanguagePicker(!showLanguagePicker)} accessibilityRole="button" accessibilityLabel="Select a language">
        <LinearGradient colors={[currentLang.color, currentLang.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.langPill}>
          <Text style={styles.langFlag}>{currentLang.flag}</Text>
          <Text style={styles.langLabel}>{currentLang.native}</Text>
          <Ionicons name={showLanguagePicker ? 'chevron-up' : 'chevron-down'} size={14} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Header>
  );

  const renderLanguagePicker = () => (
    <Animated.View style={[styles.langPickerContainer, animatedStyle]}>
      <GlassCard variant="elevated" style={styles.langPicker} padding="md">
        <Text style={[styles.pickerTitle, { color: colors.text }]}>Select a Language</Text>
        <Text style={[styles.pickerSubtitle, { color: colors.textSecondary }]}>Choose from the 8 major regional languages of the Philippines</Text>
        <View style={styles.langGrid}>
          {PHILIPPINE_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[styles.langCard, { borderColor: selectedLanguage.id === lang.id ? lang.color : colors.border }]}
              onPress={() => { setSelectedLanguage(lang); setShowLanguagePicker(false); setMessages([]); }}
            >
              <LinearGradient colors={[lang.color + '20', lang.color + '08']} style={styles.langCardInner}>
                <Text style={styles.langCardFlag}>{lang.flag}</Text>
                <Text style={[styles.langCardName, { color: colors.text }]}>{lang.native}</Text>
                <Text style={[styles.langCardRegion, { color: colors.textSecondary }]}>{lang.region}</Text>
                <Badge title={lang.speakers} variant="info" size="sm" />
              </LinearGradient>
              {selectedLanguage.id === lang.id && (
                <View style={[styles.langCheck, { backgroundColor: lang.color }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>
    </Animated.View>
  );

  const renderTopics = () => (
    <View style={styles.topicsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Topics</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsScroll}>
        {TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.label}
            style={[styles.topicChip, { backgroundColor: activeTopic?.label === topic.label ? colors.primary : colors.surface, borderColor: activeTopic?.label === topic.label ? colors.primary : colors.border }]}
            onPress={() => loadPhrases(topic)}
          >
            <Ionicons name={topic.icon} size={16} color={activeTopic?.label === topic.label ? '#fff' : colors.primary} />
            <Text style={[styles.topicLabel, { color: activeTopic?.label === topic.label ? '#fff' : colors.text }]}>{topic.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPhrases = () => {
    if (!showPhrases) return null;
    return (
      <GlassCard variant="default" style={styles.phrasesCard} padding="lg">
        <View style={styles.phrasesHeader}>
          <Text style={[styles.phrasesTitle, { color: colors.text }]}>
            {activeTopic?.icon && <Ionicons name={activeTopic.icon} size={18} color={colors.primary} />} {activeTopic?.label} Phrases
          </Text>
          <TouchableOpacity onPress={() => setShowPhrases(false)}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {phraseLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : phrases.length > 0 ? (
          phrases.map((phrase, i) => (
            <View key={i} style={[styles.phraseRow, { borderBottomColor: colors.border }]}>
              <View style={styles.phraseMain}>
                <Text style={[styles.phraseText, { color: colors.primary }]}>{phrase.native || phrase.phrase}</Text>
                <Text style={[styles.phraseEnglish, { color: colors.textSecondary }]}>{phrase.english || phrase.translation}</Text>
                {phrase.pronunciation && (
                  <Text style={[styles.phrasePron, { color: colors.textLight }]}>"{phrase.pronunciation}"</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => speakPhrase(phrase.native || phrase.phrase, selectedLanguage.id)} style={[styles.speakBtn, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="volume-high" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyPhrases, { color: colors.textSecondary }]}>No phrases found. Try another topic!</Text>
        )}
      </GlassCard>
    );
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const detected = !isUser ? item.detected : null;
    const bubbleText = detected ? stripDetectedLine(item.text) : item.text;
    return (
      <AnimatedMessage index={index}>
        <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
          {!isUser && (
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.msgAvatar}>
              <Ionicons name="language" size={16} color="#fff" />
            </LinearGradient>
          )}
          <View style={{ flex: 1, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
            {detected && (
              <View style={[styles.detectedPill, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="mic-outline" size={11} color={colors.primary} />
                <Text style={[styles.detectedText, { color: colors.primary }]}>Detected: {detected}</Text>
              </View>
            )}
             <View style={[styles.msgBubble, isUser ? styles.msgUser : styles.msgAssistant, { backgroundColor: isUser ? colors.primary : colors.surface }]}>
              <Text style={[styles.msgText, { color: isUser ? '#fff' : colors.text }]}>{bubbleText}</Text>
              {!isUser && (
                <TouchableOpacity onPress={() => speakPhrase(item.text.replace(/\*\*/g, '').replace(/[^a-zA-Z\u00F1\u00D1\s]/g, '').trim(), selectedLanguage.id)} style={styles.msgSpeak}>
                  <Ionicons name="volume-high" size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </AnimatedMessage>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AuroraBackground atmosphere="sulti">
        {renderHeader()}
        {showLanguagePicker && renderLanguagePicker()}

        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={
              <View>
                {renderTopics()}
                {renderPhrases()}
              </View>
            }
            ListFooterComponent={loading ? <TypingDots /> : null}
          />

          <View style={[styles.inputBar, { backgroundColor: isDark ? colors.surface : colors.white, borderTopColor: colors.border }]}>
<TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={[
                { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
                { backgroundColor: colors.surface }
              ]}
              accessibilityRole="button"
              accessibilityLabel={recording ? 'Stop recording' : 'Record voice message'}
            >
              <Ionicons name={recording ? 'mic' : 'mic-outline'} size={22} color={recording ? colors.error : colors.primary} />
            </TouchableOpacity>
            <TextInput
              id="whisperInput"
              name="whisperInput"
              testID="whisper-input"
              style={[styles.textInput, { color: colors.text, backgroundColor: isDark ? colors.background : colors.surfaceSecondary }]}
              placeholder={`Type in ${selectedLanguage.label} or English...`}
              placeholderTextColor={colors.textLight}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              multiline
              maxLength={500}
              autoComplete="off"
              autoCorrect={false}
              nativeID="whisper-input"
              accessibilityLabel="Message input"
              accessibilityHint="Type your message here"
              importantForAutofill="no"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: input.trim() ? 1 : 0.5,
                  // White-on-primary is the only ink that fails on some themes, so
                  // measure it against the actual fill instead of assuming.
                  borderColor: colors.border,
                },
              ]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons name="send" size={18} color={ensureContrast(onPrimary, colors.primary, 4.5)} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </AuroraBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
langPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  langFlag: { fontSize: 14 },
  langLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
  container: { flex: 1, minHeight: 0 },
  chatList: { flex: 1, minHeight: 0 },
  chatContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  langPickerContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  langPicker: {},
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  pickerSubtitle: { fontSize: 13, marginBottom: spacing.lg },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  langCard: { width: '47%', borderWidth: 2, borderRadius: borderRadius.lg, overflow: 'hidden', position: 'relative' },
  langCardInner: { padding: spacing.md, alignItems: 'center', gap: 4 },
  langCardFlag: { fontSize: 28, marginBottom: 2 },
  langCardName: { fontSize: 15, fontWeight: '700' },
  langCardRegion: { fontSize: 11 },
  langCheck: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  topicsSection: { marginTop: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  topicsScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  topicChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, gap: 6 },
  topicLabel: { fontSize: 13, fontWeight: '600' },
  phrasesCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  phrasesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  phrasesTitle: { fontSize: 16, fontWeight: '700' },
  phraseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.sm },
  phraseMain: { flex: 1 },
  phraseText: { fontSize: 16, fontWeight: '600' },
  phraseEnglish: { fontSize: 13, marginTop: 2 },
  phrasePron: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  speakBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyPhrases: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  msgRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  detectedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, marginBottom: 6 },
  detectedText: { fontSize: 11, fontWeight: '600' },
  msgBubble: { maxWidth: '80%', padding: spacing.md, borderRadius: borderRadius.lg, position: 'relative' },
  msgUser: { borderBottomRightRadius: 4 },
  msgAssistant: { borderBottomLeftRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', elevation: 1 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgSpeak: { position: 'absolute', bottom: 6, right: 6, padding: 4 },
  // This block is evaluated once at module load, so it cannot read the theme.
  // The themed background/border are applied inline at the render site.
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, gap: spacing.sm },
  textInput: { flex: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});