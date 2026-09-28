import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { readableOnGradient } from '../theme/moduleColors';

/**
 * Header
 *
 * Shared on-screen page header used by secondary/stacked screens.
 *
 * - `gradient` mode renders the app's brand gradient hero with theme-aware ink
 *   (white in light mode, near-black on the light-mint gradient in dark mode).
 * - `gradient={false}` renders a quiet surface header with border + themed ink
 *   for content-focused screens.
 *
 * Both modes stay legible in dark mode and support a left action, title,
 * subtitle, a right icon action and arbitrary right-side children (slots).
 */
export default function Header({
  title, subtitle, leftIcon, onLeftPress, rightIcon, onRightPress,
  gradient = true, style, titleStyle, children,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = Platform.OS === 'ios' ? insets.top : insets.top || spacing.xl;

  const ink = gradient ? readableOnGradient([colors.gradientStart, colors.gradientEnd]) : colors.text;
  const inkSub = gradient
    ? ink === '#FFFFFF' ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.62)'
    : colors.textSecondary;

  const content = (
    <View style={[styles.container, { paddingTop: padTop }, style]}>
      <View style={styles.row}>
        {leftIcon && onLeftPress && (
          <TouchableOpacity
            onPress={onLeftPress}
            style={styles.leftBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name={leftIcon} size={24} color={ink} />
          </TouchableOpacity>
        )}
        <View style={styles.textContainer}>
          {title && <Text style={[styles.title, { color: ink }, titleStyle]}>{title}</Text>}
          {subtitle && <Text style={[styles.subtitle, { color: inkSub }]}>{subtitle}</Text>}
        </View>
        {rightIcon && onRightPress && (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.rightBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons name={rightIcon} size={24} color={ink} />
          </TouchableOpacity>
        )}
        {children ? <View style={styles.childrenSlot}>{children}</View> : null}
      </View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.surface, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.lg, paddingHorizontal: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  surface: { borderBottomWidth: 1 },
  textContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: spacing.xs },
  leftBtn: { padding: spacing.sm, marginRight: spacing.sm, marginLeft: -spacing.sm },
  rightBtn: { padding: spacing.sm, marginLeft: spacing.sm },
  childrenSlot: { marginLeft: spacing.sm },
});