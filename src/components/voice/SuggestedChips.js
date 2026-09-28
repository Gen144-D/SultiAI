import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useVoicePalette } from './palette';

const CHIPS = [
  { label: 'Teach Greetings', icon: 'hand-left-outline' },
  { label: 'Practice Pronunciation', icon: 'mic-outline' },
  { label: 'Learn Numbers', icon: 'calculator-outline' },
  { label: 'Translate English', icon: 'swap-horizontal-outline' },
  { label: 'Daily Conversation', icon: 'chatbubbles-outline' },
];

export default function SuggestedChips({ onPick, disabled }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} accessibilityRole="text">
        Try asking me
      </Text>
      <View style={styles.list}>
        {CHIPS.map((c, i) => (
          <Animated.View key={c.label} entering={FadeInUp.duration(400).delay(150 + i * 90)}>
            <TouchableOpacity
              onPress={() => onPick(c.label)}
              disabled={disabled}
              activeOpacity={0.7}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Suggested question: ${c.label}`}
            >
              <Ionicons name={c.icon} size={15} color={voice.primary} style={styles.icon} />
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%', paddingHorizontal: 24 },
  heading: {
    color: voice.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: voice.glass,
    borderWidth: 1,
    borderColor: voice.glassBorder,
  },
  icon: { marginRight: 6 },
  chipText: { color: voice.text, fontSize: 13, fontWeight: '600' },
});
