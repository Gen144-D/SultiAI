import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import { POST_TYPES } from '../../constants/community';
import { spacing, borderRadius } from '../../theme';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 3600e3) return `${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < 86400e3) return `${Math.round(diff / 3600e3)}h`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function PostCard({
  post, expanded, comments = [],
  onToggleComments, onAddComment, onReport,
}) {
  const { colors, isDark } = useTheme();
  const [newComment, setNewComment] = useState('');
  const type = POST_TYPES[post.type] || POST_TYPES.discussion;

  const handleComment = () => {
    const text = newComment.trim();
    if (!text) return;
    onAddComment(post.id, text);
    setNewComment('');
  };

  const confirmReport = () => {
    Alert.alert('Report post', 'Report this post as spam or inappropriate?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => onReport && onReport(post) },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.author_name} size={36} />
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
              {post.author_name || 'Anonymous'}
            </Text>
            {post.author_verified && <Badge icon="shield-checkmark" title="Native" variant="success" size="sm" />}
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.typePill, { backgroundColor: type.color + '18' }]}>
              <Ionicons name={type.icon} size={10} color={type.color} />
              <Text style={[styles.typeText, { color: type.color }]}>{type.label}</Text>
            </View>
            <Text style={[styles.timeText, { color: colors.textLight }]}>{formatDate(post.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={confirmReport} style={styles.reportBtn} accessibilityRole="button" accessibilityLabel="Report post">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={[styles.titleText, { color: colors.text }]}>{post.title}</Text>
        {!!post.english && (
          <Text style={[styles.englishText, { color: colors.textSecondary }]}>{post.english}</Text>
        )}
        {!!post.content && post.content !== post.title && (
          <Text style={[styles.contentText, { color: colors.textSecondary }]}>{post.content}</Text>
        )}
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => onToggleComments && onToggleComments(post.id)}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={`${post.comments || 0} comments`}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textLight} />
          <Text style={[styles.actionText, { color: colors.textLight }]}>{post.comments || 0}</Text>
        </TouchableOpacity>
        <View style={styles.action}>
          <Ionicons name="heart-outline" size={18} color={colors.textLight} />
          <Text style={[styles.actionText, { color: colors.textLight }]}>{post.likes || 0}</Text>
        </View>
      </View>

      {expanded && (
        <View style={[styles.comments, { borderTopColor: colors.border }]}>
          {comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.textLight }]}>No comments yet.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Avatar name={c.author_name} size={24} />
                <View style={styles.commentBody}>
                  <Text style={[styles.commentAuthor, { color: colors.text }]}>
                    {c.author_name || 'Anonymous'}
                  </Text>
                  <Text style={[styles.commentText, { color: colors.textSecondary }]}>{c.comment}</Text>
                </View>
              </View>
            ))
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              id="comment"
              name="comment"
              testID="comment-input"
              style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surface : colors.surfaceSecondary }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textLight}
              value={newComment}
              onChangeText={setNewComment}
              onSubmitEditing={handleComment}
              returnKeyType="send"
              autoComplete="off"
            />
            <TouchableOpacity onPress={handleComment} style={styles.sendBtn} accessibilityRole="button" accessibilityLabel="Send comment">
              <Ionicons name="send" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  authorInfo: { flex: 1, marginLeft: spacing.md },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  authorName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  typeText: { fontSize: 10, fontWeight: '800' },
  timeText: { fontSize: 11, fontWeight: '500' },
  reportBtn: { padding: 4 },
  body: { marginBottom: spacing.md },
  titleText: { fontSize: 17, fontWeight: '700', lineHeight: 22, marginBottom: spacing.xs },
  englishText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic', marginBottom: spacing.xs },
  contentText: { fontSize: 14, lineHeight: 20, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xl, borderTopWidth: 1, paddingTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { fontSize: 12, fontWeight: '600' },
  comments: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  noComments: { fontSize: 13, marginBottom: spacing.md, fontStyle: 'italic' },
  comment: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentInput: { flex: 1, borderWidth: 1.5, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 13 },
  sendBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
