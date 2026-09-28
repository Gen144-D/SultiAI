import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
  TouchableWithoutFeedback, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BottomSheet({ visible, onClose, title, children, height = 400, bottomInset = 0 }) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(height + bottomInset)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const maxHeight = Math.min(height, SCREEN_HEIGHT - 120);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: height + bottomInset, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, height, bottomInset]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { pointerEvents: visible ? 'auto' : 'none' }]}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.sheet, {
          maxHeight,
          bottom: bottomInset,
          backgroundColor: colors.card,
          transform: [{ translateY }],
        }]}
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetContent}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
  backdrop: { flex: 1, zIndex: 9998, elevation: 9998 },
  sheet: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, zIndex: 10000, elevation: 10000 },
  handleRow: { alignItems: 'center', marginBottom: spacing.lg },
  handle: { width: 44, height: 5, borderRadius: 3 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' },
  sheetContent: { paddingBottom: spacing.sm },
});
