import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useGame } from '../context/GameContext';
import { api } from '../services/api';
import GlassCard from './GlassCard';
import Input from './Input';
import Button from './Button';
import { spacing, borderRadius, typography } from '../theme';

const LANGUAGES = ['English', 'Tagalog', 'Bisaya', 'Other'];
const GOALS = [10, 30, 50, 100];

function Chip({ label, selected, onPress, selectedColor, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? selectedColor : colors.surfaceSecondary,
          borderColor: selected ? selectedColor : colors.border,
        },
      ]}
    >
      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      <Text
        style={[
          styles.chipText,
          { color: selected ? '#fff' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function OnboardingForm({ onComplete, onSkip, initialName = '' }) {
  const { colors } = useTheme();
  const { refreshProfile } = useUser();
  const { setDailyGoal } = useGame();

  const [name, setName] = useState(initialName);
  const [nativeLang, setNativeLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Bisaya');
  const [goal, setGoal] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateProfile({
        name: name.trim(),
        native_language: nativeLang,
        target_language: targetLang,
      });
      setDailyGoal(goal);
      await refreshProfile();
      onComplete?.();
    } catch {
      setError('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard variant="elevated" style={styles.card} padding="lg">
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="rocket" size={22} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to SultiAI!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Set up your learning profile.
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Input
          label="Your name"
          icon="person-outline"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Maria"
          autoCapitalize="words"
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          I speak
        </Text>
        <View style={styles.chipRow}>
          {LANGUAGES.map((lang) => (
            <Chip
              key={lang}
              label={lang}
              selected={nativeLang === lang}
              onPress={() => setNativeLang(lang)}
              selectedColor={colors.primary}
              colors={colors}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          I want to learn
        </Text>
        <View style={styles.chipRow}>
          {LANGUAGES.map((lang) => (
            <Chip
              key={lang}
              label={lang}
              selected={targetLang === lang}
              onPress={() => setTargetLang(lang)}
              selectedColor={colors.accent}
              colors={colors}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          Daily goal (XP)
        </Text>
        <View style={styles.chipRow}>
          {GOALS.map((g) => (
            <Chip
              key={g}
              label={`${g}`}
              selected={goal === g}
              onPress={() => setGoal(g)}
              selectedColor={colors.secondary}
              colors={colors}
            />
          ))}
        </View>

        {error && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}

        <View style={styles.actions}>
          <Button
            title="Get Started"
            icon="arrow-forward"
            iconPosition="right"
            gradient
            fullWidth
            loading={saving}
            onPress={handleSave}
          />
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  form: {
    marginTop: spacing.lg,
  },
    fieldLabel: {
      marginBottom: spacing.sm,
      ...typography.caption,
    },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
});
