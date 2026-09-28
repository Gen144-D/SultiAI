import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ScrollView as RNScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInRight,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { getModuleGradient, getAccent, readableOnGradient, getNeutralGradient } from '../theme/moduleColors';
import { useGame } from '../context/GameContext';
import { getLevel } from '../constants';
import { api } from '../services/api';
import { offline } from '../services/offline';
import { hapticTap } from '../utils/haptics';
import { getUserAvatarUrl } from '../utils/avatar';
import { SITUATIONS } from '../utils/situations';
import GlassCard from '../components/GlassCard';
import AuroraBackground from '../components/AuroraBackground';
import Avatar from '../components/Avatar';
import { spacing, borderRadius, shadows } from '../theme';

const FOCUS_REFRESH_MS = 4000;
const GOAL_PRESETS = [25, 50, 100, 150];

/**
 * Navigation metadata for each learning module. The module list and its order
 * come from the API (`GET /api/learning/modules`); this map only supplies the
 * icon, gradient, and screen to open, keyed by the stable `moduleKey`.
 */
const MODULE_NAV = {
  voice_practice: {
    title: 'Voice Practice',
    description: 'Speak with SULTI voice',
    iconName: 'mic',
    gradientKey: 'voice_practice',
    route: 'VoiceMode',
  },
  scenario_practice: {
    title: 'Scenario Practice',
    description: 'Roleplay real situations',
    iconName: 'chatbubbles',
    gradientKey: 'scenario_practice',
    route: 'ScenarioPractice',
  },
  phrasebook: {
    title: 'Phrasebook',
    description: 'Essential Bisaya phrases',
    iconName: 'book',
    gradientKey: 'phrasebook',
    route: 'Phrasebook',
  },
  flashcards: {
    title: 'Flashcards',
    description: 'Review saved phrases',
    iconName: 'layers',
    gradientKey: 'flashcards',
    route: 'Flashcards',
  },
  pronunciation_lab: {
    title: 'Pronunciation Lab',
    description: 'Check speech accuracy',
    iconName: 'mic-circle',
    gradientKey: 'pronunciation_lab',
    route: 'Pronunciation',
  },
  grammar: {
    title: 'Grammar',
    description: 'Cebuano sentence structure',
    iconName: 'school',
    gradientKey: 'grammar',
    route: 'Grammar',
  },
  vocabulary_notebook: {
    title: 'Vocabulary Notebook',
    description: 'Master your word bank',
    iconName: 'bookmark',
    gradientKey: 'vocabulary_notebook',
    route: 'VocabularyReview',
  },
  listening: {
    title: 'Listening',
    description: 'Train your ear for Bisaya',
    iconName: 'ear',
    gradientKey: 'listening',
    route: 'Listening',
  },
  writing: {
    title: 'Writing',
    description: 'Compose with confidence',
    iconName: 'create',
    gradientKey: 'writing',
    route: 'Writing',
  },
  reading: {
    title: 'Reading',
    description: 'Read & understand Bisaya',
    iconName: 'book-outline',
    gradientKey: 'reading',
    route: 'Reading',
  },
  sulti_switch: {
    title: 'Sulti Switch',
    description: 'Bilingual thinking mode',
    iconName: 'swap-horizontal',
    gradientKey: 'sulti_switch',
    route: 'SultiSwitch',
  },
  culture_notes: {
    title: 'Culture Notes',
    description: 'Understand Cebuano life',
    iconName: 'compass',
    gradientKey: 'culture_notes',
    route: 'CultureNotes',
  },
  review_center: {
    title: 'Review Center',
    description: 'Reinforce what you learned',
    iconName: 'refresh',
    gradientKey: 'review_center',
    route: 'ReviewCenter',
    badge: 'NEW',
    accentKey: 'newBadge',
  },
};

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

/**
 * Merge the server module list with the user's progress rows and the local
 * navigation metadata, then assign sequential status (completed / in_progress /
 * start / locked) based on the first module that is not yet finished.
 */
function buildLearningPath(progressRows) {
  const rows = Array.isArray(progressRows) ? progressRows : [];

  const moduleById = new Map();
  for (const row of rows) {
    if (row && row.moduleId !== undefined && row.moduleId !== null) {
      moduleById.set(String(row.moduleId), row);
    }
  }

  const ordered = [...moduleById.values()].sort(
    (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
  );

  const firstIncomplete = ordered.findIndex(
    (row) => clampPercent(row.completionPercent) < 100
  );
  const cursor = firstIncomplete === -1 ? ordered.length : firstIncomplete;

  return ordered.map((row, index) => {
    const key = row.moduleKey;
    const nav = MODULE_NAV[key] || {};
    const pct = clampPercent(row.completionPercent);

    let status;
    if (index < cursor) {
      status = 'completed';
    } else if (index === cursor) {
      status = pct > 0 ? 'in_progress' : 'start';
    } else {
      status = 'locked';
    }

    return {
      key,
      title: row.moduleTitle || nav.title || key,
      description: nav.description || '',
      iconName: nav.iconName || 'book',
      gradientKey: nav.gradientKey || 'grammar',
      accentKey: nav.accentKey,
      route: nav.route,
      badge: nav.badge,
      index,
      pct,
      status,
    };
  });
}

// Speaking / communication entry points — the fastest route to real practice.
const SPEAKING_TILES = [
  {
    id: 'voice',
    title: 'Voice Practice',
    description: 'Speak with SULTI',
    iconName: 'mic',
    route: 'VoiceMode',
    accentKey: 'voice',
  },
  {
    id: 'scenario',
    title: 'Scenario Practice',
    description: 'Act out real situations',
    iconName: 'chatbubbles',
    route: 'ScenarioPractice',
    accentKey: 'scenario_practice',
  },
  {
    id: 'pronunciation',
    title: 'Pronunciation',
    description: 'Check speech accuracy',
    iconName: 'mic-circle',
    route: 'Pronunciation',
    accentKey: 'pronunciationCoach',
  },
  {
    id: 'chat',
    title: 'Chat with SULTI',
    description: 'Free-flowing conversation',
    iconName: 'chatbubble-ellipses',
    route: 'SULTI',
    accentKey: 'chat',
  },
];

const PRACTICE_HUB = [
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    description: 'Master your word bank',
    iconName: 'bookmark',
    gradientKey: 'vocabulary_notebook',
    route: 'VocabularyReview',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Review saved phrases',
    iconName: 'layers',
    gradientKey: 'flashcards',
    route: 'Flashcards',
  },
  {
    id: 'listening',
    title: 'Listening',
    description: 'Train your ear for Bisaya',
    iconName: 'ear',
    gradientKey: 'listening',
    route: 'Listening',
  },
  {
    id: 'reading',
    title: 'Reading',
    description: 'Read & understand Bisaya',
    iconName: 'book-outline',
    gradientKey: 'reading',
    route: 'Reading',
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Compose with confidence',
    iconName: 'create',
    gradientKey: 'writing',
    route: 'Writing',
  },
  {
    id: 'grammar',
    title: 'Grammar',
    description: 'Cebuano sentence structure',
    iconName: 'school',
    gradientKey: 'grammar',
    route: 'Grammar',
  },
];

const CATEGORIES = [
  { name: 'Market', icon: 'storefront', accentKey: 'market' },
  { name: 'Transportation', icon: 'bus', accentKey: 'transportation' },
  { name: 'Restaurant', icon: 'restaurant', accentKey: 'restaurant' },
  { name: 'Hospital', icon: 'medkit', accentKey: 'hospital' },
  { name: 'School', icon: 'school', accentKey: 'school' },
  { name: 'Workplace', icon: 'briefcase', accentKey: 'workplace' },
  { name: 'Hotel', icon: 'bed', accentKey: 'hotel' },
  { name: 'Emergency', icon: 'warning', accentKey: 'emergency' },
  { name: 'Community', icon: 'home', accentKey: 'community' },
  { name: 'Small Talk', icon: 'chatbubble-ellipses', accentKey: 'smallTalk' },
];

const CULTURE_CHIPS = [
  { name: 'Culture Notes', icon: 'compass', accentKey: 'culture', route: 'CultureNotes' },
  { name: 'Sulti Switch', icon: 'swap-horizontal', accentKey: 'switchMode', route: 'SultiSwitch' },
  { name: 'Review Center', icon: 'refresh', accentKey: 'review', route: 'ReviewCenter' },
];

/**
 * Deterministic "What should I do next?" built from real learner data only.
 * This is NOT an LLM call and never fabricates progress or scores.
 */
function buildNextStep({ continueModule, pronAttempts, pronAvg, dailyXp, dailyGoal, wordsLearned }) {
  // If there's an in-progress module, the Continue card already surfaces it.
  // Recommend a distinct, forward-looking action so the two sections add
  // value instead of duplicating each other.
  if (continueModule) {
    if (pronAttempts === 0) {
      return {
        type: 'pronunciation',
        title: 'Start Pronunciation Practice',
        description: 'Speak clearly with feedback on each sound.',
        reason: 'Pronunciation turns your progress into confident speaking.',
        icon: 'mic',
        accentKey: 'pronunciation_lab',
        route: 'Pronunciation',
      };
    }
    if (pronAvg > 0 && pronAvg < 70) {
      return {
        type: 'pronunciation',
        title: `Improve your pronunciation — ${Math.round(pronAvg)}%`,
        description: 'Target the sounds that need the most work.',
        reason: 'A little practice per sound goes a long way.',
        icon: 'mic-circle',
        accentKey: 'pronunciation_lab',
        route: 'Pronunciation',
      };
    }
    return {
      type: 'speaking',
      title: 'Practice speaking with SULTI',
      description: 'Roleplay a real-life scenario and build fluency.',
      reason: 'Conversation turns what you know into what you can say.',
      icon: 'chatbubbles',
      accentKey: 'scenario_practice',
      route: 'ScenarioPractice',
    };
  }
  if (pronAttempts === 0) {
    return {
      type: 'beginner',
      title: 'Start Pronunciation Practice',
      description: 'Speak clearly with feedback on each sound.',
      reason: 'Every speaker starts here — get your first pronunciation scores.',
      icon: 'mic',
      accentKey: 'pronunciation_lab',
      route: 'Pronunciation',
    };
  }
  if (pronAvg > 0 && pronAvg < 70) {
    return {
      type: 'pronunciation',
      title: `Improve your pronunciation — ${Math.round(pronAvg)}%`,
      description: 'Target the sounds that need the most work.',
      reason: 'A little practice per sound goes a long way.',
      icon: 'mic-circle',
      accentKey: 'pronunciation_lab',
      route: 'Pronunciation',
    };
  }
  if (dailyXp < Math.max(1, dailyGoal)) {
    return {
      type: 'daily',
      title: `Reach today's ${Math.max(1, dailyGoal)} XP goal`,
      description: `${Math.max(0, dailyGoal - dailyXp)} XP left today — keep your streak alive.`,
      reason: 'Completing a daily goal builds lasting consistency.',
      icon: 'target',
      accentKey: 'scenario_practice',
      route: 'ScenarioPractice',
    };
  }
  if (wordsLearned < 5) {
    return {
      type: 'phrasebook',
      title: 'Save useful phrases',
      description: 'Build your phrase bank as you chat with SULTI.',
      reason: 'A strong phrase bank feeds every future lesson.',
      icon: 'bookmark',
      accentKey: 'vocabulary_notebook',
      route: 'Phrasebook',
    };
  }
  return {
    type: 'speaking',
    title: 'Practice speaking with SULTI',
    description: 'Roleplay a real-life scenario and build fluency.',
    reason: 'Conversation turns what you know into what you can say.',
    icon: 'chatbubbles',
    accentKey: 'scenario_practice',
    route: 'ScenarioPractice',
  };
}

function SectionHeader({ title, action, onAction, actionIcon = 'chevron-forward' }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && (
        <TouchableOpacity
          style={styles.sectionAction}
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action}
        >
          <Text style={[styles.sectionActionText, { color: colors.accent }]}>{action}</Text>
          <Ionicons name={actionIcon} size={14} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * DailyGoalCard — the single most important number. XP-based because that is
 * the only per-day metric the product actually tracks (no fabricated minutes).
 */
function DailyGoalCard({ goal, earned, loading, onChangeGoal, onPractice }) {
  const { colors, themeName, getAnimationDuration } = useTheme();
  const progressValue = useSharedValue(0);
  const safeGoal = Math.max(1, Number(goal) || 50);
  const safeEarned = Math.min(Math.max(0, Number(earned) || 0), safeGoal);
  const pct = Math.round((safeEarned / safeGoal) * 100);
  const done = safeEarned >= safeGoal;
  const remaining = Math.max(safeGoal - safeEarned, 0);

  useEffect(() => {
    progressValue.value = withDelay(
      120,
      withTiming(pct / 100, { duration: getAnimationDuration(900) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, progressValue.value * 100))}%`,
  }));

  const gradient = done
    ? getNeutralGradient(themeName, 'success')
    : [colors.gradientA, colors.gradientB];
  const onGradient = readableOnGradient(gradient);
  const onGradientSoft = `${onGradient}A6`;
  const onGradientFaint = `${onGradient}8C`;

  return (
    <Animated.View entering={FadeInRight.delay(120).duration(500)}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.goalCard]}
        accessibilityLabel={
          done
            ? 'Today\'s goal complete'
            : `Today's goal: earn ${safeEarned} of ${safeGoal} XP`
        }
      >
        <View style={styles.goalTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalEyebrow, { color: onGradientFaint }]}>TODAY&apos;S GOAL</Text>
            <Text style={[styles.goalTitle, { color: onGradient }]}>
              {done ? 'Goal complete — great job!' : `Reach ${safeGoal.toLocaleString()} XP today`}
            </Text>
          </View>
          <View style={[styles.goalBadge, { backgroundColor: `${onGradient}24` }]}>
            <Ionicons name={done ? 'checkmark' : 'trophy'} size={18} color={onGradient} />
          </View>
        </View>

        <View style={styles.goalProgressHeader}>
          <Text style={[styles.goalProgressLabel, { color: onGradientSoft }]}>
            {loading ? 'Loading…' : done ? 'All done for today' : `${remaining.toLocaleString()} XP to go`}
          </Text>
          <Text style={[styles.goalProgressValue, { color: onGradient }]}>
            {safeEarned.toLocaleString()} / {safeGoal.toLocaleString()} XP
          </Text>
        </View>

        <View
          style={[styles.goalTrack, { backgroundColor: `${onGradient}42` }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: safeGoal, now: safeEarned }}
        >
          <Animated.View
            style={[
              styles.goalFill,
              {
                backgroundColor: onGradient,
                shadowColor: onGradient,
              },
              barStyle,
            ]}
          />
        </View>

        <RNScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goalPresets}
          accessibilityLabel="Daily goal options"
        >
          {GOAL_PRESETS.map((preset) => {
            const active = preset === safeGoal;
            return (
              <TouchableOpacity
                key={preset}
                onPress={() => {
                  hapticTap();
                  onChangeGoal && onChangeGoal(preset);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Set daily goal to ${preset} XP`}
                style={[
                  styles.goalPresetChip,
                  {
                    borderColor: active ? onGradient : `${onGradient}42`,
                    backgroundColor: active ? `${onGradient}24` : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.goalPresetText, { color: active ? onGradient : onGradientSoft }]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </RNScrollView>

        {!done && (
          <TouchableOpacity
            style={[styles.goalCta, { backgroundColor: onGradient === '#FFFFFF' ? '#04302A' : '#FFFFFF' }]}
            onPress={onPractice}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Practice now"
          >
            <Text style={[styles.goalCtaText, { color: onGradient === '#FFFFFF' ? '#FFFFFF' : '#0F172A' }]}>
              Practice now
            </Text>
            <Ionicons name="arrow-forward" size={16} color={onGradient === '#FFFFFF' ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

/**
 * NextStepCard — the most important card on the dashboard. Shows ONE specific
 * next action and the reason behind it, always derived from real data.
 */
function NextStepCard({ step, onPress, loading }) {
  const { colors, themeName } = useTheme();
  const accent = step ? getAccent(themeName, step.accentKey) : colors.accent;

  if (loading || !step) {
    return (
      <Animated.View entering={FadeInRight.delay(180).duration(500)}>
        <GlassCard variant="elevated" padding="lg" style={styles.nextSkeleton}>
          <View style={[styles.nextSkeletonBar, { backgroundColor: colors.surfaceSecondary }]} />
          <View style={[styles.nextSkeletonRow, { backgroundColor: colors.surfaceSecondary }]} />
          <View style={[styles.nextSkeletonBtn, { backgroundColor: colors.surfaceSecondary }]} />
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInRight.delay(180).duration(500)}>
      <TouchableOpacity
        style={styles.nextTouchable}
        onPress={() => onPress && onPress(step)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Recommended: ${step.title}`}
      >
        <GlassCard variant="elevated" padding="lg" style={styles.nextCard}>
          <Text style={[styles.nextEyebrow, { color: accent }]}>RECOMMENDED FOR YOU</Text>
          <View style={styles.nextBody}>
            <View style={[styles.nextIcon, { backgroundColor: accent + '18' }]}>
              <Ionicons name={step.icon} size={22} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.nextDesc, { color: colors.textSecondary }]}>{step.description}</Text>
            </View>
          </View>
          <View style={[styles.nextReason, { backgroundColor: accent + '10', borderColor: accent + '22' }]}>
            <Ionicons name="bulb" size={14} color={accent} />
            <Text style={[styles.nextReasonText, { color: colors.text }]}>{step.reason}</Text>
          </View>
          <TouchableOpacity
            style={[styles.nextCta, { backgroundColor: accent }]}
            onPress={() => onPress && onPress(step)}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={[styles.nextCtaText, { color: readableOnGradient([accent]) }]}>Start now</Text>
            <Ionicons name="arrow-forward" size={16} color={readableOnGradient([accent])} />
          </TouchableOpacity>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * ProgressCard — meaningful evidence of improvement. Every stat shown is a
 * real tracked number; a pronunciation score never appears unless attempts exist.
 */
function ProgressCard({ stats }) {
  const { colors } = useTheme();
  const showPron = (stats.pronAttempts || 0) > 0;
  const metrics = [
    {
      key: 'words',
      icon: 'book',
      value: stats.words,
      label: 'Words',
      hint: 'Vocabulary',
      color: colors.accent,
    },
    {
      key: 'modules',
      icon: 'checkmark-done',
      value: stats.modules,
      label: 'Lessons',
      hint: 'Completed',
      color: colors.success,
    },
    {
      key: 'sessions',
      icon: 'chatbubble-ellipses',
      value: stats.sessions,
      label: 'Speaking',
      hint: 'Sessions',
      color: getAccent(stats.themeName, 'scenario_practice'),
    },
    {
      key: 'pron',
      icon: 'mic',
      value: showPron ? `${Math.round(stats.pronAvg)}%` : '—',
      label: 'Pronunciation',
      hint: showPron ? 'Avg accuracy' : 'Not started yet',
      color: getAccent(stats.themeName, 'pronunciation_lab'),
    },
  ];

  return (
    <Animated.View entering={FadeInRight.delay(560).duration(500)}>
      <GlassCard variant="elevated" padding="lg" style={styles.progressCard}>
        <View style={styles.progressGrid}>
          {metrics.map((m, idx) => (
            <View
              key={m.key}
              style={[styles.progressStat, idx < 2 && styles.progressStatRight]}
            >
              <View style={[styles.progressIcon, { backgroundColor: m.color + '18' }]}>
                <Ionicons name={m.icon} size={17} color={m.color} />
              </View>
              <Text style={[styles.progressValue, { color: colors.text }]}>{m.value}</Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              <Text style={[styles.progressHint, { color: colors.textLight }]}>{m.hint}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function ContinueCard({ module, total, colors, onPress }) {
  const { onPrimary } = useTheme();
  const { title } = module;
  const lessonLabel = `Module ${module.index + 1} of ${total}`;
  const isStarted = module.pct > 0;
  return (
    <Animated.View entering={FadeInRight.delay(240).duration(500)}>
      <GlassCard variant="elevated" style={styles.continueCard} padding="md">
        <TouchableOpacity style={styles.continueRow} onPress={onPress} activeOpacity={0.85}>
          <View style={[styles.continueIcon, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name={isStarted ? 'play' : 'school'} size={18} color={colors.accent} />
          </View>
          <View style={styles.continueInfo}>
            <Text style={[styles.continueLabel, { color: colors.textSecondary }]}>
              {isStarted ? 'Continue Learning' : 'Next up'}
            </Text>
            <Text style={[styles.continueTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <View style={[styles.continueTrack, { backgroundColor: colors.surfaceSecondary }]}>
              <View
                style={[
                  styles.continueFill,
                  {
                    width: `${Math.max(0, Math.min(100, module.pct))}%`,
                    backgroundColor: colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.continueMeta, { color: colors.textSecondary }]}>{lessonLabel}</Text>
          </View>
          <View style={styles.continueRight}>
            <View style={[styles.continueCta, { backgroundColor: colors.accent }]}>
              <Text style={[styles.continueCtaText, { color: onPrimary }]}>
                {isStarted ? 'Continue' : 'Start'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );
}

function PathRow({ module, colors, onPress }) {
  const locked = module.status === 'locked';
  const completed = module.status === 'completed';
  const inProgress = module.status === 'in_progress';
  const statusIcon = completed
    ? 'checkmark-circle'
    : inProgress
      ? 'ellipse'
      : locked
        ? 'lock-closed'
        : 'play-circle';
  const statusColor = completed ? colors.success : inProgress ? colors.accent : colors.textLight;
  return (
    <TouchableOpacity
      style={[
        styles.pathRow,
        {
          backgroundColor: colors.surface,
          borderColor: inProgress ? colors.accent + '60' : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={locked ? 1 : 0.75}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={`${module.title}: ${module.status.replace('_', ' ')}`}
    >
      <View style={styles.pathIndex}>
        <Text style={[styles.pathIndexText, { color: colors.textLight }]}>
          {String(module.index + 1).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.pathInfo}>
        <Text style={[styles.pathTitle, { color: locked ? colors.textLight : colors.text }]}>
          {module.title}
        </Text>
        <View style={styles.pathProgressRow}>
          <View style={[styles.pathTrack, { backgroundColor: colors.surfaceSecondary }]}>
            <View
              style={[
                styles.pathFill,
                {
                  width: `${Math.max(0, Math.min(100, module.pct))}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.pathMeta, { color: colors.textSecondary }]}>
            {completed ? 'Completed' : inProgress ? `${Math.round(module.pct)}%` : liftedLabel(locked)}
          </Text>
        </View>
      </View>
      <Ionicons name={statusIcon} size={20} color={statusColor} />
    </TouchableOpacity>
  );
}

function liftedLabel(locked) {
  return locked ? 'Locked' : 'Start';
}

function PetalsCard({ title, description, iconName, gradient, onPress }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.hubTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.hubIcon, { backgroundColor: gradient[0] }]}>
        <Ionicons name={iconName} size={20} color={readableOnGradient(gradient)} />
      </View>
      <Text style={[styles.hubTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.hubDesc, { color: colors.textSecondary }]} numberOfLines={1}>
        {description}
      </Text>
    </TouchableOpacity>
  );
}

export default function LearnScreen({ navigation }) {
  const { colors, themeName, onPrimary } = useTheme();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { xp, dailyXp, streak, dailyGoal, setDailyGoal } = useGame();
  const [wordsLearned, setWordsLearned] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [weeklyXpTotal, setWeeklyXpTotal] = useState(0);
  const [pronunciationStats, setPronunciationStats] = useState(null);
  const [pathModules, setPathModules] = useState([]);
  const [pathError, setPathError] = useState(null);
  const [tutorLevel, setTutorLevel] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastLoadRef = useRef(0);

  const weeklyProgress = useMemo(() => {
    const weeklyGoal = Math.max(1, (Number(dailyGoal) || 50) * 7);
    return Math.min(Math.round((Math.max(0, weeklyXpTotal) / weeklyGoal) * 100), 100);
  }, [weeklyXpTotal, dailyGoal]);

  const levelInfo = useMemo(() => {
    const info = getLevel(Math.max(0, Number(xp) || 0));
    return { ...info, color: getAccent(themeName, 'review_center') };
  }, [xp, themeName]);

  const continueModule = useMemo(
    () => pathModules.find((m) => m.status === 'in_progress' || m.status === 'start') || null,
    [pathModules]
  );

  const modulesCompleted = useMemo(
    () => pathModules.filter((m) => m.status === 'completed').length,
    [pathModules]
  );

  const courseProgress = useMemo(() => {
    if (!pathModules.length) return 0;
    const sum = pathModules.reduce((acc, m) => acc + m.pct, 0);
    return Math.min(100, Math.round(sum / pathModules.length));
  }, [pathModules]);

  const pronAttempts = Number(pronunciationStats?.totalAttempts) || 0;
  const pronAvg = Math.max(0, Math.min(100, Number(pronunciationStats?.avgAccuracy) || 0));
  const tutorSessions = Number(tutorLevel?.total_sessions) || 0;

  const nextStep = useMemo(
    () =>
      buildNextStep({
        continueModule,
        pronAttempts,
        pronAvg,
        dailyXp,
        dailyGoal,
        wordsLearned,
      }),
    [continueModule, pronAttempts, pronAvg, dailyXp, dailyGoal, wordsLearned]
  );

  const loadData = useCallback(async () => {
    const [
      cachedVocab,
      savedPhrases,
      notifications,
      weekly,
      pron,
      progress,
      level,
    ] = await Promise.allSettled([
      offline.getCachedVocabulary(),
      api.getSavedPhrases(),
      api.getNotifications(),
      api.getWeeklyProgress(),
      api.getPronunciationStats(),
      api.getLearningProgress(),
      api.getTutorLevel(),
    ]);

    const failed = [];

    if (cachedVocab.status === 'fulfilled' && Array.isArray(cachedVocab.value)) {
      setWordsLearned(cachedVocab.value.length);
    }
    if (savedPhrases.status === 'fulfilled') {
      const rows = Array.isArray(savedPhrases.value) ? savedPhrases.value : [];
      setWordsLearned((prev) => Math.max(prev, rows.length));
    } else {
      failed.push('saved phrases');
    }
    if (notifications.status === 'fulfilled') {
      const rows = Array.isArray(notifications.value) ? notifications.value : [];
      setNotifCount(rows.filter((n) => n && !n.read).length);
    } else {
      failed.push('notifications');
    }
    if (weekly.status === 'fulfilled') {
      const rows = Array.isArray(weekly.value) ? weekly.value : [];
      setWeeklyXpTotal(rows.reduce((sum, day) => sum + (Number(day && day.xp) || 0), 0));
    } else {
      failed.push('weekly progress');
    }
    if (pron.status === 'fulfilled') {
      setPronunciationStats(pron.value || null);
    } else {
      setPronunciationStats(null);
      failed.push('pronunciation stats');
    }
    if (level.status === 'fulfilled') {
      setTutorLevel(level.value || null);
    } else {
      failed.push('tutor level');
    }

    if (progress.status === 'fulfilled') {
      setPathError(null);
      setPathModules(buildLearningPath(progress.value));
    } else {
      setPathError(
        'Your learning path could not be loaded. Pull to refresh to try again.'
      );
    }

    if (failed.length) {
      console.warn(`[Learn] Some data failed to load: ${failed.join(', ')}`);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > FOCUS_REFRESH_MS) {
        lastLoadRef.current = now;
        loadData();
      }
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleModulePress = (module) => {
    hapticTap();
    navigation.navigate(module.route, module.params || undefined);
  };

  const handleCategoryPress = (category) => {
    hapticTap();
    navigation.navigate('Phrasebook', { category: category.name });
  };

  const handleStepPress = (step) => {
    hapticTap();
    if (step.route === 'SULTI') {
      navigation.navigate('SULTI', { situation: step.title, label: step.title });
    } else {
      navigation.navigate(step.route, step.params || undefined);
    }
  };

  const handleChangeGoal = (goal) => {
    if (setDailyGoal && typeof setDailyGoal === 'function') setDailyGoal(goal);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = (user?.fullname || user?.name || '').trim().split(' ')[0];
  const learnerName = first || 'Learner';
  const avatarUri = getUserAvatarUrl(user);
  const fullName = user?.fullname || user?.name || learnerName;

  const visibleScenarios = SITUATIONS.slice(0, 6);

  const progressStats = {
    words: wordsLearned,
    modules: modulesCompleted,
    sessions: tutorSessions,
    pronAttempts,
    pronAvg,
    themeName,
  };

  return (
    <AuroraBackground style={styles.container} atmosphere="learn">
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.contentWidth}>
          {/* Header — compact personal welcome */}
          <Animated.View entering={FadeInRight.duration(450)} style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
              hitSlop={8}
            >
              <Avatar uri={avatarUri} name={fullName} size={42} />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>
                {greeting},
              </Text>
              <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                {learnerName}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Every conversation makes you better.
              </Text>
            </View>

            <View style={styles.headerRight}>
              <View style={[styles.streakPill, { backgroundColor: colors.softOrange }]}>
                <Ionicons name="flame" size={14} color={colors.amber} />
                <Text style={[styles.streakPillText, { color: colors.text }]}>{Math.max(0, Number(streak) || 0)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.notifBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel={
                  notifCount > 0 ? `${notifCount} unread notifications` : 'Notifications'
                }
              >
                <Ionicons name="notifications-outline" size={19} color={colors.text} />
                {notifCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: colors.error }]}>
                    <Text style={[styles.notifBadgeText, { color: readableOnGradient([colors.error]) }]}>
                      {notifCount > 99 ? '99+' : notifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Daily goal — prominent, configurable */}
          <DailyGoalCard
            goal={dailyGoal}
            earned={dailyXp}
            loading={loading}
            onChangeGoal={handleChangeGoal}
            onPractice={() => navigation.navigate('ScenarioPractice')}
          />

          {/* Your Next Step — the most important card */}
          <SectionHeader title="What should you do next?" />
          <NextStepCard step={nextStep} onPress={handleStepPress} loading={loading} />

          {/* Continue learning */}
          {!loading && continueModule && (
            <ContinueCard
              module={continueModule}
              total={pathModules.length}
              colors={colors}
              onPress={() => handleModulePress(continueModule)}
            />
          )}

          {/* Rank / weekly progress (compact) */}
          <Animated.View entering={FadeInRight.delay(200).duration(500)} style={styles.rankStrip}>
            <View style={[styles.rankPill, { backgroundColor: colors.surface }]}>
              <View style={[styles.rankIcon, { backgroundColor: levelInfo.color + '18' }]}>
                <Ionicons name={levelInfo.icon} size={15} color={levelInfo.color} />
              </View>
              <Text style={[styles.rankLabel, { color: colors.textSecondary }]}>Level {levelInfo.level}</Text>
              <Text style={[styles.rankValue, { color: colors.text }]}>{levelInfo.label}</Text>
            </View>
            <View style={styles.rankDivider} />
            <View style={styles.rankPill}>
              <View style={[styles.rankIcon, { backgroundColor: colors.warning + '18' }]}>
                <Ionicons name="calendar" size={15} color={colors.warning} />
              </View>
              <Text style={[styles.rankLabel, { color: colors.textSecondary }]}>This week</Text>
              <Text style={[styles.rankValue, { color: colors.text }]}>{weeklyProgress}%</Text>
            </View>
          </Animated.View>

          {/* Your Learning Path */}
          <Animated.View entering={FadeInRight.delay(300).duration(500)} style={styles.section}>
            <SectionHeader
              title="Your Learning Path"
              action="View all"
              onAction={() => navigation.navigate('ReviewCenter')}
            />
            {loading ? (
              <GlassCard padding="lg" style={styles.skeletonCard}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[styles.skeletonRow, { backgroundColor: colors.surfaceSecondary }]}
                  />
                ))}
              </GlassCard>
            ) : pathError ? (
              <GlassCard padding="lg">
                <View style={styles.pathError}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={28}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.pathErrorTitle, { color: colors.text }]}>
                    Learning path unavailable
                  </Text>
                  <Text style={[styles.pathErrorBody, { color: colors.textSecondary }]}>
                    {pathError}
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                    onPress={onRefresh}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.retryBtnText, { color: onPrimary }]}>Try again</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ) : pathModules.length === 0 ? (
              <GlassCard padding="lg">
                <View style={styles.pathError}>
                  <Ionicons
                    name="school-outline"
                    size={28}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.pathErrorTitle, { color: colors.text }]}>
                    No modules yet
                  </Text>
                  <Text style={[styles.pathErrorBody, { color: colors.textSecondary }]}>
                    Your learning path has not been set up. Run the learning content
                    seed, then pull to refresh.
                  </Text>
                </View>
              </GlassCard>
            ) : (
              <View style={styles.pathList}>
                {pathModules.map((module) => (
                  <PathRow
                    key={module.key}
                    module={module}
                    colors={colors}
                    onPress={() => {
                      if (module.status === 'locked') {
                        hapticTap();
                        return;
                      }
                      handleModulePress(module);
                    }}
                  />
                ))}
              </View>
            )}
          </Animated.View>

          {/* Practice communication — real speaking, fast */}
          <Animated.View entering={FadeInRight.delay(400).duration(500)} style={styles.section}>
            <SectionHeader title="Practice Communication" />
            <View style={styles.speakingGrid}>
              {SPEAKING_TILES.map((tile) => (
                <PetalsCard
                  key={tile.id}
                  title={tile.title}
                  description={tile.description}
                  iconName={tile.iconName}
                  gradient={getModuleGradient(themeName, tile.accentKey)}
                  onPress={() => handleModulePress(tile)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Practice hub */}
          <Animated.View entering={FadeInRight.delay(480).duration(500)} style={styles.section}>
            <SectionHeader title="Practice & Review" />
            <View style={styles.hubGrid}>
              {PRACTICE_HUB.map((tile, index) => (
                <PetalsCard
                  key={tile.id}
                  title={tile.title}
                  description={tile.description}
                  iconName={tile.iconName}
                  gradient={getModuleGradient(themeName, tile.gradientKey)}
                  index={index}
                  onPress={() => handleModulePress(tile)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Progress — meaningful metrics */}
          <Animated.View entering={FadeInRight.delay(560).duration(500)} style={styles.section}>
            <SectionHeader
              title="Your Progress"
              action="Achievements"
              onAction={() => navigation.navigate('Achievements')}
            />
            <ProgressCard stats={progressStats} />
            <Text style={[styles.progressMeta, { color: colors.textSecondary }]}>
              {loading ? 'Loading your progress…' : `${weeklyXpTotal.toLocaleString()} XP earned this week · ${courseProgress}% course complete`}
            </Text>
          </Animated.View>

          {/* Phrasebook preview */}
          <Animated.View entering={FadeInRight.delay(640).duration(500)} style={styles.section}>
            <SectionHeader
              title="Phrasebook"
              action="Open"
              onAction={() => navigation.navigate('Phrasebook')}
            />
            <View style={styles.chipsGrid}>
              {CATEGORIES.slice(0, 6).map((category) => (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handleCategoryPress(category)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={category.icon} size={18} color={getAccent(themeName, category.accentKey)} />
                  <Text style={[styles.chipText, { color: colors.text }]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Scenario Practice */}
          <Animated.View entering={FadeInRight.delay(720).duration(500)} style={styles.section}>
            <SectionHeader
              title="Real Conversations"
              action="See all"
              onAction={() => navigation.navigate('ScenarioPractice')}
            />
            <View style={styles.chipsGrid}>
              {visibleScenarios.map((situation) => (
                <TouchableOpacity
                  key={situation.id}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    hapticTap();
                    navigation.navigate('SULTI', { situation: situation.prompt, label: situation.label });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{situation.emoji}</Text>
                  <Text style={[styles.chipText, { color: colors.text }]}>{situation.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Culture & Language */}
          <Animated.View entering={FadeInRight.delay(800).duration(500)} style={styles.section}>
            <SectionHeader title="Culture & Language" />
            <View style={styles.chipsGrid}>
              {CULTURE_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip.name}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handleModulePress(chip)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={chip.icon} size={18} color={getAccent(themeName, chip.accentKey)} />
                  <Text style={[styles.chipText, { color: colors.text }]}>{chip.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120, flexGrow: 1 },
  contentWidth: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 720 : undefined,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1, marginRight: spacing.xs },
  headerGreeting: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
  headerName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    minWidth: 36,
    justifyContent: 'center',
  },
  streakPillText: { fontSize: 12, fontWeight: '700' },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 16, height: 16, borderRadius: borderRadius.full,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800' },

  // Daily goal
  goalCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  goalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  goalEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  goalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  goalBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  goalProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  goalProgressLabel: { fontSize: 12, fontWeight: '600' },
  goalProgressValue: { fontSize: 13, fontWeight: '800' },
  goalTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 999, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  goalPresets: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md },
  goalPresetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },
  goalPresetText: { fontSize: 13, fontWeight: '700' },
  goalCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    minHeight: 48,
  },
  goalCtaText: { fontSize: 15, fontWeight: '800' },

  // Next step
  nextTouchable: { marginBottom: spacing.xl },
  nextCard: { overflow: 'hidden' },
  nextSkeleton: { minHeight: 150, marginBottom: spacing.xl },
  nextSkeletonBar: { width: 140, height: 12, borderRadius: 6 },
  nextSkeletonRow: { height: 44, borderRadius: 12, marginTop: spacing.md },
  nextSkeletonBtn: { height: 44, borderRadius: borderRadius.full, marginTop: spacing.md },
  nextEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.md },
  nextBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  nextIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nextTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
  nextDesc: { fontSize: 13, lineHeight: 18 },
  nextReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  nextReasonText: { fontSize: 13, lineHeight: 18, flex: 1 },
  nextCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
  },
  nextCtaText: { fontSize: 14, fontWeight: '800' },

  // Continue
  continueCard: { marginBottom: spacing.xl },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  continueInfo: { flex: 1 },
  continueLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  continueTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.xs },
  continueTrack: { height: 5, borderRadius: 999, overflow: 'hidden', marginBottom: 4 },
  continueFill: { height: '100%', borderRadius: 999 },
  continueMeta: { fontSize: 11, fontWeight: '600' },
  continueRight: { alignItems: 'flex-end', gap: 4 },
  continueCta: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  continueCtaText: { fontSize: 12, fontWeight: '800' },

  // Rank strip
  rankStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  rankPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  rankIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankLabel: { fontSize: 11, fontWeight: '600' },
  rankValue: { fontSize: 12, fontWeight: '800' },
  rankDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(128,128,128,0.2)' },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '700' },

  skeletonCard: { marginBottom: spacing.md },
  skeletonRow: { height: 56, borderRadius: borderRadius.md, marginBottom: spacing.sm },

  pathList: { gap: spacing.sm },
  pathError: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  pathErrorTitle: { fontSize: 15, fontWeight: '800' },
  pathErrorBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  retryBtnText: { fontSize: 13, fontWeight: '700' },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  pathIndex: { width: 32, alignItems: 'center' },
  pathIndexText: { fontSize: 12, fontWeight: '800' },
  pathInfo: { flex: 1 },
  pathTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, marginBottom: spacing.xs },
  pathProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pathTrack: { flex: 1, height: 4, borderRadius: 999, overflow: 'hidden' },
  pathFill: { height: '100%', borderRadius: 999 },
  pathMeta: { fontSize: 11, fontWeight: '700', minWidth: 52, textAlign: 'right' },

  speakingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  hubTile: {
    flex: 1,
    minWidth: 150,
    maxWidth: 190,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  hubIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  hubTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  hubDesc: { fontSize: 11, lineHeight: 15 },

  // Progress
  progressCard: { marginBottom: spacing.sm },
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  progressStat: {
    width: '50%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  progressStatRight: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(128,128,128,0.15)' },
  progressIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  progressValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  progressLabel: { fontSize: 11, fontWeight: '600' },
  progressHint: { fontSize: 10, fontWeight: '500' },
  progressMeta: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: spacing.sm },

  // Chips
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipEmoji: { fontSize: 15 },

  // Progress rings (legacy, kept for the pronunciation "Start" affordance)
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', marginBottom: spacing.xl },
  progressRing: { alignItems: 'center', gap: 4 },
  progressRingValue: { fontSize: 11, fontWeight: '800', textAlign: 'center', maxWidth: 70 },
  progressRingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  ringCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  ringCtaText: { fontSize: 10, fontWeight: '700' },

  shimmerSection: { marginBottom: spacing.lg },
  shimmerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  shimmerLabel: { fontSize: 12, fontWeight: '600' },
  shimmerValue: { fontSize: 12, fontWeight: '800' },
  shimmerTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  shimmerFill: { height: '100%', borderRadius: 3, position: 'absolute', top: 0, left: 0 },
  shimmerOverlay: { height: '100%', borderRadius: 3, position: 'absolute', top: 0 },

  bottomSpacer: { height: 80 },
});