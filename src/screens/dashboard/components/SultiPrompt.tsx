import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius } from '../../../theme';
import { readableOnGradient } from '../../../theme/moduleColors';

interface SultiPromptProps {
  navigation: any;
}

/**
 * SultiPrompt
 *
 * A subtle, contextual SULTI entry point. Kept intentionally light:
 * one row, no heavy card treatment, so SULTI is reachable from Home
 * without competing with the daily goal.
 */
export function SultiPrompt({ navigation }: SultiPromptProps) {
  const { colors, getAnimationDuration } = useTheme();
  const [fadeAnim] = useState(() => new Animated.Value(0));

  // Ink measured against this card's own theme gradient.
  const onGradient = readableOnGradient([colors.primary, colors.primaryDark]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }).start();
  }, [getAnimationDuration, fadeAnim]);

  const handleOpen = () => {
    navigation.navigate('SULTI');
  };

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        onPress={handleOpen}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Talk with SULTI"
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons name="sparkles" size={16} color={onGradient} />
        </LinearGradient>
        <View style={styles.textGroup}>
          <Text style={[styles.title, { color: colors.text }]}>Need someone to practice with?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            SULTI is ready for a conversation.
          </Text>
        </View>
        <View style={[styles.chevron, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 60,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 12, fontWeight: '500' },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});