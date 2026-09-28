import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useGame } from '../context/GameContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import EmptyState from '../components/EmptyState';
import { api } from '../services/api';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import GlassCard from '../components/GlassCard';
import { spacing, borderRadius, shadows } from '../theme';
import { getUserAvatarUrl } from '../utils/avatar';

const PODIUM_HEIGHTS = [88, 64, 48];
const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen({ navigation }) {
  const { colors, isDark, getAnimationDuration } = useTheme();
  const { user } = useUser();
  const { xp, streak } = useGame();
  const { enqueueAction } = useOfflineSync();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('weekly');

  useEffect(() => { loadLeaderboard(); }, [period]);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard(period);
      setLeaders(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.textLight;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return 'trophy';
    if (rank === 2) return 'medal';
    if (rank === 3) return 'medal';
    return null;
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const currentUserInList = leaders.find(
    (l) => l.id === user?.id || l.email === user?.email
  );
  const currentUserRank = leaders.findIndex(
    (l) => l.id === user?.id || l.email === user?.email
  ) + 1;

  if (loading) return <LoadingState fullScreen />;

  const renderPodium = () => {
    if (top3.length === 0) return null;

    const ordered = [
      top3[1] || null,
      top3[0] || null,
      top3[2] || null,
    ];

    return (
      <View style={styles.podiumWrapper}>
        <LinearGradient
          colors={[colors.primary + '10', colors.primary + '05', 'transparent']}
          style={styles.podiumBg}
        >
          <View style={styles.podiumRow}>
            {ordered.map((entry, slot) => {
              if (!entry) {
                return <View key={slot} style={styles.podiumCol} />;
              }
              const rank = slot === 0 ? 2 : slot === 1 ? 1 : 3;
              const medalColor = PODIUM_COLORS[rank - 1];
              const isMe = entry.id === user?.id || entry.email === user?.email;

              return (
                <View key={entry.id || slot} style={styles.podiumCol}>
                  <View style={styles.podiumTop}>
                    <View style={[styles.podiumMedal, { backgroundColor: medalColor }]}>
                      <Text style={styles.podiumMedalText}>{rank}</Text>
                    </View>
                    <Avatar name={entry.name} uri={entry.avatar} size={rank === 1 ? 56 : 44} />
                    <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                      {entry.name || 'Anonymous'}
                    </Text>
                    <Text style={[styles.podiumXp, { color: colors.primary }]}>
                      {entry.xp || entry.total_xp || 0} XP
                    </Text>
                    {isMe && <Badge title="You" variant="info" size="sm" />}
                  </View>
                  <View style={[styles.podiumBar, { height: PODIUM_HEIGHTS[rank - 1], backgroundColor: medalColor + '35' }]}>
                    <LinearGradient
                      colors={[medalColor, medalColor + '60']}
                      style={[styles.podiumBarGradient, { height: PODIUM_HEIGHTS[rank - 1] }]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderCurrentUserCard = () => {
    if (currentUserInList) return null;

    return (
      <View style={styles.currentUserSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Rank</Text>
        <View style={[styles.currentUserCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <View style={[styles.rankContainer, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.rankNumber, { color: colors.primary }]}>—</Text>
          </View>
          <Avatar name={user?.name} uri={getUserAvatarUrl(user)} size={40} />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'You'}</Text>
            {streak > 0 && (
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={12} color={colors.accent} />
                <Text style={[styles.streakText, { color: colors.textSecondary }]}>{streak} day streak</Text>
              </View>
            )}
          </View>
          <View style={styles.xpContainer}>
            <Text style={[styles.xpValue, { color: colors.primary }]}>{xp}</Text>
            <Text style={[styles.xpLabel, { color: colors.textLight }]}>XP</Text>
          </View>
          <Badge title="Keep going!" variant="info" size="sm" />
        </View>
      </View>
    );
  };

  const renderRow = ({ item, index }) => {
    const rank = index + 4;
    const isMe = item.id === user?.id || item.email === user?.email;
    const rankColor = getRankColor(rank);

    return (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.card },
          isMe && { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.rankContainer, { backgroundColor: rank <= 3 ? rankColor + '30' : 'transparent' }]}>
          <Text style={[styles.rankNumber, { color: rankColor }]}>{rank}</Text>
        </View>
        <Avatar name={item.name} uri={item.avatar} size={40} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name || 'Anonymous'}</Text>
          {item.streak > 0 && (
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={12} color={colors.accent} />
              <Text style={[styles.streakText, { color: colors.textSecondary }]}>{item.streak} day streak</Text>
            </View>
          )}
        </View>
        <View style={styles.xpContainer}>
          <Text style={[styles.xpValue, { color: colors.primary }]}>{item.xp || item.total_xp || 0}</Text>
          <Text style={[styles.xpLabel, { color: colors.textLight }]}>XP</Text>
        </View>
        {isMe && <Badge title="You" variant="info" size="sm" />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon="podium"
      title="No rankings yet"
      message="Start learning to appear on the leaderboard!"
      actionLabel="Start Practicing"
      onAction={() => navigation.navigate('Main', { screen: 'Learn' })}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Leaderboard"
        subtitle={period === 'weekly' ? 'Top learners this week' : period === 'monthly' ? 'Top learners this month' : 'All-time rankings'}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      <View style={styles.tabs}>
        {['weekly', 'monthly', 'all_time'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.tabText, { color: period === p ? '#fff' : colors.textSecondary }]}>
              {p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {leaders.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item, i) => item.id || i.toString()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {renderPodium()}
              {renderCurrentUserCard()}
              {rest.length > 0 && (
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  All Rankings
                </Text>
              )}
            </>
          }
          renderItem={renderRow}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.full, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: spacing.xl, paddingTop: 0 },
  podiumWrapper: { marginBottom: spacing.md },
  podiumBg: { borderRadius: borderRadius.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm },
  podiumCol: { flex: 1, alignItems: 'center' },
  podiumTop: { alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  podiumMedal: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  podiumMedalText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  podiumName: { fontSize: 12, fontWeight: '700', textAlign: 'center', maxWidth: 80 },
  podiumXp: { fontSize: 11, fontWeight: '700' },
  podiumBar: { width: '100%', borderRadius: borderRadius.sm, overflow: 'hidden' },
  podiumBarGradient: { width: '100%', borderRadius: borderRadius.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, ...shadows.sm },
  rankContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  rankNumber: { fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1, marginLeft: spacing.md },
  userName: { fontSize: 15, fontWeight: '600' },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 },
  streakText: { fontSize: 11 },
  xpContainer: { alignItems: 'center', marginRight: spacing.md },
  xpValue: { fontSize: 18, fontWeight: '800' },
  xpLabel: { fontSize: 10, fontWeight: '500' },
  currentUserSection: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  currentUserCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1.5 },
});