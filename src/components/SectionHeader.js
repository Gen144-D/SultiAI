import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';

export function Divider({ style, vertical = false, inset = false }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="none"
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: colors.border },
        inset && (vertical ? styles.insetVertical : styles.insetHorizontal),
        style,
      ]}
    />
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  const { colors } = useTheme();
  if (!title && !actionLabel) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textGroup}>
        {title ? (
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontal: { height: StyleSheet.hairlineWidth, width: '100%' },
  vertical: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  insetHorizontal: { marginLeft: spacing.lg },
  insetVertical: { marginTop: spacing.md },
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  textGroup: { flexShrink: 1, gap: 2 },
  title: { ...typography.h4 },
  subtitle: { ...typography.small },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { ...typography.caption, fontWeight: '600' },
});
