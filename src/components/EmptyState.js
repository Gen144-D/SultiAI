import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Button from './Button';
import { spacing } from '../theme';

export default function EmptyState({ icon = 'book-outline', title, message, actionLabel, onAction }) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={48} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">{title || 'Nothing here yet'}</Text>
      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="outline" size="sm" style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, paddingTop: spacing.xxxl, gap: spacing.sm },
  iconContainer: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.xl },
});
