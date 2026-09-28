import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, useSharedValue, useAnimatedProps, withTiming, withDelay } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useVoicePalette } from './palette';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ScoreRing({ score, voice, styles }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(200, withTiming(Math.max(0.08, score / 100), { duration: 900 }));
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${circumference * progress.value} ${circumference}`,
  }));

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={score >= 85 ? voice.success : score >= 60 ? voice.warning : voice.danger}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
      <Text style={styles.scoreText}>{score}</Text>
    </View>
  );
}

export function PronunciationCard({ score, feedback, phonemes = [] }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  const color = score >= 85 ? voice.success : score >= 60 ? voice.warning : voice.danger;

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.card} accessibilityRole="text">
      <View style={styles.pronHeader}>
        <ScoreRing score={score} voice={voice} styles={styles} />
        <View style={styles.pronBody}>
          <View style={styles.pronLabelRow}>
            <Ionicons name="ribbon-outline" size={14} color={color} />
            <Text style={[styles.pronLabel, { color }]}>{score >= 85 ? 'Excellent pronunciation!' : score >= 60 ? 'Almost perfect!' : 'Let\'s try again.'}</Text>
          </View>
          {feedback ? <Text style={styles.feedback} numberOfLines={3}>{feedback}</Text> : null}
        </View>
      </View>
      {phonemes.length > 0 && (
        <View style={styles.phonemeList}>
          {phonemes.slice(0, 4).map((p, i) => (
            <View key={i} style={styles.phonemeChip}>
              <Text style={styles.phonemeExpected}>{p.expected}</Text>
              <Ionicons name={p.correct ? 'checkmark-circle' : 'close-circle'} size={13} color={p.correct ? voice.success : voice.danger} />
              <Text style={styles.phonemeHeard}>{p.heard}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

export function RepeatCard({ text, onSpeak }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  return (
    <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.card}>
      <View style={styles.repeatHeader}>
        <Ionicons name="repeat" size={14} color={voice.primary} />
        <Text style={styles.repeatTitle}>Repeat after me</Text>
      </View>
      <Text style={styles.repeatText} numberOfLines={2}>{text}</Text>
      <View style={styles.repeatButtons}>
        <TouchableOpacity onPress={() => onSpeak(0.55)} style={styles.repeatBtn} accessibilityRole="button" accessibilityLabel="Repeat slowly">
          <Ionicons name="turtle-outline" size={14} color={voice.accent} />
          <Text style={[styles.repeatBtnText, { color: voice.accent }]}>Slow</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSpeak(1)} style={styles.repeatBtn} accessibilityRole="button" accessibilityLabel="Repeat at normal speed">
          <Ionicons name="play" size={13} color={voice.primary} />
          <Text style={[styles.repeatBtnText, { color: voice.primary }]}>Normal</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function VocabCards({ entries }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  if (!entries || entries.length === 0) return null;
  return (
    <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.vocabWrap}>
      <View style={styles.vocabHeader}>
        <Ionicons name="book-outline" size={14} color={voice.secondary} />
        <Text style={styles.vocabTitle}>Words you just met</Text>
      </View>
      {entries.map((e, i) => (
        <View key={i} style={[styles.vocabCard, i > 0 && { marginTop: 8 }]}>
          <View style={styles.vocabRow}>
            <Text style={styles.vocabBisaya}>{e.bisaya}</Text>
            <Text style={styles.vocabEnglish}>{e.english}</Text>
          </View>
          <Text style={styles.vocabPron}>🗣 {e.pronunciation}</Text>
          <Text style={styles.vocabExample}>"{e.example}"</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  card: {
    backgroundColor: voice.surface,
    borderWidth: 1,
    borderColor: voice.glassBorder,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  scoreText: { position: 'absolute', fontSize: 16, fontWeight: '800', color: voice.text },
  pronHeader: { flexDirection: 'row', alignItems: 'center' },
  pronBody: { flex: 1 },
  pronLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  pronLabel: { fontSize: 13, fontWeight: '800' },
  feedback: { color: voice.textSecondary, fontSize: 12, lineHeight: 17 },
  phonemeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  phonemeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  phonemeExpected: { color: voice.text, fontSize: 12, fontWeight: '700' },
  phonemeHeard: { color: voice.textMuted, fontSize: 12, fontStyle: 'italic' },
  repeatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  repeatTitle: { color: voice.primary, fontSize: 13, fontWeight: '800' },
  repeatText: { color: voice.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
  repeatButtons: { flexDirection: 'row', gap: 8 },
  repeatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: voice.primary + '1A', borderWidth: 1, borderColor: voice.primary + '40',
  },
  repeatBtnText: { fontSize: 12, fontWeight: '700' },
  vocabWrap: { marginTop: 10 },
  vocabHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  vocabTitle: { color: voice.secondary, fontSize: 13, fontWeight: '800' },
  vocabCard: {
    backgroundColor: voice.surface,
    borderWidth: 1, borderColor: voice.glassBorder,
    borderRadius: 16, padding: 12,
  },
  vocabRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  vocabBisaya: { color: voice.text, fontSize: 15, fontWeight: '800' },
  vocabEnglish: { color: voice.textSecondary, fontSize: 13 },
  vocabPron: { color: voice.textMuted, fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  vocabExample: { color: voice.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
});
