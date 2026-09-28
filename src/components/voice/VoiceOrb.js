import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoicePalette } from './palette';

const WAVE_BAR_COUNT = 46;
const PARTICLE_COUNT = 10;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(1337);

const waveBarData = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => ({
  angle: (i / WAVE_BAR_COUNT) * Math.PI * 2,
  phase: rand() * Math.PI * 2,
  width: 2.4 + rand() * 1.2,
}));

const orbitParticles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  angle: (i / PARTICLE_COUNT) * Math.PI * 2,
  radius: 0.32 + rand() * 0.14,
  size: 2.5 + rand() * 2.5,
  dur: 6000 + rand() * 4000,
  delay: rand() * 2500,
  opacity: 0.5 + rand() * 0.4,
}));

const STATUS_LABEL = {
  idle: 'Ready to help',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

function CircularWaveform({ size, amplitude, active, color, styles }) {
  const wavePhase = useSharedValue(0);
  const halfSize = size / 2;
  const maxH = size * 0.16;
  const ringRadius = halfSize + size * 0.07;

  useEffect(() => {
    if (active) {
      wavePhase.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
    } else {
      wavePhase.value = withTiming(0, { duration: 500 });
    }
    return () => cancelAnimation(wavePhase);
  }, [active]);

  const fade = useAnimatedStyle(() => ({
    opacity: active ? 0.5 + 0.5 * amplitude.value : 0,
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.waveWrapper, fade]}>
      {waveBarData.map((bar, i) => (
        <WaveBar key={i} bar={bar} amplitude={amplitude} wavePhase={wavePhase} maxH={maxH} ringRadius={ringRadius} halfSize={halfSize} color={color} styles={styles} />
      ))}
    </Animated.View>
  );
}

const WaveBar = React.memo(function WaveBar({ bar, amplitude, wavePhase, maxH, ringRadius, halfSize, color, styles }) {
  const bodyStyle = useAnimatedStyle(() => {
    const wave = (Math.sin(bar.phase + wavePhase.value * Math.PI * 2) + 1) / 2;
    const h = 3 + wave * maxH * amplitude.value;
    return { height: h };
  });

  return (
    <View
      style={[
        styles.waveBarAnchor,
        {
          left: halfSize - 1.5,
          top: halfSize - maxH / 2,
          width: bar.width,
          height: maxH,
        },
        { transform: [{ rotate: `${bar.angle}rad` }, { translateY: -ringRadius }] },
      ]}
    >
      <Animated.View style={[styles.waveBarBody, { width: bar.width, backgroundColor: color, borderRadius: bar.width / 2 }, bodyStyle]} />
    </View>
  );
});

function OrbitingParticles({ halfSize, active, styles }) {
  const orbit = useSharedValue(0);

  useEffect(() => {
    if (active) {
      orbit.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false);
    } else {
      orbit.value = withTiming(0, { duration: 400 });
    }
    return () => cancelAnimation(orbit);
  }, [active]);

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {orbitParticles.map((p, i) => (
        <OrbitParticle key={i} data={p} orbit={orbit} halfSize={halfSize} active={active} styles={styles} />
      ))}
    </Animated.View>
  );
}

const OrbitParticle = React.memo(function OrbitParticle({ data, orbit, halfSize, active, styles }) {
  const style = useAnimatedStyle(() => {
    const a = data.angle + orbit.value * Math.PI * 2;
    const r = halfSize * data.radius;
    const pulse = active ? 0.7 + 0.3 * Math.sin(orbit.value * Math.PI * 2 + data.delay) : 0;
    return {
      left: halfSize + Math.cos(a) * r - data.size / 2,
      top: halfSize + Math.sin(a) * r - data.size / 2,
      opacity: pulse,
      transform: [{ scale: 0.6 + 0.4 * pulse }],
    };
  });
  return <Animated.View style={[styles.orbitParticle, { width: data.size, height: data.size, borderRadius: data.size / 2 }, style]} />;
});

function EnergyRing({ halfSize, active, color, styles }) {
  const rot = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (active) {
      rot.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
      fade.value = withTiming(1, { duration: 500 });
    } else {
      rot.value = withTiming(0, { duration: 400 });
      fade.value = withTiming(0, { duration: 400 });
    }
    return () => {
      cancelAnimation(rot);
      cancelAnimation(fade);
    };
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value * 0.5,
    transform: [
      { rotate: `${rot.value * 360}deg` },
      { scale: 1 + 0.03 * Math.sin(rot.value * Math.PI * 2) },
    ],
  }));

  const width = halfSize * 2 * 0.92;

  return (
    <Animated.View pointerEvents="none" style={[styles.energyRing, { width, height: width, borderRadius: width / 2, borderColor: color }, style]} />
  );
}

function Shimmer({ halfSize, active, styles }) {
  const sweep = useSharedValue(-0.6);

  useEffect(() => {
    if (active) {
      sweep.value = withRepeat(withTiming(1.6, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, false);
    } else {
      sweep.value = withTiming(-0.6, { duration: 400 });
    }
    return () => cancelAnimation(sweep);
  }, [active]);

  const style = useAnimatedStyle(() => {
    const translateX = (sweep.value - 0.5) * halfSize * 4;
    return {
      transform: [{ translateX }, { rotate: '-18deg' }],
      opacity: active ? 0.35 : 0,
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.shimmerWrap, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ width: halfSize, height: halfSize * 1.2 }}
      />
    </Animated.View>
  );
}

export default React.memo(function VoiceOrb({ state = 'idle', size = 240, amplitude, onPress }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  const pulse = useSharedValue(0.96);
  const glow = useSharedValue(0.5);
  const floatY = useSharedValue(0);
  const ringScale = useSharedValue(0.86);
  const ringAlpha = useSharedValue(0);
  const ripplePhase = useSharedValue(0);
  const breathe = useSharedValue(1);
  const listeningDot = useSharedValue(0);

  const halfSize = size / 2;
  const activeStates = useMemo(() => ['listening', 'thinking', 'speaking'], []);
  const isWaveActive = state === 'listening' || state === 'speaking';
  const isThinking = state === 'thinking';
  const color = voice.primary;

  useEffect(() => {
    cancelAnimation(pulse);
    cancelAnimation(glow);
    cancelAnimation(ringScale);
    cancelAnimation(ringAlpha);
    cancelAnimation(ripplePhase);
    cancelAnimation(floatY);
    cancelAnimation(breathe);
    cancelAnimation(listeningDot);

    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false
    );

    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false
    );

    switch (state) {
      case 'listening':
        pulse.value = withRepeat(withTiming(1.05, { duration: 420, easing: Easing.inOut(Easing.sin) }), -1, true);
        glow.value = withRepeat(withTiming(0.95, { duration: 420, easing: Easing.inOut(Easing.sin) }), -1, true);
        ringScale.value = withRepeat(withSequence(withTiming(1.18, { duration: 750 }), withTiming(0.94, { duration: 750 })), -1, false);
        ringAlpha.value = withRepeat(withSequence(withTiming(0.5, { duration: 750 }), withTiming(0.08, { duration: 750 })), -1, false);
        ripplePhase.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false);
        listeningDot.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.35, { duration: 450 })), -1, false);
        break;
      case 'speaking':
        pulse.value = withRepeat(withTiming(1.04, { duration: 300, easing: Easing.inOut(Easing.sin) }), -1, true);
        glow.value = withRepeat(withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) }), -1, true);
        ringScale.value = withRepeat(withSequence(withTiming(1.32, { duration: 260 }), withTiming(1.06, { duration: 460 })), -1, false);
        ringAlpha.value = withRepeat(withSequence(withTiming(0.6, { duration: 260 }), withTiming(0.12, { duration: 460 })), -1, false);
        ripplePhase.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1, false);
        listeningDot.value = withTiming(0, { duration: 150 });
        break;
      case 'thinking':
        pulse.value = withRepeat(withTiming(0.985, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
        glow.value = withRepeat(withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
        ringScale.value = withRepeat(withTiming(0.94, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
        ringAlpha.value = withRepeat(withTiming(0.14, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
        ripplePhase.value = withTiming(0, { duration: 200 });
        listeningDot.value = withTiming(0, { duration: 150 });
        break;
      default:
        pulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
        glow.value = withRepeat(withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
        ringScale.value = withRepeat(withTiming(0.9, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
        ringAlpha.value = withRepeat(withTiming(0.1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
        ripplePhase.value = withTiming(0, { duration: 400 });
        listeningDot.value = withTiming(0, { duration: 200 });
        break;
    }

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(glow);
      cancelAnimation(ringScale);
      cancelAnimation(ringAlpha);
      cancelAnimation(ripplePhase);
      cancelAnimation(floatY);
      cancelAnimation(breathe);
      cancelAnimation(listeningDot);
    };
  }, [state]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulse.value * (1 + 0.035 * (amplitude ? amplitude.value : 0)) * breathe.value },
      { translateY: floatY.value * 0.4 },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    width: size * 1.7, height: size * 1.7, borderRadius: size * 0.85,
    opacity: glow.value * 0.5,
    transform: [{ translateY: floatY.value * 0.3 }],
  }));

  const rippleStyle = useAnimatedStyle(() => {
    const t = ripplePhase.value;
    const scale = 1 + 0.45 * t;
    const opacity = 0.35 * (1 - t);
    return {
      width: size * scale, height: size * scale, borderRadius: (size * scale) / 2,
      opacity,
      transform: [{ translateY: floatY.value * 0.35 }],
    };
  });

  const ringStyle = useAnimatedStyle(() => ({
    width: size * ringScale.value, height: size * ringScale.value,
    borderRadius: (size * ringScale.value) / 2,
    opacity: ringAlpha.value,
    transform: [{ translateY: floatY.value * 0.35 }],
  }));

  const listeningDotStyle = useAnimatedStyle(() => ({
    opacity: listeningDot.value,
    transform: [{ scale: 0.8 + listeningDot.value * 0.2 }],
  }));

  const a11y = Platform.OS === 'web'
    ? { accessibilityLabel: `Voice orb, ${STATUS_LABEL[state]}. Tap to toggle recording.`, accessibilityRole: 'button' }
    : {};

  return (
    <View
      style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.touchable, { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8 }]}
        accessibilityLabel={`Voice orb, ${STATUS_LABEL[state]}. Tap to toggle recording.`}
        accessibilityRole="button"
        accessibilityState={{ busy: state === 'thinking' }}
        {...a11y}
      >
        <Animated.View pointerEvents="none" style={[styles.centered, { width: size, height: size }, rippleStyle]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color, opacity: 0.5 }]} />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[glowStyle, styles.glowBase]}>
          <LinearGradient
            colors={[color + '80', color + '1F', 'transparent']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.centered, { width: size, height: size }, ringStyle]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 1.5, borderColor: voice.accent + '8C' }]} />
        </Animated.View>

        <CircularWaveform size={size} amplitude={amplitude} active={isWaveActive} color={color} styles={styles} />

        {isThinking && <EnergyRing halfSize={halfSize} active={isThinking} color={color} styles={styles} />}
        <OrbitingParticles halfSize={halfSize} active={isThinking} styles={styles} />

        <Animated.View pointerEvents="none" style={[styles.centered, { width: size, height: size }, orbStyle]}>
          <LinearGradient
            colors={voice.orbCoreGradient}
            start={{ x: 0.2, y: 0 }} end={{ x: 0.85, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: halfSize }]}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shine]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.05)', 'transparent']}
              locations={[0, 0.45, 1]}
              style={[StyleSheet.absoluteFill, { borderRadius: halfSize }]}
            />
          </View>
          <Shimmer halfSize={halfSize} active={isThinking} styles={styles} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: halfSize, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' }]} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: halfSize, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.16)', 'transparent']}
              style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '40%', borderRadius: halfSize }}
            />
          </View>
        </Animated.View>

        {state === 'listening' && (
          <Animated.View pointerEvents="none" style={[listeningDotStyle, styles.listeningDot, { borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.18)' }]} />
        )}
      </TouchableOpacity>
    </View>
  );
});

const createStyles = (voice) => StyleSheet.create({
  touchable: { alignItems: 'center', justifyContent: 'center' },
  glowBase: { position: 'absolute', overflow: 'hidden' },
  centered: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  waveWrapper: { alignItems: 'center', justifyContent: 'center' },
  waveBarAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBarBody: { height: '100%' },
  energyRing: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed' },
  orbitParticle: { position: 'absolute', backgroundColor: voice.secondary },
  shimmerWrap: { position: 'absolute', top: '12%', left: '-60%' },
  shine: { zIndex: 2 },
  listeningDot: {
    position: 'absolute',
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2,
  },
});
