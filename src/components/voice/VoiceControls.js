import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVoicePalette } from './palette';
import { ensureContrast } from '../../theme/moduleColors';

function GlassButton({ onPress, icon, label, active, color, disabled, size = 46, children, voice, styles }) {
  const activeStyle = active
    ? { backgroundColor: voice.primary + '29', borderColor: voice.primary + '66' }
    : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.glassBtn,
        { width: size, height: size, borderRadius: size / 2 },
        activeStyle,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
    >
      {children || (
        <Ionicons name={icon} size={20} color={active ? color || voice.primary : voice.text} />
      )}
    </TouchableOpacity>
  );
}

function HeroMic({ onPress, active, disabled, size = 76, voice, styles }) {
  // Recording is a semantic danger state, so it follows the theme's error ramp
  // rather than a fixed red. Its ink is measured because the error fill is a
  // saturated mid-tone where white clears 4.5:1 on some themes but not others.
  const recordGradient = [voice.danger, voice.dangerDark];
  const recordInk = ensureContrast('#FFFFFF', voice.danger, 4.5);
  const pulse = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringAlpha = useSharedValue(0);
  const idleBreathe = useSharedValue(1);

  useEffect(() => {
    if (active) {
      idleBreathe.value = withTiming(1, { duration: 150 });
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 480, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 480, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      ringScale.value = withRepeat(
        withSequence(withTiming(1.55, { duration: 1200 }), withTiming(1, { duration: 1200 })),
        -1,
        false
      );
      ringAlpha.value = withRepeat(
        withSequence(withTiming(0.45, { duration: 1200 }), withTiming(0, { duration: 1200 })),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
      ringScale.value = withTiming(1, { duration: 200 });
      ringAlpha.value = withTiming(0, { duration: 200 });
      idleBreathe.value = withRepeat(
        withSequence(
          withTiming(1.045, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }
  }, [active, idleBreathe, pulse, ringAlpha, ringScale]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: active ? pulse.value : idleBreathe.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringAlpha.value,
  }));

  return (
    <View style={styles.micZone}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.micRing,
          {
            width: size * 1.55,
            height: size * 1.55,
            borderRadius: size * 0.775,
            borderColor: active ? voice.danger : voice.primary,
          },
          ringStyle,
        ]}
      />
      <Animated.View style={btnStyle}>
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.85}
          style={[
            styles.heroMic,
            { width: size, height: size, borderRadius: size / 2 },
            active && styles.heroMicActive,
            disabled && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={active ? 'Stop recording' : 'Tap to speak'}
          accessibilityState={{ disabled: !!disabled, selected: !!active }}
        >
          <LinearGradient
            colors={active ? recordGradient : voice.orbCoreGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroMicGradient,
              { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 },
            ]}
          >
            <Ionicons
              name={active ? 'stop' : 'mic'}
              size={size / 2.6}
              color={active ? recordInk : voice.onGradientText}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      <Text style={[styles.micLabel, { color: active ? voice.danger : voice.textMuted }]}>
        {active ? 'Listening — tap to stop' : 'Tap to speak'}
      </Text>
    </View>
  );
}

export default function VoiceControls({
  onMic,
  onReplay,
  onToggleMute,
  onToggleSlow,
  onOpenSettings,
  onEnd,
  recording,
  muted,
  slowMode,
  canReplay,
  disabled,
}) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  const glassBlur = Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {};

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, glassBlur]}>
        <GlassButton
          onPress={onToggleMute}
          icon={muted ? 'volume-mute' : 'volume-medium'}
          label={muted ? 'Unmute AI voice' : 'Mute AI voice'}
          active={muted}
          disabled={disabled}
          voice={voice}
          styles={styles}
        />
        <GlassButton
          onPress={onReplay}
          icon="refresh"
          label="Replay last reply"
          disabled={disabled || !canReplay}
          voice={voice}
          styles={styles}
        />
        <GlassButton
          onPress={onToggleSlow}
          icon="speedometer-outline"
          label={slowMode ? 'Normal speed' : 'Slow & clear (Repeat after me)'}
          active={slowMode}
          color={voice.accent}
          disabled={disabled}
          voice={voice}
          styles={styles}
        />
        <GlassButton
          onPress={onOpenSettings}
          icon="settings-outline"
          label="Voice settings"
          disabled={disabled}
          voice={voice}
          styles={styles}
        />
        <GlassButton
          onPress={onEnd}
          icon="log-out-outline"
          label="End voice session"
          color={voice.danger}
          voice={voice}
          styles={styles}
        />
      </View>
      <HeroMic onPress={onMic} active={recording} disabled={disabled && !recording} voice={voice} styles={styles} />
    </View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%', paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: voice.glass,
    borderWidth: 1,
    borderColor: voice.glassBorder,
  },
  glassBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: voice.glass,
    borderWidth: 1,
    borderColor: voice.glassBorder,
  },
  disabled: { opacity: 0.35 },

  micZone: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  micRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'solid',
    opacity: 0,
  },
  heroMic: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    boxShadow: `0 6px 18px ${voice.primary}80`,
    elevation: 12,
  },
  heroMicActive: {
    borderColor: `${voice.danger}99`,
    boxShadow: `0 6px 18px ${voice.danger}80`,
  },
  heroMicGradient: { alignItems: 'center', justifyContent: 'center' },
  micLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginTop: 6 },
});
