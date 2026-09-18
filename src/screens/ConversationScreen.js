import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { spacing, borderRadius, shadows } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  { id: 'market', label: 'At the Market', native: 'Palengke', icon: 'cart', color: '#10B981', prompt: 'Buying food and bargaining at a public market' },
  { id: 'greetings', label: 'Greetings & Slang', native: 'Kumusta!', icon: 'hand-left', color: '#14B8A6', prompt: 'Casual greetings, introductions, and local slang' },
  { id: 'jeepney', label: 'Riding a Jeepney', native: 'Jeepney', icon: 'bus', color: '#3B82F6', prompt: 'Commuting via jeepney and tricycle' },
  { id: 'restaurant', label: 'Ordering Food', native: 'Karenderia', icon: 'restaurant', color: '#F59E0B', prompt: 'Ordering at a carenderia or restaurant' },
  { id: 'directions', label: 'Directions', native: 'Asa ang...', icon: 'compass', color: '#8B5CF6', prompt: 'Asking for and giving directions' },
  { id: 'family', label: 'Family & Home', native: 'Pamilya', icon: 'people', color: '#EC4899', prompt: 'Talking about family, home, and relationships' },
  { id: 'emergency', label: 'Emergency', native: 'Tabang!', icon: 'warning', color: '#EF4444', prompt: 'Emergency and medical situation phrases' },
  { id: 'travel', label: 'Travel & Tourism', native: 'Biyahe', icon: 'airplane', color: '#06B6D4', prompt: 'Traveling around the Philippines' },
];

const DAILY_DRILL = {
  label: '5-Min Market Haggling',
  emoji: '\u{1F3AF}',
  phrase: 'Pila ang kilo sa mangga?',
  translation: 'How much per kilo of mangoes?',
  prompt: 'Market bargaining phrases',
};

export default function ConversationScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('phrasebook');

  const selectedCategory = route?.params?.category;

  const handleCategory = (cat) => {
    navigation.navigate('Learn', { situation: cat.prompt, label: cat.label });
  };

  const handleDailyDrill = () => {
    navigation.navigate('Learn', { situation: DAILY_DRILL.prompt, label: DAILY_DRILL.label });
  };

  const handleFlashcards = () => {
    navigation.navigate('Flashcards');
  };

  const handlePronunciation = () => {
    navigation.navigate('Pronunciation');
  };

  const tabs = [
    { key: 'phrasebook', label: 'Phrasebook', icon: 'book' },
    { key: 'flashcards', label: 'Flashcards', icon: 'layers' },
    { key: 'speech', label: 'Pronunciation', icon: 'mic' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Practice</Text>
        <Text style={styles.headerSubtitle}>Master essential Bisaya phrases & pronunciation</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {selectedCategory ? (
          <View style={[styles.categoryBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Ionicons name="pricetag" size={16} color={colors.primary} />
            <Text style={[styles.categoryBannerText, { color: colors.primary }]}>
              Practicing: {selectedCategory}
            </Text>
          </View>
        ) : null}
        <View style={styles.tabRow}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                activeTab === t.key
                  ? [styles.tabActive, { backgroundColor: colors.primary }]
                  : { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => {
                setActiveTab(t.key);
                if (t.key === 'flashcards') handleFlashcards();
                if (t.key === 'speech') handlePronunciation();
              }}
            >
              <Ionicons name={t.icon} size={16} color={activeTab === t.key ? colors.textOnGradient : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === t.key ? colors.textOnGradient : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          <GlassCard variant="elevated" style={styles.dailyCard}>
            <LinearGradient
              colors={isDark ? ['#0A1626', '#0B1120'] : ['#00A896', '#008F7F']}
              style={styles.dailyInner}
            >
              <View style={styles.dailyLeft}>
                <View style={styles.dailyBadgeRow}>
                  <Badge title="Daily Practice" variant="info" size="sm" />
                </View>
                <Text style={styles.dailyTitle}>{DAILY_DRILL.emoji} {DAILY_DRILL.label}</Text>
                <Text style={styles.dailyPhrase}>{'"'}{DAILY_DRILL.phrase}{'"'}</Text>
                <Text style={styles.dailyTranslation}>{DAILY_DRILL.translation}</Text>
              </View>
              <TouchableOpacity style={[styles.dailyBtn, { backgroundColor: colors.primary }]} onPress={handleDailyDrill} activeOpacity={0.8} hitSlop={8}>
                <Ionicons name="play" size={18} color={colors.textOnGradient} />
                <Text style={[styles.dailyBtnText, { color: colors.textOnGradient }]}>Start</Text>
              </TouchableOpacity>
            </LinearGradient>
          </GlassCard>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore Categories</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Tap a category to practice situational phrases with SULTI!
          </Text>

          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} onPress={() => handleCategory(cat)} activeOpacity={0.7}>
              <GlassCard variant="tinted" style={styles.catCard} padding="md">
                <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon} size={22} color={cat.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={[styles.catLabel, { color: colors.text }]}>{cat.label}</Text>
                  <Text style={[styles.catNative, { color: colors.textSecondary }]}>{cat.native}</Text>
                </View>
                <View style={[styles.catBadge, { backgroundColor: cat.color + '15' }]}>
                  <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.prompt.length > 25 ? Math.floor(cat.prompt.length / 3) : 8} phrases</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </GlassCard>
            </TouchableOpacity>
            ))}
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.36 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, letterSpacing: -0.08 },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginTop: -spacing.lg, marginBottom: spacing.lg },
  categoryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1,
  },
  categoryBannerText: { fontSize: 13, fontWeight: '700' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs, ...shadows.sm },
  tabActive: { boxShadow: '0 2px 8px rgba(13,148,136,0.3)', elevation: 4 },
  tabText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.07 },
  content: { padding: spacing.xl, paddingTop: 0 },
  dailyCard: { marginBottom: spacing.xxl, overflow: 'hidden' },
  dailyInner: { borderRadius: borderRadius.lg, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dailyLeft: { flex: 1, marginRight: spacing.md },
  dailyBadgeRow: { marginBottom: spacing.sm },
  dailyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: spacing.sm },
  dailyPhrase: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginBottom: 2 },
  dailyTranslation: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  dailyBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: borderRadius.full, gap: 6, ...shadows.md },
  dailyBtnText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: 13, marginBottom: spacing.lg, lineHeight: 18 },
  catCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md },
  catIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 15, fontWeight: '600' },
  catNative: { fontSize: 12, marginTop: 2 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, marginRight: spacing.sm },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
});