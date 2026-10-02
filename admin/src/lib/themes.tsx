'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

export type ThemeId = 'midnightTeal' | 'warmCyberSunset' | 'obsidianEmerald' | 'softAcademicLight';

/**
 * Theme metadata only.
 *
 * Colour values live exclusively in `globals.css` under `[data-theme="..."]`.
 * They are deliberately not mirrored here: a second copy of every hex value
 * would drift out of sync with the stylesheet and become a false source of
 * truth. Swapping themes is therefore a single attribute write on <html>.
 */
export interface Theme {
  id: ThemeId;
  label: string;
  description: string;
  icon: string;
  family: 'dark' | 'light';
}

export const themes: Record<ThemeId, Theme> = {
  midnightTeal: {
    id: 'midnightTeal',
    label: 'Cosmic Deep Space',
    description: 'Deep space & mint — the SultiAI signature',
    icon: 'moon',
    family: 'dark',
  },
  warmCyberSunset: {
    id: 'warmCyberSunset',
    label: 'Warm Cyber Sunset',
    description: 'Plum & coral — energetic and expressive',
    icon: 'flame',
    family: 'dark',
  },
  obsidianEmerald: {
    id: 'obsidianEmerald',
    label: 'Obsidian Emerald',
    description: 'Matte black & mint — minimalist and premium',
    icon: 'diamond',
    family: 'dark',
  },
  softAcademicLight: {
    id: 'softAcademicLight',
    label: 'Soft Academic Light',
    description: 'Milky glass & indigo — bright daytime use',
    icon: 'sunny',
    family: 'light',
  },
};

export const THEME_LIST = Object.values(themes);
export const DEFAULT_THEME: ThemeId = 'midnightTeal';

const THEME_KEY = 'sultiai_admin_theme';
const THEME_EVENT = 'sultiai:themechange';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeId;
  themeList: Theme[];
  setTheme: (name: ThemeId) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(name: ThemeId) {
  const root = document.documentElement;
  root.setAttribute('data-theme', name);
  root.setAttribute('data-theme-family', themes[name].family);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * The `data-theme` attribute on <html> is the single source of truth: the
 * pre-paint bootstrap script writes it before React exists, and the stylesheet
 * reads it. Subscribing to it keeps React in step without a second source of
 * truth (and without the setState-in-effect cascade the compiler rules flag).
 */
function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_EVENT, onStoreChange);
}

function getThemeSnapshot(): ThemeId {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr && attr in themes ? (attr as ThemeId) : DEFAULT_THEME;
}

function getThemeServerSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeName = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  // Only runs when the bootstrap script could not write the attribute (e.g. it
  // was blocked). Purely an external-system write, so no state is involved.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current && current in themes) return;
    let initial: ThemeId = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(THEME_KEY) as ThemeId | null;
      if (stored && stored in themes) initial = stored;
    } catch (error) {
      console.warn('[ThemeProvider] Failed to read stored theme:', error);
    }
    applyTheme(initial);
  }, []);

  const setTheme = useCallback(
    (name: ThemeId) => {
      if (!themes[name] || name === themeName) return;
      applyTheme(name);
      try {
        localStorage.setItem(THEME_KEY, name);
      } catch (error) {
        console.warn('[ThemeProvider] Failed to save theme:', error);
      }
    },
    [themeName]
  );

  const activeTheme = themes[themeName] ?? themes[DEFAULT_THEME];

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        themeName,
        themeList: THEME_LIST,
        setTheme,
        isDark: activeTheme.family === 'dark',
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
