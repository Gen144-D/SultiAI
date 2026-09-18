import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { borderRadius } from '../theme';

export default function Avatar({ uri, name, size = 48, style, badge, onPress }) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const dim = typeof size === 'number' ? size : 48;
  const fontSize = dim * 0.4;
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const shell = (
    <View style={[styles.container, { width: dim, height: dim }, style]} accessibilityLabel={name || 'Avatar'}>
      {uri && !imgError ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2, borderColor: colors.border }]}
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[styles.fallback, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <Text style={[styles.initials, { fontSize, color: colors.primary }]}>{initials}</Text>
        </View>
      )}
      {badge && (
        <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
          <Ionicons name={badge} size={dim * 0.26} color={colors.textOnGradient} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name || 'Avatar'} hitSlop={8}>
        {shell}
      </Pressable>
    );
  }

  return shell;
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  image: { borderWidth: 2 },
  fallback: { justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  initials: { fontWeight: '700' },
  badge: { position: 'absolute', bottom: 0, right: 0, borderRadius: borderRadius.full, padding: 2, borderWidth: 2 },
});