import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withTiming, withDelay, withRepeat,
  FadeInRight, Easing, interpolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { SafeUserStats } from '../utils/formatters';
import { api } from '../services/api';
import { offline } from '../services/offline';
import { hapticTap } from '../utils/haptics';
import ModuleCard from '../components/learning/ModuleCard';
import DailyChallengeCard from '../components/learning/DailyChallengeCard';
import AIRecommendationCard from '../components/learning/AIRecommendationCard';
import GlassCard from '../components/GlassCard';
import AuroraBackground from '../components/AuroraBackground';
import { spacing, borderRadius, shadows } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUOTES = [
  { text: 'Angay kaayo mag-sugod ug karon!', english: 'Start today!' },
  { text: 'Matag adlaw usa ka lakang.', english: 'Every day is one step.' },
  { text: 'Ang kalamboan magsugod sa gamay.', english: 'Progress starts small.' },
  { text: 'Padayon lang, dili lang ni hilabihan.', english: 'Keep going, this too shall pass.' },
  { text: 'Ang langgam dili mokusog pinaagi sa pagsalig.', english: 'The bird flies by trusting its wings.' },
  { text: 'Kusog ang Bisaya kung mag-istorya.', english: 'Bisaya shines when spoken.' },
];

const MODULES = [
  {
    id: 'voice_practice',
    title: 'Voice Practice',
    description: 'Speak with SULTI voice',
    iconName: 'mic',
    gradient: ['#14B8A6', '#0D9488'],
    route: 'VoiceMode',
  },
  {
    id: 'scenario_practice',
    title: 'Scenario Practice',
    description: 'Roleplay real situations',
    iconName: 'chatbubbles',
    gradient: ['#3B82F6', '#2563EB'],
    route: 'ScenarioPractice',
  },
  {
    id: 'phrasebook',
    title: 'Phrasebook',
    description: 'Essential Bisaya phrases',
    iconName: 'book',
    gradient: ['#8B5CF6', '#7C3AED'],
    route: 'Phrasebook',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Review saved phrases',
    iconName: 'layers',
    gradient: ['#F59E0B', '#F97316'],
    route: 'Flashcards',
  },
  {
    id: 'pronunciation_lab',
    title: 'Pronunciation Lab',
    description: 'Check speech accuracy',
    iconName: 'mic-circle',
    gradient: ['#EC4899', '#DB2777'],
    route: 'Pronunciation',
  },
  {
    id: 'grammar',
    title: 'Grammar',
    description: 'Cebuano sentence structure',
    iconName: 'school',
    gradient: ['#6366F1', '#4F46E5'],
    route: 'Grammar',
  },
  {
    id: 'vocabulary_notebook',
    title: 'Vocabulary Notebook',
    description: 'Master your word bank',
    iconName: 'bookmark',
    gradient: ['#10B981', '#059669'],
    route: 'VocabularyReview',
  },
  {
    id: 'listening',
    title: 'Listening',
    description: 'Train your ear for Bisaya',
    iconName: 'ear',
    gradient: ['#F97316', '#EA580C'],
    route: 'Listening',
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Compose with confidence',
    iconName: 'create',
    gradient: ['#EC4899', '#DB2777'],
    route: 'Writing',
  },
  {
    id: 'reading',
    title: 'Reading',
    description: 'Read & understand Bisaya',
    iconName: 'book-outline',
    gradient: ['#06B6D4', '#0891B2'],
    route: 'Reading',
  },
  {
    id: 'sulti_switch',
    title: 'Sulti Switch',
    description: 'Bilingual thinking mode',
    iconName: 'swap-horizontal',
    gradient: ['#0EA5E9', '#0284C7'],
    route: 'SultiSwitch',
  },
  {
    id: 'culture_notes',
    title: 'Culture Notes',
    description: 'Understand Cebuano life',
    iconName: 'compass',
    gradient: ['#10B981', '#059669'],
    route: 'CultureNotes',
  },
  {
    id: 'review_center',
    title: 'Review Center',
    description: 'Reinforce what you learned',
    iconName: 'refresh',
    gradient: ['#F43F5E', '#E11D48'],
    route: 'ReviewCenter',
    badge: 'NEW',
    badgeColor: '#F43F5E',
  },
];

const CATEGORIES = [
  { name: 'Market', icon: 'storefront', color: '#14B8A6' },
  { name: 'Transportation', icon: 'bus', color: '#3B82F6' },
  { name: 'Restaurant', icon: 'restaurant', color: '#F59E0B' },
  { name: 'Hospital', icon: 'medkit', color: '#EF4444' },
  { name: 'School', icon: 'school', color: '#8B5CF6' },
  { name: 'Workplace', icon: 'briefcase', color: '#6366F1' },
  { name: 'Hotel', icon: 'bed', color: '#06B6D4' },
  { name: 'Emergency', icon: 'warning', color: '#FF6B6B' },
  { name: 'Community', icon: 'home', color: '#10B981' },
  { name: 'Small Talk', icon: 'chatbubble-ellipses', color: '#EC4899' },
  { name: 'Dating', icon: 'heart', color: '#F43F5E' },
  { name: 'Festivals', icon: 'gift', color: '#8B5CF6' },
];

const FOCUS_REFRESH_MS = 4000;

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

function CircularProgress({ progress, size = 64, strokeWidth = 5, color, label, value, delay = 0, empty = false, onPress }) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withDelay(delay, withTiming(empty ? 0 : Math.max(0.05, progress / 100), { duration: 1000 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, empty]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${circumference * progressValue.value} ${circumference}`,
  }));

  const ring = (
    <>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" animatedProps={animatedProps} />
      </Svg>
      {empty ? (
        <View style={[styles.ringCta, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Ionicons name="mic" size={10} color={color} />
          <Text style={[styles.ringCtaText, { color }]}>Start</Text>
        </View>
      ) : (
        <Text style={[styles.progressRingValue, { color: colors.text }]}>{value}</Text>
      )}
    </>
  );

  return (
    <TouchableOpacity
      style={styles.progressRing}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={empty ? 'Start pronunciation practice' : `${label}: ${value}`}
    >
      {ring}
      <Text style={[styles.progressRingLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ShimmerBar({ progress, color }) {
  const { colors, isDark } = useTheme();
  const shimmer = useSharedValue(0);
  const barWidth = (SCREEN_WIDTH - 80) / 3;

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1, false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-barWidth, barWidth]) }],
    opacity: 0.4,
  }));

  return (
    <View style={[styles.shimmerTrack, { backgroundColor: colors.border }]}>
      <View style={[styles.shimmerFill, { width: `${progress}%`, backgroundColor: color || colors.accent }]} />
      {progress > 0 && progress < 100 && (
        <Animated.View style={[styles.shimmerOverlay, { width: '30%', backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }, shimmerStyle]} />
      )}
    </View>
  );
}

export default function LearnScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { xp, dailyXp, streak, dailyGoal, user } = useGame();
  const [wordsLearned, setWordsLearned] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [weeklyXpTotal, setWeeklyXpTotal] = useState(0);
  const [pronunciationStats, setPronunciationStats] = useState(null);
  const [learningProgress, setLearningProgress] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const lastLoadRef = useRef(0);

  const quote = useMemo(() => getDailyQuote(), []);

  const weeklyProgress = useMemo(() => {
    const weeklyGoal = Math.max(1, (Number(dailyGoal) || 50) * 7);
    return Math.min(Math.round((Math.max(0, weeklyXpTotal) / weeklyGoal) * 100), 100);
  }, [weeklyXpTotal, dailyGoal]);

  const stats = useMemo(() => SafeUserStats({
    xp,
    dailyTargetXp: dailyGoal,
    dailyXp,
    wordsLearned,
    streakDays: streak,
    weeklyProgress,
  }), [xp, dailyXp, dailyGoal, wordsLearned, streak, weeklyProgress]);

  const moduleProgressByTitle = useMemo(() => {
    const map = {};
    for (const row of learningProgress || []) {
      if (row && row.moduleTitle) {
        map[String(row.moduleTitle).trim().toLowerCase()] = Math.max(0, Math.min(100, Number(row.completionPercent) || 0));
      }
    }
    return map;
  }, [learningProgress]);

  const continueModule = useMemo(() => {
    let best = null;
    for (const module of MODULES) {
      const pct = moduleProgressByTitle[module.title.toLowerCase()];
      if (pct !== undefined && pct > 0 && pct < 100) {
        if (!best || pct > best.pct) best = { module, pct };
      }
    }
    return best ? { ...best.module, pct: best.pct } : null;
  }, [moduleProgressByTitle]);

  const loadData = useCallback(async () => {
    try {
      const cached = await offline.getCachedVocabulary();
      if (Array.isArray(cached) && cached.length) setWordsLearned(cached.length);
    } catch (e) {
      console.warn('[Learn] Failed to load cached vocabulary:', e.message);
    }
    try {
      const data = await api.getSavedPhrases();
      if (Array.isArray(data) && data.length) setWordsLearned(data.length);
    } catch (e) {
      console.warn('[Learn] Failed to load saved phrases:', e.message);
    }
    try {
      const notifications = await api.getNotifications();
      if (Array.isArray(notifications)) {
        setNotifCount(notifications.filter((n) => n && !n.read).length);
      }
    } catch (e) {
      console.warn('[Learn] Failed to load notifications:', e.message);
    }
    try {
      const weekly = await api.getWeeklyProgress();
      if (Array.isArray(weekly) && weekly.length) {
        setWeeklyXpTotal(weekly.reduce((sum, day) => sum + (Number(day && day.xp) || 0), 0));
      }
    } catch (e) {
      console.warn('[Learn] Failed to load weekly progress:', e.message);
    }
    try {
      const pron = await api.getPronunciationStats();
      if (pron) setPronunciationStats(pron);
    } catch {
      setPronunciationStats(null);
    }
    try {
      const progress = await api.getLearningProgress();
      if (Array.isArray(progress)) setLearningProgress(progress);
    } catch (e) {
      console.warn('[Learn] Failed to load learning progress:', e.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastLoadRef.current > FOCUS_REFRESH_MS) {
        lastLoadRef.current = now;
        loadData();
      }
      setRefreshKey((k) => k + 1);
    }, [loadData])
  );

  const handleTalkToSulti = () => {
    hapticTap();
    navigation.navigate('VoiceMode');
  };

  const handleModulePress = (module) => {
    hapticTap();
    navigation.navigate(module.route, module.params);
  };

  const handleCategoryPress = (category) => {
    hapticTap();
    navigation.navigate('Phrasebook', { category: category.name });
  };

  const handleDailyChallengeAction = (challenge, route, params, completed) => {
    hapticTap();
    if (completed) {
      loadData();
      return;
    }
    if (challenge) {
      navigation.navigate(route || 'SULTI', params || { situation: challenge.title, label: challenge.title });
    } else {
      navigation.navigate('SULTI');
    }
  };

  const handleAIRecommendation = (recommendation) => {
    if (!recommendation) return;
    const moduleRoutes = {
      phrasebook: 'Phrasebook',
      daily_challenge: 'SULTI',
      pronunciation: 'Pronunciation',
      ai_conversation: 'SULTI',
      flashcards: 'Flashcards',
      vocabulary: 'VocabularyReview',
      voice: 'VoiceMode',
      scenario: 'ScenarioPractice',
    };
    const route = recommendation.route || moduleRoutes[recommendation.module] || 'SULTI';
    const params = route === 'SULTI'
      ? { situation: recommendation.title, label: recommendation.title }
      : {};
    navigation.navigate(route, params);
  };

  const userName = user?.name || user?.displayName || 'Learner';

  const pronAttempts = Number(pronunciationStats?.totalAttempts) || 0;
  const pronAvg = Math.max(0, Math.min(100, Number(pronunciationStats?.avgAccuracy) || 0));

  return (
    <AuroraBackground style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]}>
        {/* Header */}
        <Animated.View entering={FadeInRight.duration(500)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Kumusta,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{userName}!</Text>
            <View style={[styles.aiBadge, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={[styles.aiBadgeText, { color: colors.accent }]}>AI-Powered</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={notifCount > 0 ? `${notifCount} unread notifications` : 'Notifications'}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {notifCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.notifBadgeText, { color: '#fff' }]}>{notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Motif Quote */}
        <Animated.View entering={FadeInRight.delay(100).duration(500)}>
          <View style={[styles.quoteCard, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '20' }]}>
            <Ionicons name="bulb-outline" size={18} color={colors.accent} />
            <View style={styles.quoteTextWrap}>
              <Text style={[styles.quoteText, { color: colors.text }]}>{quote.text}</Text>
              <Text style={[styles.quoteEnglish, { color: colors.textSecondary }]}>{quote.english}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Today's Goal */}
        <Animated.View entering={FadeInRight.delay(200).duration(500)} style={styles.goalSection}>
          <View style={styles.goalHeader}>
            <View>
              <Text style={[styles.goalTitle, { color: colors.text }]}>Today&apos;s Goal</Text>
              <Text style={[styles.goalSubtitle, { color: colors.textSecondary }]}>Complete your goal to keep your progress moving</Text>
            </View>
            <View style={[styles.goalChip, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={[styles.goalChipText, { color: colors.accent }]}>{stats.streakCount} day{stats.streakCount === 1 ? '' : 's'}</Text>
            </View>
          </View>
          <View style={styles.goalValueRow}>
            <Text style={[styles.goalValue, { color: colors.text }]}>{stats.targetDisplay}</Text>
            <Text style={[styles.goalPercent, { color: colors.accent }]}>{stats.dailyProgress}% of today&apos;s goal</Text>
          </View>
          <ShimmerBar progress={stats.dailyProgress} color={colors.primary} />
        </Animated.View>

        {/* Progress Summary */}
        <Animated.View entering={FadeInRight.delay(300).duration(500)} style={styles.progressRow}>
          <CircularProgress progress={stats.dailyProgress} color={colors.accent} label="TODAY" value={stats.targetDisplay} delay={350} />
          <CircularProgress progress={stats.weeklyProgress} color={colors.warning} label="WEEKLY" value={`${stats.weeklyProgress}%`} delay={450} />
          <CircularProgress
            progress={pronAvg}
            color={colors.secondary}
            label="PRONUNCIATION"
            value={pronAttempts > 0 ? `${Math.round(pronAvg)}%` : '—'}
            delay={550}
            empty={pronAttempts === 0}
            onPress={() => navigation.navigate('Pronunciation')}
          />
        </Animated.View>

        {/* Continue Learning */}
        {continueModule && (
          <Animated.View entering={FadeInRight.delay(400).duration(500)}>
            <ContinueCard title={continueModule.title} pct={continueModule.pct} colors={colors} onPress={() => handleModulePress(continueModule)} />
          </Animated.View>
        )}

        {/* AI Recommendation */}
        <Animated.View entering={FadeInRight.delay(500).duration(500)}>
          <AIRecommendationCard
            onStart={handleAIRecommendation}
            navigation={navigation}
            refreshKey={refreshKey}
            pronunciationStats={pronunciationStats}
            inProgressModule={continueModule ? { title: continueModule.title, module: continueModule.id, route: continueModule.route } : null}
          />
        </Animated.View>

        {/* Talk with SULTI + Daily Challenge */}
        <Animated.View entering={FadeInRight.delay(600).duration(500)} style={styles.cardsFeed}>
          <TouchableOpacity style={[styles.bannerCard, { backgroundColor: colors.primary }]} onPress={handleTalkToSulti} activeOpacity={0.9}>
            <View style={styles.bannerCardBadge}>
              <Text style={styles.bannerCardBadgeText}>NEW</Text>
            </View>
            <View style={styles.bannerCardContent}>
              <Text style={styles.bannerCardTitle}>Talk with SULTI</Text>
              <Text style={styles.bannerCardDesc}>Practice speaking Bisaya naturally with AI-powered voice recognition</Text>
            </View>
            <TouchableOpacity style={[styles.bannerBtn, { backgroundColor: colors.surface }]} onPress={handleTalkToSulti} activeOpacity={0.85}>
              <View style={styles.bannerBtnContent}>
                <Ionicons name="mic" size={18} color={colors.text} />
                <Text style={[styles.bannerBtnText, { color: colors.text }]}>Start Voice Session</Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>

          <DailyChallengeCard
            onStart={handleDailyChallengeAction}
            navigation={navigation}
            refreshKey={refreshKey}
          />
        </Animated.View>

        {/* Learning Modules */}
        <Animated.View entering={FadeInRight.delay(700).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Learning Modules</Text>
          <View style={styles.modulesGrid}>
            {MODULES.map((module, index) => {
              const pct = moduleProgressByTitle[module.title.toLowerCase()];
              const hasProgress = pct !== undefined;
              const statusLabel = hasProgress
                ? (pct >= 100 ? 'Completed' : (pct === 0 ? 'Not started' : 'In progress'))
                : undefined;
              return (
                <ModuleCard
                  key={module.id}
                  title={module.title}
                  description={module.description}
                  iconName={module.iconName}
                  gradient={module.gradient}
                  index={index}
                  badge={module.badge}
                  badgeColor={module.badgeColor}
                  progress={hasProgress ? pct : null}
                  statusLabel={statusLabel}
                  onPress={() => handleModulePress(module)}
                />
              );
            })}
          </View>
        </Animated.View>

        {/* Categories */}
        <Animated.View entering={FadeInRight.delay(800).duration(500)} style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={[styles.categoryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <Ionicons name={category.icon} size={20} color={category.color} />
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </AuroraBackground>
  );
}

function ContinueCard({ title, pct, colors, onPress }) {
  return (
    <GlassCard variant="elevated" style={styles.continueCard} padding="md">
      <TouchableOpacity style={styles.continueRow} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.continueIcon, { backgroundColor: colors.accent + '15' }]}>
          <Ionicons name="play" size={18} color={colors.accent} />
        </View>
        <View style={styles.continueInfo}>
          <Text style={[styles.continueLabel, { color: colors.textSecondary }]}>Continue Learning</Text>
          <Text style={[styles.continueTitle, { color: colors.text }]}>{title}</Text>
          <View style={[styles.continueTrack, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={[styles.continueFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.continueMeta, { color: colors.textSecondary }]}>{Math.round(pct)}% complete</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, flexGrow: 1, padding: spacing.xl, paddingTop: spacing.sm },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  userName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: spacing.xs },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  aiBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  notifBadge: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  quoteCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.lg, gap: spacing.md },
  quoteTextWrap: { flex: 1 },
  quoteText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  quoteEnglish: { fontSize: 12, marginTop: 2 },

  goalSection: { marginBottom: spacing.lg },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm },
  goalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  goalSubtitle: { fontSize: 12, marginTop: 2 },
  goalChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  goalChipText: { fontSize: 12, fontWeight: '700' },
  goalValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  goalValue: { fontSize: 16, fontWeight: '800' },
  goalPercent: { fontSize: 12, fontWeight: '700' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', marginBottom: spacing.xl },
  progressRing: { alignItems: 'center', gap: 4 },
  progressRingValue: { fontSize: 11, fontWeight: '800', textAlign: 'center', maxWidth: 70 },
  progressRingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  ringCta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, marginTop: 8 },
  ringCtaText: { fontSize: 10, fontWeight: '700' },

  shimmerSection: { marginBottom: spacing.lg },
  shimmerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  shimmerLabel: { fontSize: 12, fontWeight: '600' },
  shimmerValue: { fontSize: 12, fontWeight: '800' },
  shimmerTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  shimmerFill: { height: '100%', borderRadius: 3, position: 'absolute', top: 0, left: 0 },
  shimmerOverlay: { height: '100%', borderRadius: 3, position: 'absolute', top: 0 },

  continueCard: { marginBottom: spacing.md },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  continueInfo: { flex: 1 },
  continueLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  continueTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.xs },
  continueTrack: { height: 5, borderRadius: 999, overflow: 'hidden', marginBottom: 4 },
  continueFill: { height: '100%', borderRadius: 999 },
  continueMeta: { fontSize: 11, fontWeight: '600' },

  cardsFeed: { flexDirection: 'column', gap: spacing.md, marginBottom: spacing.lg, width: '100%' },
  bannerCard: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between', width: '100%', minHeight: 180, borderRadius: borderRadius.xl, padding: spacing.lg },
  bannerCardBadge: { alignSelf: 'flex-start', backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: spacing.sm },
  bannerCardBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  bannerCardContent: { flex: 1, marginBottom: spacing.md },
  bannerCardTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: spacing.xs },
  bannerCardDesc: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.7)' },
  bannerBtn: { minHeight: 44, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg, borderRadius: 999, alignSelf: 'flex-start', ...shadows.md },
  bannerBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  bannerBtnText: { fontSize: 13, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },

  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },

  categoriesSection: { marginTop: spacing.sm },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.lg, borderWidth: 1, gap: spacing.sm, minWidth: 120 },

  categoryName: { fontSize: 13, fontWeight: '600', flex: 1 },

  bottomSpacer: { height: 80 },
});