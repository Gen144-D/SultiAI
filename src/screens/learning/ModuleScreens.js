import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { getModuleGradient, readableOnGradient } from '../../theme/moduleColors';
import { useGame } from '../../context/GameContext';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import useModuleProgress, { useModuleLessons } from '../../hooks/useModuleProgress';
import { spacing, borderRadius, shadows } from '../../theme';
import { XP_VALUES } from '../../constants';

function PhraseRow({ native, english, note, colors, revealed, flipped, onToggle }) {
  const primaryText = flipped ? english : native;
  const primaryStyle = flipped ? styles.phraseEnglish : styles.phraseNative;
  const primaryColor = flipped ? colors.primary : colors.text;

  return (
    <TouchableOpacity
      style={[styles.phraseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={revealed ? `${native}, ${english}` : `${native}, meaning hidden`}
    >
      <View style={styles.phraseMain}>
        <Text style={[primaryStyle, { color: primaryColor }]}>{primaryText}</Text>
        {revealed ? (
          <Text
            style={[
              flipped ? styles.phraseNative : styles.phraseEnglish,
              { color: flipped ? colors.text : colors.primary },
            ]}
          >
            {flipped ? native : english}
          </Text>
        ) : (
          <Text style={[styles.phraseHint, { color: colors.textLight }]}>Tap to reveal meaning</Text>
        )}
      </View>
      {note ? <Text style={[styles.phraseNote, { color: colors.textSecondary }]}>{note}</Text> : null}
      <Ionicons name={revealed ? 'eye' : 'eye-off'} size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

function SectionTitle({ title, colors }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function ProgressBanner({ percent, total, completed, colors, error }) {
  if (!total) return null;
  const done = completed >= total;
  return (
    <View style={styles.progressBanner}>
      <View style={styles.progressBannerHeader}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'reader'}
          size={16}
          color={done ? colors.success : colors.primary}
        />
        <Text style={[styles.progressBannerText, { color: colors.textSecondary }]}>
          {completed} of {total} items reviewed
        </Text>
        <Text style={[styles.progressBannerPct, { color: done ? colors.success : colors.primary }]}>
          {percent}%
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${percent}%`, backgroundColor: done ? colors.success : colors.primary },
          ]}
        />
      </View>
      {error ? (
        <Text style={[styles.progressError, { color: colors.error }]}>
          Progress will sync when you reconnect.
        </Text>
      ) : null}
    </View>
  );
}

function makeModuleScreen(config) {
  const { route, title, subtitle, icon, gradientKey, description, heroAction, moduleKey } = config;

  return function ModuleScreen({ navigation }) {
    const { colors, themeName } = useTheme();
    const gradient = getModuleGradient(themeName, gradientKey);
    const heroInk = readableOnGradient(gradient);
    const { addXp } = useGame();
    const { sections, total, savedPercent, loading, error: contentError } = useModuleLessons(moduleKey);
    const [revealed, setRevealed] = useState({});
    const [flipped, setFlipped] = useState(false);
    const [practiceLogged, setPracticeLogged] = useState(false);
    const hydratedRef = useRef(false);

    const completed = useMemo(
      () => Object.values(revealed).filter(Boolean).length,
      [revealed]
    );

    const { percent: localPercent, error: progressError } = useModuleProgress(moduleKey, {
      total,
      completed,
      initialPercent: savedPercent,
    });

    // Restore the previously reached completion so reopening a module shows
    // the stored progress instead of an empty list.
    useEffect(() => {
      if (hydratedRef.current || loading || !total || !savedPercent) return;
      hydratedRef.current = true;
      const target = Math.round((savedPercent / 100) * total);
      if (!target) return;
      setRevealed((prev) => {
        const next = { ...prev };
        let filled = 0;
        for (const section of sections) {
          for (const item of section.items) {
            if (filled >= target) break;
            next[item.itemId] = true;
            filled += 1;
          }
        }
        return next;
      });
    }, [loading, total, savedPercent, sections]);

    const percent = Math.max(localPercent, savedPercent || 0);

    const toggleItem = useCallback((itemId) => {
      setRevealed((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    }, []);

    const revealAll = useCallback(() => {
      setRevealed((prev) => {
        const next = { ...prev };
        for (const section of sections) {
          for (const item of section.items) next[item.itemId] = true;
        }
        return next;
      });
    }, [sections]);

    const handlePractice = () => {
      if (heroAction) {
        if (!practiceLogged) setPracticeLogged(true);
        addXp(XP_VALUES.ROLEPLAY_START, route);
        if (heroAction.route) {
          // Tab destinations live inside the nested "Main" navigator, so they
          // need { screen } rather than a bare route name. These previously
          // targeted an unregistered "Tutor" route and silently did nothing.
          if (heroAction.tab) {
            navigation.navigate('Main', { screen: heroAction.route, params: heroAction.params });
          } else {
            navigation.navigate(heroAction.route, heroAction.params);
          }
        }
      }
    };

    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header
          title={title}
          subtitle={subtitle}
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={[styles.heroIcon, { backgroundColor: `${heroInk}33` }]}>
              <Ionicons name={icon} size={26} color={heroInk} />
            </View>
            <Text style={[styles.heroTitle, { color: heroInk }]}>{title}</Text>
            <Text style={[styles.heroDesc, { color: heroInk, opacity: 0.85 }]}>{description}</Text>
            {heroAction && (
              <TouchableOpacity style={[styles.heroBtn, { backgroundColor: heroInk }]} onPress={handlePractice} activeOpacity={0.85}>
                <Ionicons name="sparkles" size={16} color={gradient[0]} />
                <Text style={[styles.heroBtnText, { color: readableOnGradient([gradient[0]]) }]}>{heroAction.label}</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {loading ? (
            <View style={styles.section}>
              <SectionTitle title="Loading content…" colors={colors} />
            </View>
          ) : contentError ? (
            <View style={styles.section}>
              <GlassCard variant="elevated" padding="lg" style={styles.errorCard}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.error} />
                <Text style={[styles.errorTitle, { color: colors.text }]}>Content unavailable</Text>
                <Text style={[styles.errorBody, { color: colors.textSecondary }]}>
                  {contentError}
                </Text>
                <TouchableOpacity
                  style={[styles.revealBtn, { borderColor: colors.primary }]}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.revealBtnText, { color: colors.primary }]}>Go back</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          ) : (
            <>
              <ProgressBanner
                percent={percent}
                total={total}
                completed={completed}
                colors={colors}
                error={progressError}
              />

              {total > 0 && completed < total ? (
                <TouchableOpacity
                  style={[styles.revealAllBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={revealAll}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Reveal all items"
                >
                  <Ionicons name="eye-outline" size={15} color={colors.textSecondary} />
                  <Text style={[styles.revealAllText, { color: colors.textSecondary }]}>
                    Reveal all
                  </Text>
                </TouchableOpacity>
              ) : null}

              {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <SectionTitle title={section.title} colors={colors} />
                  {section.items.map((item) => (
                    <PhraseRow
                      key={item.itemId}
                      native={item.native}
                      english={item.english}
                      note={item.note}
                      colors={colors}
                      revealed={Boolean(revealed[item.itemId])}
                      flipped={flipped}
                      onToggle={() => toggleItem(item.itemId)}
                    />
                  ))}
                </View>
              ))}
            </>
          )}

          {config.renderExtra
            ? config.renderExtra({
                colors,
                themeName,
                addXp,
                navigation,
                sections,
                total,
                flipped,
                onToggleFlip: () => setFlipped((f) => !f),
              })
            : null}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    );
  };
}

const WRITING_EXTRA = ({ colors, addXp, sections = [] }) => {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Vocabulary comes from the module's own seeded lesson items.
  const words = useMemo(
    () =>
      sections
        .flatMap((section) => section.items)
        .map((item) => item.native)
        .filter(Boolean),
    [sections]
  );

  if (!words.length) return null;

  const handleSubmit = () => {
    if (submitted || text.trim().length < 2) return;
    setSubmitted(true);
    addXp(10, 'writing');
  };

  return (
    <View style={styles.section}>
      <SectionTitle title="Today's Writing Prompt" colors={colors} />
      <GlassCard variant="elevated" style={styles.promptCard} padding="lg">
        <Text style={[styles.promptText, { color: colors.text }]}>
          Describe your morning in Bisaya.
        </Text>
        <Text style={[styles.promptHint, { color: colors.textSecondary }]}>
          {`Use the words: ${words.join(', ')}.`}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Pagsulat diri... (Write here)"
          placeholderTextColor={colors.textLight}
          multiline
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: submitted ? colors.success : colors.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name={submitted ? 'checkmark-circle' : 'send'} size={16} color="#fff" />
          <Text style={styles.submitText}>{submitted ? 'Submitted!' : 'Submit for XP'}</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
};

const SWITCH_EXTRA = ({ colors, themeName, flipped, onToggleFlip }) => {
  if (typeof onToggleFlip !== 'function') return null;
  const activeGradient = getModuleGradient(themeName, 'sulti_switch');
  const activeBg = activeGradient[0];
  const activeInk = readableOnGradient(activeGradient);
  return (
    <View style={styles.section}>
      <SectionTitle title="Bisaya ⇄ English Switch" colors={colors} />
      <View style={[styles.switchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>Show as</Text>
        <TouchableOpacity
          style={[styles.switchChip, flipped ? { backgroundColor: colors.surfaceSecondary } : { backgroundColor: activeBg }]}
          onPress={() => flipped && onToggleFlip()}
          accessibilityRole="button"
          accessibilityLabel="Show Bisaya first"
        >
          <Text style={[styles.switchChipText, { color: flipped ? colors.textSecondary : activeInk }]}>Bisaya</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchChip, flipped ? { backgroundColor: activeBg } : { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => !flipped && onToggleFlip()}
          accessibilityRole="button"
          accessibilityLabel="Show English first"
        >
          <Text style={[styles.switchChipText, { color: flipped ? activeInk : colors.textSecondary }]}>English</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const QUIZ_EXTRA = ({ colors, addXp, sections = [] }) => {
  const questions = useMemo(
    () =>
      sections
        .flatMap((section) => section.items)
        .filter((item) => item.native && item.english)
        .map((item) => ({ q: `How do you say "${item.english}"?`, a: item.native })),
    [sections]
  );

  if (!questions.length) return null;

  // Keyed on the question set so the quiz resets when content changes.
  return (
    <QuizCard
      key={questions.length}
      questions={questions}
      colors={colors}
      addXp={addXp}
    />
  );
};

const QuizCard = ({ questions, colors, addXp }) => {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const current = questions[active];

  const handleNext = () => {
    if (active + 1 >= questions.length) {
      setDone(true);
      addXp(XP_VALUES.FLASHCARD_KNOWN * questions.length, 'review_center');
      return;
    }
    setActive((a) => a + 1);
    setRevealed(false);
  };

  if (done) {
    return (
      <View style={styles.section}>
        <GlassCard variant="elevated" style={styles.doneCard} padding="lg">
          <Ionicons name="trophy" size={40} color={colors.accent} />
          <Text style={[styles.doneTitle, { color: colors.text }]}>Review Complete!</Text>
          <Text style={[styles.doneSub, { color: colors.textSecondary }]}>
            You earned {XP_VALUES.FLASHCARD_KNOWN * questions.length} XP
          </Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Quick Review Quiz" colors={colors} />
      <GlassCard variant="elevated" style={styles.quizCard} padding="lg">
        <Text style={[styles.quizProgress, { color: colors.textLight }]}>
          {active + 1} / {questions.length}
        </Text>
        <Text style={[styles.quizQ, { color: colors.text }]}>{current.q}</Text>
        {revealed ? (
          <View style={[styles.quizAnswer, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.quizAnswerText, { color: colors.success }]}>{current.a}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.revealBtn, { borderColor: colors.primary }]}
            onPress={() => setRevealed(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.revealBtnText, { color: colors.primary }]}>Reveal Answer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.submitText}>{active + 1 >= questions.length ? 'Finish' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
};

export const ScenarioPracticeScreen = makeModuleScreen({
  route: 'scenario',
  title: 'Scenario Practice',
  subtitle: 'Roleplay real-life conversations',
  icon: 'chatbubbles',
  gradientKey: 'scenario_practice',
  description: 'Step into realistic Bisaya conversations. Practice bargaining, riding, ordering, and more with SULTI.',
  heroAction: { label: 'Start Roleplay', route: 'SULTI', tab: true, params: { situation: 'Roleplay conversation', label: 'Scenario Practice' } },
  moduleKey: 'scenario_practice',
});

export const GrammarScreen = makeModuleScreen({
  route: 'grammar',
  title: 'Grammar',
  subtitle: 'Cebuano sentence structure',
  icon: 'school',
  gradientKey: 'grammar',
  description: 'Learn the core building blocks of Cebuano grammar: particles, verb focus, and word order.',
  heroAction: { label: 'Practice Grammar', route: 'SULTI', tab: true, params: { situation: 'Grammar practice', label: 'Grammar' } },
  moduleKey: 'grammar',
});

export const ListeningScreen = makeModuleScreen({
  route: 'listening',
  title: 'Listening',
  subtitle: 'Train your ear for Bisaya',
  icon: 'ear',
  gradientKey: 'listening',
  description: 'Hear everyday Bisaya phrases at natural speed. Play them back and repeat out loud.',
  heroAction: { label: 'Start Listening', route: 'VoiceMode', params: { situation: 'Listening practice', label: 'Listening' } },
  moduleKey: 'listening',
});

export const WritingScreen = makeModuleScreen({
  route: 'writing',
  title: 'Writing',
  subtitle: 'Compose in Cebuano',
  icon: 'create',
  gradientKey: 'writing',
  description: 'Build writing confidence with guided prompts. SULTI checks your sentences and offers corrections.',
  heroAction: { label: 'Writing Coach', route: 'SULTI', tab: true, params: { situation: 'Writing help', label: 'Writing Coach' } },
  moduleKey: 'writing',
  renderExtra: WRITING_EXTRA,
});

export const ReadingScreen = makeModuleScreen({
  route: 'reading',
  title: 'Reading',
  subtitle: 'Read & understand Bisaya',
  icon: 'book',
  gradientKey: 'reading',
  description: 'Read short Bisaya passages with full English translations and key vocabulary.',
  heroAction: { label: 'Reading Session', route: 'SULTI', tab: true, params: { situation: 'Reading comprehension', label: 'Reading' } },
  moduleKey: 'reading',
});

export const SultiSwitchScreen = makeModuleScreen({
  route: 'switch',
  title: 'Sulti Switch',
  subtitle: 'Bilingual thinking mode',
  icon: 'swap-horizontal',
  gradientKey: 'sulti_switch',
  description: 'Toggle between Bisaya and English to train instant translation recall.',
  heroAction: { label: 'Switch Mode', route: 'SULTI', tab: true, params: { situation: 'Translation practice', label: 'Sulti Switch' } },
  moduleKey: 'sulti_switch',
  renderExtra: SWITCH_EXTRA,
});

export const CultureNotesScreen = makeModuleScreen({
  route: 'culture',
  title: 'Culture Notes',
  subtitle: 'Understand Cebuano life',
  icon: 'compass',
  gradientKey: 'culture_notes',
  description: 'Cultural context behind the language — from festivals to everyday etiquette.',
  heroAction: { label: 'Ask About Culture', route: 'SULTI', tab: true, params: { situation: 'Culture discussion', label: 'Culture Notes' } },
  moduleKey: 'culture_notes',
});

export const ReviewCenterScreen = makeModuleScreen({
  route: 'review',
  title: 'Review Center',
  subtitle: 'Reinforce what you learned',
  icon: 'refresh',
  gradientKey: 'review_center',
  description: 'Quick quizzes that turn learned phrases into lasting memory. Earn XP for every correct recall.',
  heroAction: { label: 'Review Session', route: 'SULTI', tab: true, params: { situation: 'Review session', label: 'Review Center' } },
  moduleKey: 'review_center',
  renderExtra: QUIZ_EXTRA,
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  heroDesc: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.full, marginTop: spacing.md,
  },
  heroBtnText: { fontSize: 14, fontWeight: '700' },
  section: { marginBottom: spacing.xl },
  sectionHeader: { marginBottom: spacing.sm },
  progressBanner: { marginBottom: spacing.lg, gap: spacing.xs },
  progressBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  progressBannerPct: { fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: borderRadius.full },
  progressError: { fontSize: 11, fontWeight: '500' },
  revealAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.full, borderWidth: 1,
    marginBottom: spacing.lg,
  },
  revealAllText: { fontSize: 13, fontWeight: '700' },
  errorCard: { alignItems: 'center', gap: spacing.sm },
  errorTitle: { fontSize: 16, fontWeight: '800' },
  errorBody: { fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  phraseRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  phraseMain: { flex: 1 },
  phraseNative: { fontSize: 15, fontWeight: '700' },
  phraseEnglish: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  phraseHint: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  phraseNote: { fontSize: 11, fontWeight: '500', maxWidth: 90, textAlign: 'right' },
  promptCard: { gap: spacing.md },
  promptText: { fontSize: 16, fontWeight: '700' },
  promptHint: { fontSize: 12, lineHeight: 17 },
  input: {
    minHeight: 90, borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.md,
    fontSize: 14, textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.xl,
  },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  switchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1,
  },
  switchLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  switchChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  
  switchChipText: { fontSize: 13, fontWeight: '700' },
  quizCard: { gap: spacing.md, alignItems: 'center' },
  quizProgress: { fontSize: 12, fontWeight: '600', alignSelf: 'flex-end' },
  quizQ: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  quizAnswer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg },
  quizAnswerText: { fontSize: 16, fontWeight: '700' },
  revealBtn: { borderWidth: 2, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  revealBtnText: { fontSize: 14, fontWeight: '700' },
  doneCard: { alignItems: 'center', gap: spacing.sm },
  doneTitle: { fontSize: 18, fontWeight: '800' },
  doneSub: { fontSize: 13, fontWeight: '500' },
  bottomSpacer: { height: 40 },
});
