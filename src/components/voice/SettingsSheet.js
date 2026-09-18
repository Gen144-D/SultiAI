import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { voice } from './palette';

function Row({ icon, title, subtitle, value, onValueChange, accessibilityLabel }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={voice.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(32,214,199,0.5)' }}
        thumbColor={value ? voice.primary : '#9AA6B2'}
        accessibilityLabel={accessibilityLabel || title}
      />
    </View>
  );
}

export default function SettingsSheet({
  visible, onClose, haptics, continuous, slowMode, onHaptics, onContinuous, onSlow,
  selectedCharacter, onCharacterChange, useMetaVoice, onMetaVoiceChange,
}) {
  const insets = useSafeAreaInsets();
  const CHARACTERS = [
    { id: 'blessica', name: 'Blessica', desc: 'Warm, friendly female' },
    { id: 'angel', name: 'Angel', desc: 'Clear, patient male' },
    { id: 'sultan', name: 'Sultan', desc: 'Authoritative male' },
    { id: 'lola', name: 'Lola', desc: 'Gentle, wise elder female' },
  ];

  if (!visible) return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Close settings" />
      <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>Voice Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close settings">
            <Ionicons name="close" size={20} color={voice.text} />
          </TouchableOpacity>
        </View>

        <Row
          icon="vibrate-outline"
          title="Haptic feedback"
          subtitle="Subtle vibration on mic & speech events"
          value={haptics}
          onValueChange={onHaptics}
        />
        <Row
          icon="infinite-outline"
          title="Continuous conversation"
          subtitle="Automatically listen again after SULTI speaks"
          value={continuous}
          onValueChange={onContinuous}
        />
        <Row
          icon="speedometer-outline"
          title="Slow & clear"
          subtitle="Repeat after me at a slower pace"
          value={slowMode}
          onValueChange={onSlow}
        />
        <Row
          icon="rocket-outline"
          title="Meta Voice AI"
          subtitle="Use SeamlessM4T v2 for better translation"
          value={useMetaVoice}
          onValueChange={onMetaVoiceChange}
        />

        <Text style={[styles.sectionLabel, { color: voice.textSecondary }]}>Voice Character</Text>
        {CHARACTERS.map((char) => (
          <TouchableOpacity
            key={char.id}
            style={[
              styles.charRow,
              selectedCharacter === char.id && { backgroundColor: 'rgba(32,214,199,0.15)' },
            ]}
            onPress={() => onCharacterChange && onCharacterChange(char.id)}
            accessibilityLabel={`Select ${char.name}`}
          >
            <View style={styles.charRadio}>
              {selectedCharacter === char.id && <View style={styles.charRadioInner} />}
            </View>
            <View style={styles.charInfo}>
              <Text style={[styles.charName, { color: voice.text }]}>{char.name}</Text>
              <Text style={[styles.charDesc, { color: voice.textMuted }]}>{char.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.footnote}>Made for learners — every reply is also read aloud word by word.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 12, 0.7)' },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#0B1B2C',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: voice.glassBorder,
    paddingHorizontal: 20, paddingTop: 10,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(30px)' } : {}),
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: voice.text, fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: voice.glass },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,214,199,0.12)', marginRight: 12 },
  rowText: { flex: 1, paddingRight: 8 },
  rowTitle: { color: voice.text, fontSize: 15, fontWeight: '600' },
  rowSubtitle: { color: voice.textMuted, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: voice.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  charRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 4,
  },
  charRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  charRadioInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: voice.primary,
  },
  charInfo: { flex: 1 },
  charName: { fontSize: 14, fontWeight: '600' },
  charDesc: { fontSize: 12, marginTop: 2 },
  footnote: { color: voice.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
