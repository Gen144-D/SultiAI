import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { spacing, borderRadius, shadows } from '../../theme';
import { readableOnGradient } from '../../theme/moduleColors';
import { useTheme } from '../../context/ThemeContext';
import { hapticTap } from '../../utils/haptics';
import { unlockWebAudio } from '../../utils/tts';
import { useAccessibility } from '../../hooks/useAccessibility';

const BAR_HEIGHTS = [10, 22, 16, 26, 14, 20, 12];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function WaveBar({ index, height, animate, color }) {
  const h = useSharedValue(height);

  useEffect(() => {
    if (!animate) return;
    h.value = withRepeat(
      withSequence(
        withTiming(height + 6, { duration: 280 + index * 40, easing: Easing.inOut(Easing.sin) }),
        withTiming(height, { duration: 280 + index * 40, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true
    );
  }, [height, index, h, animate]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return <Animated.View style={[styles.waveBar, style, { backgroundColor: color }]} />;
}

function WaveDeco({ animate = true, color }) {
  return (
    <View style={styles.waveDeco} pointerEvents="none">
      {BAR_HEIGHTS.map((h, i) => (
        <WaveBar key={i} index={i} height={h} animate={animate} color={color} />
      ))}
    </View>
  );
}

// One-tap launch card: two large, distinct targets instead of a toggle + button.
export default function UnifiedHeroCard({ onChat, onVoice, style }) {
  const { colors } = useTheme();
  const { reduceMotion } = useAccessibility();
  const textScale = useSharedValue(1);
  const voiceScale = useSharedValue(1);
  const heroGradient = [colors.primary, colors.primaryDark];
  const heroInk = readableOnGradient(heroGradient);
  // The solid voice pill is painted *in* heroInk, so its label needs the ink
  // that contrasts with heroInk — not the theme's primary, which on Obsidian
  // Emerald lands dark teal on a near-black pill.
  const pillInk = readableOnGradient([heroInk]);

  const textZoneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
  }));

  const voiceZoneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: voiceScale.value }],
  }));

  const pressTextIn = () => {
    // eslint-disable-next-line react-hooks/immutability
    textScale.value = withSpring(0.97, { stiffness: 320, damping: 14 });
  };
  const pressTextOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    textScale.value = withSpring(1, { stiffness: 320, damping: 14 });
  };
  const pressVoiceIn = () => {
    // eslint-disable-next-line react-hooks/immutability
    voiceScale.value = withSpring(0.97, { stiffness: 320, damping: 14 });
  };
  const pressVoiceOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    voiceScale.value = withSpring(1, { stiffness: 320, damping: 14 });
  };

  const handleChat = () => {
    hapticTap();
    if (onChat) onChat();
  };

  const handleVoice = () => {
    hapticTap();
    if (Platform.OS === 'web') unlockWebAudio();
    if (onVoice) onVoice();
  };

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <WaveDeco animate={!reduceMotion} color={`${heroInk}B3`} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconChip, { backgroundColor: `${heroInk}2E`, borderColor: `${heroInk}3D` }]}>
            <Ionicons name="sparkles" size={18} color={heroInk} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: heroInk }]}>Practice with SULTI</Text>
            <Text style={[styles.subtitle, { color: `${heroInk}CC` }]}>
              Choose your interaction mode to start learning.
            </Text>
          </View>
        </View>

        {/* One tap immediately enters chat or voice */}
        <View style={styles.actions}>
          <AnimatedPressable
            onPress={handleChat}
            onPressIn={pressTextIn}
            onPressOut={pressTextOut}
            style={[styles.chatPill, textZoneStyle, { backgroundColor: `${heroInk}2E`, borderColor: `${heroInk}52` }]}
            accessibilityRole="button"
            accessibilityLabel="Start text chat"
            accessibilityHint="Opens the chat with SULTI on this screen"
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={heroInk} />
            <Text style={[styles.chatPillText, { color: heroInk }]}>Start Text Chat</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleVoice}
            onPressIn={pressVoiceIn}
            onPressOut={pressVoiceOut}
            style={[styles.voicePill, voiceZoneStyle, { backgroundColor: heroInk }]}
            accessibilityRole="button"
            accessibilityLabel="Start voice call"
            accessibilityHint="Opens the full-screen voice lesson with SULTI"
          >
            <Ionicons name="mic" size={20} color={pillInk} />
            <Text style={[styles.voicePillText, { color: pillInk }]}>Start Voice Call</Text>
          </AnimatedPressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  gradient: {
    padding: spacing.md + 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.25,
    lineHeight: 23,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  chatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  chatPillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  voicePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: 16,
    ...Platform.select({
      default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
    }),
  },
  voicePillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  waveDeco: {
    position: 'absolute',
    right: spacing.md + 2,
    bottom: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    opacity: 0.5,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,

  },
});