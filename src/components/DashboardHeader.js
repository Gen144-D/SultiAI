import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useGame } from '../context/GameContext';
import UserAvatar from './profile/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '../theme';
import { dashboardGradients } from '../theme/dashboardGradients';
import { getUserAvatarUrl } from '../utils/avatar';

/**
 * DashboardHeader
 *
 * Compact mobile-first header: avatar + greeting + notifications,
 * a horizontal stats row (XP widget, streak, hearts), and a
 * dynamically-calculated daily-goal progress bar.
 *
 * @param {{ onNotificationPress?: Function, unreadCount?: number }} props
 */
export default function DashboardHeader({ onNotificationPress, unreadCount = 0 }) {
  const { colors } = useTheme();
  const { user } = useUser();
  const { xp, hearts, streak, dailyGoal, dailyXp, getLevelInfo } = useGame();
  const insets = useSafeAreaInsets();
  const [userAvatarId, setUserAvatarId] = useState('avatar-01');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    AsyncStorage.getItem('user_avatar_id').then((id) => {
      if (id) setUserAvatarId(id);
    }).catch(() => []);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 12,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Learner';

  const levelInfo = getLevelInfo(xp);

  const dailyProgressPercent = dailyGoal > 0 ? Math.min((dailyXp / dailyGoal) * 100, 100) : 0;
  const dailyProgressRounded = Math.round(dailyProgressPercent);

  const flameColor =
    streak >= 30 ? '#FF6B00' : streak >= 7 ? '#FF9500' : streak >= 3 ? '#FFB347' : '#FFD700';

  const paddedTop = (insets.top || 0) + spacing.sm;

  return (
    <LinearGradient
      colors={dashboardGradients.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.headerGradient}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.content, { paddingTop: paddedTop, paddingBottom: spacing.lg }]}>
          {/* Top row: avatar + greeting + notifications */}
          <View style={styles.topRow}>
            <View style={styles.leftSection}>
              <UserAvatar avatarId={userAvatarId} name={user?.name} uri={getUserAvatarUrl(user)} size={44} />
              <View style={styles.greetingBox}>
                <Text style={styles.greeting}>Kumusta, {firstName}!</Text>
                <Text style={styles.subGreeting}>Padayon sa pagkat-on</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onNotificationPress || (() => {})}
              activeOpacity={0.8}
              style={styles.notifBtn}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifDotText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Mid: compact stats row (XP widget, streak, hearts) */}
          <View style={styles.statsRow}>
            <View style={styles.xpWidget}>
              <LinearGradient
                colors={dashboardGradients.xpWidget}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.xpWidgetGradient, { borderColor: levelInfo.color }]}
              >
                <Text style={styles.xpValue}>{xp >= 1000 ? `${Math.round(xp / 1000)}k` : xp}</Text>
                <Text style={styles.xpLabel}>XP</Text>
                <View style={[styles.levelBadge, { backgroundColor: levelInfo.color }]}>
                  <Ionicons name={levelInfo.icon} size={12} color="#fff" />
                  <Text style={styles.levelBadgeText}>L{levelInfo.level}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.streakWidget}>
              <Ionicons name="flame" size={20} color={flameColor} />
              <Text style={[styles.streakValue, { color: flameColor }]}>{streak}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>day streak</Text>
            </View>

            <View style={styles.heartWidget}>
              <Ionicons name="heart" size={20} color="#FF6B6B" />
              <Text style={styles.heartValue}>{hearts}</Text>
              <Text style={[styles.heartLabel, { color: colors.textSecondary }]}>hearts</Text>
            </View>
          </View>

          {/* Daily goal progress — dynamic percentage */}
          <View style={styles.dailyGoal}>
            <View style={styles.dailyGoalHeader}>
              <Text style={styles.dailyGoalLabel}>Daily Goal</Text>
              <Text style={styles.dailyGoalPercent}>{dailyProgressRounded}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${dailyProgressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.dailyGoalValue}>
              {dailyXp} / {dailyGoal} XP
            </Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 0,
  },
  container: {
    opacity: 0,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greetingBox: {
    marginLeft: spacing.md,
    flex: 1,
  },
    greeting: {
      color: '#fff',
      ...typography.h3,
    },
  subGreeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    letterSpacing: -0.08,
  },
  notifBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  xpWidget: {
    flex: 1,
    alignItems: 'center',
  },
  xpWidgetGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Platform.select({
      ios: { boxShadow: '0 4px 12px rgba(20,184,166,0.25)' },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(20, 184, 166, 0.25)' },
    }),
  },
  levelBadge: {
    position: 'absolute', top: -4, right: -4,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 10, fontWeight: '800', color: '#fff',
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.36,
  },
  xpLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: -2,
  },
  streakWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.36,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.07,
  },
  heartWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B6B',
    letterSpacing: 0.36,
  },
  heartLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.07,
  },
  dailyGoal: {
    gap: spacing.xs,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyGoalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: -0.08,
  },
  dailyGoalPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.07,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2.5,
  },
  dailyGoalValue: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    letterSpacing: -0.08,
  },
});
