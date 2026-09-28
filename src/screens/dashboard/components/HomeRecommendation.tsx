import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useGame } from '../../../context/GameContext';
import { api } from '../../../services/api';
import { SectionLabel } from './SectionLabel';
import {
  buildRecommendation,
  MODULE_ROUTES,
} from '../../../components/learning/AIRecommendationCard';
import { spacing, borderRadius, shadows } from '../../../theme';

interface HomeRecommendationProps {
  navigation: any;
  refreshKey?: number;
}

/**
 * HomeRecommendation
 *
 * "Recommended for You" — a compact, personalized practice cue built from
 * the same deterministic recommendation engine used on the Learn screen.
 * Rendered as a level-2 light card (different treatment from the primary
 * hero) so the page avoids an endless stack of identical gradient cards.
 */
export function HomeRecommendation({ navigation, refreshKey = 0 }: HomeRecommendationProps) {
  const { colors, getAnimationDuration, onPrimary } = useTheme();
  const game = useGame() as any;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(12));
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(550), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 180, useNativeDriver: true }),
    ]).start();

    (async () => {
      const [analyticsRes, pronRes] = await Promise.allSettled([
        api.getLearningAnalytics(),
        api.getPronunciationStats(),
      ]);
      if (!mounted) return;
      setRecommendation(
        buildRecommendation({
          analytics: analyticsRes.status === 'fulfilled' ? analyticsRes.value : null,
          pronunciationStats: pronRes.status === 'fulfilled' ? pronRes.value : null,
          game: {
            xp: Number(game?.xp) || 0,
            dailyXp: Number(game?.dailyXp) || 0,
            dailyGoal: Math.max(1, Number(game?.dailyGoal) || 50),
          },
          inProgressModule: null,
        })
      );
    })();

    return () => {
      mounted = false;
    };
  }, [getAnimationDuration, fadeAnim, slideAnim, game?.xp, game?.dailyXp, game?.dailyGoal, refreshKey]);

  const handleStart = () => {
    if (!recommendation) return;
    const moduleKey = String(recommendation.module) as keyof typeof MODULE_ROUTES;
    const route = recommendation.route || MODULE_ROUTES[moduleKey] || 'SULTI';
    const params =
      route === 'SULTI'
        ? { situation: recommendation.title, label: recommendation.title }
        : {};
    navigation.navigate(route, params);
  };

  if (!recommendation) {
    return (
      <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
          <View style={[styles.skeletonRow, { backgroundColor: colors.surfaceSecondary }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceSecondary }]} />
          <View style={[styles.skeletonBtn, { backgroundColor: colors.surfaceSecondary }]} />
        </View>
      </Animated.View>
    );
  }

  const color = recommendation.color || colors.primary;

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
        <View style={styles.cardHeader}>
          <SectionLabel style={styles.labelOverride}>RECOMMENDED FOR YOU</SectionLabel>
          <View style={[styles.typeChip, { backgroundColor: color + '14' }]}>
            <Text style={[styles.typeChipText, { color }]}>{recommendation.type}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: color + '14', borderColor: color + '2E' }]}>
            <Ionicons name={recommendation.icon || 'bulb'} size={22} color={color} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {recommendation.title}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {recommendation.description}
            </Text>
          </View>
        </View>

        <View style={[styles.reasonRow, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="sparkles" size={13} color={color} />
          <Text style={[styles.reasonText, { color: colors.textSecondary }]} numberOfLines={1}>
            Based on {recommendation.reason}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={handleStart}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Practice now: ${recommendation.title}`}
        >
          <Text style={[styles.ctaText, { color: onPrimary }]}>Practice now</Text>
          <Ionicons name="arrow-forward" size={16} color={onPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelOverride: { marginBottom: 0 },
  typeChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  typeChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  info: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.35 },
  description: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 2 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  reasonText: { fontSize: 12, fontWeight: '600', flex: 1 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    minHeight: 48,
  },
  ctaText: { fontSize: 15, fontWeight: '800' },
  skeletonRow: { height: 48, borderRadius: 16, marginTop: spacing.sm },
  skeletonLine: { height: 14, borderRadius: 7, marginTop: spacing.sm },
  skeletonBtn: { height: 48, borderRadius: borderRadius.xl, marginTop: spacing.md },
});