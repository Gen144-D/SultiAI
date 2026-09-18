import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography } from '../../theme';
import GlassCard from '../GlassCard';

export default function RoleplayCard({ onPress, expanded, children, colors }) {
  return (
    <GlassCard variant="tinted" style={styles.card} padding="lg">
      <TouchableOpacity
        style={styles.header}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel="Role-Play Scenarios"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.iconWrap, { backgroundColor: (colors?.primary || '#5B5FEF') + '18' }]}>
          <Ionicons name="game-controller" size={20} color={colors?.primary || '#5B5FEF'} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors?.text || '#0F172A' }]}>
            🎮 Role-Play Scenarios
          </Text>
          <Text style={[styles.subtitle, { color: colors?.textSecondary || '#475569' }]}>
            Sulti plays a local character — you act out the scene together
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-forward'}
          size={20}
          color={colors?.textLight || '#64748B'}
        />
      </TouchableOpacity>
      {expanded && children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    lineHeight: 17,
  },
});
