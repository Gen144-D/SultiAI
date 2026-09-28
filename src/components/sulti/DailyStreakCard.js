import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../theme';
import { readableOnGradient } from '../../theme/moduleColors';

const DAILY_WORDS = [
  { word: 'Kumusta', meaning: 'Hello / How are you' },
  { word: 'Salamat', meaning: 'Thank you' },
  { word: 'Palihug', meaning: 'Please' },
  { word: 'Nindot', meaning: 'Nice / Good' },
  { word: 'Kanunay', meaning: 'Always' },
  { word: 'Puhon', meaning: 'Soon / God willing' },
  { word: 'Tagay', meaning: 'Cheers' },
  { word: 'Unya na', meaning: 'Later / Not now' },
  { word: 'Sulong', meaning: 'Go / Move forward' },
  { word: 'Mahal', meaning: 'Love / Expensive' },
];

const getDailyWord = () => {
  const idx = Math.floor(Date.now() / 86400000) % DAILY_WORDS.length;
  return DAILY_WORDS[idx];
};

// The card is deliberately the one warm surface in the hub: a streak reads as
// fire, not as a theme colour. Its inks are therefore measured against that
// gradient, and the "Practice" button follows the active theme's primary ramp
// so the CTA matches the rest of the app instead of a fixed teal.
export default function DailyStreakCard({ streak = 3, onPractice }) {
  const { colors, onPrimary } = useTheme();
  const word = getDailyWord();

  const streakGradient = [colors.amber, colors.coral];
  const streakInk = readableOnGradient(streakGradient);

  return (
    <LinearGradient
      colors={streakGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
      accessibilityLabel={`Daily streak: ${streak} days. Word of the day: ${word.word}, meaning ${word.meaning}.`}
    >
      <View style={styles.topRow}>
        <View style={styles.streakBlock}>
          <View style={[styles.flameBadge, { backgroundColor: `${streakInk}26` }]}>
        <Ionicons name="flame" size={20} color={streakInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.streakTitle, { color: streakInk }]}>{streak} Day Streak!</Text>
        <Text style={[styles.streakSub, { color: `${streakInk}D9` }]}>
          Keep it going, padayon!
        </Text>
      </View>
        </View>
        <TouchableOpacity
          onPress={() => onPractice && onPractice(word)}
          accessibilityRole="button"
          accessibilityLabel={`Practice the word ${word.word}`}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.practiceBtn}
        >
          <Text style={[styles.practiceText, { color: onPrimary }]}>Practice</Text>
          <Ionicons name="arrow-forward" size={16} color={onPrimary} />
        </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={[styles.wotdBand, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
        <Text style={[styles.wotdLabel, { color: colors.primary }]}>WORD OF THE DAY</Text>
        <Text style={[styles.wotdWord, { color: colors.text }]}>
          {word.word}
          <Text style={[styles.wotdEq, { color: colors.textSecondary }]}> = </Text>
          {word.meaning}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xxxl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  flameBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTitle: {
    ...typography.h4,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  streakSub: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 1,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  practiceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  wotdBand: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  wotdLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  wotdWord: {
    ...typography.bodyBold,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  wotdEq: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
});