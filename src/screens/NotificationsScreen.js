import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { communityMock, normalizeNotification } from '../services/communityMock';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { spacing, borderRadius } from '../theme';

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(
    () =>
      communityMock
        .getNotifications()
        .then((data) => (Array.isArray(data) ? data.map(normalizeNotification).filter(Boolean) : [])),
    []
  );

  useEffect(() => {
    let active = true;
    load()
      .then((rows) => {
        if (active) setNotifications(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setNotifications(await load());
    } catch {
      toast.error('Could not refresh notifications.');
    } finally {
      setRefreshing(false);
    }
  }, [load, toast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    if (clearing || unreadCount === 0) return;
    const previous = notifications;
    setClearing(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await communityMock.markAllNotificationsRead();
    } catch {
      setNotifications(previous);
      toast.error('Could not clear notifications. Please try again.');
    } finally {
      setClearing(false);
    }
  }, [clearing, notifications, unreadCount, toast]);

  const markRead = useCallback(
    async (id) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await communityMock.markNotificationRead(id);
      } catch {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
        toast.error('Could not mark that notification as read.');
      }
    },
    [notifications, toast]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightIcon={unreadCount > 0 && !clearing ? 'checkmark-done' : undefined}
        onRightPress={unreadCount > 0 && !clearing ? markAllRead : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            disabled={clearing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Mark all ${unreadCount} notifications as read`}
            style={[
              styles.clearAll,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary + '33' },
            ]}
          >
            <Ionicons name="checkmark-done" size={18} color={colors.primary} />
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              {clearing ? 'Clearing…' : 'Mark all as read'}
            </Text>
            <Text style={[styles.clearAllCount, { color: colors.primary }]}>{unreadCount}</Text>
          </TouchableOpacity>
        )}

          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications-off-outline"
              title="No notifications yet"
              message="Activity from the community, challenges, and your learning progress will appear here."
            />
          ) : (
          <>
            {notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.row,
                  { backgroundColor: !n.read ? colors.primary + '08' : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => markRead(n.id)}
                disabled={n.read}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: n.read }}
                accessibilityLabel={`${n.title}. ${n.read ? 'Read' : 'Unread'}`}
              >
                <View style={[styles.icon, { backgroundColor: (n.read ? colors.surfaceSecondary : colors.primary) + '18' }]}>
                  <Ionicons name={n.icon} size={20} color={n.read ? colors.textSecondary : colors.primary} />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.title, { color: n.read ? colors.textSecondary : colors.text }]}>
                    {n.title}
                  </Text>
                  {!!n.body && (
                    <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {n.body}
                    </Text>
                  )}
                  {!!n.time && <Text style={[styles.time, { color: colors.textLight }]}>{n.time}</Text>}
                </View>
                {!n.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  clearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  clearAllText: { flex: 1, fontSize: 14, fontWeight: '700' },
  clearAllCount: { fontSize: 13, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
