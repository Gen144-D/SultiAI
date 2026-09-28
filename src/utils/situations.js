/**
 * Shared situation catalog for SultiAI.
 * Single source of truth for Tutor lessons, Practice phrases,
 * Role-play scenarios, and Voice Mode context.
 */

export const SITUATIONS = [
  {
    id: 'greetings',
    label: 'Greetings',
    icon: 'hand-left',
    emoji: '👋',
    desc: 'Meeting someone new',
    color: '#14B8A6',
    prompt: 'Greeting someone for the first time in Cebu',
    roleplay: 'Meeting a new friend and introducing yourself in Bisaya',
    difficulty: 'beginner',
    category: 'social',
  },
  {
    id: 'market',
    label: 'Market',
    icon: 'cart',
    emoji: '🛒',
    desc: 'Buying at the market',
    color: '#10B981',
    prompt: 'Buying food at a public market in Cebu',
    roleplay: 'Bargaining at the local market for fresh produce',
    character: 'Sulti is a market vendor at Carbon Market. You are bargaining for fresh mangoes.',
    difficulty: 'beginner',
    category: 'daily',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: 'restaurant',
    emoji: '🍽️',
    desc: 'Ordering food',
    color: '#F59E0B',
    prompt: 'Ordering at a restaurant in Cebu',
    roleplay: 'Ordering food at a restaurant in Cebu and asking for recommendations',
    character:
      'Sulti is your waiter at a busy restaurant in Cebu. You want to order lechon and rice.',
    difficulty: 'beginner',
    category: 'daily',
  },
  {
    id: 'directions',
    label: 'Directions',
    icon: 'compass',
    emoji: '🧭',
    desc: 'Asking for directions',
    color: '#8B5CF6',
    prompt: 'Asking for directions around Cebu City',
    roleplay: 'Asking a local for directions to a nearby landmark',
    difficulty: 'intermediate',
    category: 'travel',
  },
  {
    id: 'jeepney',
    label: 'Jeepney',
    icon: 'bus',
    emoji: '🚌',
    desc: 'Riding jeepney',
    color: '#EF4444',
    prompt: 'Riding a jeepney and paying the fare',
    roleplay: 'Riding the jeepney, telling the driver where to stop, and paying fare',
    character: 'Sulti is your jeepney driver. Tell him where you are getting off.',
    difficulty: 'intermediate',
    category: 'travel',
  },
  {
    id: 'hospital',
    label: 'Hospital',
    icon: 'medkit',
    emoji: '🏥',
    desc: 'Medical visits',
    color: '#06B6D4',
    prompt: 'Visiting a hospital or clinic and describing symptoms',
    roleplay: 'At the hospital explaining symptoms to a nurse or doctor',
    character:
      'Sulti is the receptionist at a hospital. You need to describe your symptoms.',
    difficulty: 'intermediate',
    category: 'essential',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    icon: 'warning',
    emoji: '🚨',
    desc: 'Emergency situations',
    color: '#FF6B6B',
    prompt: 'Emergency situation phrases and asking for help',
    roleplay: 'An emergency situation where you need to ask for help in Bisaya',
    character: 'Sulti is a 911 dispatcher. Describe the emergency clearly and calmly.',
    difficulty: 'intermediate',
    category: 'essential',
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: 'people',
    emoji: '🤝',
    desc: 'Casual conversation',
    color: '#EC4899',
    prompt: 'Casual conversation with friends in Bisaya',
    roleplay: 'Meeting new friends and having a casual chat',
    character:
      'Sulti is a friendly local you just met at a gathering in Cebu. Get to know each other.',
    difficulty: 'beginner',
    category: 'social',
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: 'airplane',
    emoji: '✈️',
    desc: 'Travel & tourism',
    color: '#2563EB',
    prompt: 'Travel and tourism phrases around Cebu',
    roleplay: 'Traveling around Cebu as a tourist asking about places to visit',
    character: 'Sulti is a tour guide showing you around Cebu. Ask about places to visit.',
    difficulty: 'intermediate',
    category: 'travel',
  },
  {
    id: 'interview',
    label: 'Interview',
    icon: 'briefcase',
    emoji: '💼',
    desc: 'Job interview',
    color: '#6366F1',
    prompt: 'Job interview phrases in Bisaya and professional introductions',
    roleplay: 'A job interview conducted partly in Bisaya',
    character:
      'Sulti is the interviewer at a job interview. You are applying for a customer service job.',
    difficulty: 'advanced',
    category: 'work',
  },
  {
    id: 'school',
    label: 'School',
    icon: 'school',
    emoji: '📚',
    desc: 'Campus life',
    color: '#0EA5E9',
    prompt: 'School and campus conversation phrases',
    roleplay: 'Talking with a classmate or teacher at school in Bisaya',
    difficulty: 'beginner',
    category: 'daily',
  },
  {
    id: 'office',
    label: 'Workplace',
    icon: 'business',
    emoji: '🏢',
    desc: 'Office talk',
    color: '#64748B',
    prompt: 'Workplace small talk and meeting phrases in Bisaya',
    roleplay: 'A short workplace conversation with a coworker in Bisaya',
    difficulty: 'advanced',
    category: 'work',
  },
];

export const SITUATION_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'daily', label: 'Daily', icon: 'sunny' },
  { id: 'social', label: 'Social', icon: 'people' },
  { id: 'travel', label: 'Travel', icon: 'map' },
  { id: 'essential', label: 'Essential', icon: 'shield-checkmark' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
];

export function getSituationById(id) {
  if (!id) return null;
  return SITUATIONS.find((s) => s.id === id) || null;
}

export function resolveSituation(input) {
  if (!input) return null;
  if (typeof input === 'object' && input.id) return input;
  const key = String(input).toLowerCase().trim();
  return (
    SITUATIONS.find(
      (s) =>
        s.id === key ||
        s.label.toLowerCase() === key ||
        s.prompt.toLowerCase() === key ||
        s.roleplay.toLowerCase() === key
    ) || null
  );
}

export function getSituationsByCategory(category) {
  if (!category || category === 'all') return SITUATIONS;
  return SITUATIONS.filter((s) => s.category === category);
}

export function getSituationsByDifficulty(level) {
  if (!level) return SITUATIONS;
  return SITUATIONS.filter((s) => s.difficulty === level);
}

/** Compact chips for Tutor welcome / quick lessons */
export function getLessonSituations() {
  return SITUATIONS.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    desc: s.desc,
    color: s.color,
    situation: s.prompt,
    difficulty: s.difficulty,
  }));
}

/** Role-play prompts for Tutor */
export function getRoleplaySituations() {
  return SITUATIONS.map((s) => ({
    id: s.id,
    label: s.label,
    emoji: s.emoji,
    prompt: s.roleplay,
    color: s.color,
    difficulty: s.difficulty,
  }));
}

/**
 * Ordered role-play set surfaced by the Tutor hub chips and the
 * "All Role-Play Scenarios" bottom sheet. Order is intentional: the first
 * ROLEPLAY_CHIPS_LIMIT entries are the inline hub chips.
 */
export const TUTOR_ROLEPLAY_IDS = [
  'restaurant',
  'market',
  'jeepney',
  'hospital',
  'interview',
  'friends',
  'travel',
  'emergency',
];

export function getTutorRoleplayScenarios() {
  return TUTOR_ROLEPLAY_IDS.map((id) => {
    const s = getSituationById(id);
    if (!s) return null;
    return {
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      prompt: s.roleplay,
      color: s.color,
      difficulty: s.difficulty,
      character: s.character,
    };
  }).filter(Boolean);
}

/** Phrase practice suggestions */
export function getPhraseSuggestions() {
  return SITUATIONS.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    prompt: s.prompt,
    color: s.color,
    category: s.category,
  }));
}

/** Build system-context string for AI tutor when a situation is active */
export function buildSituationContext(situation) {
  if (!situation) return '';
  const s = resolveSituation(situation);
  if (!s) {
    const label = typeof situation === 'string' ? situation : 'general';
    return `\nActive practice situation: ${label}.\nStay in this real-life context. Prefer practical, speakable phrases for this setting.\n`;
  }
  return `\nActive practice situation: ${s.label} (${s.desc}).
Context: ${s.prompt}
Role-play style: ${s.roleplay}
Difficulty target: ${s.difficulty}
Stay in this real-life context. Prefer practical, speakable Bisaya phrases for this setting. Correct gently and keep responses short enough to say aloud.\n`;
}
