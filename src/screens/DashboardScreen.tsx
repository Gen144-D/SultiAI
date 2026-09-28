import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { spacing } from '../theme';
import { ensureContrast } from '../theme/moduleColors';
import AuroraBackground from '../components/AuroraBackground';
import { api } from '../services/api';
import { HomeHeader } from './dashboard/components/HomeHeader';
import { DailyMotivation } from './dashboard/components/DailyMotivation';
import { DailyGoalCard } from './dashboard/components/DailyGoalCard';
import { ContinueLearningCard } from './dashboard/components/ContinueLearningCard';
import { HomeRecommendation } from './dashboard/components/HomeRecommendation';
import { QuickPractice } from './dashboard/components/QuickPractice';
import { CommunityPreview } from './dashboard/components/CommunityPreview';
import { FeaturesGrid } from './dashboard/components/FeaturesGrid';
import { SultiPrompt } from './dashboard/components/SultiPrompt';
import OnboardingForm from '../components/OnboardingForm';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { colors, onPrimary: onPrimaryInk } = useTheme();
  const { xp, loading: gameLoading } = useGame() as any;
  const [scrollY] = useState(() => new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem('onboarding_completed');
        setOnboardingComplete(flag === 'true');
      } catch {
        setOnboardingComplete(true);
      }
      try {
        const level = await api.getTutorLevel();
        setTotalSessions(level?.total_sessions ?? 0);
      } catch {
        setTotalSessions(0);
      }
    })();
  }, []);

  const isNewUser = !gameLoading && onboardingComplete !== false && onboardingComplete !== null && totalSessions === 0 && (xp ?? 0) === 0;

  const handleStartFirstChat = () => {
    navigation.navigate('SULTI');
  };

  const finishOnboarding = async () => {
    setOnboardingComplete(true);
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
    } catch (e) {
      console.warn('[Dashboard] Failed to save onboarding state:', e);
    }
  };

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleContinueLearning = () => {
    navigation.navigate('Learn');
  };

  // Measure the ink against the actual CTA fill instead of hardcoding one
  // theme's value as the fallback: '#042F2B' is Midnight Teal's dark ink and
  // only reaches 2.65:1 on Soft Academic Light's emerald, where the label and
  // arrow would be unreadable.
  const onPrimary = ensureContrast(onPrimaryInk, colors.primary, 4.5);
  return (
    <AuroraBackground style={styles.container} atmosphere="home">
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={styles.contentWidth}>
          <Animated.View style={{
            transform: [
              { translateY: headerTranslateY },
              { scale: headerScale },
            ],
          }}>
            <HomeHeader
              onNotificationPress={() => navigation.navigate('Notifications')}
              onProfilePress={() => navigation.navigate('Profile')}
            />
          </Animated.View>

          {onboardingComplete === false && (
            <View style={styles.onboardingWrap}>
              <OnboardingForm
                initialName=""
                onComplete={finishOnboarding}
                onSkip={finishOnboarding}
              />
            </View>
          )}

          {isNewUser && (
            <View style={[styles.gettingStartedCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <View style={[styles.gettingStartedIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="rocket" size={22} color={colors.primary} />
              </View>
              <View style={styles.gettingStartedInfo}>
                <Text style={[styles.gettingStartedTitle, { color: colors.text }]}>
                  Welcome! Ready to learn Bisaya?
                </Text>
                <Text style={[styles.gettingStartedSub, { color: colors.textSecondary }]}>
                  Ask Sulti anything — greetings, phrases, pronunciation — and earn your first XP.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.gettingStartedCta, { backgroundColor: colors.primary }]}
                onPress={handleStartFirstChat}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={[styles.gettingStartedCtaText, { color: onPrimary }]}>Start your first chat</Text>
                <Ionicons name="arrow-forward" size={16} color={onPrimary} />
              </TouchableOpacity>
            </View>
          )}

          <DailyMotivation />
          <DailyGoalCard onStart={handleContinueLearning} />
          <ContinueLearningCard onContinue={handleContinueLearning} refreshKey={refreshKey} />
          <HomeRecommendation navigation={navigation} refreshKey={refreshKey} />
          <QuickPractice navigation={navigation} />
          <CommunityPreview navigation={navigation} refreshKey={refreshKey} />
          <FeaturesGrid navigation={navigation} />
          <SultiPrompt navigation={navigation} />

          <View style={styles.bottomSpacer} />
        </View>
      </Animated.ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  bottomSpacer: { height: 40 },
  onboardingWrap: { marginBottom: spacing.lg },
  gettingStartedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  gettingStartedIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  gettingStartedInfo: { flex: 1, minWidth: 180 },
  gettingStartedTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  gettingStartedSub: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  gettingStartedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginTop: spacing.xs,
    minHeight: 44,
  },
  gettingStartedCtaText: { fontSize: 14, fontWeight: '700' },
  contentWidth: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 720 : undefined,
    alignSelf: 'center',
  },
});