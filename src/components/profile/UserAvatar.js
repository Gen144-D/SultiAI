import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getAvatarSource } from '../../constants/avatars';

export default function UserAvatar({ avatarId, uri, name, size = 48, style, badge, onPress }) {
  const { colors } = useTheme();
  const dim = typeof size === 'number' ? size : 48;
  const fontSize = dim * 0.4;
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const renderImage = () => {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
        />
      );
    }
    if (avatarId) {
      return (
        <Image
          source={getAvatarSource(avatarId)}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
        />
      );
    }
    return (
      <View style={[styles.fallback, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.initials, { fontSize, color: colors.primary }]}>{initials}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: dim, height: dim }, style]}>
      {renderImage()}
      {badge && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Ionicons name={badge} size={dim * 0.3} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  image: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  fallback: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  initials: { fontWeight: '700' },
  badge: { position: 'absolute', bottom: 0, right: 0, borderRadius: 999, padding: 2, borderWidth: 2, borderColor: '#fff' },
});
