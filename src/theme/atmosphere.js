import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Atmosphere is the second half of the design system.
 *
 * A theme owns *colour* — what everything looks like. An atmosphere owns
 * *density and ambience* — how much air a screen breathes, how loud the
 * background wash is, and how round the corners sit. Keeping them separate is
 * what lets all four themes share one layout language without every screen
 * feeling identical.
 *
 *   home       calm, spacious, full aurora — the daily check-in surface
 *   learn      denser and quieter — scanning a path of many small cards
 *   sulti      immersive, loudest glow, roundest corners — the conversation
 *   community  flat and restrained — content-first, chrome gets out of the way
 *   profile    flat and dense — settings are lists, not cards
 */
const ATMOSPHERES = {
  home: {
    id: 'home',
    ambient: 'aurora',
    density: 'comfortable',
    radiusScale: 1,
    blobScale: 1,
    particleScale: 1,
    glowScale: 1,
    blur: true,
  },
  learn: {
    id: 'learn',
    ambient: 'grid',
    density: 'compact',
    radiusScale: 0.85,
    blobScale: 0.7,
    particleScale: 0.6,
    glowScale: 0.7,
    blur: true,
  },
  sulti: {
    id: 'sulti',
    ambient: 'orb',
    density: 'immersive',
    radiusScale: 1.15,
    blobScale: 1.2,
    particleScale: 1.2,
    glowScale: 1.2,
    blur: true,
  },
  community: {
    id: 'community',
    ambient: 'flat',
    density: 'comfortable',
    radiusScale: 0.9,
    blobScale: 0.5,
    particleScale: 0.5,
    glowScale: 0.6,
    blur: false,
  },
  profile: {
    id: 'profile',
    ambient: 'flat',
    density: 'compact',
    radiusScale: 0.85,
    blobScale: 0.4,
    particleScale: 0.35,
    glowScale: 0.5,
    blur: false,
  },
};

export const DEFAULT_ATMOSPHERE = 'home';

export function getAtmosphere(nameOrId) {
  return ATMOSPHERES[nameOrId] || ATMOSPHERES[DEFAULT_ATMOSPHERE];
}

export function getAtmosphereIds() {
  return Object.keys(ATMOSPHERES);
}

/**
 * Resolves the atmosphere for a screen and folds in the theme family so
 * ambient strength never fights the theme's own lightness.
 */
export function useAtmosphere(nameOrId) {
  const { isDark } = useTheme();
  return useMemo(() => {
    const atmosphere = getAtmosphere(nameOrId);
    const familyTrim = isDark ? 1 : 0.85;
    return {
      ...atmosphere,
      blobScale: atmosphere.blobScale * familyTrim,
      particleScale: atmosphere.particleScale * familyTrim,
      glowScale: atmosphere.glowScale * familyTrim,
    };
  }, [nameOrId, isDark]);
}

/**
 * Scales a base border radius by the active atmosphere, so Sulti's cards read
 * rounder and denser screens read tighter without any screen owning a magic
 * number.
 */
export function scaleRadius(radius, atmosphere) {
  return Math.round(radius * (atmosphere?.radiusScale ?? 1));
}
