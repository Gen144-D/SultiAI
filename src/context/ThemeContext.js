import React, { createContext, useState, useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, THEME_LIST, DEFAULT_THEME } from '../theme';
import { useAccessibility } from '../hooks/useAccessibility';

const THEME_NAME_KEY = 'sultiai_theme_name';
const VALID_THEME_NAMES = THEME_LIST.map((t) => t.id);

const ThemeContext = createContext(/** @type {any} */ (null));

export function ThemeProvider({ children }) {
  const [themeName, setThemeNameState] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const switchOverlay = useSharedValue(0);
  const {
    reduceMotion, highContrast, largeText, loaded: a11yLoaded,
    toggleReduceMotion, toggleHighContrast, toggleLargeText,
    getAnimationDuration, getSpringConfig, getTextStyle, getContrastColor,
  } = useAccessibility();

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_NAME_KEY);
        if (stored && VALID_THEME_NAMES.includes(stored)) {
          setThemeNameState(stored);
        }
      } catch (e) {
        console.warn('[ThemeContext] Failed to load theme preference:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeTheme = themes[themeName] || themes[DEFAULT_THEME];
  const colors = activeTheme.colors;
  const isDark = activeTheme.family === 'dark';
  const onPrimary = activeTheme.onPrimary;
  const previewCard = activeTheme.previewCard || null;

  const setThemeName = async (name) => {
    if (!themes[name] || name === themeName) return;
    const fadeMs = getAnimationDuration(160);
    if (fadeMs > 0) {
      switchOverlay.value = withTiming(1, { duration: fadeMs });
      setTimeout(() => {
        setThemeNameState(name);
        switchOverlay.value = withTiming(0, { duration: fadeMs * 1.6 });
      }, fadeMs);
    } else {
      setThemeNameState(name);
    }
    try {
      await AsyncStorage.setItem(THEME_NAME_KEY, name);
    } catch (e) {
      console.warn('[ThemeContext] Failed to save theme preference:', e.message);
    }
  };

  const toggleTheme = () => {
    const idx = THEME_LIST.findIndex((t) => t.id === themeName);
    const next = THEME_LIST[(idx + 1) % THEME_LIST.length];
    setThemeName(next.id);
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: switchOverlay.value * 0.5,
  }));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        isDark, colors, onPrimary, previewCard, themeName, themeList: THEME_LIST, loading, toggleTheme, setThemeName,
        reduceMotion, highContrast, largeText, a11yLoaded,
        toggleReduceMotion, toggleHighContrast, toggleLargeText,
        getAnimationDuration, getSpringConfig, getTextStyle, getContrastColor,
      }}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.switchOverlay, overlayStyle]}
      />
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  switchOverlay: {
    backgroundColor: '#000000',
    zIndex: 9999,
  },
});

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
