import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { useAtmosphere } from '../theme/atmosphere';

const BLOBS = [
  { size: 0.7, top: -0.2, left: -0.15, colorKey: 'aurora1', dur: 9000, rangeX: 0.16, rangeY: 0.1, delay: 0, opacity: 0.5, tone: 'primary' },
  { size: 0.5, top: 0.05, right: -0.1, colorKey: 'aurora2', dur: 11000, rangeX: 0.12, rangeY: 0.08, delay: 1.4, opacity: 0.42, tone: 'secondary' },
  { size: 0.42, bottom: 0.12, left: 0.08, colorKey: 'aurora3', dur: 13000, rangeX: 0.14, rangeY: 0.09, delay: 2.8, opacity: 0.4, tone: 'primary' },
  { size: 0.3, bottom: -0.05, right: 0.05, colorKey: 'aurora4', dur: 10000, rangeX: 0.1, rangeY: 0.06, delay: 0.9, opacity: 0.36, tone: 'accent' },
];

const PARTICLE_COUNT = 15;

function toneColor(tone, colors) {
  if (tone === 'secondary') return colors.secondary;
  if (tone === 'accent') return colors.accent;
  return colors.primary;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Particle({ particle, width, height }) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withTiming(1, { duration: particle.dur, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const yOff = -height * 0.15 * anim.value;
    const fade = (0.4 + 0.3 * Math.sin(anim.value * Math.PI)) * particle.opacity;
    const xOff = Math.sin(anim.value * Math.PI * 2) * 20;
    return {
      width: particle.size, height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      opacity: fade,
      position: 'absolute',
      left: particle.x + xOff,
      top: particle.y + yOff,
    };
  });

  return <Animated.View style={style} />;
}

export default function AuroraBackground({ children, style, atmosphere }) {
  const { colors, isDark } = useTheme();
  const amb = useAtmosphere(atmosphere);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const particles = useMemo(() => {
    const r = seededRandom(99);
    const colorKeys = ['aurora1', 'aurora2', 'aurora3'];
    const count = Math.max(0, Math.round(PARTICLE_COUNT * amb.particleScale));
    return Array.from({ length: count }, (_, i) => ({
      x: r() * SCREEN_WIDTH,
      y: r() * SCREEN_HEIGHT,
      size: 1.5 + r() * 2.5,
      dur: 4000 + r() * 4000,
      opacity: 0.3 + r() * 0.4,
      color: colors[colorKeys[i % 3]] || colors.primary + '60',
    }));
  }, [SCREEN_WIDTH, SCREEN_HEIGHT, amb.particleScale, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <BreathingGlow width={SCREEN_WIDTH} height={SCREEN_HEIGHT} isDark={isDark} glowScale={amb.glowScale} colors={colors} />
      {BLOBS.map((cfg, i) => (
        <AuroraBlob key={i} cfg={cfg} colors={colors} screenWidth={SCREEN_WIDTH} screenHeight={SCREEN_HEIGHT} blobScale={amb.blobScale} />
      ))}
      {particles.map((p, i) => (
        <Particle key={i} particle={p} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
      ))}
      {amb.blur && Platform.OS !== 'web' && (
        <BlurView intensity={80} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} tint={isDark ? 'dark' : 'light'} />
      )}
      <LinearGradient
        colors={isDark
          ? ['transparent', `${colors.background}F2`]
          : ['transparent', colors.background]}
        style={[styles.fadeBottom, { height: SCREEN_HEIGHT * 0.3, pointerEvents: 'none' }]}
      />
      <LinearGradient
        colors={isDark
          ? [`${colors.background}E0`, 'transparent']
          : [colors.background, 'transparent']}
        style={[styles.fadeTop, { height: SCREEN_HEIGHT * 0.16, pointerEvents: 'none' }]}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

function AuroraBlob({ cfg, colors, screenWidth, screenHeight, blobScale }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: cfg.dur, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, []);

  const size = cfg.size * blobScale;

  const style = useAnimatedStyle(() => {
    const t = (progress.value + cfg.delay * 0.1) % 1;
    const phase = t * Math.PI * 2;
    const x = Math.sin(phase) * screenWidth * cfg.rangeX;
    const y = Math.cos(phase * 0.7) * screenHeight * cfg.rangeY;
    const s = 1 + 0.08 * Math.sin(phase * 0.5);

    const posStyle = {};
    if (cfg.top !== undefined) posStyle.top = cfg.top * screenHeight;
    if (cfg.bottom !== undefined) posStyle.bottom = cfg.bottom * screenHeight;
    if (cfg.left !== undefined) posStyle.left = cfg.left * screenWidth;
    if (cfg.right !== undefined) posStyle.right = cfg.right * screenWidth;

    return {
      width: size * screenWidth,
      height: size * screenWidth,
      borderRadius: (size * screenWidth) / 2,
      opacity: cfg.opacity * (0.75 + 0.25 * Math.sin(phase * 0.5)),
      ...posStyle,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: s },
      ],
    };
  });

  const tone = toneColor(cfg.tone, colors);
  const gradient = [`${tone}29`, `${tone}08`, 'transparent'];

  return (
    <Animated.View style={[styles.blob, style]}>
      <LinearGradient
        colors={gradient}
        locations={[0, 0.6, 1]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

function BreathingGlow({ width, height, isDark, glowScale, colors }) {
  const breath = useSharedValue(1);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: (0.5 + (breath.value - 1) * 3) * glowScale,
    transform: [{ scale: breath.value }],
  }));

  const base = isDark ? colors.primary : colors.accent;
  const colorsSlice = [`${base}24`, `${base}0A`, 'transparent'];

  return (
    <Animated.View pointerEvents="none" style={[styles.breathGlow, style, { width: width * 0.9, height: height * 0.9, borderRadius: height * 0.45 }]}>
      <LinearGradient
        colors={colorsSlice}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', overflow: 'visible' },
  blob: { position: 'absolute' },
  breathGlow: { position: 'absolute', top: '5%', left: '5%' },
  fadeBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { flex: 1, zIndex: 2, minHeight: 0 },
});
