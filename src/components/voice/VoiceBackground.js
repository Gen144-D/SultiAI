import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  withDelay, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoicePalette } from './palette';

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const BLOBS = [
  { size: 0.7, top: -0.2, left: -0.15, dur: 9000, rangeX: 0.16, rangeY: 0.1, delay: 0, opacity: 0.5, blur: 90 },
  { size: 0.5, top: 0.05, right: -0.1, dur: 11000, rangeX: 0.12, rangeY: 0.08, delay: 1.4, opacity: 0.42, blur: 80 },
  { size: 0.42, bottom: 0.12, left: 0.08, dur: 13000, rangeX: 0.14, rangeY: 0.09, delay: 2.8, opacity: 0.4, blur: 70 },
  { size: 0.3, bottom: -0.05, right: 0.05, dur: 10000, rangeX: 0.1, rangeY: 0.06, delay: 0.9, opacity: 0.36, blur: 60 },
];

const PARTICLE_COUNT = 26;

function FloatBlob({ cfg, width, height, voice }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: cfg.dur, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const t = (progress.value + cfg.delay * 0.0009) % 1;
    const phase = t * Math.PI * 2;
    const x = Math.sin(phase) * width * cfg.rangeX;
    const y = Math.cos(phase * 0.73) * height * cfg.rangeY;
    const s = 1 + 0.1 * Math.sin(phase * 0.5 + 1);

    const pos = {};
    if (cfg.top !== undefined) pos.top = cfg.top * height;
    if (cfg.bottom !== undefined) pos.bottom = cfg.bottom * height;
    if (cfg.left !== undefined) pos.left = cfg.left * width;
    if (cfg.right !== undefined) pos.right = cfg.right * width;

    return {
      width: cfg.size * width,
      height: cfg.size * width,
      borderRadius: (cfg.size * width) / 2,
      opacity: cfg.opacity * (0.75 + 0.25 * Math.sin(phase * 0.5)),
      ...pos,
      transform: [{ translateX: x }, { translateY: y }, { scale: s }],
    };
  });

  const colors = [
    cfg.tone === 'teal'
      ? `${voice.primary}29`
      : cfg.tone === 'blue'
        ? `${voice.secondary}1A`
        : `${voice.accent}1F`,
    `${voice.primary}08`,
    'transparent',
  ];

  return (
    <Animated.View pointerEvents="none" style={[styles.blob, style]}>
      <LinearGradient
        colors={colors}
        locations={[0, 0.6, 1]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function Particle({ data, width, height }) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withDelay(data.delay, withTiming(1, { duration: data.dur, easing: Easing.inOut(Easing.sin) })),
        withTiming(0, { duration: data.dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const p = anim.value;
    const rise = height * (0.12 + 0.1 * p);
    const drift = Math.sin(p * Math.PI * 2 + data.phase) * 26;
    const fade = 0.5 * (1 - p) * data.opacity;
    return {
      width: data.size, height: data.size,
      borderRadius: data.size / 2,
      backgroundColor: data.color,
      opacity: fade,
      position: 'absolute',
      left: data.x + drift,
      top: data.y - rise,
    };
  });

  return <Animated.View pointerEvents="none" style={style} />;
}

function BreathingGlow({ width, height, voice }) {
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
    opacity: 0.5 + (breath.value - 1) * 3,
    transform: [{ scale: breath.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.breathGlow, style, { width: width * 0.9, height: height * 0.9, borderRadius: height * 0.45 }]}>
      <LinearGradient
        colors={[`${voice.primary}24`, `${voice.accent}0A`, 'transparent']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function VoiceBackground({ children, style, parallax = 0 }) {
  const { width: W, height: H } = useWindowDimensions();
  const voice = useVoicePalette();

  const particles = useMemo(() => {
    const r = seededRandom(2026);
    const tones = [voice.primary, voice.secondary, voice.accent];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: r() * W,
      y: H * (0.2 + r() * 0.8),
      size: 1.5 + r() * 2.8,
      dur: 6000 + r() * 7000,
      delay: r() * 3000,
      opacity: 0.35 + r() * 0.4,
      color: tones[i % tones.length],
      phase: r() * Math.PI * 2,
    }));
  }, [W, H, voice]);

  const blobs = useMemo(() => BLOBS.map((b, i) => ({ ...b, tone: ['teal', 'blue', 'teal', 'mint'][i] })), []);

  return (
    <View style={[styles.root, { backgroundColor: voice.background }, style]}>
      <BreathingGlow width={W} height={H} voice={voice} />
      {blobs.map((cfg, i) => (
        <FloatBlob key={i} cfg={cfg} width={W} height={H} voice={voice} />
      ))}
      {particles.map((p, i) => (
        <Particle key={i} data={p} width={W} height={H} />
      ))}
      <LinearGradient
        colors={['transparent', `${voice.backgroundDeep}EB`]}
        style={[styles.bottomFade, { height: H * 0.32 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[`${voice.backgroundDeep}E0`, 'transparent']}
        style={[styles.topFade, { height: H * 0.18 }]}
        pointerEvents="none"
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute' },
  breathGlow: {
    position: 'absolute', top: '5%', left: '5%',
  },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { flex: 1, zIndex: 2 },
});
