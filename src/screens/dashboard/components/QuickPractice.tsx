import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { SectionLabel } from './SectionLabel';
import { spacing, borderRadius, shadows } from '../../../theme';
import { ensureContrast } from '../../../theme/moduleColors';

interface QuickPracticeProps {
  navigation: any;
}

type Action = {
  id: string;
  label: string;
  icon: string;
  bg: string;
  route: string;
  accessibilityLabel: string;
};

/**
 * QuickPractice
 *
 * Level-3 compact action tiles. Fast paths to the most common practice
 * modes so SULTI voice, chat and flashcards are one tap away — without
 * turning the Home page into a row of giant cards.
 */
export function QuickPractice({ navigation }: QuickPracticeProps) {
  const { colors, getAnimationDuration } = useTheme();

  // Each tile's glyph sits on its own tinted chip, so the ink has to be
  // measured per tile. Soft Academic's amber only reaches 1.98:1 on softOrange,
  // which is the same amber-on-amber defect as the token-level amber pair.
  const chipInk = (fill: string) => ensureContrast(colors.text, fill, 4.5);

  const [fadeAnim] = useState(() => new Animated.Value(0));

  const actions: Action[] = [
    {
      id: 'speak',
      label: 'Speak with SULTI',
      icon: 'mic',
      bg: colors.primaryLight,
      route: 'VoiceMode',
      accessibilityLabel: 'Speak with SULTI — voice practice',
    },
    {
      id: 'chat',
      label: 'Chat with SULTI',
      icon: 'chatbubbles',
      bg: colors.softPurple,
      route: 'SULTI',
      accessibilityLabel: 'Chat with SULTI',
    },
    {
      id: 'cards',
      label: 'Review flashcards',
      icon: 'layers',
      bg: colors.softOrange,
      route: 'Flashcards',
      accessibilityLabel: 'Review flashcards',
    },
    {
      id: 'vocab',
      label: 'Practice vocabulary',
      icon: 'book',
      bg: colors.softTeal,
      route: 'VocabularyReview',
      accessibilityLabel: 'Practice vocabulary',
    },
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }).start();
  }, [getAnimationDuration, fadeAnim]);

  const handlePress = (action: Action) => {
    navigation.navigate(action.route);
  };

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
        <SectionLabel>QUICK PRACTICE</SectionLabel>
        <View style={styles.tiles}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.tile, { borderColor: colors.border }]}
              onPress={() => handlePress(action)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
            >
              <View style={[styles.tileIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon as any} size={20} color={chipInk(action.bg)} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={2}>
                {action.label}
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