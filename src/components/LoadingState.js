import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';

export default function LoadingState({ message = 'Loading...', fullScreen = false, size = 'large' }) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen]} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  fullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { marginTop: spacing.md, fontSize: 14, fontWeight: '500' },
});
