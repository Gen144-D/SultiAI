import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoicePalette } from './palette';

const createStatusMeta = (voice) => ({
  idle: { label: 'Ready to help', dot: voice.textMuted },
  listening: { label: 'Listening...', dot: voice.danger },
  thinking: { label: 'Thinking...', dot: voice.accent },
  speaking: { label: 'Speaking...', dot: voice.primary },
  error: { label: 'Something went wrong', dot: voice.danger },
});

export default function StatusPill({ state = 'idle' }) {
  const voice = useVoicePalette();
  const statusMeta = useMemo(() => createStatusMeta(voice), [voice]);
  const styles = useMemo(() => createStyles(voice), [voice]);
  const meta = statusMeta[state] || statusMeta.idle;

  const key = `${state}`;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={`AI status: ${meta.label}`}
    >
      <LinearGradient
        colors={[voice.glass, voice.glassHighlight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        <Animated.View
          key={`dot-${key}`}
          entering={ZoomIn.springify().damping(14)}
          style={[styles.dot, { backgroundColor: meta.dot }]}
        />
        <Animated.Text
          key={`label-${key}`}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(140)}
          style={styles.label}
        >
          {meta.label}
        </Animated.Text>
      </LinearGradient>
    </View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  wrap: { alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: voice.glassBorder,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(18px)' }
      : {}),
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  label: { color: voice.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
});
