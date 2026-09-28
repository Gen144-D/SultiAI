import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeInRight, runOnJS, interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { api } from '../services/api';
import { hapticTap } from '../utils/haptics';
import { spacing, borderRadius } from '../theme';
import LoadingState from '../components/LoadingState';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

function Flashcard({ phrase, onKnown, onReview }) {
  const { colors } = useTheme();
  const rotateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const knownOverlay = useSharedValue(0);
  const reviewOverlay = useSharedValue(0);

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      rotateY.value = withSpring(rotateY.value === 0 ? 180 : 0, { stiffness: 200, damping: 20 });
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
      cardScale.value = 1 - Math.abs(e.translationX) / SCREEN_WIDTH * 0.1;
      knownOverlay.value = Math.max(0, e.translationX / SWIPE_THRESHOLD);
      reviewOverlay.value = Math.max(0, -e.translationX / SWIPE_THRESHOLD);
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 }, () => {
          runOnJS(onKnown)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 }, () => {
          runOnJS(onReview)();
        });
      } else {
        translateX.value = withSpring(0, { stiffness: 200, damping: 15 });
        cardScale.value = withSpring(1, { stiffness: 200, damping: 15 });
        knownOverlay.value = withTiming(0, { duration: 200 });
        reviewOverlay.value = withTiming(0, { duration: 200 });
      }
    });

  const composed = Gesture.Exclusive(panGesture, tapGesture);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotateY.value}deg` },
      { translateX: translateX.value },
      { scale: cardScale.value },
    ],
    opacity: interpolate(rotateY.value, [0, 90, 91, 180], [1, 1, 0, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotateY.value - 180}deg` },
      { translateX: translateX.value },
      { scale: cardScale.value },
    ],
    opacity: interpolate(rotateY.value, [0, 90, 91, 180], [0, 0, 1, 1]),
  }));

  const knownStyle = useAnimatedStyle(() => ({ opacity: knownOverlay.value }));
  const reviewStyle = useAnimatedStyle(() => ({ opacity: reviewOverlay.value }));

  const key = phrase.phrase || phrase.phrase_text || phrase.word;

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.flashcardContainer}>
        <Animated.View style={[styles.overlay, knownStyle]}>
          <Ionicons name="checkmark-circle" size={60} color={colors.success} />
          <Text style={[styles.overlayText, { color: colors.text }]}>Known</Text>
        </Animated.View>

        <Animated.View style={[styles.overlay, reviewStyle]}>
          <Ionicons name="refresh-circle" size={60} color={colors.error} />
          <Text style={[styles.overlayText, { color: colors.text }]}>Review</Text>
        </Animated.View>

        <Animated.View style={[styles.flashcard, styles.flashcardFront, frontStyle, { backgroundColor: colors.surface }]}>
          <Text style={[styles.flashcardBisaya, { color: colors.text }]}>{key}</Text>
          {phrase.category && <Text style={[styles.flashcardCategory, { color: colors.primary }]}>{phrase.category}</Text>}
          <Text style={[styles.flashcardHint, { color: colors.textLight }]}>Tap to reveal</Text>
        </Animated.View>

        <Animated.View style={[styles.flashcard, styles.flashcardBack, backStyle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
          <Text style={[styles.flashcardTranslation, { color: colors.text }]}>{phrase.translation || phrase.meaning || phrase.english}</Text>
          {phrase.pronunciation && <Text style={[styles.flashcardPron, { color: colors.textSecondary }]}>{phrase.pronunciation}</Text>}
          <Text style={[styles.flashcardHint, { color: colors.textLight }]}>Tap to flip back</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function SessionStats({ known, remaining, total }) {
  const { colors } = useTheme();
  const progress = total > 0 ? ((known) / total) * 100 : 0;

  return (
    <View style={styles.statsContainer}>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{known} known</Text>
        </View>
        <Text style={[styles.statText, { color: colors.textLight }]}>{remaining} remaining</Text>
      </View>
    </View>
  );
}

export default function VocabularyReviewScreen({ navigation }) {
  const { colors, getContrastColor } = useTheme();
  const onActive = getContrastColor('#FFFFFF', '#042F2B');
  const { addXp } = useGame();
  const { enqueueAction } = useOfflineSync();
  const [phrases, setPhrases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownPhrases, setKnownPhrases] = useState(new Set());
  const [reviewPhrases, setReviewPhrases] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getSavedPhrases();
        if (!cancelled) setPhrases(Array.isArray(data) ? data : []);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = phrases.filter(p => {
    const text = (p.phrase || p.phrase_text || '').toLowerCase();
    const match = text.includes(search.toLowerCase());
    const catMatch = filter === 'all' || p.category === filter;
    return match && catMatch;
  });

  const categories = [...new Set(phrases.map(p => p.category).filter(Boolean))];
  const studyPhrases = filtered.filter(p => !knownPhrases.has(p.phrase || p.phrase_text || p.word));
  const currentPhrase = studyPhrases[currentIndex];

  const markKnown = useCallback(() => {
    if (!currentPhrase) return;
    hapticTap();
    const key = currentPhrase.phrase || currentPhrase.phrase_text || currentPhrase.word;
    setKnownPhrases(prev => new Set([...prev, key]));
    addXp(5, 'flashcard');
    enqueueAction({
      endpoint: '/api/v2/vocabulary/review',
      method: 'POST',
      payload: { word: key, quality: 4 },
    });
    setCurrentIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhrase]);

  const markReview = useCallback(() => {
    if (!currentPhrase) return;
    hapticTap();
    const key = currentPhrase.phrase || currentPhrase.phrase_text || currentPhrase.word;
    setReviewPhrases(prev => new Set([...prev, key]));
    enqueueAction({
      endpoint: '/api/v2/vocabulary/review',
      method: 'POST',
      payload: { word: key, quality: 1 },
    });
    setCurrentIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhrase]);

  const resetStudy = useCallback(() => {
    setKnownPhrases(new Set());
    setReviewPhrases(new Set());
    setCurrentIndex(0);
  }, []);

  if (loading) return <LoadingState fullScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Vocabulary"
        subtitle={`${phrases.length} saved phrases`}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        gradient={false}
      >
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: mode === 'list' ? colors.primaryLight : 'transparent' }]}
            onPress={() => setMode('list')}
            accessibilityRole="button"
            accessibilityLabel="List view"
          >
            <Ionicons name="list" size={18} color={mode === 'list' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: mode === 'study' ? colors.primaryLight : 'transparent' }]}
            onPress={() => { setMode('study'); setCurrentIndex(0); }}
            accessibilityRole="button"
            accessibilityLabel="Study mode"
          >
            <Ionicons name="layers" size={18} color={mode === 'study' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Header>

      {mode === 'list' ? (
        <>
          <View style={styles.searchContainer}>
            <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textLight} />
              <TextInput
                id="vocabularySearch"
                name="vocabularySearch"
                testID="vocabulary-search-input"
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search vocabulary..."
                placeholderTextColor={colors.textLight}
                value={search}
                onChangeText={setSearch}
                autoComplete="off"
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close-circle" size={20} color={colors.textLight} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {categories.length > 0 && (
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filter === 'all'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
                onPress={() => setFilter('all')}
                hitSlop={{ top: 4, bottom: 4 }}
              >
                <Text style={[styles.filterText, { color: filter === 'all' ? onActive : colors.textSecondary }]}>All</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    filter === cat
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  ]}
                  onPress={() => setFilter(cat)}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={[styles.filterText, { color: filter === cat ? onActive : colors.textSecondary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Animated.FlatList
            data={filtered}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const key = item.phrase || item.phrase_text || item.word;
              const isKnown = knownPhrases.has(key);
              const needsReview = reviewPhrases.has(key);
              return (
                <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
                  <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.listCardHeader}>
                      <Text style={[styles.listCardPhrase, { color: colors.text }]}>{key}</Text>
                      {item.category && (
                        <View style={[styles.listCardBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.listCardBadgeText, { color: colors.primary }]}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                    {item.translation && <Text style={[styles.listCardTranslation, { color: colors.textSecondary }]}>{item.translation}</Text>}
                    {item.pronunciation && <Text style={[styles.listCardPron, { color: colors.textLight }]}>{item.pronunciation}</Text>}
                    {(isKnown || needsReview) && (
                      <View style={styles.listCardStatus}>
                        <Ionicons name={isKnown ? 'checkmark-circle' : 'refresh-circle'} size={14} color={isKnown ? colors.success : colors.error} />
                        <Text style={[styles.listCardStatusText, { color: isKnown ? colors.success : colors.error }]}>
                          {isKnown ? 'Known' : 'Needs Review'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            }}
            ListEmptyComponent={
              <EmptyState icon="search" title="No vocabulary found" message={search ? 'Try a different search' : 'Save phrases from conversations.'} />
            }
          />
        </>
      ) : studyPhrases.length === 0 ? (
        <View style={styles.studyEmpty}>
          <Ionicons name="trophy" size={64} color={colors.primary} />
          <Text style={[styles.studyEmptyTitle, { color: colors.text }]}>All reviewed!</Text>
          <Text style={[styles.studyEmptySubtitle, { color: colors.textSecondary }]}>
            {'You\'ve reviewed all ' + filtered.length + ' phrases.'}
          </Text>
          <TouchableOpacity style={[styles.resetBtn, { backgroundColor: colors.primary }]} onPress={resetStudy}>
            <Text style={styles.resetBtnText}>Start Over</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resetBtn, { backgroundColor: colors.surface, marginTop: 12 }]} onPress={() => setMode('list')}>
            <Text style={[styles.resetBtnText, { color: colors.text }]}>Back to List</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <SessionStats known={knownPhrases.size} remaining={studyPhrases.length} total={filtered.length} />
          <View style={styles.flashcardArea}>
            <Flashcard key={currentPhrase.phrase || currentPhrase.phrase_text || currentPhrase.word} phrase={currentPhrase} onKnown={markKnown} onReview={markReview} />
          </View>
          <View style={styles.studyActions}>
            <TouchableOpacity style={[styles.studyBtn, styles.studyBtnReview, { backgroundColor: colors.error + '1F' }]} onPress={markReview}>
              <Ionicons name="close" size={24} color={colors.error} />
              <Text style={[styles.studyBtnText, { color: colors.error }]}>Need Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.studyBtn} onPress={() => markKnown()}>
              <Ionicons name="checkmark" size={24} color={colors.success} />
              <Text style={[styles.studyBtnText, { color: colors.success }]}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeToggle: { flexDirection: 'row', gap: 4 },
  modeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 2 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, marginLeft: spacing.sm },

  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  filterChipActive: { backgroundColor: 'rgba(45, 212, 191, 0.2)', borderColor: 'rgba(45, 212, 191, 0.4)' },
  filterText: { fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#2DD4BF' },

  list: { padding: spacing.xl, paddingTop: 0 },
  listCard: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  listCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  listCardPhrase: { fontSize: 18, fontWeight: '700', flex: 1 },
  listCardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  listCardBadgeText: { fontSize: 11, fontWeight: '600' },
  listCardTranslation: { fontSize: 15, marginTop: spacing.xs },
  listCardPron: { fontSize: 13, fontStyle: 'italic', marginTop: spacing.xs },
  listCardStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  listCardStatusText: { fontSize: 12, fontWeight: '600' },

  statsContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, fontWeight: '600' },

  flashcardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  flashcardContainer: { width: '100%', maxWidth: 340, aspectRatio: 0.72, position: 'relative' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  overlayText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 8 },
  flashcard: {
    position: 'absolute', width: '100%', height: '100%', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', padding: spacing.xxl,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    elevation: 8,
  },
  flashcardFront: { backfaceVisibility: 'hidden' },
  flashcardBack: { backfaceVisibility: 'hidden' },
  flashcardBisaya: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: spacing.md },
  flashcardCategory: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  flashcardHint: { fontSize: 12, fontWeight: '500', position: 'absolute', bottom: spacing.xl },
  flashcardTranslation: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
  flashcardPron: { fontSize: 16, fontStyle: 'italic' },

  studyActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl },
  studyBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: 999, gap: spacing.sm },
  studyBtnReview: { backgroundColor: 'rgba(248,113,113,0.12)' },
  studyBtnKnown: { backgroundColor: 'rgba(52,211,153,0.12)' },
  studyBtnText: { fontSize: 15, fontWeight: '700' },

  studyEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  studyEmptyTitle: { fontSize: 24, fontWeight: '700', marginTop: spacing.lg },
  studyEmptySubtitle: { fontSize: 16, marginTop: spacing.sm, marginBottom: spacing.xxl },
  resetBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: 999 },
  resetBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
