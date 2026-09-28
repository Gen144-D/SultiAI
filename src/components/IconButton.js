import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { borderRadius } from '../theme';

const SIZES = { sm: 32, md: 40, lg: 48 };

export default function IconButton({
  icon,
  onPress,
  size = 'md',
  color,
  backgroundColor,
  disabled = false,
  accessibilityLabel,
  style,
  hitSlop,
}) {
  const { colors } = useTheme();
  const box = SIZES[size] || SIZES.md;
  // 44pt is the minimum comfortable touch target; smaller visual boxes still
  // get a hitSlop so the tappable area stays at least 44.
  const slop = hitSlop ?? Math.max(0, Math.ceil((44 - box) / 2));

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        {
          width: box,
          height: box,
          borderRadius: Math.min(borderRadius.md, Math.round(box / 3)),
          backgroundColor: backgroundColor || 'transparent',
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(box * 0.5)} color={color || colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
