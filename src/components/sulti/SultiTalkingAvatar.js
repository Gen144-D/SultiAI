import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { SULTI_IMAGES, SULTI_SPEAKING_FRAMES } from '../../constants/avatars';

const SPEAKING_FRAME_DURATION = 180;
const LISTENING_PULSE_DURATION = 1200;

export default React.memo(function SultiTalkingAvatar({ size = 200, mood = 'idle' }) {
  const [speakingFrame, setSpeakingFrame] = useState(0);
  const floatAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);
  const pulseAnim = useSharedValue(1);
  const speakingTimerRef = useRef(null);
  const prevMoodRef = useRef(mood);

  useEffect(() => {
    cancelAnimation(floatAnim);
    cancelAnimation(opacityAnim);
    cancelAnimation(scaleAnim);
    cancelAnimation(pulseAnim);

    floatAnim.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );

    if (mood === 'listening') {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: LISTENING_PULSE_DURATION / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: LISTENING_PULSE_DURATION / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true
      );
    }

    if (prevMoodRef.current !== mood) {
      scaleAnim.value = withTiming(0.95, { duration: 100 }, () => {
        scaleAnim.value = withTiming(1, { duration: 200 });
      });
      opacityAnim.value = withTiming(0.7, { duration: 100 }, () => {
        opacityAnim.value = withTiming(1, { duration: 200 });
      });
    }
    prevMoodRef.current = mood;

    return () => {
      cancelAnimation(floatAnim);
      cancelAnimation(opacityAnim);
      cancelAnimation(scaleAnim);
      cancelAnimation(pulseAnim);
    };
  }, [mood]);

  useEffect(() => {
    if (speakingTimerRef.current) {
      clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }

    if (mood === 'speaking') {
      setSpeakingFrame(0);
      let frame = 0;
      speakingTimerRef.current = setInterval(() => {
        frame = (frame + 1) % SULTI_SPEAKING_FRAMES.length;
        setSpeakingFrame(frame);
      }, SPEAKING_FRAME_DURATION);
    } else {
      setSpeakingFrame(0);
    }

    return () => {
      if (speakingTimerRef.current) {
        clearInterval(speakingTimerRef.current);
        speakingTimerRef.current = null;
      }
    };
  }, [mood]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(floatAnim.value * Math.PI * 2) * (mood === 'listening' ? 3 : 6) },
      { scale: scaleAnim.value },
      { scale: pulseAnim.value },
    ],
    opacity: opacityAnim.value,
  }));

  const getSource = () => {
    if (mood === 'speaking') return SULTI_SPEAKING_FRAMES[speakingFrame];
    return SULTI_IMAGES[mood] || SULTI_IMAGES.idle;
  };

  return (
    <Animated.View
      style={[styles.container, { width: size, height: size }, containerStyle]}
      accessibilityLabel={`Sulti avatar, ${mood}`}
      accessibilityRole="image"
    >
      <Image
        source={getSource()}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    borderRadius: 999,
  },
});
