import { useTheme } from '../../context/ThemeContext';
import { readableOnGradient } from '../../theme/moduleColors';

/**
 * Voice-specific values that have no equivalent in the base theme: the deep
 * background wash behind the orb, the translucent glass tints, the muted text
 * ramp, the achievement star, and the orb's core gradient.
 *
 * Everything shared (primary, surface, text, danger, warning, success, accent)
 * is derived from the active theme so the voice screen can never drift out of
 * sync with the rest of the app.
 */
const voiceExtras = {
  midnightTeal: {
    surfaceAlpha: '99',
    surfaceStrongAlpha: 'D1',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(94, 234, 212, 0.12)',
    glassHighlight: 'rgba(255, 255, 255, 0.06)',
    textMuted: 'rgba(248, 250, 252, 0.45)',
    star: '#FFD76A',
  },
  warmCyberSunset: {
    surfaceAlpha: '99',
    surfaceStrongAlpha: 'D9',
    glass: 'rgba(255, 255, 255, 0.06)',
    glassBorder: 'rgba(255, 122, 89, 0.16)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',
    textMuted: 'rgba(251, 243, 236, 0.45)',
    star: '#FFD76A',
  },
  obsidianEmerald: {
    surfaceAlpha: 'B3',
    surfaceStrongAlpha: 'E6',
    glass: 'rgba(255, 255, 255, 0.04)',
    glassBorder: 'rgba(45, 212, 167, 0.14)',
    glassHighlight: 'rgba(255, 255, 255, 0.05)',
    textMuted: 'rgba(245, 245, 245, 0.42)',
    star: '#FFD76A',
  },
  softAcademicLight: {
    surfaceAlpha: 'BF',
    surfaceStrongAlpha: 'EB',
    // Emerald glass, matching the theme's own primary ramp. These were still
    // indigo rgba(79,70,229), so switching to Soft Academic Light left the
    // voice screen violet while the rest of the app turned green.
    glass: 'rgba(4, 120, 87, 0.05)',
    glassBorder: 'rgba(4, 120, 87, 0.15)',
    glassHighlight: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(30, 41, 59, 0.45)',
    star: '#F59E0B',
  },
};

/**
 * Mixes a hex colour toward another by `amount` (0-1). Used to build the
 * recording state's two-stop ramp: the theme carries a single error colour, so
 * the gradient's second stop is derived against the theme's own background
 * rather than hand-picked as a fixed red that would drift per theme.
 */
const mixToward = (hex, target, amount) => {
  const parse = (h) => {
    const n = parseInt(String(h).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(hex);
  const b = parse(target);
  const mixed = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

export function useVoicePalette() {
  const { colors, onPrimary, themeName } = useTheme();
  const extra = voiceExtras[themeName] || voiceExtras.midnightTeal;

  // The orb's core is the screen's loudest surface, so it has to be the active
  // theme's own gradient ramp rather than a per-theme duplicate that silently
  // goes stale. `primaryHover -> primaryDark` reads as the theme's highlight
  // pair on the dark themes and as a deep emerald on the light one.
  const orbCoreGradient = [colors.primaryHover, colors.primaryDark];

  return {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
    backgroundDeep: colors.backgroundDeep,
    surface: `${colors.surface}${extra.surfaceAlpha}`,
    surfaceStrong: `${colors.surface}${extra.surfaceStrongAlpha}`,
    glass: extra.glass,
    glassBorder: extra.glassBorder,
    glassHighlight: extra.glassHighlight,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: extra.textMuted,
    onPrimary,
    overlay: colors.overlay,
    border: colors.border,
    danger: colors.error,
    dangerDark: mixToward(colors.error, colors.backgroundDeep, 0.3),
    warning: colors.warning,
    success: colors.success,
    star: extra.star,
    orbCoreGradient,
    onGradientText: readableOnGradient(orbCoreGradient),
  };
}
