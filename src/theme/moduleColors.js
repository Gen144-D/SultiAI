const MODULE_GRADIENTS = {
  midnightTeal: {
    scenario_practice: ['#3B82F6', '#2563EB'],
    grammar: ['#8B5CF6', '#7C3AED'],
    listening: ['#F59E0B', '#F97316'],
    writing: ['#EC4899', '#DB2777'],
    reading: ['#14B8A6', '#0D9488'],
    sulti_switch: ['#06B6D4', '#0891B2'],
    culture_notes: ['#10B981', '#059669'],
    review_center: ['#F43F5E', '#E11D48'],
  },
  warmCyberSunset: {
    scenario_practice: ['#F97316', '#EA580C'],
    grammar: ['#A855F7', '#7E22CE'],
    listening: ['#F59E0B', '#D97706'],
    writing: ['#EC4899', '#BE185D'],
    reading: ['#2DD4BF', '#0F766E'],
    sulti_switch: ['#F43F5E', '#9F1239'],
    culture_notes: ['#84CC16', '#4D7C0F'],
    review_center: ['#E11D48', '#9F1239'],
  },
  obsidianEmerald: {
    scenario_practice: ['#0EA5E9', '#0369A1'],
    grammar: ['#8B5CF6', '#6D28D9'],
    listening: ['#F59E0B', '#B45309'],
    writing: ['#EC4899', '#9D174D'],
    reading: ['#14B8A6', '#0F766E'],
    sulti_switch: ['#06B6D4', '#0E7490'],
    culture_notes: ['#10B981', '#047857'],
    review_center: ['#E11D48', '#9F1239'],
  },
  softAcademicLight: {
    // Emerald family + two neutrals. The blue hues (#2563EB scenario,
    // #0D9488 reading) were re-tinted so the theme no longer reads blue, while
    // every module keeps a distinct identity.
    scenario_practice: ['#92400E', '#78350F'],
    grammar: ['#7C3AED', '#5B21B6'],
    listening: ['#D97706', '#B45309'],
    writing: ['#DB2777', '#9D174D'],
    reading: ['#475569', '#334155'],
    sulti_switch: ['#0891B2', '#0E7490'],
    culture_notes: ['#4D7C0F', '#3F6212'],
    review_center: ['#E11D48', '#9F1239'],
  },
};

const CATEGORY_GRADIENTS = {
  midnightTeal: {
    pronunciation: ['#00D4BD', '#0D9488'],
    vocabulary: ['#3B82F6', '#2563EB'],
    grammar: ['#8B5CF6', '#7C3AED'],
    listening: ['#F59E0B', '#F97316'],
    conversation: ['#EC4899', '#DB2777'],
  },
  warmCyberSunset: {
    pronunciation: ['#FF7A59', '#E8603F'],
    vocabulary: ['#F5A524', '#D97706'],
    grammar: ['#C084FC', '#8B5CF6'],
    listening: ['#FDBA74', '#F97316'],
    conversation: ['#FB7185', '#E11D48'],
  },
  obsidianEmerald: {
    pronunciation: ['#2DD4A7', '#0D9488'],
    vocabulary: ['#60A5FA', '#3B82F6'],
    grammar: ['#A78BFA', '#7C3AED'],
    listening: ['#FBBF24', '#D97706'],
    conversation: ['#F472B6', '#DB2777'],
  },
  softAcademicLight: {
    pronunciation: ['#65A30D', '#4D7C0F'],
    vocabulary: ['#0F766E', '#115E59'],
    grammar: ['#7C3AED', '#6D28D9'],
    listening: ['#D97706', '#EA580C'],
    conversation: ['#DB2777', '#BE185D'],
  },
};

const NEUTRAL_GRADIENTS = {
  midnightTeal: { neutral: ['#6366F1', '#4F46E5'], success: ['#10B981', '#059669'], amber: ['#F59E0B', '#F97316'], rose: ['#F43F5E', '#E11D48'] },
  warmCyberSunset: { neutral: ['#C084FC', '#8B5CF6'], success: ['#4ADE80', '#16A34A'], amber: ['#FBBF24', '#F59E0B'], rose: ['#FB7185', '#E11D48'] },
  obsidianEmerald: { neutral: ['#6366F1', '#4338CA'], success: ['#34D399', '#059669'], amber: ['#FBBF24', '#D97706'], rose: ['#F87171', '#E11D48'] },
  softAcademicLight: { neutral: ['#047857', '#065F46'], success: ['#046C50', '#064E3B'], amber: ['#D97706', '#B45309'], rose: ['#E11D48', '#BE123C'] },
};

const MODULE_KEYS = [
  'scenario_practice',
  'grammar',
  'listening',
  'writing',
  'reading',
  'sulti_switch',
  'culture_notes',
  'review_center',
];

const MODULE_CATEGORIES = ['pronunciation', 'vocabulary', 'grammar', 'listening', 'conversation'];

const NEUTRAL_VARIANTS = ['neutral', 'success', 'amber', 'rose'];

const LABELS = {
  scenario_practice: 'Scenario Practice',
  grammar: 'Grammar',
  listening: 'Listening',
  writing: 'Writing',
  reading: 'Reading',
  sulti_switch: 'Sulti Switch',
  culture_notes: 'Culture Notes',
  review_center: 'Review Center',
  pronunciation: 'Pronunciation',
  vocabulary: 'Vocabulary',
  conversation: 'Conversation',
  neutral: 'General',
  success: 'Achieved',
  amber: 'Streak',
  rose: 'Mastery',
};

const FALLBACK_THEME = 'midnightTeal';

const MODULE_ALIASES = {
  voice_practice: 'reading',
  phrasebook: 'grammar',
  flashcards: 'listening',
  pronunciation_lab: 'writing',
  vocabulary_notebook: 'culture_notes',
  vocabulary: 'culture_notes',
  conversation: 'writing',
};

const ACCENT_TARGETS = {
  market: 'reading',
  transportation: 'scenario_practice',
  restaurant: 'listening',
  hospital: 'danger',
  school: 'grammar',
  workplace: 'neutral',
  hotel: 'sulti_switch',
  emergency: 'danger',
  community: 'culture_notes',
  smallTalk: 'writing',
  dating: 'review_center',
  festivals: 'grammar',
  chat: 'reading',
  voice: 'scenario_practice',
  roleplay: 'grammar',
  pronunciationCoach: 'writing',
  culture: 'culture_notes',
  switchMode: 'sulti_switch',
  review: 'review_center',
  newBadge: 'review_center',
};

const DANGER = {
  midnightTeal: '#EF4444',
  warmCyberSunset: '#F87171',
  obsidianEmerald: '#F87171',
  softAcademicLight: '#DC2626',
};

const LEVEL_ACCENTS = [
  'scenario_practice',
  'culture_notes',
  'listening',
  'danger',
  'grammar',
  'writing',
  'sulti_switch',
  'reading',
];

function resolve(themeName, key) {
  const target = MODULE_ALIASES[key] || key;
  const tables = [MODULE_GRADIENTS, CATEGORY_GRADIENTS];
  for (const table of tables) {
    const set = table[themeName] || table[FALLBACK_THEME];
    if (set[target]) return set[target];
  }
  const neutrals = NEUTRAL_GRADIENTS[themeName] || NEUTRAL_GRADIENTS[FALLBACK_THEME];
  if (neutrals[target]) return neutrals[target];
  return neutrals.neutral;
}

export function getModuleGradient(themeName, key) {
  return resolve(themeName, key);
}

function channelLuminance(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const l1 = channelLuminance(a);
  const l2 = channelLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const INK_DARK = '#0F172A';

export function readableOnGradient(gradient) {
  let best = '#FFFFFF';
  let bestMin = -1;
  // Pure black is included because #0F172A tops out around 4.4:1 on
  // mid-tone greens (e.g. the light theme's success gradient), which is
  // under the 4.5:1 needed for small text. Picking the maximum of the
  // worst-case ratios means extra candidates can only help.
  for (const ink of ['#FFFFFF', INK_DARK, '#000000']) {
    const worst = Math.min(...gradient.map((stop) => contrastRatio(stop, ink)));
    if (worst > bestMin) {
      bestMin = worst;
      best = ink;
    }
  }
  return best;
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Keeps a brand/decorative hue identifiable while guaranteeing it stays legible
 * on the given surface. Slides lightness toward the far end of the ramp until
 * the ratio is met, so a topic colour never becomes invisible on an unfamiliar
 * theme background.
 */
export function ensureContrast(color, background, minRatio = 4.5) {
  if (!color || !background) return color;
  if (contrastRatio(color, background) >= minRatio) return color;
  const bgL = hexToHsl(background)[2];
  const goDark = bgL > 0.5;
  const [h, s] = hexToHsl(color);
  for (let step = 1; step <= 20; step += 1) {
    const l = goDark
      ? Math.max(0, hexToHsl(color)[2] - step * 0.05)
      : Math.min(1, hexToHsl(color)[2] + step * 0.05);
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
    if (l === 0 || l === 1) break;
  }
  return goDark ? '#FFFFFF' : '#0F172A';
}

/**
 * Keeps a brand hue identifiable on a multi-stop gradient. `ensureContrast`
 * only knows about one background, so this walks every stop and takes the
 * harshest one — a heart or badge placed on a gradient needs the worst case,
 * not the average.
 */
export function ensureContrastAcross(color, backgrounds, minRatio = 4.5) {
  let result = color;
  for (const background of backgrounds) {
    result = ensureContrast(result, background, minRatio);
  }
  return result;
}

export function getNeutralGradient(themeName, variant) {
  const neutrals = NEUTRAL_GRADIENTS[themeName] || NEUTRAL_GRADIENTS[FALLBACK_THEME];
  return neutrals[variant] || neutrals.neutral;
}

export function getAccent(themeName, accentKey) {
  const target = ACCENT_TARGETS[accentKey] || accentKey;
  if (target === 'danger') {
    return DANGER[themeName] || DANGER[FALLBACK_THEME];
  }
  if (target === 'neutral') {
    return getNeutralGradient(themeName, 'neutral')[0];
  }
  return getModuleGradient(themeName, target)[0];
}

export function getLevelAccent(themeName, levelIndex) {
  const idx = Math.max(0, Math.min(LEVEL_ACCENTS.length - 1, levelIndex || 0));
  return getAccent(themeName, LEVEL_ACCENTS[idx]);
}

export function getModuleLabel(key) {
  return LABELS[key] || LABELS.neutral;
}

export function getModuleKeys() {
  return MODULE_KEYS;
}

export function getModuleCategories() {
  return MODULE_CATEGORIES;
}

export function getNeutralVariants() {
  return NEUTRAL_VARIANTS;
}
