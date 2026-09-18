import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing, shadows } from '../theme';

const padMap = { sm: spacing.sm, md: spacing.md, lg: spacing.lg, xl: spacing.xl, xxl: spacing.xxl };

export default function Card({
  children, style, variant = 'default', padding = 'md', onPress, glass = false, accessibilityLabel,
}) {
  const { colors } = useTheme();

  const cardStyles = [
    styles.card,
    { backgroundColor: glass ? colors.glassBg : colors.card },
    variant === 'elevated' && { ...shadows.lg },
    variant === 'outlined' && { borderWidth: 1, borderColor: colors.border },
    variant === 'glass' && {
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...shadows.lg,
    },
    variant !== 'outlined' && variant !== 'glass' && { borderWidth: 1, borderColor: colors.border },
    { padding: padMap[padding] || spacing.lg },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          ...cardStyles,
          pressed && { transform: [{ scale: 0.985 }], opacity: 0.92, ...shadows.lg },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
});