import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useGame } from '../../../context/GameContext';
import { getLevel, XP_VALUES, LEVEL_THRESHOLDS } from '../../../constants';
import { api } from '../../../services/api';
import { SectionLabel } from './SectionLabel';
import { spacing, borderRadius, shadows } from '../../../theme';

interface ContinueLearningCardProps {
  onContinue?: () => void;
  refreshKey?: number;
}

type ModuleProgress = {
  moduleId: number;
  completionPercent: number;
  moduleTitle: string;
  difficulty?: string;
};

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const XP_REWARD = XP_VALUES.TUTOR_LESSON || 20;

/**
 * ContinueLearningCard
 *
 * Focused level-2 preview of the user's in-progress lesson. The XP /
 * level display is derived from the SAME getLevel() curve as the progress
 * bar (current XP within the level / the level's range), so it can never
 * show an impossible value like `908 / 500 XP`.
 */
export function ContinueLearningCard({ onContinue, refreshKey = 0 }: ContinueLearningCardProps) {
  const { colors, getAnimationDuration, onPrimary } = useTheme();
  const { xp } = useGame() as any;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [moduleAnim] = useState(() => new Animated.Value(0));

  const [state, setState] = useState<LoadState>('loading');
  const [module, setModule] = useState<ModuleProgress | null>(null);

  const fetchModuleProgress = async (): Promise<ModuleProgress | null> => {
    const res = await api.getLearningProgress();
    const rows: ModuleProgress[] = Array.isArray(res)
      ? res.map((row: any) => ({
          moduleId: Number(row?.moduleId) || Number(row?.module_id) || 0,
          completionPercent: Math.min(100, Math.max(0, Number(row?.completionPercent) || Number(row?.completion_percent) || 0)),
          moduleTitle: String(row?.moduleTitle || row?.module_title || 'Lesson'),
          difficulty: row?.difficulty,
        }))
      : [];

    if (rows.length === 0) return null;

    const inProgress = rows.find((m) => m.completionPercent > 0 && m.completionPercent < 100);
    return inProgress || rows[rows.length - 1];
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const progress = await fetchModuleProgress();
        if (cancelled) return;
        if (progress) {
          setModule(progress);
          setState('ready');
        } else {
          setModule(null);
          setState('empty');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }),
      Animated.timing(moduleAnim, { toValue: 1, duration: getAnimationDuration(800), useNativeDriver: false }),
    ]).start();
    return () => {
      cancelled = true;
    };
  }, [getAnimationDuration, fadeAnim, moduleAnim, refreshKey]);

  const level = getLevel(Math.max(0, Number(xp) || 0));
  const isMaxLevel = level.level === LEVEL_THRESHOLDS.length;
  const levelProgressWidth = moduleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${Math.min(100, Math.max(0, level.progress))}%`],
  });

  const retry = () => {
    setState('loading');
    fetchModuleProgress()
      .then((progress) => {
        if (progress) {
          setModule(progress);
          setState('ready');
        } else {
          setModule(null);
          setState('empty');
        }
      })
      .catch(() => setState('error'));
  };

  const modulePercent = module ? Math.min(100, Math.max(0, Number(module.completionPercent) || 0)) : 0;
  const moduleWidth = moduleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${modulePercent}%`],
  });

  const renderBody = () => {
    if (state === 'loading') {
      return (
        <View style={styles.skeletonBox}>
          <View style={[styles.skeletonBar, { backgroundColor: colors.surfaceSecondary }]} />
          <View style={[styles.skeletonBarWide, { backgroundColor: colors.surfaceSecondary }]} />
        </View>
      );
    }

    if (state === 'error') {
      return (
        <View style={styles.stateBox}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Couldn&apos;t load your progress</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={retry}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Retry loading progress"
          >
            <Ionicons name="refresh" size={14} color={onPrimary} />
            <Text style={[styles.retryText, { color: onPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (state === 'empty') {
      return (
        <View style={styles.stateBox}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="play" size={18} color={colors.primary} />
          </View>
          <View style={styles.emptyInfo}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to start?</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Begin your first Bisaya lesson.
            </Text>
          </View>
        </View>
      );
    }

    const completed = modulePercent >= 100;

    return (
      <>
        <View style={styles.lessonRow}>
          <View style={[styles.lessonIcon, { backgroundColor: completed ? colors.secondaryLight : colors.softTeal }]}>
            <Ionicons
              name={completed ? 'checkmark-circle' : 'play'}
              size={18}
              color={completed ? colors.success : colors.accent}
            />
          </View>
          <View style={styles.lessonInfo}>
            <View style={styles.metaRow}>
              <Text style={[styles.statusChip, { color: completed ? colors.success : colors.accent }]}>
                {completed ? 'Completed' : 'In progress'}
              </Text>
              <View style={[styles.xpChip, { backgroundColor: colors.softOrange }]}>
                <Ionicons name="flash" size={11} color={colors.amber} />
                <Text style={[styles.xpChipText, { color: colors.text }]}>+{XP_REWARD} XP</Text>
              </View>
            </View>
            <Text style={[styles.moduleTitle, { color: colors.text }]} numberOfLines={1}>
              {module?.moduleTitle || 'Continue Learning'}
            </Text>
            <Text style={[styles.moduleMeta, { color: colors.textSecondary }]}>
              {Math.round(modulePercent)}% complete{completed ? ' — great work!' : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressBarFill, { width: moduleWidth, backgroundColor: completed ? colors.success : colors.primary }]} />
        </View>
      </>
    );
  };

  const ctaLabel =
    state === 'empty'
      ? 'Start learning'
      : state === 'error'
        ? 'Retry'
        : modulePercent >= 100
          ? 'Review lesson'
          : 'Continue lesson';

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
        <View style={styles.cardHeader}>
          <SectionLabel>CONTINUE LEARNING</SectionLabel>
          <View style={[styles.levelChip, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.levelChipText, { color: colors.primary }]}>LEVEL {level.level}</Text>
          </View>
        </View>

        {renderBody()}

        <View style={[styles.levelProgress, { borderTopColor: colors.border }]}>
          <View style={styles.levelHeader}>
            <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>
              {isMaxLevel
                ? `Level ${level.level} · Max level`
                : `Progress to Level ${level.level + 1}`}
            </Text>
            <Text style={[styles.levelNumbers, { color: colors.text }]}>
              {isMaxLevel ? level.label : `${Math.round(level.currentXp).toLocaleString()} / ${Math.round(level.nextLevelXp).toLocaleString()} XP`}
            </Text>
          </View>
          <View style={[styles.levelBarBg, { backgroundColor: colors.border }]}>
            <Animated.View style={[styles.levelBarFill, { width: levelProgressWidth, backgroundColor: level.color }]} />
          </View>
        </View>

        {state !== 'error' && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={onContinue}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <Text style={[styles.ctaText, { color: onPrimary }]}>{ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color={onPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, gap: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  levelChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lessonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfo: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  statusChip: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  xpChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  xpChipText: { fontSize: 10, fontWeight: '700' },
  moduleTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  moduleMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  levelProgress: { gap: spacing.xs, borderTopWidth: 1, paddingTop: spacing.md },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelLabel: { fontSize: 11, fontWeight: '600' },
  levelNumbers: { fontSize: 11, fontWeight: '700' },
  levelBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  levelBarFill: { height: '100%', borderRadius: 3 },
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
  skeletonBox: { gap: spacing.md, paddingVertical: spacing.xs },
  skeletonBar: { height: 44, borderRadius: 12 },
  skeletonBarWide: { height: 8, borderRadius: 4 },
  stateBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyInfo: { flex: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  emptyText: { fontSize: 13, fontWeight: '500', marginTop: 2, lineHeight: 18 },
  stateTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  stateText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  retryText: { fontSize: 13, fontWeight: '700' },
});