import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import GlassCard from './GlassCard';
import Badge from './Badge';
import { spacing, borderRadius, typography } from '../theme';

/**
 * @typedef {Object} StatCard
 * @property {string} id
 * @property {string} label
 * @property {string|number} value
 * @property {string} icon
 * @property {string} color
 */

/**
 * ProgressScrollSection
 *
 * Horizontal overflow-x scroll container for "Your Progress" stat cards.
 * Users can swipe left/right to see all stats — replacing the flat
 * cut-off section with a scrollable carousel.
 *
 * @param {{ level?: Object|null, xp: number, streak: number, savedCount: number, communityCount: number }} props
 */
export default function ProgressScrollSection({
  level,
  xp,
  streak,
  savedCount = 0,
  communityCount = 0,
}) {
  const { colors } = useTheme();
  const { getLevelInfo } = useGame();
  const levelInfo = getLevelInfo(xp);

  /** @type {StatCard[]} */
  const statCards = [
    { id: 'sessions', label: 'Sessions', value: level?.total_sessions || 0, icon: 'play-circle', color: colors.primary },
    { id: 'xp', label: 'Total XP', value: xp, icon: 'flash', color: colors.accent },
    { id: 'streak', label: 'Streak', value: streak, icon: 'flame', color: streak >= 30 ? '#FF6B00' : streak >= 7 ? '#FF9500' : '#FFD700' },
    { id: 'saved', label: 'Saved', value: savedCount, icon: 'bookmark', color: colors.secondary },
    { id: 'community', label: 'Community', value: communityCount, icon: 'people', color: colors.success },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
        {levelInfo && (
          <Badge
            icon={levelInfo.icon}
            title={levelInfo.label}
            color={levelInfo.color}
          />
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {statCards.map((card) => (
          <GlassCard key={card.id} variant="elevated" style={styles.statCard} padding="md">
            <View style={[styles.statIcon, { backgroundColor: card.color + '20' }]}>
              <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
    sectionTitle: {
      ...typography.h3,
    },
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  statCard: {
    width: 100,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.36,
    marginBottom: 2,
  },
    statLabel: {
      ...typography.small,
    },
});
