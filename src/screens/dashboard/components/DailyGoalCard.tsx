import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { useGame } from '../../../context/GameContext';
import { DAILY_GOAL_DEFAULT } from '../../../constants';
import { spacing, borderRadius } from '../../../theme';
import { readableOnGradient, getNeutralGradient, ensureContrast } from '../../../theme/moduleColors';

interface DailyGoalCardProps {
  onStart?: () => void;
}

/**
 * DailyGoalCard
 *
 * The primary hero section of the Home screen. One goal, one number set.
 *
 * The daily goal is XP-based (the only per-day progress the product tracks),
 * so the title, the counter and the remaining-value all speak about the SAME
 * thing. This removes the past contradiction of "Learn 10 new words" alongside
 * a `0 / 50 XP` counter.
 */
export function DailyGoalCard({ onStart }: DailyGoalCardProps) {
  const { colors, getAnimationDuration, onPrimary, themeName } = useTheme();
  const { dailyXp, dailyGoal } = useGame() as any;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [progressAnim] = useState(() => new Animated.Value(0));

  const goal = Math.max(1, Number(dailyGoal) || DAILY_GOAL_DEFAULT);
  const earned = Math.min(Math.max(0, Number(dailyXp) || 0), goal);
  const progress = Math.round((earned / goal) * 100);
  const remaining = Math.max(goal - earned, 0);
  const done = earned >= goal;

  // The card is painted with a theme gradient, so its ink has to be measured
  // against that gradient. Pinning it to Midnight Teal's '#042F2B' left every
  // other theme with whatever contrast it happened to land on. The completed
  // state uses the theme's single-hue success gradient — mixing success with
  // gradientB spanned light-to-dark, so no single ink could clear 4.5:1.
  const successGradient = getNeutralGradient(themeName, 'success');
  const cardGradient = done ? successGradient : [colors.gradientA, colors.gradientB];
  const onGradient = readableOnGradient(cardGradient);
  const onGradientSoft = `${onGradient}A6`;
  const onGradientFaint = `${onGradient}8C`;
  const trackBg = `${onGradient}42`;
  const badgeBg = `${onGradient}24`;
  // The CTA now paints on colors.primary, so measure the label against that
  // fill rather than against the card gradient behind it.
  const ctaFg = ensureContrast(onPrimary, colors.primary, 4.5);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: 1, duration: getAnimationDuration(900), useNativeDriver: false }),
    ]).start();
  }, [getAnimationDuration, fadeAnim, progressAnim, progress]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${progress}%`] });

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={done ? [colors.success, colors.gradientB] : [colors.gradientA, colors.gradientB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
        accessibilityLabel={
          done
            ? 'Today\'s goal complete'
            : `Today's goal: earn ${earned} of ${goal} XP`
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: onGradientFaint }]}>TODAY&apos;S GOAL</Text>
            <Text style={[styles.title, { color: onGradient }]}>
              {done ? 'Goal complete — great job!' : `Reach ${goal.toLocaleString()} XP today`}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Ionicons name={done ? 'checkmark' : 'trophy'} size={16} color={onGradient} />
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: onGradientSoft }]}>
            {done ? 'All done for today' : `${remaining.toLocaleString()} XP to go`}
          </Text>
          <Text style={[styles.progressPercent, { color: onGradient }]}>
            {earned.toLocaleString()} / {goal.toLocaleString()} XP
          </Text>
        </View>

        <View
          style={[styles.progressBarBg, { backgroundColor: trackBg }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: goal, now: earned }}
        >
          <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: onGradient }]} />
        </View>

        {!done && (
          <Text style={[styles.hint, { color: onGradientFaint }]}>Lessons, conversations and practice all count.</Text>
        )}

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={onStart}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={done ? 'Keep practicing' : 'Continue learning'}
        >
          <Text style={[styles.ctaText, { color: ctaFg }]}>
            {done ? 'Keep practicing' : 'Continue learning'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={ctaFg} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  card: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressPercent: { fontSize: 13, fontWeight: '800' },
  progressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  hint: { fontSize: 11, fontWeight: '500' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    // The CTA fill is applied at the render site; the label ink is measured
    // against it there. Hardcoding a white fill here made the label
    // white-on-white (1.00:1) on Soft Academic Light.
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.xs,
    minHeight: 48,
  },
  ctaText: { fontSize: 15, fontWeight: '800' },
});