import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Animated, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useToast } from '../components/Toast';
import { api } from '../services/api';
import GlassCard from '../components/GlassCard';
import UserAvatar from '../components/profile/UserAvatar';
import StreakFlame from '../components/StreakFlame';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import AuroraBackground from '../components/AuroraBackground';
import { spacing, borderRadius, shadows } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { USER_AVATARS } from '../constants/avatars';

const MOCK_CERTIFICATES = [
  { id: 'cert1', title: 'Beginner Bisaya', date: 'Mar 2026', icon: 'ribbon', color: '#10B981' },
  { id: 'cert2', title: 'Survival Phrases', date: 'Jun 2026', icon: 'medal', color: '#3B82F6' },
];

const MOCK_DOWNLOADS = [
  { id: 'dl1', title: 'Offline Phrasebook (Bisaya)', size: '2.4 MB', icon: 'book', color: '#14B8A6' },
  { id: 'dl2', title: 'Voice Lessons Pack 1', size: '18 MB', icon: 'musical-notes', color: '#8B5CF6' },
];

const HISTORY_ICONS = ['chatbubbles', 'mic', 'school', 'book', 'record', 'headset'];
const HISTORY_COLORS = ['#14B8A6', '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#10B981'];

const THEME_MODES = [
  { value: 'system', label: 'Natural', icon: 'contrast' },
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

export default function ProfileScreen({ navigation }) {
  const { user, signOut, refreshProfile } = useUser();
  const { colors, isDark, themeMode, setThemeMode, reduceMotion, highContrast, largeText, toggleReduceMotion, toggleHighContrast, toggleLargeText, getAnimationDuration } = useTheme();
  const toast = useToast();
  const { xp, coins, hearts, streak, badges, getLevelInfo } = useGame();
  const { enqueueAction } = useOfflineSync();
  const levelInfo = getLevelInfo(xp);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const num = (v) => Math.max(0, Number(v) || 0);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ dark_mode: false, speech_speed: 1.0, voice_gender: 'neutral' });
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [savedPhrases, setSavedPhrases] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [infoModal, setInfoModal] = useState(null);
  const [showSignOut, setShowSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [moduleMastery, setModuleMastery] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState('avatar-01');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const loadSettings = async () => { try { const d = await api.getUserSettings(); setSettings(d); } catch (e) { console.warn('[Profile] Failed to load settings:', e.message); } };
  const loadSavedPhrases = async () => { try { const d = await api.getSavedPhrases(); setSavedPhrases(Array.isArray(d) ? d : []); } catch (e) { console.warn('[Profile] Failed to load saved phrases:', e.message); } };
  const loadAnalytics = async () => {
    try {
      const weekly = await api.getWeeklyProgress();
      if (Array.isArray(weekly) && weekly.length) {
        setWeeklyActivity(
          weekly.map((w) => ({
            day: DAY_KEYS[new Date(w.date).getDay()] ?? w.date,
            xp: num(w.xp),
            color: '#14B8A6',
          }))
        );
      }
    } catch (e) {
      console.warn('[Profile] Failed to load weekly progress:', e.message);
    }
    try {
      const modules = await api.getLearningProgress();
      if (Array.isArray(modules) && modules.length) {
        const rows = modules
          .map((m) => ({
            label: m.module_title || m.moduleTitle || 'Module',
            value: num(m.completion_percent ?? m.completionPercent),
            color: '#3B82F6',
          }))
          .filter((r) => r.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
        setModuleMastery(rows);
      }
    } catch (e) {
      console.warn('[Profile] Failed to load learning progress:', e.message);
    }
  };

  const loadHistory = async () => {
    try {
      const convos = await api.getHistory();
      if (Array.isArray(convos) && convos.length) {
        setHistory(
          convos.map((c, i) => ({
            id: c.id || String(i),
            title: c.title || 'Voice Session',
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
            msgs: Array.isArray(c.messages) ? c.messages.length : 0,
            icon: HISTORY_ICONS[i % HISTORY_ICONS.length],
            color: HISTORY_COLORS[i % HISTORY_COLORS.length],
          }))
        );
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.warn('[Profile] Failed to load history:', e.message);
      setHistory([]);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await api.deleteHistory(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.warn('[Profile] Failed to delete history:', e.message);
    }
  };

  useEffect(() => {
    if (user) { setEditName(user.name || ''); setEditCountry(user.country || ''); }
    loadSettings();
    loadSavedPhrases();
    loadAnalytics();
    loadHistory();
    Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(600), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    AsyncStorage.getItem('user_avatar_id').then((id) => {
      if (id) setSelectedAvatarId(id);
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name: editName, country: editCountry });
      await refreshProfile();
      setEditing(false);
      enqueueAction({ endpoint: '/api/user/me', method: 'PUT', payload: { name: editName, country: editCountry } });
    } catch (err) { toast.error(err.message || 'Failed to save profile.'); }
    finally { setSaving(false); }
  };

  const handleDeletePhrase = async (id) => {
    try {
      await api.deleteSavedPhrase(id);
      setSavedPhrases(prev => prev.filter(p => p.phrase_id !== id));
      enqueueAction({ endpoint: `/api/saved-phrases/${id}`, method: 'POST', payload: { deleted: true } });
    } catch (err) { toast.error(err.message || 'Failed to delete phrase.'); }
  };

  const handleAvatarSelect = async (avatarId) => {
    setSelectedAvatarId(avatarId);
    setShowAvatarPicker(false);
    try {
      await AsyncStorage.setItem('user_avatar_id', avatarId);
    } catch (e) {
      console.warn('[Profile] Failed to save avatar:', e.message);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setShowSignOut(false);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const tabs = [
    { key: 'stats', label: 'Stats', icon: 'stats-chart' },
    { key: 'profile', label: 'Profile', icon: 'person' },
    { key: 'phrases', label: 'Phrases', icon: 'bookmark' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AuroraBackground>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity onPress={() => setShowAvatarPicker(true)} activeOpacity={0.8}>
              <UserAvatar avatarId={selectedAvatarId} name={user?.name} uri={user?.avatar?.image} size={80} />
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{user?.name || 'Learner'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            {user?.username && <Text style={styles.username}>@{user.username.length > 12 ? user.username.slice(0, 12) + '...' : user.username}</Text>}
            <View style={styles.headerStats}>
              <View style={[styles.headerStatPill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.headerStatValue}>{num(xp)} XP</Text>
                <View style={[styles.levelBadge, { backgroundColor: levelInfo.color }]}>
                  <Ionicons name={levelInfo.icon} size={10} color="#fff" />
                  <Text style={styles.levelText}>Lv. {levelInfo.level}</Text>
                </View>
              </View>
              <View style={[styles.headerStatPill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="heart" size={16} color="#FF6B6B" />
                <Text style={styles.headerStatValue}>{num(hearts)} Hearts</Text>
              </View>
              <View style={[styles.headerStatPill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <StreakFlame streak={streak} />
              </View>
            </View>
            {badges.length > 0 && (
              <View style={styles.badgeRow}>
                {badges.slice(0, 5).map((b) => (
                  <Badge key={b.id} icon={b.icon} title="" variant="success" size="sm" />
                ))}
                {badges.length > 5 && <Text style={styles.moreBadges}>+{badges.length - 5}</Text>}
              </View>
            )}
          </LinearGradient>

          <View style={[styles.tabRow, { backgroundColor: colors.background }]}>
            {tabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  activeTab === t.key
                    ? [styles.tabActive, { backgroundColor: colors.primary }]
                    : { backgroundColor: isDark ? colors.surface : '#F1F5F9' },
                ]}
                onPress={() => setActiveTab(t.key)}
              >
                <Ionicons name={t.icon} size={18} color={activeTab === t.key ? '#fff' : colors.textSecondary} />
                <Text style={[styles.tabText, { color: activeTab === t.key ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.content}>
            {activeTab === 'stats' && (
              <>
                <GlassCard variant="elevated" style={styles.statsGrid}>
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: colors.primary }]}>{savedPhrases.length}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Words Learned</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: colors.accent }]}>{num(xp)}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total XP</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: colors.success }]}>{num(streak)}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                    </View>
                  </View>
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: '#8B5CF6' }]}>{num(coins)}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Coins</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: '#FF6B6B' }]}>{num(hearts)}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hearts</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: colors.accent }]}>{num(badges.length)}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Badges</Text>
                    </View>
                  </View>
                </GlassCard>
                <View style={styles.quickLinks}>
                  <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => navigation.navigate('Achievements')}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="trophy" size={20} color={colors.accent} />
                    </View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Achievements</Text>
                    <Text style={[styles.linkCount, { color: colors.textLight }]}>{badges.length}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => navigation.navigate('Leaderboard')}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="podium" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Leaderboard</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionHeader, { color: colors.text }]}>Analytics</Text>
                <GlassCard variant="elevated" style={styles.analyticsCard}>
                  <View style={styles.analyticsTitleRow}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="stats-chart" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.analyticsTitle, { color: colors.text }]}>Weekly Activity</Text>
                  </View>
                  {weeklyActivity.length === 0 ? (
                    <Text style={[styles.emptyAnalytics, { color: colors.textLight }]}>Practice with SULTI this week to see your activity.</Text>
                  ) : (
                    <View style={styles.barChart}>
                      {weeklyActivity.map((d, i) => {
                        const max = Math.max(...weeklyActivity.map((x) => x.xp), 1);
                        return (
                          <View key={i} style={styles.barCol}>
                            <Text style={[styles.barValue, { color: colors.textSecondary }]}>{num(d.xp)}</Text>
                            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                              <View style={[styles.barFill, { height: `${(num(d.xp) / max) * 100}%`, backgroundColor: d.color }]} />
                            </View>
                            <Text style={[styles.barDay, { color: colors.textLight }]}>{d.day}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </GlassCard>

                <GlassCard variant="elevated" style={styles.analyticsCard}>
                  <View style={styles.analyticsTitleRow}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="pulse" size={18} color={colors.accent} />
                    </View>
                    <Text style={[styles.analyticsTitle, { color: colors.text }]}>Module Mastery</Text>
                  </View>
                  {moduleMastery.length === 0 ? (
                    <Text style={[styles.emptyAnalytics, { color: colors.textLight }]}>Complete a lesson to start building your skills.</Text>
                  ) : (
                    moduleMastery.map((s) => (
                      <View key={s.label} style={styles.skillRow}>
                        <Text style={[styles.skillLabel, { color: colors.textSecondary }]} numberOfLines={1}>{s.label}</Text>
                        <View style={[styles.skillTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.skillFill, { width: `${num(s.value)}%`, backgroundColor: s.color }]} />
                        </View>
                        <Text style={[styles.skillValue, { color: colors.text }]}>{num(s.value)}%</Text>
                      </View>
                    ))
                  )}
                </GlassCard>

                <GlassCard variant="elevated" style={styles.analyticsCard}>
                  <View style={styles.analyticsTitleRow}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="trending-up" size={18} color={colors.success} />
                    </View>
                    <Text style={[styles.analyticsTitle, { color: colors.text }]}>Level Progress</Text>
                  </View>
                  <View style={styles.analyticsTitleRow}>
                    <Text style={[styles.skillValue, { color: colors.text }]}>LEVEL {levelInfo.level}</Text>
                    <Text style={[styles.analyticsTotal, { color: colors.textLight }]}>{levelInfo.label}</Text>
                  </View>
                  <View style={[styles.skillTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.skillFill, { width: `${num(levelInfo.progress)}%`, backgroundColor: colors.success }]} />
                  </View>
                  <Text style={[styles.levelProgressHint, { color: colors.textLight }]}>
                    {num(xp)} / {num(levelInfo.xpForNext)} XP &middot; {num(levelInfo.progress)}% to next level
                  </Text>
                </GlassCard>

                <Text style={[styles.sectionHeader, { color: colors.text }]}>More</Text>
                <View style={styles.quickLinks}>
                  <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => setInfoModal({ title: 'History', rows: history, kind: 'history' })}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.linkText, { color: colors.text }]}>History</Text>
                    {history.length > 0 && <Text style={[styles.linkCount, { color: colors.textLight }]}>{history.length}</Text>}
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => setInfoModal({ title: 'Certificates', rows: MOCK_CERTIFICATES, kind: 'cert' })}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="ribbon" size={20} color={colors.accent} />
                    </View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Certificates</Text>
                    <Text style={[styles.linkCount, { color: colors.textLight }]}>{MOCK_CERTIFICATES.length}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => setInfoModal({ title: 'Downloads', rows: MOCK_DOWNLOADS, kind: 'download' })}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="download" size={20} color={colors.success} />
                    </View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Downloads</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => setInfoModal({ title: 'Privacy', rows: null, kind: 'privacy' })}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.warning + '20' }]}>
                      <Ionicons name="shield-checkmark" size={20} color={colors.warning} />
                    </View>
                    <Text style={[styles.linkText, { color: colors.text }]}>Privacy</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {activeTab === 'profile' && (
              <GlassCard>
                {editing ? (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
                    <TextInput
                      id="editName"
                      name="editName"
                      testID="editName-input"
                      style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                      value={editName}
                      onChangeText={setEditName}
                      autoComplete="name"
                      autoCapitalize="words"
                    />
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Country</Text>
                    <TextInput
                      id="editCountry"
                      name="editCountry"
                      testID="editCountry-input"
                      style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                      value={editCountry}
                      onChangeText={setEditCountry}
                      autoComplete="country-name"
                      autoCapitalize="words"
                    />
                    <View style={styles.editActions}>
                      <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
                      <Button title="Save" onPress={handleSaveProfile} loading={saving} />
                    </View>
                  </>
                ) : (
                  <>
                    {[
                      { label: 'Name', value: user?.name },
                      { label: 'Username', value: user?.username ? `@${user.username}` : null },
                      { label: 'Email', value: user?.email },
                      { label: 'Country', value: user?.country },
                      { label: 'Native Language', value: user?.native_language || 'English' },
                      { label: 'Learning', value: user?.target_language || 'Bisaya' },
                      { label: 'Role', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : null },
                      { label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : null },
                    ].filter(i => i.value).map((item, idx) => (
                      <View key={idx}>
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
                        </View>
                        {idx < 7 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                      </View>
                    ))}
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                      <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Profile</Text>
                    </TouchableOpacity>
                  </>
                )}
              </GlassCard>
            )}

            {activeTab === 'phrases' && (
              <>
                {savedPhrases.length === 0 ? (
                  <GlassCard style={styles.emptyCard}>
                    <Ionicons name="bookmark-outline" size={48} color={colors.textLight} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No saved phrases</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textLight }]}>Save phrases from conversations to review later.</Text>
                  </GlassCard>
                ) : (
                  <>
                    <TouchableOpacity style={[styles.reviewBtn, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]} onPress={() => navigation.navigate('Flashcards')}>
                      <View style={[styles.linkIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="layers" size={20} color={colors.primary} />
                      </View>
                      <Text style={[styles.reviewText, { color: colors.text }]}>Review with Flashcards</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                    {savedPhrases.map((item) => (
                      <GlassCard key={item.phrase_id} style={styles.phraseCard} padding="md">
                        <View style={styles.phraseContent}>
                          <Text style={[styles.phraseText, { color: colors.text }]}>{item.phrase}</Text>
                          {item.language && <Badge title={item.language} variant="info" size="sm" />}
                        </View>
                         <TouchableOpacity
                           onPress={() => handleDeletePhrase(item.phrase_id)}
                           style={styles.iconBtn}
                           accessibilityRole="button"
                           accessibilityLabel="Delete phrase"
                         >
                          <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </GlassCard>
                    ))}
                  </>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <>
                <GlassCard>
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="contrast" size={18} color={colors.accent} />
                    </View>
                    <View>
                      <Text style={[styles.settingLabel, { color: colors.text }]}>Appearance</Text>
                      <Text style={[styles.settingSubLabel, { color: colors.textLight }]}>Natural follows your device theme</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.themePicker}>
                  {THEME_MODES.map((m) => {
                    const active = themeMode === m.value;
                    return (
                      <TouchableOpacity
                        key={m.value}
                        style={[styles.themeOption, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setThemeMode(m.value)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Ionicons name={m.icon} size={16} color={active ? '#fff' : colors.textSecondary} />
                        <Text style={[styles.themeOptionText, { color: active ? '#fff' : colors.textSecondary }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingRow} onPress={toggleReduceMotion}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="speedometer" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Reduce Motion</Text>
                  </View>
                  <View style={[styles.toggle, reduceMotion && { backgroundColor: colors.primary }]}>
                    <View style={[styles.toggleCircle, reduceMotion && { marginLeft: 20 }]} />
                  </View>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingRow} onPress={toggleHighContrast}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="contrast" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>High Contrast</Text>
                  </View>
                  <View style={[styles.toggle, highContrast && { backgroundColor: colors.primary }]}>
                    <View style={[styles.toggleCircle, highContrast && { marginLeft: 20 }]} />
                  </View>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingRow} onPress={toggleLargeText}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="text" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Large Text</Text>
                  </View>
                  <View style={[styles.toggle, largeText && { backgroundColor: colors.primary }]}>
                    <View style={[styles.toggleCircle, largeText && { marginLeft: 20 }]} />
                  </View>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="speedometer" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Speech Speed</Text>
                  </View>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{settings.speech_speed}x</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.textLight + '20' }]}>
                      <Ionicons name="information-circle" size={18} color={colors.textLight} />
                    </View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
                  </View>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>2.0.0</Text>
                </View>
              </GlassCard>

                <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: colors.glassBg, borderColor: colors.error + '30' }]} onPress={() => setShowSignOut(true)}>
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </AuroraBackground>

      <ConfirmModal
        visible={showSignOut}
        title="Sign Out?"
        message="You can sign back in anytime. Your progress stays saved on this device."
        confirmLabel="Sign Out"
        icon="log-out-outline"
        destructive
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOut(false)}
      />

      <Modal visible={!!infoModal} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(15,23,42,0.7)' }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{infoModal?.title}</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setInfoModal(null)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {infoModal?.kind === 'privacy' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                  {`SultiAI respects your privacy.\n\n• Your learning data (XP, streaks, saved phrases) is stored on your device and synced to your account when signed in.\n\n• Voice recordings are processed only to give you pronunciation feedback and are never sold or shared.\n\n• You can delete your saved phrases and account data at any time from the Phrases tab.\n\n• We use encryption for your credentials and never expose your password.`}
                </Text>
              </ScrollView>
            ) : infoModal?.kind === 'history' && (!infoModal?.rows || infoModal.rows.length === 0) ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="time-outline" size={48} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No conversations yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.textLight }]}>Your voice practice sessions will appear here.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {(infoModal?.rows || []).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.infoRowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (infoModal.kind === 'history') {
                        Alert.alert('Delete History', `Delete "${item.title}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteHistory(item.id) },
                        ]);
                      }
                    }}
                  >
                    <View style={[styles.infoRowIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={styles.infoRowBody}>
                      <Text style={[styles.infoRowTitle, { color: colors.text }]}>{item.title}</Text>
                      {item.date ? (
                        <Text style={[styles.infoRowMeta, { color: colors.textSecondary }]}>{item.date}{item.msgs ? ` \u00b7 ${item.msgs} msgs` : ''}</Text>
                      ) : item.size ? (
                        <Text style={[styles.infoRowMeta, { color: colors.textSecondary }]}>{item.size}</Text>
                      ) : (
                        <Text style={[styles.infoRowMeta, { color: colors.textSecondary }]}>{item.msgs} messages</Text>
                      )}
                    </View>
                    {infoModal.kind === 'history' ? (
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(15,23,42,0.7)' }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Avatar</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setShowAvatarPicker(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarGrid}>
              {USER_AVATARS.map((avatar) => {
                const isSelected = selectedAvatarId === avatar.id;
                return (
                  <TouchableOpacity
                    key={avatar.id}
                    style={[styles.avatarOption, isSelected && { borderColor: colors.primary, borderWidth: 3 }]}
                    onPress={() => handleAvatarSelect(avatar.id)}
                    activeOpacity={0.7}
                  >
                    <Image source={avatar.source} style={styles.avatarOptionImage} />
                    {isSelected && (
                      <View style={[styles.avatarCheck, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', paddingBottom: spacing.xxxl, paddingHorizontal: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  name: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: spacing.md, letterSpacing: 0.36 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: -0.24 },
  username: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2, letterSpacing: -0.08 },
  headerStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'center' },
  headerStatPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, gap: 6, backdropFilter: 'blur(8px)' },
  levelBadge: { position: 'absolute', top: -6, right: -6, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  levelText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  headerStatValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, alignItems: 'center' },
  moreBadges: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginTop: spacing.xxxl, marginBottom: spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs, ...shadows.sm },
  tabActive: { boxShadow: '0 2px 8px rgba(13,148,136,0.3)', elevation: 4 },
  tabText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.07 },
  content: { padding: spacing.xl, paddingTop: spacing.sm },
  statsGrid: { marginBottom: spacing.md },
  statRow: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', letterSpacing: 0.36 },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.07 },
  quickLinks: { gap: spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1 },
  linkIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  linkText: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.24 },
  linkCount: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  infoLabel: { fontSize: 14, letterSpacing: -0.24 },
  infoValue: { fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right', letterSpacing: -0.24 },
  divider: { height: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, marginTop: spacing.md, gap: spacing.xs },
  editBtnText: { fontSize: 14, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm, letterSpacing: -0.08 },
  fieldInput: { borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, borderWidth: 1, marginBottom: spacing.sm },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, justifyContent: 'flex-end' },
  emptyCard: { alignItems: 'center', padding: spacing.xxl, marginBottom: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: spacing.md, letterSpacing: 0.35 },
  emptyDesc: { fontSize: 13, marginTop: spacing.sm, textAlign: 'center', letterSpacing: -0.08 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, borderWidth: 1 },
  reviewText: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.24 },
  phraseCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  phraseContent: { flex: 1 },
  phraseText: { fontSize: 15, fontWeight: '500', marginBottom: spacing.xs, letterSpacing: -0.24 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500', letterSpacing: -0.24 },
  settingSubLabel: { fontSize: 12, marginTop: 2 },
  settingValue: { fontSize: 14, letterSpacing: -0.24 },
  themePicker: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  themeOptionText: { fontSize: 13, fontWeight: '700' },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#D1D5DB', padding: 2, justifyContent: 'center' },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl, marginBottom: 40, paddingVertical: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1.5, gap: spacing.sm },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  sectionHeader: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, marginTop: spacing.lg, marginBottom: spacing.md },
  analyticsCard: { marginBottom: spacing.md },
  analyticsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  analyticsTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  analyticsTotal: { fontSize: 12, fontWeight: '600' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  barValue: { fontSize: 9, fontWeight: '600' },
  barTrack: { width: 18, height: 70, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barDay: { fontSize: 10, fontWeight: '700' },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  skillLabel: { width: 90, fontSize: 12, fontWeight: '500' },
  skillTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  skillFill: { height: '100%', borderRadius: 4 },
  skillValue: { width: 40, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  levelProgressHint: { fontSize: 13, fontWeight: '600', marginTop: spacing.sm, textAlign: 'center' },
  emptyAnalytics: { fontSize: 13, lineHeight: 19, paddingVertical: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '70%', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  infoRowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm },
  infoRowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoRowBody: { flex: 1 },
  infoRowTitle: { fontSize: 14, fontWeight: '700' },
  infoRowMeta: { fontSize: 12, marginTop: 2 },
  privacyText: { fontSize: 14, lineHeight: 22 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center',
  },
  avatarOption: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: 'transparent',
    overflow: 'hidden', position: 'relative',
  },
  avatarOptionImage: {
    width: '100%', height: '100%', borderRadius: 50,
  },
  avatarCheck: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
});
