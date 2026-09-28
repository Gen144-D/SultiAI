import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';

const padMap = { sm: spacing.sm, md: spacing.lg, lg: spacing.xl, xl: spacing.xxl, xxl: spacing.xxxl, huge: spacing.huge };

export default function GlassCard({
  children, style, variant = 'default', intensity = 30,
  glowColor, padding = 'lg', floating = false,
}) {
  const { colors, isDark } = useTheme();
  const pad = padMap[padding] || spacing.xl;

  const baseStyle = [
    styles.base,
    {
      padding: pad,
      borderColor: colors.border,
      ...shadows.card,
      ...(padding === 'xl' ? shadows.soft : {}),
    },
    style,
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={[
        styles.webGlass,
        { backgroundColor: colors.glassBg, borderColor: colors.glassBorder, padding: pad },
        baseStyle,
        variant === 'elevated' && styles.elevated,
        variant === 'tinted' && { backgroundColor: colors.primary + '10', borderColor: colors.borderHover },
        floating && styles.floatShadow,
      ]}>
        <View style={[styles.shine, { backgroundColor: colors.glassHighlight }]} />
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.base,
        styles.inner,
        baseStyle,
        variant === 'elevated' && styles.elevated,
        variant === 'tinted' && { backgroundColor: colors.primary + '10' },
        variant === 'glow' && { borderColor: glowColor || colors.primary + '40', ...shadows.premium },
        floating && styles.floatShadow,
      ]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
    borderRadius: borderRadius.xxl,
  },
  webGlass: {
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  },
  elevated: {
    ...shadows.xxl,
  },
  floatShadow: {
    boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
    elevation: 14,
  },
  shine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
    borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    opacity: 0.25,
  },
});
