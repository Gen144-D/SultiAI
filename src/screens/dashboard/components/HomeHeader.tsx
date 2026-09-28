import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useUser } from '../../../context/UserContext';
import { useGame } from '../../../context/GameContext';
import Avatar from '../../../components/Avatar';
import { spacing, borderRadius } from '../../../theme';
import { getUserAvatarUrl } from '../../../utils/avatar';

interface HomeHeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

/**
 * HomeHeader
 *
 * Compact top bar for the Home screen. Keeps greeting + name, a small
 * streak / daily-XP indicator and a subtle avatar. Purpose-built to answer
 * "how am I progressing?" without competing with the primary daily goal.
 */
export function HomeHeader({ onNotificationPress, onProfilePress }: HomeHeaderProps) {
  const { colors, getAnimationDuration } = useTheme();
  const { user } = useUser() as any;
  const { streak, dailyXp } = useGame() as any;
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(-8));
  const AvatarComp = Avatar as any;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.fullname?.split(' ')[0] || user?.name?.split(' ')[0] || 'Learner';
  const fullName = user?.fullname || user?.name || name;
  const avatarUri = getUserAvatarUrl(user) || user?.photoURL || null;

  const safeStreak = Math.max(0, Number(streak) || 0);
  const safeDailyXp = Math.max(0, Number(dailyXp) || 0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: getAnimationDuration(400), useNativeDriver: true }),
    ]).start();
  }, [getAnimationDuration, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.md, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <AvatarComp uri={avatarUri} name={fullName || name} size={38} />
        </TouchableOpacity>

        <View style={styles.textGroup}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting},</Text>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
        </View>

        <View style={styles.stats}>
          <View style={[styles.statPill, { backgroundColor: colors.softOrange }]}>
            <Ionicons name="flame" size={13} color={colors.amber} />
            <Text style={[styles.statPillText, { color: colors.text }]}>{safeStreak}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="flash" size={12} color={colors.primary} />
            <Text style={[styles.statPillText, { color: colors.text }]}>{safeDailyXp}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.bell, { backgroundColor: colors.surfaceSecondary }]}
          onPress={onNotificationPress}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textGroup: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    minWidth: 36,
    justifyContent: 'center',
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});