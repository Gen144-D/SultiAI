import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring,
  withSequence, Easing,
} from 'react-native-reanimated';
import { spacing, borderRadius, shadows, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { readableOnGradient } from '../../theme/moduleColors';
import { unlockWebAudio } from '../../utils/tts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isNarrow = SCREEN_WIDTH < 380;
const isTablet = SCREEN_WIDTH > 768;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// The card glow animates its opacity, so it needs a real alpha channel rather
// than a pre-baked rgba string.
const withAlpha = (hex, alpha) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const wfStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  bar: { borderRadius: 1.5 },
});

function WaveformBar({ index, color }) {
  const height = useSharedValue(6);

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(4 + Math.random() * 14, { duration: 200 + index * 60, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 200 + index * 60, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const style = useAnimatedStyle(() => ({
    width: 3,
    height: height.value,
    borderRadius: 1.5,
    backgroundColor: color,
    opacity: 0.75,
  }));

  return <Animated.View style={[wfStyles.bar, style]} />;
}

function WaveformBars({ color, count = 5 }) {
  return (
    <View style={wfStyles.container}>
      {Array.from({ length: count }, (_, i) => (
        <WaveformBar key={i} index={i} color={color} />
      ))}
    </View>
  );
}

export default function SultiModeCard({
  title,
  subtitle,
  icon,
  gradient,
  badge,
  badgeColor,
  onPress,
  variant = 'chat',
  style,
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const { colors, onPrimary } = useTheme();

  const isVoice = variant === 'voice';

  // Chat = the theme's primary, voice = the theme's highlight pair, so the two
  // modes stay distinguishable by hue rather than by a fixed teal that belongs
  // to no theme. The glyphs sit on a saturated fill, so their ink is measured.
  const [c0] =
    gradient && gradient.length >= 2 ? gradient : isVoice ? [colors.primaryHover, colors.primaryDark] : [colors.primary, colors.primaryDark];
  const cardColors = isVoice ? [c0, colors.accent] : [c0, c0];
  const cardInk = readableOnGradient(cardColors);
  const cardGlow = withAlpha(cardColors[0], 0.45);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + glow.value * 0.15,
    elevation: 6 + Math.round(glow.value * 8),
  }));

  const glowColor = `0 0 18px ${withAlpha(cardColors[0], 0.35 + glow.value * 0.1)}`;

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow]);

  const onPressIn = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(0.97, { stiffness: 300, damping: 12 });
  };

  const onPressOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, { stiffness: 300, damping: 12 });
  };

  const handlePress = () => {
    // Unlock the shared web AudioContext from within this gesture so voice
    // mode audio is not blocked by autoplay policies.
    if (Platform.OS === 'web') {
      unlockWebAudio();
    }
    if (onPress) onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.wrapper, glowStyle, style, { boxShadow: glowColor }]}
      accessibilityLabel={`${title} - ${subtitle}`}
      accessibilityRole="button"
      accessibilityHint="Opens this practice mode"
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <LinearGradient
          colors={cardColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Top row: icon (left) + badge & chevron (right). Chevron signals
              the whole card is one tap target, not just the old white pill. */}
          <View style={styles.topRow}>
            <View style={[styles.iconContainer, isVoice && styles.iconContainerVoice]}>
              <Ionicons
                name={icon}
                size={isNarrow ? 20 : isTablet ? 24 : 22}
                color={cardInk}
              />
            </View>

            <View style={styles.topRight}>
              {badge ? (
                <View style={[styles.badge, { backgroundColor: badgeColor || withAlpha(cardInk, 0.22) }]}>
                  <Text style={[styles.badgeText, { color: cardInk }]}>{badge}</Text>
                </View>
              ) : null}
              <View
            style={[
              styles.chevronCircle,
              isVoice && styles.chevronCircleVoice,
              { backgroundColor: withAlpha(cardInk, 0.22) },
            ]}
          >
                <Ionicons name="chevron-forward" size={16} color={cardInk} />
              </View>
            </View>
          </View>

          <Text style={[styles.title, { color: cardInk }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: withAlpha(cardInk, 0.85) }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </LinearGradient>

        {/* Decorative background motifs */}
        {isVoice ? (
          <View style={styles.waveformDecoration} pointerEvents="none">
            <WaveformBars color={cardInk} count={7} />
          </View>
        ) : (
          <View style={styles.chatDeco} pointerEvents="none">
            <Ionicons name="chatbubble-ellipses" size={72} color={withAlpha(cardInk, 0.08)} />
          </View>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  gradient: {
    padding: spacing.md,
    minHeight: isNarrow ? 130 : isTablet ? 160 : 150,
    paddingTop: spacing.md + 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { ...shadows.sm },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  iconContainerVoice: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronCircleVoice: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  title: {
    fontSize: isNarrow ? 15 : isTablet ? 19 : 17,
    fontWeight: '800',
    letterSpacing: -0.25,
    lineHeight: isNarrow ? 20 : isTablet ? 24 : 22,
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
    lineHeight: 17,
    fontSize: isNarrow ? 11 : isTablet ? 13 : 12,
  },
  // The whole card is the button; chevron (top-right) hints at that. A small
  // caption sits in the corner opposite the icon as an explicit affordance.
  waveformDecoration: {
    position: 'absolute',
    right: spacing.md + 2,
    bottom: spacing.md - 2,
    opacity: 0.55,
  },
  chatDeco: {
    position: 'absolute',
    right: -6,
    bottom: -14,
    opacity: 0.8,
  },
});