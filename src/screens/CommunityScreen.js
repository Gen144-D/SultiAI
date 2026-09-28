import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated, ScrollView, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useGame } from '../context/GameContext';
import { api } from '../services/api';
import { FEED_FILTERS } from '../constants/community';
import { normalizeNotification } from '../utils/notifications';
import { getLevel } from '../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import BottomSheet from '../components/BottomSheet';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import AuroraBackground from '../components/AuroraBackground';
import PostCard from './community/PostCard';
import CreatePostSheet from './community/CreatePostSheet';
import { spacing, borderRadius } from '../theme';

const PRIMARY_TABS = [
  { key: 'feed', label: 'Feed', icon: 'home', iconOutline: 'home-outline' },
  { key: 'challenges', label: 'Challenges', icon: 'trophy', iconOutline: 'trophy-outline' },
  { key: 'leaderboard', label: 'Leaderboard', icon: 'podium', iconOutline: 'podium-outline' },
  { key: 'me', label: 'Me', icon: 'person', iconOutline: 'person-outline' },
];

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'question', label: 'Questions', icon: 'help-circle' },
  { key: 'tip', label: 'Tips', icon: 'bulb' },
  { key: 'vocabulary', label: 'Vocabulary', icon: 'book' },
  { key: 'culture', label: 'Culture', icon: 'color-palette' },
];

const PERIODS = [
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'all_time', label: 'All Time' },
];

export default function CommunityScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useUser();
  const { xp, streak, badges, addXp } = useGame();
  const insets = useSafeAreaInsets();
  const padTop = Platform.OS === 'ios' ? insets.top : spacing.xl;

  const [activeTab, setActiveTab] = useState('feed');
  const [feedFilter, setFeedFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('question');
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState(false);
  const [lbPeriod, setLbPeriod] = useState('weekly');
  const [challengeData, setChallengeData] = useState([]);
  const [weeklyChallenge, setWeeklyChallenge] = useState([]);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [challengeError, setChallengeError] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifError, setNotifError] = useState(false);
  const [myActivity, setMyActivity] = useState([]);
  const listRef = useRef(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line react-hooks/refs
  const collapse = scrollY.interpolate({ inputRange: [0, 36], outputRange: [0, 1], extrapolate: 'clamp' });
  const subtitleOpacity = collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  // eslint-disable-next-line react-hooks/refs
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true });
  const scrollProps = { onScroll, scrollEventThrottle: 16 };

  const levelInfo = useMemo(() => getLevel(Math.max(0, Number(xp) || 0)), [xp]);
  const communityMetrics = useMemo(() => {
    const all = Array.isArray(posts) ? posts : [];
    const today = new Date().setHours(0, 0, 0, 0);
    const todayPosts = all.filter((p) => new Date(p.created_at).getTime() >= today);
    const questionsToday = todayPosts.filter((p) => p.type === 'question' || p.type === 'translation' || p.type === 'pronunciation').length;
    const tipsToday = todayPosts.filter((p) => p.type === 'tip' || p.type === 'vocabulary').length;
    const answersToday = all.filter((p) => (p.comments || 0) > 0).length;
    return { questionsToday, tipsToday, answersToday };
  }, [posts]);

  const dashboardStats = useMemo(() => {
    const all = Array.isArray(posts) ? posts : [];
    const authors = new Set(all.map((p) => p.author_name).filter(Boolean));
    const totalLikes = all.reduce((sum, p) => sum + (Number(p.likes) || 0), 0);
    const totalComments = all.reduce((sum, p) => sum + (Number(p.comments) || 0), 0);
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const start = d.getTime();
      const end = start + 86400000;
      const count = all.filter((p) => {
        const t = new Date(p.created_at).getTime();
        return t >= start && t < end;
      }).length;
      return { label: dayLabels[d.getDay()], count, isToday: i === 6 };
    });
    const maxDay = Math.max(1, ...weekly.map((d) => d.count));
    const tagCounts = {};
    all.forEach((p) => (p.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const trendingTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
    const topAuthors = Object.entries(
      all.reduce((acc, p) => {
        const name = p.author_name || 'Anonymous';
        acc[name] = acc[name] || { posts: 0, likes: 0, count: 0 };
        acc[name].count += 1;
        acc[name].likes += Number(p.likes) || 0;
        return acc;
      }, {}),
    ).sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([name, v]) => ({ name, ...v }));
    return {
      activeMembers: authors.size,
      totalPosts: all.length,
      totalLikes,
      totalComments,
      weekly,
      maxDay,
      trendingTags,
      topAuthors,
    };
  }, [posts]);

  const unread = notifications.filter((n) => !n.read).length;
  const canPost = activeTab === 'feed';
  const searching = searchFocused && query.trim().length > 0;

  const loadPosts = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await api.getCommunityPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadPosts, 0);
    return () => clearTimeout(t);
  }, [loadPosts]);

  const loadNotifications = useCallback(async () => {
    setNotifError(false);
    try {
      const data = await api.getNotifications();
      setNotifications(
        (Array.isArray(data) ? data : []).map(normalizeNotification).filter(Boolean)
      );
    } catch {
      setNotifError(true);
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadNotifications, 0);
    return () => clearTimeout(t);
  }, [loadNotifications]);

  const loadLeaderboard = useCallback(async (period = lbPeriod) => {
    setLbLoading(true);
    setLbError(false);
    try {
      const data = await api.getLeaderboard(period);
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {
      setLbError(true);
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      const t = setTimeout(() => loadLeaderboard(lbPeriod), 0);
      return () => clearTimeout(t);
    }
  }, [activeTab, lbPeriod, loadLeaderboard]);

  const loadChallenges = async () => {
    setChallengeLoading(true);
    setChallengeError(false);
    try {
      const [daily, weekly] = await Promise.allSettled([
        api.getDailyChallenge(),
        api.getWeeklyChallenge(),
      ]);
      setChallengeData(daily.status === 'fulfilled' && Array.isArray(daily.value) ? daily.value : []);
      setWeeklyChallenge(weekly.status === 'fulfilled' && Array.isArray(weekly.value) ? weekly.value : []);
      if (daily.status === 'rejected' && weekly.status === 'rejected') setChallengeError(true);
    } catch {
      setChallengeError(true);
    } finally {
      setChallengeLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'challenges') {
      const t = setTimeout(loadChallenges, 0);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  const loadMyActivity = useCallback(async () => {
    try {
      const all = await api.getCommunityPosts();
      const rows = Array.isArray(all) ? all : [];
      const myName = (user?.fullname || '').trim().toLowerCase();
      setMyActivity(myName ? rows.filter((p) => (p.author_name || '').trim().toLowerCase() === myName) : []);
    } catch {
      setMyActivity([]);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'me') {
      const t = setTimeout(loadMyActivity, 0);
      return () => clearTimeout(t);
    }
  }, [activeTab, loadMyActivity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([loadPosts(), loadNotifications()]);
    setRefreshing(false);
  };

  const openCreate = (type = 'question') => {
    setCreateType(type);
    setShowCreate(true);
  };

  const handleCreatePost = async ({ type, native, english }) => {
    const bisaya = (native || '').trim();
    const translation = (english || '').trim();
    if (!bisaya) {
      Alert.alert('Empty post', 'Write something in Bisaya first.');
      return;
    }
    try {
      // The server requires both title and content, so the first line becomes
      // the headline and the remainder the body.
      const [firstLine, ...rest] = bisaya.split('\n');
      const post = await api.createCommunityPost({
        type,
        title: (firstLine || bisaya).slice(0, 160),
        content: rest.join('\n').trim() || bisaya,
        phrase: bisaya,
        translation: translation || null,
      });
      setPosts((prev) => [post, ...prev]);
      setShowCreate(false);
      setActiveTab('feed');
      if (type === 'question') {
        await addXp(10, 'community_question');
        Alert.alert('Question posted', '+10 XP for asking the community!');
      } else {
        Alert.alert('Posted', 'Thanks for sharing with the community!');
      }
    } catch (err) {
      Alert.alert('Could not post', err.message || 'Something went wrong. Please try again.');
    }
  };

  const toggleComments = async (postId) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    try {
      const data = await api.getPostComments(postId);
      setComments((prev) => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      console.warn('[Community] Failed to load comments:', e.message);
      setComments((prev) => ({ ...prev, [postId]: [] }));
    }
  };

  const handleAddComment = async (postId, comment) => {
    if (!comment.trim()) return;
    try {
      await api.createPostComment(postId, comment);
      const data = await api.getPostComments(postId);
      const rows = Array.isArray(data) ? data : [];
      setComments((prev) => ({ ...prev, [postId]: rows }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: (Number(p.comments) || 0) + 1 } : p))
      );
    } catch (e) {
      console.warn('[Community] Failed to add comment:', e.message);
      Alert.alert('Could not comment', 'Your comment was not saved. Please try again.');
    }
  };

  const handleReport = async (post) => {
    Alert.alert('Not available', 'Reporting is not enabled yet.');
  };

  const filteredPosts = posts.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (feedFilter === 'popular') return (p.likes || 0) >= 20;
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (feedFilter === 'latest') return new Date(b.created_at) - new Date(a.created_at);
    if (feedFilter === 'popular') return (b.likes || 0) - (a.likes || 0);
    return 0;
  });

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return posts.filter((p) =>
      `${p.title || ''} ${p.native || ''} ${p.english || ''} ${p.content || ''} ${p.author_name || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, posts]);

  const myRank = useMemo(() => {
    const name = user?.fullname?.split(' ')[0] || 'You';
    const idx = leaderboard.findIndex((l) => (l.name || '').toLowerCase() === name.toLowerCase());
    if (idx === -1) return null;
    return { rank: idx + 1, xp: Number(leaderboard[idx].xp) || 0, streak: Number(leaderboard[idx].streak) || 0 };
  }, [leaderboard, user]);

  const renderTabs = () => (
    <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        alwaysBounceHorizontal={false}
      >
        {PRIMARY_TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && { backgroundColor: colors.primaryLight }]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={active ? t.icon : t.iconOutline} size={15} color={active ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary }]}>{t.label}</Text>
              {active && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderPeriodFilters = () => (
    <View style={[styles.periodBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodRow}
        alwaysBounceHorizontal={false}
      >
        {PERIODS.map((p) => {
          const active = lbPeriod === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setLbPeriod(p.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.periodChipText, { color: active ? '#fff' : colors.textSecondary }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderDashboard = () => {
    const { activeMembers, totalPosts, weekly, maxDay, trendingTags } = dashboardStats;
    const kpis = [
      { key: 'members', label: 'Active today', value: activeMembers, suffix: 'learners', icon: 'people', color: colors.primary },
      { key: 'questions', label: 'Questions', value: communityMetrics.questionsToday, suffix: 'asked today', icon: 'help-circle', color: colors.accent },
      { key: 'answers', label: 'Answers', value: communityMetrics.answersToday, suffix: 'given today', icon: 'chatbox-ellipses', color: colors.secondary },
      { key: 'tips', label: 'Tips shared', value: communityMetrics.tipsToday, suffix: 'today', icon: 'bulb', color: colors.success },
    ];
    return (
      <View>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dashHero}
        >
          <View style={styles.dashHeroHeader}>
            <View style={styles.dashHeroTitleWrap}>
              <View style={[styles.dashHeroIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="stats-chart" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.dashHeroTitle}>Community Pulse</Text>
                <Text style={styles.dashHeroSubtitle}>Overview of learner activity</Text>
              </View>
            </View>
          </View>
          <View style={styles.kpiGrid}>
            {kpis.map((k) => (
              <View key={k.key} style={[styles.kpiTile, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.16)' }]}>
                <View style={[styles.kpiIcon, { backgroundColor: k.color + '2E' }]}>
                  <Ionicons name={k.icon} size={16} color="#fff" />
                </View>
                <Text style={styles.kpiValue}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiSuffix}>{k.suffix}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Card style={styles.dashCard}>
          <View style={styles.dashCardHeader}>
            <View>
              <Text style={[styles.dashCardTitle, { color: colors.text }]}>Weekly Activity</Text>
              <Text style={[styles.dashCardSubtitle, { color: colors.textSecondary }]}>Posts shared over the last 7 days</Text>
            </View>
            <View style={[styles.totalPill, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.totalPillText, { color: colors.primary }]}>{totalPosts} posts</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {weekly.map((d, i) => (
              <View key={i} style={styles.chartGroup}>
                <View style={[styles.chartTrack, { backgroundColor: colors.surfaceSecondary }]}>
                  <View
                    style={[
                      styles.chartFill,
                      {
                        height: `${Math.max(6, (d.count / maxDay) * 100)}%`,
                        backgroundColor: d.isToday ? colors.primary : colors.accent + '66',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.chartLabel, { color: d.isToday ? colors.primary : colors.textLight }]}>{d.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: colors.border }]}>
            <View style={styles.chartLegendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.chartLegendText, { color: colors.textSecondary }]}>Today</Text>
            </View>
            <View style={styles.chartLegendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.chartLegendText, { color: colors.textSecondary }]}>Previous days</Text>
            </View>
          </View>
        </Card>

        {trendingTags.length > 0 && (
          <View style={styles.trendingWrap}>
            <View style={styles.trendingHeader}>
              <Ionicons name="trending-up" size={15} color={colors.primary} />
              <Text style={[styles.trendingTitle, { color: colors.text }]}>Trending Topics</Text>
            </View>
            <View style={styles.trendingChips}>
              {trendingTags.map((t) => (
                <TouchableOpacity
                  key={t.name}
                  style={[styles.trendChip, { backgroundColor: colors.primary + '0E', borderColor: colors.primary + '28' }]}
                  onPress={() => setQuery(t.name)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Search topic ${t.name}`}
                >
                  <Ionicons name="pricetag" size={11} color={colors.primary} />
                  <Text style={[styles.trendChipText, { color: colors.primary }]}>{t.name}</Text>
                  <Text style={[styles.trendChipCount, { color: colors.primary + '99' }]}>{t.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {dashboardStats.topAuthors.length > 0 && (
          <Card style={styles.dashCard}>
            <View style={styles.dashCardHeader}>
              <View>
                <Text style={[styles.dashCardTitle, { color: colors.text }]}>Top Contributors</Text>
                <Text style={[styles.dashCardSubtitle, { color: colors.textSecondary }]}>Most active members this week</Text>
              </View>
            </View>
            {dashboardStats.topAuthors.map((a, i) => (
              <View key={a.name} style={[styles.contribRow, i < dashboardStats.topAuthors.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.contribRank, { backgroundColor: i === 0 ? colors.warning + '18' : colors.surfaceSecondary }]}>
                  <Text style={[styles.contribRankText, { color: i === 0 ? colors.warning : colors.textSecondary }]}>{i + 1}</Text>
                </View>
                <Avatar name={a.name} size={34} />
                <View style={styles.contribInfo}>
                  <Text style={[styles.contribName, { color: colors.text }]}>{a.name}</Text>
                  <Text style={[styles.contribMeta, { color: colors.textLight }]}>{a.count} posts · {a.likes} likes</Text>
                </View>
                <View style={[styles.contribBadge, { backgroundColor: colors.primary + '0E' }]}>
                  <Ionicons name="star" size={12} color={colors.primary} />
                  <Text style={[styles.contribBadgeText, { color: colors.primary }]}>{a.count} posts</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>
    );
  };

  const renderFeed = () => (
    <FlatList
      data={sortedPosts}
      keyExtractor={(item) => item.id?.toString()}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={onRefresh}
      {...scrollProps}
      ListHeaderComponent={
        <>
          {renderDashboard()}
          <View style={styles.filterRow}>
            <FlatList
              horizontal
              data={FEED_FILTERS}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = feedFilter === item.key;
                return (
                  <TouchableOpacity
                    style={[styles.filterChip, active && { backgroundColor: colors.primary }]}
                    onPress={() => setFeedFilter(item.key)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={item.icon} size={13} color={active ? '#fff' : colors.textSecondary} />
                    <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.textSecondary }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          <View style={styles.filterRow}>
            <FlatList
              horizontal
              data={TYPE_FILTERS}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = typeFilter === item.key;
                return (
                  <TouchableOpacity
                    style={[styles.typeChip, active && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                    onPress={() => setTypeFilter(item.key)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={item.icon} size={13} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.typeChipText, { color: active ? colors.primary : colors.textSecondary }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          {feedFilter === 'popular' && (
            <Card style={styles.hintCard}>
              <Ionicons name="flame" size={18} color={colors.primary} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>Posts with 20 or more likes.</Text>
            </Card>
          )}
        </>
      }
      renderItem={({ item }) => (
        <PostCard
          post={item}
          expanded={expandedPost === item.id}
          comments={comments[item.id] || []}
          onToggleComments={toggleComments}
          onAddComment={handleAddComment}
          onReport={handleReport}
        />
      )}
      ListEmptyComponent={
        loadError ? (
          <ErrorState
            icon="cloud-offline-outline"
            title="Could not load the feed"
            message="Check your connection and try again."
            actionLabel="Retry"
            onAction={loadPosts}
          />
        ) : (
          <View style={styles.emptyInvite}>
            <View style={[styles.emptyInviteIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="leaf" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyInviteTitle, { color: colors.text }]}>Your community starts here.</Text>
            <Text style={[styles.emptyInviteMessage, { color: colors.textSecondary }]}>
              Ask a Bisaya question, share a phrase you&apos;ve learned, or help another learner grow.
            </Text>
            <View style={styles.emptyInviteActions}>
              <TouchableOpacity
                style={[styles.emptyInviteBtn, { backgroundColor: colors.primary }]}
                onPress={() => openCreate('question')}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Ionicons name="help-circle" size={16} color="#fff" />
                <Text style={styles.emptyInviteBtnText}>Ask a Question</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyInviteBtn, styles.emptyInviteBtnOutline, { borderColor: colors.primary }]}
                onPress={() => openCreate('tip')}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Ionicons name="bulb" size={16} color={colors.primary} />
                <Text style={[styles.emptyInviteBtnText, { color: colors.primary }]}>Share a Learning Tip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    />
  );

  const renderChallenges = () => {
    const daily = Array.isArray(challengeData) ? challengeData : [];
    const weekly = Array.isArray(weeklyChallenge) ? weeklyChallenge : [];
    if (challengeLoading) return <LoadingState fullScreen />;
    if (challengeError && daily.length === 0 && weekly.length === 0) {
      return (
        <View style={styles.list}>
          <ErrorState
            icon="trophy-outline"
            title="Could not load challenges"
            message="Check your connection and try again."
            actionLabel="Retry"
            onAction={loadChallenges}
          />
        </View>
      );
    }
    const items = [
      ...daily.map((c) => ({
        id: `d-${c.id}`, title: c.title, desc: c.description || '', completed: !!c.completed,
        xp: Number(c.xpReward) || Number(c.xp_reward) || 20, icon: c.icon || 'sunny', color: '#3B82F6', scenario: c.scenario, kind: 'Daily',
      })),
      ...weekly.map((c) => ({
        id: `w-${c.id}`, title: c.title, desc: c.description || '', completed: !!c.completed,
        xp: Number(c.xpReward) || Number(c.xp_reward) || 100, icon: c.icon || 'calendar', color: '#8B5CF6', scenario: c.scenario, kind: 'Weekly',
      })),
    ];

    if (items.length === 0) {
      return (
        <View style={styles.list}>
          <EmptyState icon="trophy-outline" title="No active challenges" message="New challenges drop regularly — check back soon." />
        </View>
      );
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        {...scrollProps}
        ListHeaderComponent={
          <Card style={[styles.streakCard, { borderColor: colors.accent + '40' }]}>
            <Ionicons name="flame" size={26} color={colors.warning} />
            <View style={styles.hubInfo}>
              <Text style={[styles.hubTitle, { color: colors.text }]}>Your streak: {Math.max(0, Number(streak) || 0)} days</Text>
              <Text style={[styles.hubDesc, { color: colors.textSecondary }]}>Keep the momentum — every completed challenge earns XP and coins.</Text>
            </View>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.hubCard}>
            <View style={[styles.hubIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.hubInfo}>
              <View style={styles.eventRow}>
                <Text style={[styles.hubTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={[styles.typeTag, { backgroundColor: item.color + '18' }]}>
                  <Text style={[styles.typeTagText, { color: item.color }]}>{item.kind}</Text>
                </View>
              </View>
              <Text style={[styles.hubDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              <View style={[styles.xpPill, { backgroundColor: item.color + '15', alignSelf: 'flex-start', marginTop: 6 }]}>
                <Ionicons name="star" size={12} color={item.color} />
                <Text style={[styles.xpPillText, { color: item.color }]}>+{Math.max(0, item.xp)} XP</Text>
              </View>
            </View>
            {item.completed ? (
              <View style={[styles.completedBadge, { backgroundColor: colors.success + '18' }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.completedText, { color: colors.success }]}>Done</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('SULTI', { situation: item.scenario || item.title, label: item.title })}
              >
                <Text style={styles.joinBtnText}>Start</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
      />
    );
  };

  const renderLeaderboard = () => {
    if (lbLoading && leaderboard.length === 0) return <LoadingState fullScreen />;
    if (lbError && leaderboard.length === 0) {
      return (
        <View style={styles.list}>
          <ErrorState
            icon="podium-outline"
            title="Could not load the leaderboard"
            message="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => loadLeaderboard(lbPeriod)}
          />
        </View>
      );
    }
    const rank = myRank?.rank || leaderboard.length + 1;
    const rankXp = myRank?.xp ?? xp;
    return (
      <FlatList
        data={leaderboard}
        keyExtractor={(item, index) => `${item.id || item.name || index}`}
        contentContainerStyle={styles.list}
        {...scrollProps}
        ListHeaderComponent={
          <Card style={styles.yourRankCard}>
            <View style={styles.yourRankHeader}>
              <Ionicons name="ribbon" size={20} color={colors.accent} />
              <Text style={[styles.yourRankLabel, { color: colors.textSecondary }]}>YOUR RANK</Text>
            </View>
            <View style={styles.yourRankRow}>
              <View style={[styles.yourRankBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.yourRankNum}>#{rank}</Text>
              </View>
              <View style={styles.yourRankStats}>
                <Text style={[styles.yourRankXp, { color: colors.text }]}>{rankXp.toLocaleString()} XP</Text>
                <Text style={[styles.yourRankLevel, { color: colors.textSecondary }]}>
                  Level {levelInfo.level} · {levelInfo.label}
                </Text>
              </View>
              <View style={styles.yourRankStreak}>
                <Ionicons name="flame" size={16} color={colors.warning} />
                <Text style={[styles.yourRankStreakText, { color: colors.textSecondary }]}>{Math.max(0, Number(streak) || 0)}</Text>
              </View>
            </View>
          </Card>
        }
        ListEmptyComponent={
          <EmptyState icon="podium-outline" title="No rankings yet" message="Earn XP to climb the leaderboard!" />
        }
        renderItem={({ item, index }) => {
          const r = Number(item.rank) || index + 1;
          const xpVal = Math.max(0, Number(item.xp) || 0);
          const streakVal = Math.max(0, Number(item.streak) || 0);
          const lvl = getLevel(xpVal).level;
          return (
            <Card style={[styles.hubCard, r === 1 && { borderColor: colors.accent + '50' }]}>
              <View style={[styles.rankBadge, r === 1 && { backgroundColor: colors.accent }]}>
                <Text style={[styles.rankText, r === 1 && { color: '#fff' }]}>{r}</Text>
              </View>
              <Avatar name={item.name} size={36} />
              <View style={styles.hubInfo}>
                <Text style={[styles.hubTitle, { color: colors.text }]}>{item.name || 'Anonymous'}</Text>
                <View style={styles.eventRow}>
                  <Ionicons name="flame" size={12} color={colors.warning} />
                  <Text style={[styles.eventText, { color: colors.textSecondary }]}>{streakVal} day streak · Lv. {lvl}</Text>
                </View>
              </View>
              <Text style={[styles.xpValue, { color: colors.primary }]}>{xpVal.toLocaleString()} XP</Text>
            </Card>
          );
        }}
      />
    );
  };

  const renderMe = () => {
    const completedChallenges = [...challengeData, ...weeklyChallenge].filter((c) => c.completed).length;
    const tabs = [
      { key: 'notifications', label: 'Notifications', icon: 'notifications', count: unread },
      { key: 'activity', label: 'My Activity', icon: 'time', count: myActivity.length },
    ];
    const stats = [
      { label: 'Rank', value: myRank ? `#${myRank.rank}` : '—' },
      { label: 'Level', value: String(levelInfo.level) },
      { label: 'Posts', value: String(myActivity.length) },
      { label: 'Badges', value: String(badges?.length || 0) },
    ];
    return (
      <FlatList
        data={tabs}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        {...scrollProps}
        ListHeaderComponent={
          <>
            <Card style={styles.profileCard}>
              <Avatar name={user?.fullname || 'You'} size={56} />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>{user?.fullname || 'Welcome, Learner!'}</Text>
                <Text style={[styles.profileBio, { color: colors.textSecondary }]}>
                  {user?.native_language || 'Bisaya (Cebuano)'} learner · {Math.max(0, Number(streak) || 0)} day streak
                </Text>
              </View>
            </Card>
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                {stats.map((s, i) => (
                  <View key={s.label} style={[styles.stat, i < stats.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.meStatsDivider, { borderTopColor: colors.border }]}>
                <View style={styles.meStatRow}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <Text style={[styles.meStatText, { color: colors.textSecondary }]}>
                    {xp.toLocaleString()} XP · {levelInfo.label} ({levelInfo.progress.toFixed(0)}% to next)
                  </Text>
                </View>
                <View style={styles.meStatRow}>
                  <Ionicons name="trophy" size={14} color={colors.warning} />
                  <Text style={[styles.meStatText, { color: colors.textSecondary }]}>
                    {completedChallenges} challenges completed
                  </Text>
                </View>
              </View>
            </Card>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.meRow, { borderBottomColor: colors.border }]} onPress={() => {
            if (item.key === 'notifications') {
              setShowNotifications(true);
            } else if (myActivity.length === 0) {
              Alert.alert('No activity yet', 'Your questions and shared posts will appear here.');
            } else {
              Alert.alert('My Activity', myActivity.map((p) => p.title).join('\n\n'));
            }
          }} activeOpacity={0.8}>
            <View style={[styles.meIcon, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.meLabel, { color: colors.text }]}>{item.label}</Text>
            {item.count > 0 && <Badge title={String(item.count)} variant="primary" size="sm" />}
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderSearch = () => {
    const rows = searchResults;
    if (rows.length === 0) {
      return (
        <View style={styles.list}>
          <EmptyState icon="search" title="No results" message={`Nothing found for "${query}". Try a different word.`} />
        </View>
      );
    }
    return (
      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item.id ?? index}`}
        contentContainerStyle={styles.list}
        {...scrollProps}
        ListHeaderComponent={
          <Text style={[styles.searchResultCount, { color: colors.textSecondary }]}>
            {rows.length} {rows.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
          </Text>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            expanded={expandedPost === item.id}
            comments={comments[item.id] || []}
            onToggleComments={toggleComments}
            onAddComment={handleAddComment}
            onReport={handleReport}
          />
        )}
      />
    );
  };

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
    api.markNotificationRead(id).catch(() => {});
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    api.markAllNotificationsRead().catch(() => {});
  }, []);

  const renderNotificationsSheet = () => (
    <BottomSheet visible={showNotifications} onClose={() => setShowNotifications(false)} title="Notifications" height={480} bottomInset={96}>
      {unread > 0 && (
        <TouchableOpacity
          onPress={markAllNotificationsRead}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
          style={[styles.sheetClearAll, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '33' }]}
        >
          <Ionicons name="checkmark-done" size={16} color={colors.primary} />
          <Text style={[styles.sheetClearAllText, { color: colors.primary }]}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      {notifications.length === 0 ? (
        <View style={styles.sheetEmpty}>
          <Ionicons name="notifications-off-outline" size={28} color={colors.textLight} />
          <Text style={[styles.sheetEmptyText, { color: colors.textSecondary }]}>
            {notifError ? 'Could not load notifications.' : 'No notifications yet.'}
          </Text>
        </View>
      ) : (
        notifications.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[styles.notifRow, !n.read && { backgroundColor: colors.primary + '08' }]}
            onPress={() => markNotificationRead(n.id)}
            disabled={n.read}
            activeOpacity={0.8}
          >
            <View style={[styles.notifIcon, { backgroundColor: (n.read ? colors.surfaceSecondary : colors.primary) + '18' }]}>
              <Ionicons name={n.icon} size={18} color={n.read ? colors.textSecondary : colors.primary} />
            </View>
            <View style={styles.notifBody}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>{n.title}</Text>
              {!!n.body && <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>{n.body}</Text>}
              {!!n.time && <Text style={[styles.notifTime, { color: colors.textLight }]}>{n.time}</Text>}
            </View>
            {!n.read && <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))
      )}
    </BottomSheet>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'challenges': return renderChallenges();
      case 'leaderboard': return renderLeaderboard();
      case 'me': return renderMe();
      case 'feed':
      default: return renderFeed();
    }
  };

  if (loading && activeTab === 'feed') return <LoadingState fullScreen />;

  return (
    <AuroraBackground style={styles.container} atmosphere="community">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: padTop }]}>
        <View style={styles.headerRow}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.softPurple }]}>
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerKicker, { color: colors.textSecondary }]}>Community Dashboard</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {user?.fullname?.split(' ')[0] || 'Learner'}
            </Text>
            <Animated.View style={{ opacity: subtitleOpacity }}>
              <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
                {(() => {
                  const h = new Date().getHours();
                  if (h < 12) return 'Maayong buntag — good morning.';
                  if (h < 18) return 'Maayong hapon — good afternoon.';
                  return 'Maayong gabii — good evening.';
                })()}
              </Text>
            </Animated.View>
          </View>
          <View style={styles.headerActions}>
            {canPost && (
              <TouchableOpacity
                onPress={() => openCreate()}
                style={[styles.iconBtn, styles.createBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Create a post"
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textLight} />
          <TextInput
            id="communitySearch"
            name="communitySearch"
            testID="communitySearch-input"
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search community posts..."
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
            autoComplete="off"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClear} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderTabs()}
      {activeTab === 'leaderboard' && renderPeriodFilters()}

      {searching ? renderSearch() : renderTab()}

      <CreatePostSheet
        visible={showCreate}
        initialType={createType}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreatePost}
      />
      {renderNotificationsSheet()}
    </AuroraBackground>
  );
  }

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginBottom: spacing.sm },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  headerText: { flex: 1 },
  headerKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2, lineHeight: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  createBtn: { width: 40, height: 40, borderRadius: 20, padding: 0 },
  searchBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  searchClear: { padding: 2 },
  tabBar: { borderBottomWidth: 1 },
  tabRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingVertical: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: 2, alignSelf: 'center', width: 18, height: 3, borderRadius: 2 },
  periodBar: { borderBottomWidth: 1 },
  periodRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingVertical: spacing.sm },
  periodChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: 'transparent' },
  periodChipText: { fontSize: 12, fontWeight: '700' },
  list: { padding: spacing.xl, paddingTop: spacing.lg },
  sampleBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  sampleBannerText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  filterRow: { marginBottom: spacing.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, marginRight: spacing.sm },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, marginRight: spacing.sm },
  typeChipText: { fontSize: 12, fontWeight: '700' },
  hintCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  hintText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  metricsCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricInfo: { flex: 1 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  metricLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  metricDivider: { width: 1, height: 24, marginHorizontal: spacing.sm },
  dashHero: { borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md },
  dashHeroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  dashHeroTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dashHeroIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dashHeroTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  dashHeroSubtitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22D3EE' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiTile: { width: '48.5%', borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.md, gap: 2 },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
  kpiSuffix: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  dashCard: { marginBottom: spacing.md },
  dashCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  dashCardTitle: { fontSize: 15, fontWeight: '800' },
  dashCardSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  totalPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  totalPillText: { fontSize: 11, fontWeight: '800' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96, gap: spacing.xs, marginBottom: spacing.md },
  chartGroup: { flex: 1, alignItems: 'center', gap: spacing.xs },
  chartTrack: { width: '100%', height: 76, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartFill: { width: '100%', borderRadius: 6 },
  chartLabel: { fontSize: 10, fontWeight: '700' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderTopWidth: 1, paddingTop: spacing.sm },
  chartLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  chartLegendText: { fontSize: 11, fontWeight: '600' },
  trendingWrap: { marginBottom: spacing.lg },
  trendingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  trendingTitle: { fontSize: 13, fontWeight: '800' },
  trendingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  trendChipText: { fontSize: 12, fontWeight: '700' },
  trendChipCount: { fontSize: 11, fontWeight: '700' },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  contribRank: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  contribRankText: { fontSize: 12, fontWeight: '800' },
  contribInfo: { flex: 1 },
  contribName: { fontSize: 13, fontWeight: '700' },
  contribMeta: { fontSize: 11, marginTop: 2 },
  contribBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  contribBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyInvite: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyInviteIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  emptyInviteTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  emptyInviteMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  emptyInviteActions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  emptyInviteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  emptyInviteBtnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  emptyInviteBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  discoverCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  discoverIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  discoverInfo: { flex: 1 },
  discoverNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  discoverName: { fontSize: 14, fontWeight: '700' },
  discoverDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  discoverMeta: { fontSize: 11, marginTop: 3 },
  followBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  followBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  learnBtn: { padding: spacing.sm },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  viewAllText: { fontSize: 12, fontWeight: '700' },
  discoverMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  discoverActions: { alignItems: 'flex-end', gap: spacing.sm },
  askBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  askBtnText: { fontSize: 11, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  phraseCard: { marginBottom: spacing.sm },
  phraseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  phraseNative: { fontSize: 16, fontWeight: '800' },
  phraseNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.sm },
  phraseNoteText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  phraseActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'transparent' },
  phraseAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  phraseActionText: { fontSize: 12, fontWeight: '700' },
  eventCard: { marginBottom: spacing.sm },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventDetails: { gap: spacing.xs, marginBottom: spacing.md },
  eventActions: { flexDirection: 'row', gap: spacing.sm },
  remindBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  remindBtnText: { fontSize: 12, fontWeight: '700' },
  backTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: borderRadius.full, paddingVertical: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg },
  backTopText: { fontSize: 13, fontWeight: '700' },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, marginBottom: spacing.md, marginTop: spacing.sm },
  hubCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  hubInfo: { flex: 1 },
  hubTitle: { fontSize: 15, fontWeight: '700' },
  hubDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  hubIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  xpPillText: { fontSize: 11, fontWeight: '700' },
  typeTag: { marginLeft: spacing.xs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  typeTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  completedText: { fontSize: 12, fontWeight: '700' },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '800' },
  xpValue: { fontSize: 13, fontWeight: '800' },
  yourRankCard: { marginBottom: spacing.md },
  yourRankHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  yourRankLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  yourRankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  yourRankBadge: { minWidth: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  yourRankNum: { fontSize: 16, fontWeight: '800', color: '#fff' },
  yourRankStats: { flex: 1 },
  yourRankXp: { fontSize: 18, fontWeight: '800' },
  yourRankLevel: { fontSize: 12, marginTop: 2 },
  yourRankStreak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yourRankStreakText: { fontSize: 14, fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800' },
  profileBio: { fontSize: 12, marginTop: 3 },
  statsCard: { marginBottom: spacing.md },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  meStatsDivider: { borderTopWidth: 1, paddingTop: spacing.sm, gap: spacing.xs },
  meStatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meStatText: { fontSize: 12, fontWeight: '600' },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  meIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  meLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 },
  eventText: { fontSize: 12 },
  joinBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  sheetEmpty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  sheetEmptyText: { fontSize: 13, fontWeight: '600' },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  notifIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700' },
  notifDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  notifTime: { fontSize: 11, marginTop: 3 },
  notifDot: { width: 8, height: 8, borderRadius: 4 },
});