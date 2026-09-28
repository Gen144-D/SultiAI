import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { spacing } from '../../../theme';

interface SectionLabelProps {
  children: React.ReactNode;
  style?: any;
}

/**
 * SectionLabel
 *
 * Consistent uppercase eyebrow used across Home sections so the page
 * reads as one typographic system instead of a stack of opaque cards.
 */
export function SectionLabel({ children, style }: SectionLabelProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.label, { color: colors.textSecondary }, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
});