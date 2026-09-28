import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useGame } from '../../context/GameContext';
import GlassCard from '../GlassCard';
import { Skeleton, SkeletonRow } from '../Skeleton';
import { spacing, borderRadius, shadows } from '../../theme';
import { api } from '../../services/api';
import { getLevel, getNumericLevel } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

export default function LearningProgressCard() {
  const { colors } = useTheme();
  const { xp, streak, dailyGoal, dailyXp } = useGame();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Declared before the effect that calls it, so the reference is never in a
  // temporal dead zone (a const arrow above the effect was TDZ-fragile).
  async function loadAnalytics() {
    try {
      const data = await api.getWeeklyProgress();
      setAnalytics(data);
    } catch {
      // Offline: show real game-context data only, no fabricated analytics
      setAnalytics({
        wordsLearned: 0,
        pronunciationAvg: 0,
        weeklyXp: 0,
        weeklyGoal: Math.max(1, dailyGoal * 7),
        sessionsThisWeek: 0,
        streak: streak,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 10,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate level from XP
  const currentLevel = getLevel(xp);
  const xpForNextLevel = currentLevel.nextThreshold;
  const xpProgress = Math.min(100, Math.max(0, currentLevel.progress * 100));
  const dailyProgress = dailyGoal > 0 ? Math.min((dailyXp / dailyGoal) * 100, 100) : 0;

  if (loading) {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <GlassCard variant="elevated" style={styles.skeletonCard} padding="lg">
          <SkeletonRow avatar lines={2} style={{ marginBottom: spacing.lg }} />
          <View style={styles.skeletonStats}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={60} radius={borderRadius.md} style={{ flex: 1 }} />
            ))}
          </View>
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <GlassCard variant="elevated" style={styles.progressCard} padding="lg">
        {/* Header with Level */}
        <View style={styles.header}>
          <View style={styles.levelSection}>
            <LinearGradient
              colors={[currentLevel.color, currentLevel.color + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelIcon}
            >
              <Ionicons name="school-outline" size={20} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>Current Level</Text>
              <View style={styles.levelRow}>
                <Text style={[styles.levelName, { color: currentLevel.color }]}>{currentLevel.label}</Text>
                <View style={[styles.levelPill, { backgroundColor: currentLevel.color + '20' }]}>
                  <Text style={[styles.levelPillText, { color: currentLevel.color }]}>Level {getNumericLevel(xp)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* XP to next level */}
          <View style={styles.xpProgressSection}>
            <View style={styles.xpProgressHeader}>
              <Text style={[styles.xpProgressLabel, { color: colors.textSecondary }]}>XP to {getLevel(xp + 100).label}</Text>
              <Text style={[styles.xpProgressValue, { color: colors.text }]}>{xp} / {xpForNextLevel} XP</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: currentLevel.color },
                  { width: `${Math.min(Math.max(xpProgress, 0), 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Daily Goal */}
        <View style={[styles.dailyGoalSection, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.dailyGoalHeader}>
            <View style={styles.dailyGoalIcon}>
              <Ionicons name="target" size={18} color={colors.accent} />
            </View>
            <View>
              <Text style={[styles.dailyGoalLabel, { color: colors.textSecondary }]}>Today's Goal</Text>
              <Text style={[styles.dailyGoalValue, { color: colors.text }]}>{dailyXp} / {dailyGoal} XP</Text>
            </View>
            <View style={styles.dailyProgressPill}>
              <Text style={[styles.dailyProgressText, { color: colors.accent }]}>{Math.round(dailyProgress)}%</Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent },
                { width: `${dailyProgress}%` },
              ]}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="flame" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="book" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{Math.max(0, Number(analytics?.wordsLearned) || 0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Words Learned</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="mic" size={20} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{Math.max(0, Number(analytics?.pronunciationAvg) || 0)}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pronunciation</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="star" size={20} color={colors.secondary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{Math.max(0, Number(analytics?.weeklyXp) || 0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Weekly XP</Text>
          </View>
        </View>

        {/* Weekly Progress Mini Chart */}
        {analytics?.dailyXp && (
          <View style={styles.weeklyChartSection}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>This Week</Text>
            <View style={styles.chartBars}>
              {analytics.dailyXp.map((day, i) => (
                <View key={i} style={styles.chartBarWrapper}>
                  <Animated.View
                    style={[
                      styles.chartBar,
                      {
                        backgroundColor: day.isToday ? colors.primary : colors.border,
                        height: `${Math.max((day.xp / Math.max(...analytics.dailyXp.map(d => d.xp), 1)) * 100, 8)}%`,
                      },
                    ]}
                  />
                  <Text style={[styles.chartDay, { color: day.isToday ? colors.primary : colors.textLight }]}>{day.day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
    skeletonCard: {
      minHeight: 280,
    },
    skeletonStats: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    progressCard: {
      width: CARD_WIDTH,
    },
  header: {
    marginBottom: spacing.lg,
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  levelIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.36,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  xpProgressSection: {},
  xpProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  xpProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpProgressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dailyGoalSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  dailyGoalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyGoalLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dailyGoalValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.32,
    marginTop: 2,
  },
  dailyProgressPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  dailyProgressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.07,
    textAlign: 'center',
  },
  weeklyChartSection: {},
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.13,
    marginBottom: spacing.md,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 60,
    paddingHorizontal: spacing.xs,
  },
  chartBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: '60%',
    borderRadius: 3,
    minHeight: 8,
  },
  chartDay: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});