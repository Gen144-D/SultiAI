import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import BottomSheet from '../../components/BottomSheet';
import { POST_TYPES, POST_TYPE_KEYS } from '../../constants/community';
import { spacing, borderRadius, shadows } from '../../theme';

const AI_HELPERS = [
  { key: 'improve', label: 'Improve my Bisaya', icon: 'sparkles', desc: 'Rewrites your text more naturally' },
  { key: 'translate', label: 'Translate to English', icon: 'language', desc: 'Adds an English translation' },
  { key: 'explain', label: 'Explain the grammar', icon: 'school', desc: 'Breaks down the structure' },
  { key: 'example', label: 'Example sentences', icon: 'chatbubbles', desc: 'Shows usage in context' },
];

export default function CreatePostSheet({ visible, onClose, onSubmit, initialType = 'question' }) {
  const { colors, isDark } = useTheme();
  const [type, setType] = useState('question');
  const [native, setNative] = useState('');
  const [english, setEnglish] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [aiActive, setAiActive] = useState(null);

  const reset = () => {
    setType(initialType);
    setNative('');
    setEnglish('');
    setTags([]);
    setTagInput('');
    setAiActive(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!native.trim() && !english.trim()) {
      Alert.alert('Empty post', 'Write something in Bisaya or English first.');
      return;
    }
    onSubmit({ type, native: native.trim(), english: english.trim(), tags });
    reset();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '');
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  };

  const selected = POST_TYPES[type];

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Create Post" height={520} bottomInset={96}>
      <Text style={[styles.label, { color: colors.text }]}>Post type</Text>
      <View style={styles.typeGrid}>
        {POST_TYPE_KEYS.map((key) => {
          const t = POST_TYPES[key];
          const active = type === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.typeChip, active && { borderColor: t.color, backgroundColor: t.color + '12' }]}
              onPress={() => setType(key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={t.icon} size={14} color={active ? t.color : colors.textSecondary} />
              <Text style={[styles.typeChipText, { color: active ? t.color : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        id="postNative"
        name="postNative"
        testID="postNative-input"
        style={[styles.input, styles.nativeInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : colors.surfaceSecondary }]}
        placeholder="Bisaya text (the main content)"
        placeholderTextColor={colors.textLight}
        value={native}
        onChangeText={setNative}
        multiline
        autoComplete="off"
      />
      <TextInput
        id="postEnglish"
        name="postEnglish"
        testID="postEnglish-input"
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : colors.surfaceSecondary }]}
        placeholder="English meaning or explanation (optional)"
        placeholderTextColor={colors.textLight}
        value={english}
        onChangeText={setEnglish}
        autoComplete="off"
      />

      <Text style={[styles.label, { color: colors.text }]}>AI assistance (optional)</Text>
      <View style={styles.aiRow}>
        {AI_HELPERS.map((h) => {
          const active = aiActive === h.key;
          return (
            <TouchableOpacity
              key={h.key}
              style={[styles.aiBtn, { borderColor: colors.primary }, active && { backgroundColor: colors.primary }]}
              onPress={() => setAiActive(active ? null : h.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={h.icon} size={15} color={active ? '#fff' : colors.primary} />
              <Text style={[styles.aiBtnText, { color: active ? '#fff' : colors.primary }]}>{h.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {aiActive && (
        <View style={[styles.aiHint, { backgroundColor: colors.primary + '0D' }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.aiHintText, { color: colors.primary }]}>
            {AI_HELPERS.find((h) => h.key === aiActive)?.desc} — will be applied when you post.
          </Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.text }]}>Tags</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          id="postTag"
          name="postTag"
          testID="postTag-input"
          style={[styles.input, styles.tagInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : colors.surfaceSecondary }]}
          placeholder="e.g. grammar"
          placeholderTextColor={colors.textLight}
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={addTag}
          returnKeyType="done"
          autoComplete="off"
        />
        <TouchableOpacity style={[styles.addTagBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={addTag} accessibilityRole="button" accessibilityLabel="Add tag">
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.submit, { backgroundColor: selected.color || colors.primary }]} onPress={handleSubmit} activeOpacity={0.85}>
        <Ionicons name={selected.icon} size={18} color="#fff" />
        <Text style={styles.submitText}>Post {selected.label}</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  typeChipText: { fontSize: 11, fontWeight: '700' },
  input: { borderWidth: 1.5, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, fontSize: 14 },
  nativeInput: { minHeight: 72, textAlignVertical: 'top' },
  aiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  aiBtnText: { fontSize: 12, fontWeight: '700' },
  aiHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  aiHintText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  tagInputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  tagInput: { flex: 1, marginBottom: 0 },
  addTagBtn: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  tagText: { fontSize: 11, fontWeight: '700' },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.lg, paddingVertical: 14, gap: spacing.sm, ...shadows.md },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});