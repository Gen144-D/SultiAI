import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useGame } from '../../context/GameContext';
import GlassCard from '../GlassCard';
import { Skeleton, SkeletonRow } from '../Skeleton';
import { spacing, borderRadius, shadows } from '../../theme';
import { api } from '../../services/api';

// Map recommendation modules to existing SultiAI routes (SULTI tutor flow, NOT "Tutor").
export const MODULE_ROUTES = {
  phrasebook: 'Phrasebook',
  daily_challenge: 'SULTI',
  pronunciation: 'Pronunciation',
  ai_conversation: 'SULTI',
  flashcards: 'Flashcards',
  vocabulary: 'VocabularyReview',
  voice: 'VoiceMode',
  scenario: 'ScenarioPractice',
};

export function buildRecommendation({ analytics, game, pronunciationStats, inProgressModule }) {
  const started = Number(analytics?.modules_started) || 0;
  const avgCompletion = Number(analytics?.avg_completion) || 0;
  const pronAttempts = Number(pronunciationStats?.totalAttempts) || 0;
  const pronAvg = Number(pronunciationStats?.avgAccuracy) || 0;
  const dailyXp = Number(game?.dailyXp) || 0;
  const dailyGoal = Math.max(1, Number(game?.dailyGoal) || 50);
  const xp = Number(game?.xp) || 0;

  if (inProgressModule) {
    return {
      type: 'continue',
      title: `Continue ${inProgressModule.title}`,
      description: 'Pick up right where you left off.',
      module: 'continue',
      route: inProgressModule.route,
      icon: 'play-forward',
      color: '#14B8A6',
      reason: 'You already started this — keep the momentum going.',
    };
  }
  if (pronAttempts === 0) {
    return {
      type: 'pronunciation',
      title: 'Start Pronunciation Practice',
      description: 'Build confidence speaking Bisaya with checked pronunciation.',
      module: 'pronunciation',
      icon: 'mic',
      color: '#EC4899',
      reason: 'Pronunciation practice will unlock your first speaking scores.',
    };
  }
  if (pronAvg > 0 && pronAvg < 70) {
    return {
      type: 'pronunciation',
      title: 'Improve Your Pronunciation',
      description: `Your average pronunciation score is ${Math.round(pronAvg)}%.`,
      module: 'pronunciation',
      icon: 'mic',
      color: '#EC4899',
      reason: 'A little practice per sound goes a long way.',
    };
  }
  if (dailyXp < dailyGoal) {
    return {
      type: 'daily',
      title: 'Reach Today\'s Goal',
      description: `${dailyXp.toLocaleString()} / ${dailyGoal} XP today — keep your streak alive.`,
      module: 'daily_challenge',
      icon: 'target',
      color: '#F59E0B',
      reason: `${Math.max(0, dailyGoal - dailyXp).toLocaleString()} XP to your daily goal.`,
    };
  }
  if (started > 0 && avgCompletion > 0 && avgCompletion < 100) {
    return {
      type: 'continue',
      title: 'Keep Your Progress Going',
      description: `You are ${Math.round(avgCompletion)}% through your started modules.`,
      module: 'ai_conversation',
      icon: 'sparkles',
      color: '#8B5CF6',
      reason: 'Regular practice is the fastest path to fluency.',
    };
  }
  if (xp < 500) {
    return {
      type: 'practice',
      title: 'Practice with SULTI',
      description: 'Chat in Bisaya with your AI tutor to build real confidence.',
      module: 'ai_conversation',
      icon: 'chatbubbles',
      color: '#3B82F6',
      reason: 'Conversation turns vocabulary into fluent speech.',
    };
  }
  return {
    type: 'advanced',
    title: 'AI Conversation Practice',
    description: 'Roleplay real scenarios with Sulti at your level.',
    module: 'ai_conversation',
    icon: 'chatbubbles',
    color: '#8B5CF6',
    reason: 'You are ready for deeper conversation practice.',
  };
}

/**
 * AIRecommendationCard
 * Generates a deterministic learning recommendation from real data only:
 *   - /api/analytics/learning (DB aggregates, not an LLM call)
 *   - existing pronunciation stats (optional prop)
 *   - GameContext (xp, dailyXp, dailyGoal)
 * It never expects a "recommendation" field that the backend does not return,
 * and it never fires an LLM/AI request.
 */
export default function AIRecommendationCard({
  onStart,
  navigation,
  refreshKey = 0,
  pronunciationStats,
  inProgressModule,
}) {
  const { colors } = useTheme();
  const game = useGame();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const gameXp = Number(game?.xp) || 0;
  const gameDailyXp = Number(game?.dailyXp) || 0;
  const gameDailyGoal = Math.max(1, Number(game?.dailyGoal) || 50);
  const pronAttempts = Number(pronunciationStats?.totalAttempts) || 0;
  const pronAvg = Math.max(0, Number(pronunciationStats?.avgAccuracy) || 0);
  const continueTitle = inProgressModule ? String(inProgressModule.title) : null;
  const continueRoute = inProgressModule ? String(inProgressModule.route) : null;

  const loadRecommendation = useCallback(async () => {
    let analytics = null;
    try {
      analytics = await api.getLearningAnalytics();
    } catch {
      analytics = null;
    }
    setRecommendation(buildRecommendation({
      analytics,
      game: { xp: gameXp, dailyXp: gameDailyXp, dailyGoal: gameDailyGoal },
      pronunciationStats: { totalAttempts: pronAttempts, avgAccuracy: pronAvg },
      inProgressModule: continueRoute ? { title: continueTitle, route: continueRoute } : null,
    }));
    setLoading(false);
  }, [gameXp, gameDailyXp, gameDailyGoal, pronAttempts, pronAvg, continueTitle, continueRoute]);

  useEffect(() => {
    loadRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
      { iterations: -1 }
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    if (!recommendation) return;
    if (onStart) {
      onStart(recommendation);
      return;
    }
    if (navigation) {
      const route = recommendation.route || MODULE_ROUTES[recommendation.module] || 'SULTI';
      const params = route === 'SULTI'
        ? { situation: recommendation.title, label: recommendation.title }
        : {};
      navigation.navigate(route, params);
    }
  };

  if (loading || !recommendation) {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
            <GlassCard variant="elevated" style={styles.skeletonCard} padding="lg">
              <SkeletonRow avatar lines={2} />
              <Skeleton height={44} radius={borderRadius.full} style={{ marginTop: spacing.md }} />
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
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <GlassCard variant="elevated" style={styles.recCard} padding="lg">
          <View style={styles.recHeader}>
            <View style={styles.recLeft}>
              <Animated.View
                style={[
                  styles.sparkleIcon,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons name="sparkles" size={20} color={recommendation.color} />
              </Animated.View>
              <Text style={[styles.recType, { color: recommendation.color }]}>Your Focus</Text>
              <Text style={[styles.recTitle, { color: colors.text }]}>{recommendation.title}</Text>
              <Text style={[styles.recDescription, { color: colors.textSecondary }]}>{recommendation.description}</Text>
            </View>
          </View>

          <View style={[styles.recReason, { backgroundColor: recommendation.color + '10', borderColor: recommendation.color + '20' }]}>
            <Ionicons name="lightbulb" size={14} color={recommendation.color} />
            <Text style={[styles.recReasonText, { color: colors.text }]}>{recommendation.reason}</Text>
          </View>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: recommendation.color }]}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>Start Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: spacing.md,
  },
  recCard: {
    overflow: 'hidden',
  },
    skeletonCard: {
      minHeight: 140,
    },
    recHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  recLeft: {
    flex: 1,
  },
  sparkleIcon: {
    width: 24,
    height: 24,
  },
  recType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.36,
    marginBottom: spacing.xs,
  },
  recDescription: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  recReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  recReasonText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
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
});