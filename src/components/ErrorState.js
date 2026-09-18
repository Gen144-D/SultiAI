import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../theme';

/**
 * ErrorState
 *
 * Reusable error/empty failure state with an optional retry action.
 * Used when data fetching fails so screens degrade gracefully instead
 * of silently showing nothing.
 *
 * @param {{ icon?: string, title?: string, message?: string, actionLabel?: string, onAction?: Function, compact?: boolean }} props
 */
export default function ErrorState({
  icon = 'cloud-offline-outline',
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  actionLabel = 'Retry',
  onAction,
  compact = false,
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.error + '15' }]}>
        <Ionicons name={icon} size={compact ? 28 : 40} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint="Retries loading this content"
          hitSlop={8}
        >
          <Ionicons name="refresh" size={16} color={colors.textOnGradient} />
          <Text style={[styles.actionText, { color: colors.textOnGradient }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  compact: { padding: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 13, lineHeight: 18, textAlign: 'center', maxWidth: 260 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, marginTop: spacing.sm },
  actionText: { fontSize: 14, fontWeight: '700' },
});
