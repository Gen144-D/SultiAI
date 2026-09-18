import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring,
  withSequence, Easing,
} from 'react-native-reanimated';
import { spacing, borderRadius, shadows, typography } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isNarrow = SCREEN_WIDTH < 380;
const isTablet = SCREEN_WIDTH > 768;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  }, []);

  const style = useAnimatedStyle(() => ({
    width: 3,
    height: height.value,
    borderRadius: 1.5,
    backgroundColor: color,
    opacity: 0.75,
  }));

  return <Animated.View style={[wfStyles.bar, style]} />;
}

function WaveformBars({ color = '#fff', count = 5 }) {
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + glow.value * 0.15,
    elevation: 6 + Math.round(glow.value * 8),
  }));

  const glowColor = variant === 'voice'
    ? '0 0 18px rgba(0,168,150,0.45)'
    : '0 0 18px rgba(0,168,150,0.45)';

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const onPressIn = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(0.96, { stiffness: 300, damping: 12 });
  };

  const onPressOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, { stiffness: 300, damping: 12 });
  };

  const isVoice = variant === 'voice';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.wrapper, glowStyle, style, { boxShadow: glowColor }]}
      accessibilityLabel={`${title} - ${subtitle}`}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.cardContent}>
            <View style={[styles.badge, { backgroundColor: badgeColor || 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>

            <View style={[styles.iconContainer, isVoice && styles.iconContainerVoice]}>
              <Ionicons name={icon} size={isNarrow ? 26 : 30} color="#fff" />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
            </View>

            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{isVoice ? 'Start Voice' : 'Start Chat'}</Text>
              <Ionicons name="arrow-forward" size={isNarrow ? 14 : 16} color="#fff" />
            </View>
          </View>

          {isVoice && (
            <View style={styles.waveformDecoration}>
              <WaveformBars color="rgba(255,255,255,0.45)" />
            </View>
          )}

          {!isVoice && (
            <View style={styles.chatDeco}>
              <Ionicons name="chatbubble-ellipses" size={64} color="rgba(255,255,255,0.07)" />
            </View>
          )}
        </LinearGradient>
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
    padding: isTablet ? spacing.xxl : spacing.xl,
    minHeight: isNarrow ? 200 : isTablet ? 240 : 220,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    zIndex: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { ...shadows.md },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  iconContainerVoice: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  textContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: '#fff',
    fontSize: isNarrow ? 17 : isTablet ? 22 : 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: isNarrow ? 22 : 25,
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
    lineHeight: 18,
    fontSize: isNarrow ? 11 : isTablet ? 14 : 13,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: isNarrow ? spacing.md : spacing.xl,
    paddingVertical: spacing.sm + 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...shadows.sm,
  },
  ctaText: {
    color: '#fff',
    fontSize: isNarrow ? 11 : isTablet ? 14 : 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  waveformDecoration: {
    position: 'absolute',
    bottom: isNarrow ? spacing.md : spacing.xl,
    right: isNarrow ? spacing.md : spacing.xl,
    opacity: 0.5,
  },
  chatDeco: {
    position: 'absolute',
    bottom: -10,
    right: -10,
  },
});
