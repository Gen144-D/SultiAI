import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useGame } from '../../../context/GameContext';
import { spacing, borderRadius } from '../../../theme';
import { ensureContrast } from '../../../theme/moduleColors';

/**
 * DailyMotivation
 *
 * Slim encouragement strip. Deliberately NOT a full-width dashboard card:
 * it is a single line of motivation that shrinks away once the daily goal
 * is met so the primary action stays above the fold.
 */
export function DailyMotivation() {
  const { colors, getAnimationDuration } = useTheme();
  const { streak, dailyXp, dailyGoal } = useGame() as any;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(6));

  const safeStreak = Math.max(0, Number(streak) || 0);
  const goal = Math.max(1, Number(dailyGoal) || 50);
  const safeDailyXp = Math.max(0, Number(dailyXp) || 0);
  const done = safeDailyXp >= goal;

  let icon: 'sparkles' | 'checkmark-circle' = 'sparkles';
  let message = 'Start your first streak today — one lesson is all it takes.';

  if (done) {
    icon = 'checkmark-circle';
    message = 'Daily goal complete — amazing work today!';
  } else if (safeStreak > 0) {
    message = `You're on a ${safeStreak}-day streak. Keep it going today!`;
  } else if (safeDailyXp > 0) {
    message = `${safeDailyXp.toLocaleString()} XP today — keep the momentum!`;
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(450), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: getAnimationDuration(400), useNativeDriver: true }),
    ]).start();
  }, [getAnimationDuration, fadeAnim, slideAnim]);

  const bg = done ? colors.secondaryLight : colors.softTeal;
  // The strip icon sits on the strip fill, so measure it there. Soft Academic's
  // success is only 3.34:1 on secondaryLight, which is too faint to read.
  const fg = ensureContrast(colors.text, bg, 4.5);

  return (
    <Animated.View
      style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      accessibilityLabel={message}
    >
      <View style={[styles.strip, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={15} color={fg} />
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
});