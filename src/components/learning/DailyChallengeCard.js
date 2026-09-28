import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import GlassCard from '../GlassCard';
import { Skeleton, SkeletonRow } from '../Skeleton';
import { spacing, borderRadius, shadows } from '../../theme';
import { api } from '../../services/api';

const CHALLENGE_COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

// Map real challenge icons to existing SultiAI routes. Defaults to the SULTI tutor flow.
const CHALLENGE_ROUTES = {
  chatbubbles: 'SULTI',
  mic: 'VoiceMode',
  layers: 'VocabularyReview',
  flame: 'SULTI',
  people: 'Community',
};

function getRouteFor(challenge) {
  return (challenge && CHALLENGE_ROUTES[challenge.icon]) || 'SULTI';
}

function getParamsFor(challenge) {
  const route = getRouteFor(challenge);
  if (route === 'SULTI') return { situation: challenge?.title || 'Daily challenge', label: challenge?.title || 'Daily Challenge' };
  return {};
}

export default function DailyChallengeCard({ onStart, navigation, refreshKey = 0 }) {
  const { colors, getAnimationDuration, getSpringConfig } = useTheme();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [completing, setCompleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadChallenge = useCallback(async () => {
    setError(false);
    try {
      const data = await api.getDailyChallenge();
      const list = Array.isArray(data) ? data : [];
      const next = list.find((c) => c && !c.completed) || list[0] || null;
      setChallenge(next);
    } catch {
      setError(true);
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge, refreshKey]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: getAnimationDuration(600),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, getSpringConfig({
        toValue: 0,
        friction: 10,
        tension: 200,
        useNativeDriver: true,
      })),
    ]).start();
  }, [getAnimationDuration, getSpringConfig]);

  const color = challenge && challenge.id
    ? CHALLENGE_COLORS[Math.abs(challenge.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % CHALLENGE_COLORS.length]
    : CHALLENGE_COLORS[0];

  const handlePress = () => {
    if (!challenge) return;
    const route = getRouteFor(challenge);
    const params = getParamsFor(challenge);
    if (onStart) onStart(challenge, route, params);
    else if (navigation) navigation.navigate(route, params);
  };

  const handleComplete = async () => {
    if (!challenge || completing) return;
    setCompleting(true);
    try {
      await api.completeChallenge(challenge.id);
      setChallenge((prev) => (prev ? { ...prev, completed: true } : prev));
      if (onStart && typeof onStart === 'function') {
        // notify parent to refresh daily progress/xp (completion is verified server-side)
        onStart(challenge, null, null, true);
      }
    } catch {
      setError(true);
    } finally {
      setCompleting(false);
    }
  };

  const handlePracticeAnyway = () => {
    if (navigation) navigation.navigate('SULTI');
    else if (onStart) onStart(null);
  };

  if (loading) {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
            <GlassCard variant="elevated" style={styles.skeletonCard} padding="lg">
              <SkeletonRow avatar lines={2} />
              <View style={styles.skeletonBarRow}>
                <Skeleton height={14} radius={6} style={{ flex: 1 }} />
                <Skeleton height={14} radius={6} width={80} />
              </View>
              <Skeleton height={44} radius={borderRadius.full} style={{ marginTop: spacing.md }} />
            </GlassCard>
      </Animated.View>
    );
  }

  if (error) {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginBottom: spacing.lg,
        }}
      >
        <GlassCard variant="elevated" style={styles.stateCard} padding="lg">
          <View style={styles.stateRow}>
            <View style={[styles.stateIcon, { backgroundColor: colors.softOrange }]}>
              <Ionicons name="alert-circle" size={20} color={colors.secondary} />
            </View>
            <View style={styles.stateInfo}>
              <Text style={[styles.stateTitle, { color: colors.text }]}>Daily challenge unavailable</Text>
              <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>Check your connection and try again.</Text>
            </View>
          </View>
          <View style={styles.stateActions}>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => { setLoading(true); loadChallenge(); }} activeOpacity={0.8}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </Animated.View>
    );
  }

  if (!challenge) {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginBottom: spacing.lg,
        }}
      >
        <GlassCard variant="elevated" style={styles.stateCard} padding="lg">
          <View style={styles.stateRow}>
            <View style={[styles.stateIcon, { backgroundColor: colors.softOrange }]}>
              <Ionicons name="flame" size={20} color={colors.secondary} />
            </View>
            <View style={styles.stateInfo}>
              <Text style={[styles.stateTitle, { color: colors.text }]}>No daily challenge today</Text>
              <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>Complete any practice session to earn bonus XP.</Text>
            </View>
          </View>
          <View style={styles.stateActions}>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={handlePracticeAnyway} activeOpacity={0.8}>
              <Ionicons name="play" size={14} color="#fff" />
              <Text style={styles.retryText}>Practice now</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </Animated.View>
    );
  }

  const completed = Boolean(challenge.completed);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <GlassCard variant="elevated" style={styles.challengeCard} padding="lg">
        <View style={styles.challengeHeader}>
          <View style={styles.challengeLeft}>
            <LinearGradient
              colors={[color, color + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.challengeIcon}
            >
              <Ionicons name={challenge.icon || 'flag'} size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.challengeInfo}>
              <View style={styles.badgeRow}>
                <View style={[styles.challengeBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.challengeBadgeText, { color }]}>Daily Challenge</Text>
                </View>
                {completed && (
                  <View style={[styles.completedBadge, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={styles.completedBadgeText}>Done</Text>
                  </View>
                )}
              </View>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              {challenge.description ? (
                <Text style={[styles.challengeScenario, { color: colors.textSecondary }]}>{challenge.description}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.challengeRight}>
            <View style={styles.xpReward}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <Text style={[styles.xpText, { color: colors.accent }]}>{'+' + challenge.xpReward} XP</Text>
            </View>
            {Number(challenge.coinReward) > 0 && (
              <View style={[styles.coinReward, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
                <Ionicons name="logo-bitcoin" size={14} color="#F59E0B" />
                <Text style={[styles.coinText, { color: '#F59E0B' }]}>{'+' + challenge.coinReward}</Text>
              </View>
            )}
          </View>
        </View>

        {completed ? (
          <View style={[styles.completedPanel, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={[styles.completedPanelText, { color: '#10B981' }]}>Challenge completed. XP and coins claimed.</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: color }]}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>Start Challenge</Text>
            <Ionicons name="play" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        {!completed && (
          <TouchableOpacity style={styles.completeLink} onPress={handleComplete} disabled={completing} activeOpacity={0.7}>
            <Ionicons name="checkmark-done" size={15} color={colors.textSecondary} />
            <Text style={[styles.completeLinkText, { color: colors.textSecondary }]}>
              {completing ? 'Confirming…' : 'I completed this challenge'}
            </Text>
          </TouchableOpacity>
        )}
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  challengeCard: {
    overflow: 'hidden',
  },
  skeletonCard: {
    minHeight: 160,
  },
  skeletonBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  challengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  challengeIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  challengeInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  challengeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  challengeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.36,
    marginBottom: 2,
  },
  challengeScenario: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  challengeRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  xpReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  xpText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.26,
  },
  coinReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  coinText: {
    fontSize: 12,
    fontWeight: '700',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.14,
  },
  completeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  completeLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  completedPanelText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  stateCard: {
    marginBottom: spacing.md,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stateIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateInfo: {
    flex: 1,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  stateDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  stateActions: {
    marginTop: spacing.md,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
