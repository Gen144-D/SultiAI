import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, typography } from '../theme';

const variantMap = {
  default: { bg: 'primaryLight', text: 'primary' },
  success: { bg: 'success', text: 'success' },
  warning: { bg: 'warning', text: 'warning' },
  error: { bg: 'error', text: 'error' },
  info: { bg: 'primaryLight', text: 'primary' },
};

export default function Badge({ title, icon, color, variant = 'default', size = 'sm' }) {
  const { colors } = useTheme();
  const isLarge = size === 'lg';
  const styleKey = variantMap[variant] || variantMap.default;
  const bgKey = styleKey.bg;
  const textKey = styleKey.text;
  const bg = colors[bgKey] + '20';
  const tc = colors[textKey];
  const finalColor = color || tc;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isLarge && styles.badgeLarge]}>
      {icon && <Ionicons name={icon} size={isLarge ? 14 : 12} color={finalColor} style={{ marginRight: 4 }} />}
      {title && <Text style={[styles.text, { color: finalColor }, isLarge && styles.textLarge]}>{title}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  badgeLarge: { paddingHorizontal: 14, paddingVertical: 7 },
  text: { ...typography.caption, fontSize: 11, fontWeight: '700' },
  textLarge: { fontSize: 13 },
});