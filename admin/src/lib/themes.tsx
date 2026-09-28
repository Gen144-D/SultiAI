'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeId = 'midnightTeal' | 'warmCyberSunset' | 'obsidianEmerald' | 'softAcademicLight';

export interface Theme {
  id: ThemeId;
  label: string;
  description: string;
  icon: string;
  family: 'dark' | 'light';
  onPrimary: string;
  colors: Record<string, string>;
}

export const themes: Record<ThemeId, Theme> = {
  midnightTeal: {
    id: 'midnightTeal',
    label: 'Midnight Teal',
    description: 'Deep navy & teal — the original SultiAI look',
    icon: 'moon',
    family: 'dark',
    onPrimary: '#04111F',
    colors: {
      primary: '#00D4BD',
      primaryDark: '#00B8A3',
      primaryLight: '#0A2E2A',
      primaryHover: '#33DDD0',
      secondary: '#34D399',
      secondaryLight: '#0A2E2A',
      accent: '#5EEAD4',
      accentLight: '#0A2E2A',
      coral: '#FF6B6B',
      coralLight: '#3D2424',
      amber: '#FBBF24',
      amberLight: '#3D3224',
      background: '#0B1120',
      backgroundDeep: '#080E1A',
      surface: '#111827',
      surfaceSecondary: '#0F172A',
      surfaceStrong: 'rgba(22,36,55,0.82)',
      card: '#111827',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#94A3B8',
      textLight: '#CBD5E1',
      border: '#1E293B',
      borderHover: '#334155',
      borderLight: '#1E293B',
      neutralSurface: '#2C2C2C',
      tabInactive: '#AAAAAA',
      success: '#34D399',
      error: '#FB7185',
      warning: '#FCD34D',
      textOnGradient: '#FFFFFF',
      gradientStart: '#00D4BD',
      gradientEnd: '#00B8A3',
      gradientA: '#00D4BD',
      gradientB: '#00B8A3',
      glassBg: 'rgba(17,24,39,0.6)',
      glassBorder: 'rgba(94,234,212,0.12)',
      glassHighlight: 'rgba(255,255,255,0.06)',
      overlay: 'rgba(15,23,42,0.6)',
      notification: '#111827',
      aurora1: 'rgba(0,212,189,0.07)',
      aurora2: 'rgba(52,211,153,0.05)',
      aurora3: 'rgba(94,234,212,0.04)',
      aurora4: 'rgba(0,184,163,0.04)',
      orbGradient1: '#00D4BD',
      orbGradient2: '#34D399',
      orbGlow: 'rgba(0,212,189,0.2)',
      premiumCard: 'rgba(17,24,39,0.88)',
      premiumBorder: 'rgba(94,234,212,0.25)',
      softPurple: '#131A2E',
      softTeal: '#0A2E2A',
      softOrange: '#2A1A0D',
      softPink: '#2A1520',
    },
  },
  warmCyberSunset: {
    id: 'warmCyberSunset',
    label: 'Warm Cyber Sunset',
    description: 'Plum & coral — energetic and expressive',
    icon: 'flame',
    family: 'dark',
    onPrimary: '#2A1206',
    colors: {
      primary: '#FF7A59',
      primaryDark: '#E8603F',
      primaryLight: '#3D2530',
      primaryHover: '#FF9478',
      secondary: '#F5A524',
      secondaryLight: '#3D3220',
      accent: '#FDBA74',
      accentLight: '#3D2A1C',
      coral: '#FF6B6B',
      coralLight: '#3D2424',
      amber: '#FBBF24',
      amberLight: '#3D3224',
      background: '#241B2E',
      backgroundDeep: '#1B1424',
      surface: '#2E2138',
      surfaceSecondary: '#281E32',
      surfaceStrong: 'rgba(46,33,56,0.9)',
      card: '#2E2138',
      text: '#FBF3EC',
      textSecondary: '#C9B8D6',
      textMuted: '#C9B8D6',
      textLight: '#B3A0C2',
      border: '#3D2E48',
      borderHover: '#4E3B5C',
      borderLight: '#3D2E48',
      neutralSurface: '#2C2C2C',
      tabInactive: '#AAAAAA',
      success: '#4ADE80',
      error: '#FB7185',
      warning: '#FBBF24',
      textOnGradient: '#FFFFFF',
      gradientStart: '#FF7A59',
      gradientEnd: '#F5A524',
      gradientA: '#FF7A59',
      gradientB: '#F5A524',
      glassBg: 'rgba(46,33,56,0.6)',
      glassBorder: 'rgba(255,122,89,0.16)',
      glassHighlight: 'rgba(255,255,255,0.08)',
      overlay: 'rgba(20,14,26,0.6)',
      notification: '#2E2138',
      aurora1: 'rgba(255,122,89,0.08)',
      aurora2: 'rgba(245,165,36,0.06)',
      aurora3: 'rgba(253,186,116,0.05)',
      aurora4: 'rgba(255,122,89,0.05)',
      orbGradient1: '#FF7A59',
      orbGradient2: '#F5A524',
      orbGlow: 'rgba(255,122,89,0.22)',
      premiumCard: 'rgba(46,33,56,0.88)',
      premiumBorder: 'rgba(255,122,89,0.25)',
      softPurple: '#2A2138',
      softTeal: '#1F2E2C',
      softOrange: '#3D2A18',
      softPink: '#3D2028',
    },
  },
  obsidianEmerald: {
    id: 'obsidianEmerald',
    label: 'Obsidian Emerald',
    description: 'Matte black & mint — minimalist and premium',
    icon: 'diamond',
    family: 'dark',
    onPrimary: '#04111F',
    colors: {
      primary: '#2DD4A7',
      primaryDark: '#1FB88E',
      primaryLight: '#12241E',
      primaryHover: '#54E0BC',
      secondary: '#6EE7B7',
      secondaryLight: '#122420',
      accent: '#5EEAD4',
      accentLight: '#0F211D',
      coral: '#FF6B6B',
      coralLight: '#2E1D1D',
      amber: '#FBBF24',
      amberLight: '#2E2718',
      background: '#0A0A0A',
      backgroundDeep: '#050505',
      surface: '#161616',
      surfaceSecondary: '#121212',
      surfaceStrong: 'rgba(22,22,22,0.9)',
      card: '#161616',
      text: '#F5F5F5',
      textSecondary: '#A3A3A3',
      textMuted: '#A3A3A3',
      textLight: '#8A8A8A',
      border: '#262626',
      borderHover: '#333333',
      borderLight: '#262626',
      neutralSurface: '#2C2C2C',
      tabInactive: '#AAAAAA',
      success: '#34D399',
      error: '#F87171',
      warning: '#FBBF24',
      textOnGradient: '#FFFFFF',
      gradientStart: '#2DD4A7',
      gradientEnd: '#6EE7B7',
      gradientA: '#2DD4A7',
      gradientB: '#6EE7B7',
      glassBg: 'rgba(22,22,22,0.6)',
      glassBorder: 'rgba(45,212,167,0.14)',
      glassHighlight: 'rgba(255,255,255,0.05)',
      overlay: 'rgba(0,0,0,0.6)',
      notification: '#161616',
      aurora1: 'rgba(45,212,167,0.06)',
      aurora2: 'rgba(110,231,183,0.05)',
      aurora3: 'rgba(94,234,212,0.04)',
      aurora4: 'rgba(31,184,142,0.04)',
      orbGradient1: '#2DD4A7',
      orbGradient2: '#6EE7B7',
      orbGlow: 'rgba(45,212,167,0.2)',
      premiumCard: 'rgba(22,22,22,0.88)',
      premiumBorder: 'rgba(45,212,167,0.25)',
      softPurple: '#16151C',
      softTeal: '#0F1E1B',
      softOrange: '#241C12',
      softPink: '#211519',
    },
  },
  softAcademicLight: {
    id: 'softAcademicLight',
    label: 'Soft Academic Light',
    description: 'Clean & indigo — bright daytime learning',
    icon: 'sunny',
    family: 'light',
    onPrimary: '#FFFFFF',
    colors: {
      primary: '#4F46E5',
      primaryDark: '#4338CA',
      primaryLight: '#E0E7FF',
      primaryHover: '#4F46E5',
      secondary: '#3B5BDB',
      secondaryLight: '#E7EBFC',
      accent: '#3B5BDB',
      accentLight: '#E7EBFC',
      coral: '#FF6B6B',
      coralLight: '#FFE5E5',
      amber: '#F59E0B',
      amberLight: '#FEF3C7',
      background: '#F4F6F8',
      backgroundDeep: '#E8ECF0',
      surface: '#FFFFFF',
      surfaceSecondary: '#EEF1F5',
      surfaceStrong: 'rgba(255,255,255,0.92)',
      card: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      textMuted: '#4F5B6D',
      textLight: '#94A3B8',
      border: '#E2E8F0',
      borderHover: '#CBD5E1',
      borderLight: '#EEF1F5',
      neutralSurface: '#F5F5F5',
      tabInactive: '#888888',
      success: '#059669',
      error: '#DC2626',
      warning: '#D97706',
      textOnGradient: '#FFFFFF',
      gradientStart: '#4F46E5',
      gradientEnd: '#3B5BDB',
      gradientA: '#4F46E5',
      gradientB: '#3B5BDB',
      glassBg: 'rgba(255,255,255,0.72)',
      glassBorder: 'rgba(79,70,229,0.15)',
      glassHighlight: 'rgba(255,255,255,0.6)',
      overlay: 'rgba(30,41,59,0.4)',
      notification: '#FFFFFF',
      aurora1: 'rgba(79,70,229,0.08)',
      aurora2: 'rgba(59,91,219,0.06)',
      aurora3: 'rgba(79,70,229,0.05)',
      aurora4: 'rgba(59,91,219,0.06)',
      orbGradient1: '#4F46E5',
      orbGradient2: '#3B5BDB',
      orbGlow: 'rgba(79,70,229,0.18)',
      premiumCard: 'rgba(255,255,255,0.88)',
      premiumBorder: 'rgba(79,70,229,0.25)',
      softPurple: '#F0F1FF',
      softTeal: '#E6F7F3',
      softOrange: '#FFF4E6',
      softPink: '#FFF0F5',
    },
  },
};

export const THEME_LIST = Object.values(themes);
export const DEFAULT_THEME: ThemeId = 'midnightTeal';

const THEME_KEY = 'sultiai_admin_theme';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeId;
  themeList: Theme[];
  setTheme: (name: ThemeId) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored && (stored as ThemeId) in themes) {
        setThemeNameState(stored as ThemeId);
      }
    } catch (e) {
      console.warn('[ThemeProvider] Failed to load theme:', e);
    }
  }, []);

  const setTheme = (name: ThemeId) => {
    if (!themes[name] || name === themeName) return;
    setThemeNameState(name);
    try {
      localStorage.setItem(THEME_KEY, name);
      // Also update next-themes for compatibility
      document.documentElement.setAttribute('data-theme', name);
    } catch (e) {
      console.warn('[ThemeProvider] Failed to save theme:', e);
    }
  };

  const activeTheme = themes[themeName] || themes[DEFAULT_THEME];
  const isDark = activeTheme.family === 'dark';

  // Apply theme to document for CSS variables
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    root.setAttribute('data-theme-family', activeTheme.family);
    Object.entries(activeTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
  }, [themeName, activeTheme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        themeName,
        themeList: THEME_LIST,
        setTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}