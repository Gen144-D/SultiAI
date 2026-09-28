import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useVoicePalette } from './palette';
import WordReveal from '../WordReveal';
import { findVocabInText } from '../../utils/bisayaWords';
import { PronunciationCard, RepeatCard, VocabCards } from './LearningCards';
import { SULTI_IMAGES } from '../../constants/avatars';
import UserAvatar from '../profile/UserAvatar';

const staticStyles = StyleSheet.create({
  avatarWrap: { marginBottom: 2 },
  sultiAvatar: { width: 28, height: 28, borderRadius: 14 },
});

function SultiAvatar() {
  return (
    <View style={staticStyles.avatarWrap}>
      <Image source={SULTI_IMAGES.idle} style={staticStyles.sultiAvatar} />
    </View>
  );
}

export function UserMessage({ text, pronunciation, speaking, userAvatarId }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  const speed = useMemo(() => {
    if (!text) return 40;
    return Math.max(18, Math.min(60, Math.round(360 / (text.split(/\s+/).length || 1))));
  }, [text]);

  return (
    <Animated.View entering={FadeInUp.duration(350)} style={styles.userBlock}>
      <View style={styles.userRow}>
        <View style={[styles.userBubble]}>
          <Text style={styles.userLabel}>You</Text>
          <Text style={styles.userText}>{text}</Text>
        </View>
        <UserAvatar avatarId={userAvatarId} size={28} style={styles.userAvatar} />
      </View>
      {pronunciation ? (
        <View style={styles.cardAlign}>
          <PronunciationCard
            score={pronunciation.score}
            feedback={pronunciation.feedback}
            phonemes={pronunciation.phoneme_breakdown || []}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

export function SultiMessage({ text, speaking, onSpeak, showRepeat = true, emphasis = false }) {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  const speed = useMemo(() => {
    if (!text) return 45;
    const words = text.split(/\s+/).length;
    return Math.max(20, Math.min(80, Math.round(500 / words)));
  }, [text]);
  const vocab = useMemo(() => findVocabInText(text), [text]);

  return (
    <Animated.View entering={FadeInUp.duration(350)} style={styles.sultiBlock}>
      <View style={styles.sultiRow}>
        <SultiAvatar />
        <View style={styles.sultiBubble}>
          <View style={styles.sultiHeader}>
            <Text style={styles.sultiLabel}>SULTI</Text>
            {speaking && (
              <View style={styles.typingDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            )}
          </View>
          <WordReveal
            text={text}
            speed={speed}
            showCursor={speaking}
            style={emphasis ? styles.sultiTextEmphasis : styles.sultiText}
          />
        </View>
      </View>
      <View style={styles.cardAlign}>
        {showRepeat && <RepeatCard text={text} onSpeak={onSpeak} />}
        <VocabCards entries={vocab} />
      </View>
    </Animated.View>
  );
}

export function TypingIndicator() {
  const voice = useVoicePalette();
  const styles = useMemo(() => createStyles(voice), [voice]);
  return (
    <Animated.View entering={FadeInUp.duration(250)} style={styles.sultiRow}>
      <SultiAvatar />
      <View style={styles.sultiBubble}>
        <View style={styles.typingDots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </Animated.View>
  );
}

const createStyles = (voice) => StyleSheet.create({
  userBlock: { alignItems: 'flex-end' },
  userRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingLeft: 40 },
  userAvatar: { marginBottom: 2 },
  userBubble: {
    backgroundColor: voice.primary + '29',
    borderWidth: 1,
    borderColor: voice.primary + '59',
    borderRadius: 20,
    borderTopRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  userLabel: {
    color: voice.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  userText: { color: voice.text, fontSize: 15, lineHeight: 21 },
  sultiBlock: { alignItems: 'flex-start' },
  sultiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingRight: 40 },
  sultiBubble: {
    backgroundColor: voice.surface,
    borderWidth: 1,
    borderColor: voice.glassBorder,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flex: 1,
  },
  sultiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sultiLabel: { color: voice.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  sultiText: { fontSize: 15, lineHeight: 22, color: voice.text },
  sultiTextEmphasis: { fontSize: 17, lineHeight: 25, color: voice.text, fontWeight: '600' },
  typingDots: { flexDirection: 'row', gap: 3, alignItems: 'center', paddingVertical: 2 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: voice.primary,
  },
  cardAlign: { paddingLeft: 36, alignItems: 'stretch' },
});
