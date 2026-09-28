import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { communityMock } from '../../../services/communityMock';
import { SectionLabel } from './SectionLabel';
import { spacing, borderRadius, shadows } from '../../../theme';

interface CommunityPreviewProps {
  navigation: any;
  refreshKey?: number;
}

type Post = {
  id: string;
  type: string;
  author_name: string;
  author_verified?: boolean;
  is_native?: boolean;
  native: string;
  english?: string;
  likes?: number;
  comments?: number;
  created_at?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * CommunityPreview
 *
 * A single compact card that surfaces the live community on Home: the most
 * recent post plus a direct path into the Community tab. Keeps the community
 * visibly first-class without letting it dominate the daily-learning page.
 */
export function CommunityPreview({ navigation, refreshKey = 0 }: CommunityPreviewProps) {
  const { colors, getAnimationDuration } = useTheme();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Animated.timing(fadeAnim, { toValue: 1, duration: getAnimationDuration(500), useNativeDriver: true }).start();

    (async () => {
      const { posts } = await communityMock.getPosts();
      if (!mounted) return;
      setPost(Array.isArray(posts) && posts.length ? posts[0] : null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [getAnimationDuration, fadeAnim, refreshKey]);

  const openCommunity = () => navigation.navigate('Community');

  const renderBody = () => {
    if (loading) {
      return (
        <View style={[styles.postRow, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]} />
          <View style={styles.postText}>
            <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceSecondary }]} />
            <View style={[styles.skeletonLineShort, { backgroundColor: colors.surfaceSecondary }]} />
          </View>
        </View>
      );
    }

    if (!post) {
      return (
        <TouchableOpacity
          style={[styles.postRow, { backgroundColor: colors.surfaceSecondary }]}
          onPress={openCommunity}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open the Community to start a conversation"
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
          </View>
          <View style={styles.postText}>
            <Text style={[styles.native, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.english, { color: colors.textSecondary }]}>Start the first conversation in the Community</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const initials = post.author_name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.postRow, { backgroundColor: colors.surfaceSecondary }]}
        onPress={openCommunity}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Community post from ${post.author_name}: ${post.native}`}
      >
        <View style={[styles.avatar, { backgroundColor: post.is_native ? colors.softPurple : colors.primaryLight }]}>
          <Text style={[styles.avatarInitials, { color: post.is_native ? colors.text : colors.primary }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.postText}>
          <Text style={[styles.native, { color: colors.text }]} numberOfLines={2}>
            {post.native}
          </Text>
          <Text style={[styles.english, { color: colors.textSecondary }]} numberOfLines={1}>
            {post.english || post.author_name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {post.author_name}
              {post.author_verified ? ' · verified' : ''}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textSecondary }]}>·</Text>
            <Ionicons name="heart" size={12} color={colors.amber} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{post.likes ?? 0}</Text>
            <Ionicons name="chatbubble-ellipses" size={12} color={colors.textSecondary} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{post.comments ?? 0}</Text>
            <Text style={[styles.metaDot, { color: colors.textSecondary }]}>·</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{timeAgo(post.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
        <View style={styles.header}>
          <SectionLabel style={styles.labelOverride}>COMMUNITY</SectionLabel>
          <TouchableOpacity
            onPress={openCommunity}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open the Community tab"
            style={styles.link}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>See the community</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {renderBody()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelOverride: { marginBottom: 0 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  linkText: { fontSize: 12, fontWeight: '700' },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 14, fontWeight: '800' },
  postText: { flex: 1 },
  native: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  english: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  meta: { fontSize: 11, fontWeight: '600' },
  metaDot: { fontSize: 11 },
  skeletonLine: { height: 14, borderRadius: 7 },
  skeletonLineShort: { height: 12, borderRadius: 6, marginTop: 6, width: '60%' },
});