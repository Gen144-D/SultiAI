import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoicePalette } from './palette';

export default function Greeting({ visible, hasSpoken }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  if (!visible) return null;

  return (
    <Animated.View
      key={hasSpoken ? 'greeting-spoken' : 'greeting'}
      entering={FadeInDown.duration(700).delay(150)}
      exiting={FadeOutUp.duration(350)}
      style={styles.wrap}
      accessibilityRole="text"
    >
      <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.emojiRow}>
        <View style={styles.emojiCircle}>
          <Ionicons name="hand-left" size={26} color={voice.primary} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(450)} style={styles.titleRow}>
        <Text style={styles.title}>Hi! I'm SULTI</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.subtitleRow}>
        <LinearGradient
          colors={[voice.primary, voice.secondary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>Your Bisaya AI Tutor</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(750)} style={styles.hintRow}>
        <Text style={styles.hint}>Tap the orb or say "Hi Sulti" to begin</Text>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32 },
  emojiRow: { marginBottom: 6 },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: voice.primary + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: voice.text,
    letterSpacing: -0.5,
  },
  subtitleRow: { marginBottom: 12 },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { color: voice.onGradientText, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  hintRow: { marginBottom: 4 },
  hint: { color: voice.textMuted, fontSize: 13, textAlign: 'center' },
});
