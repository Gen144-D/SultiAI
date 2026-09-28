import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import GlassCard from '../GlassCard';
import { spacing, borderRadius, typography, shadows } from '../../theme';

/**
 * ModuleCard
 *
 * Reusable learning module card with:
 *   - Staggered mount animation (opacity + scale spring)
 *   - Press/tap scale effect
 *   - Gradient icon background
 *   - Description and "Start" button
 *
 * @param {{
 *   title: string,
 *   description: string,
 *   iconName: string,
 *   gradient: string[],
 *   onPress: Function,
 *   index: number,
 *   badge?: string,
 *   badgeColor?: string,
 *   progress?: number | null,
 *   statusLabel?: string
 * }} props
 */
export default function ModuleCard({
  title,
  description,
  iconName,
  gradient,
  onPress,
  index = 0,
  badge,
  badgeColor,
  progress = null,
  statusLabel
}) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(
      () => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
      index * 80,
    );
    return () => clearTimeout(timer);
  }, [index]);

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.96,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <GlassCard variant="elevated" style={styles.moduleCard} padding="lg">
            <View style={styles.iconRow}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleIcon}
              >
                <Ionicons name={iconName} size={28} color="#fff" />
              </LinearGradient>
              {badge && (
                <View style={[styles.badge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '40' }]}>
                  <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.moduleTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.moduleDescription, { color: colors.textSecondary }]}>{description}</Text>
            {progress !== null && progress !== undefined ? (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: gradient[0] }]} />
                </View>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  {progress >= 100 ? 'Completed' : statusLabel || `${Math.round(progress)}%`}
                </Text>
              </View>
            ) : (
              <Text style={[styles.progressLabel, styles.notStarted, { color: colors.textSecondary }]}>Not started</Text>
            )}
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: gradient[0] }]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>Start</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  moduleCard: {
    flex: 1,
    minWidth: 160,
    maxWidth: 180,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
    moduleTitle: {
      marginBottom: spacing.xs,
      ...typography.h4,
    },
    moduleDescription: {
      marginBottom: spacing.md,
      ...typography.caption,
    },
  progressWrap: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  notStarted: {
    marginBottom: spacing.md,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.08,
  },
});