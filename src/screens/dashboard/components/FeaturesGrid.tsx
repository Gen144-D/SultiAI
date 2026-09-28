import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { ensureContrast } from '../../../theme/moduleColors';
import { FEATURES } from '../../../theme/dashboardGradients';
import { SectionLabel } from './SectionLabel';
import { spacing, borderRadius, shadows } from '../../../theme';

interface FeaturesGridProps {
  navigation: any;
}

type Tile = {
  id: string;
  title: string;
  icon: string;
  route: string;
  color: string;
  bg: string;
};

/**
 * FeaturesGrid
 *
 * Compact access to the full feature set (Sulti Tutor, Whisper AI, Practice,
 * AI Voice, Pronunciation, AR Explore, Rewards + Daily Challenge). Rendered
 * as a quiet 2-column mini grid so every tool stays reachable from Home
 * without competing with the daily-learning hero sections. Colors are
 * theme-aware so tiles hold their contrast in dark mode.
 */
export function FeaturesGrid({ navigation }: FeaturesGridProps) {
  const { colors, getAnimationDuration, isDark } = useTheme();
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const ID_COLORS: Record<string, { color: string; dark: string; bg: string; bgDark: string }> = {
    tutor: { color: colors.primary, dark: colors.primary, bg: colors.primaryLight, bgDark: colors.primaryLight },
    whisper: { color: colors.violet, dark: colors.violet, bg: colors.softPurple, bgDark: colors.softPurple },
    practice: { color: colors.secondary, dark: colors.secondary, bg: colors.secondaryLight, bgDark: colors.secondaryLight },
    voice: { color: colors.amber, dark: colors.amber, bg: colors.softOrange, bgDark: colors.softOrange },
    pronunciation: { color: colors.coral, dark: colors.coral, bg: colors.coralLight, bgDark: colors.coralLight },
    ar: { color: colors.blue, dark: colors.blue, bg: colors.softBlue, bgDark: colors.softBlue },
    rewards: { color: colors.amber, dark: colors.amber, bg: colors.softOrange, bgDark: colors.softOrange },
    challenge: { color: colors.pink, dark: colors.pink, bg: colors.softPink, bgDark: colors.softPink },
  };

  const tiles: Tile[] = FEATURES.map((feature: any) => {
    const lookup = ID_COLORS[feature.id] || ID_COLORS.tutor;

    return {
      id: feature.id,
      title: feature.title,
      icon: feature.iconName,
      route: feature.path,
      color: ensureContrast(isDark ? lookup.dark : lookup.color, isDark ? lookup.bgDark : lookup.bg, 4.5),
      bg: isDark ? lookup.bgDark : lookup.bg,
    };
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }).start();
  }, [getAnimationDuration, fadeAnim]);

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
        <SectionLabel>FEATURES</SectionLabel>
        <View style={styles.tiles}>
          {tiles.map((tile: Tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, { borderColor: colors.border }]}
              onPress={() => navigation.navigate(tile.route)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tile.title}
            >
              <View style={[styles.tileIcon, { backgroundColor: tile.bg }]}>
                <Ionicons name={tile.icon as any} size={20} color={tile.color} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={2}>
                {tile.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '47%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 96,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', letterSpacing: -0.1 },
});