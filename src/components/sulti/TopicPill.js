import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography } from '../../theme';

export default function TopicPill({ label, icon, color, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor: color + '12', borderColor: color + '25' },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={`Practice ${label}`}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xxxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    minHeight: 44,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});