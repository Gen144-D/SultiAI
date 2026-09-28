import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoicePalette } from './palette';

export default function XpToast({ visible, amount = 15, streak = 0, offset = 60 }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  if (!visible) return null;

  return (
    <Animated.View entering={FadeInUp.duration(320).springify().damping(16)} exiting={FadeOutUp.duration(320)} style={[styles.wrap, { top: offset }]}>
      <LinearGradient
        colors={[voice.primary, voice.secondary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.pill}
        accessibilityRole="text"
      >
        <Text style={styles.xp}>+{amount} XP</Text>
        {streak > 1 && (
          <View style={styles.streak}>
            <Text style={styles.flame}>🔥</Text>
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    boxShadow: `0 4px 12px ${voice.primary}80`,
    elevation: 8,
  },
  xp: { color: voice.onGradientText, fontSize: 14, fontWeight: '800' },
  streak: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  flame: { fontSize: 12, marginRight: 3 },
  streakText: { color: voice.onGradientText, fontSize: 12, fontWeight: '800' },
});
