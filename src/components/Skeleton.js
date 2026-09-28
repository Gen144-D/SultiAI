import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, animation } from '../theme';

export function Skeleton({
  width = '100%',
  height = 14,
  radius = borderRadius.sm,
  style,
  delay = 0,
  accessibilityLabel = 'Loading',
}) {
  const { colors, getAnimationDuration } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const duration = getAnimationDuration(animation.timingSlow.duration);
    if (!duration) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: duration / 2, useNativeDriver: true }),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [pulse, getAnimationDuration, delay]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceStrong, opacity: pulse },
        style,
      ]}
    />
  );
}

export function SkeletonText({ lines = 3, lastLineWidth = '60%', spacing = 10, style }) {
  return (
    <View style={[styles.textGroup, { gap: spacing }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          delay={i * 90}
          accessibilityLabel={`Loading line ${i + 1} of ${lines}`}
        />
      ))}
    </View>
  );
}

export function SkeletonRow({ avatar = false, lines = 2, style, spacing = 14 }) {
  return (
    <View style={[styles.row, { gap: spacing }, style]}>
      {avatar ? <Skeleton width={40} height={40} radius={borderRadius.full} /> : null}
      <View style={styles.rowBody}>
        <SkeletonText lines={lines} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
  textGroup: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  rowBody: { flex: 1, gap: 10 },
});
