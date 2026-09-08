export const XP_VALUES = {
  VOICE_PRACTICE_LEARN: 25,
  VOICE_PRACTICE_TURN: 15,
  CHAT_MESSAGE: 10,
  LESSON_GENERATE: 20,
  LESSON_COMPLETE: 30,
  ROLEPLAY_START: 15,
  FLASHCARD_KNOWN: 10,
  FLASHCARD_REVIEW: 5,
  WHISPER_INTERACTION: 5,
  AR_SCAN: 5,
  SAVE_PHRASE: 2,
  ACHIEVEMENT_BONUS: 100,
  DAILY_REWARD: 50,
  DAILY_GOAL_COMPLETE: 50,
  TUTOR_SESSION_COMPLETE: 10,
  TUTOR_CHAT: 10,
  TUTOR_LESSON: 20,
} as const;

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, label: 'Starter', color: '#3B82F6', icon: 'leaf' },
  { level: 2, xp: 100, label: 'Beginner', color: '#10B981', icon: 'sparkles' },
  { level: 3, xp: 500, label: 'Intermediate', color: '#F59E0B', icon: 'medal' },
  { level: 4, xp: 2000, label: 'Advanced', color: '#EF4444', icon: 'star' },
  { level: 5, xp: 5000, label: 'Native-like', color: '#8B5CF6', icon: 'trophy' },
] as const;

export const ACHIEVEMENTS = [
  {
    id: 'first_100_xp',
    title: 'First Steps',
    description: 'Earn your first 100 XP',
    condition: { type: 'xp_threshold', value: 100 },
    icon: 'star',
    xpReward: 50,
    coinReward: 20,
  },
  {
    id: 'thousand_xp',
    title: 'Century',
    description: 'Earn 1,000 XP',
    condition: { type: 'xp_threshold', value: 1000 },
    icon: 'trophy',
    xpReward: 200,
    coinReward: 100,
  },
  {
    id: 'five_thousand_xp',
    title: 'Dedicated',
    description: 'Earn 5,000 XP',
    condition: { type: 'xp_threshold', value: 5000 },
    icon: 'diamond',
    xpReward: 500,
    coinReward: 250,
  },
  {
    id: 'streak_3',
    title: 'Getting Started',
    description: 'Maintain a 3-day streak',
    condition: { type: 'streak', value: 3 },
    icon: 'sparkles',
    xpReward: 50,
    coinReward: 30,
  },
  {
    id: 'streak_7',
    title: 'Consistent',
    description: 'Maintain a 7-day streak',
    condition: { type: 'streak', value: 7 },
    icon: 'calendar',
    xpReward: 100,
    coinReward: 50,
  },
  {
    id: 'streak_30',
    title: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    condition: { type: 'streak', value: 30 },
    icon: 'crown',
    xpReward: 500,
    coinReward: 200,
  },
  {
    id: 'daily_goal',
    title: 'Goal Crusher',
    description: 'Reach your daily XP goal',
    condition: { type: 'daily_goal' },
    icon: 'target',
    xpReward: 50,
    coinReward: 25,
  },
] as const;

export const SM2_DEFAULTS = {
  MIN_EASE_FACTOR: 1.3,
  INITIAL_EASE_FACTOR: 2.5,
  INITIAL_INTERVAL: 1,
  MAX_INTERVAL: 365,
  GRADING_THRESHOLD_PASS: 3,
} as const;

export const DAILY_GOAL_DEFAULT = 50;

export const RATE_LIMITS = {
  GLOBAL: { windowMs: 15 * 60 * 1000, max: 100 },
  AUTH: { windowMs: 15 * 60 * 1000, max: 5 },
  AI: { windowMs: 60 * 1000, max: 30 },
  SPEECH: { windowMs: 60 * 1000, max: 20 },
  COMMUNITY: { windowMs: 60 * 1000, max: 30 },
} as const;

export const CONVERSATION_MEMORY = {
  MAX_SESSION_MESSAGES: 50,
  MAX_SUMMARY_ENTRIES: 20,
  MEMORY_DECAY_DAYS: 30,
  IMPORTANCE_DECAY_RATE: 0.95,
} as const;

export const ADAPTIVE_PARAMS = {
  SESSIONS_TO_LEVEL_UP: 3,
  SESSIONS_TO_LEVEL_DOWN: 5,
  MASTERY_THRESHOLD_UP: 0.75,
  MASTERY_THRESHOLD_DOWN: 0.4,
  MIN_SESSIONS_FOR_ASSESSMENT: 3,
} as const;

export const VOCABULARY_CATEGORIES = [
  'greetings',
  'food',
  'family',
  'travel',
  'numbers',
  'time',
  'emotions',
  'body',
  'nature',
  'work',
  'culture',
  'custom',
] as const;

export const NOTIFICATION_TYPES = {
  DAILY_REMINDER: 'daily_reminder',
  STREAK_REMINDER: 'streak_reminder',
  REVIEW_VOCABULARY: 'review_vocabulary',
  WEEKLY_REPORT: 'weekly_report',
  NEW_CHALLENGE: 'new_challenge',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  COMMUNITY_REPLY: 'community_reply',
  GOAL_ACHIEVED: 'goal_achieved',
} as const;
