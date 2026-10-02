import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';

export const avatars = sqliteTable('avatars', {
  avatarId: integer('avatar_id').primaryKey({ autoIncrement: true }),
  avatarName: text('avatar_name').notNull(),
  avatarImage: text('avatar_image').notNull(),
});

export const roles = sqliteTable('roles', {
  roleId: integer('role_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const permissions = sqliteTable('permissions', {
  permissionId: integer('permission_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  description: text('description'),
});

export const rolePermissions = sqliteTable('role_permissions', {
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.roleId, { onDelete: 'cascade' }),
  permissionId: integer('permission_id')
    .notNull()
    .references(() => permissions.permissionId, { onDelete: 'cascade' }),
});

export const users = sqliteTable('users', {
  userId: integer('user_id').primaryKey({ autoIncrement: true }),
  fullname: text('fullname').notNull(),
  username: text('username'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  clerkId: text('clerk_id'),
  googleId: text('google_id'),
  supabaseId: text('supabase_id'),
  avatarId: integer('avatar_id').default(1),
  preferredLang: text('preferred_lang').default('English'),
  learningLang: text('learning_lang').default('Bisaya'),
  country: text('country'),
  role: text('role').notNull().default('user'),
  roleId: integer('role_id').references(() => roles.roleId),
  status: text('status').notNull().default('approved'),
  isVerified: integer('is_verified').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const userSettings = sqliteTable('user_settings', {
  settingId: integer('setting_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  darkMode: integer('dark_mode').default(0),
  speechSpeed: real('speech_speed').default(1.0),
  voiceGender: text('voice_gender').default('neutral'),
});

export const savedPhrases = sqliteTable('saved_phrases', {
  phraseId: integer('phrase_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  phrase: text('phrase').notNull(),
  language: text('language'),
  category: text('category'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const notifications = sqliteTable('notifications', {
  notifyId: integer('notify_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title'),
  message: text('message'),
  isRead: integer('is_read').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const feedback = sqliteTable('feedback', {
  feedbackId: integer('feedback_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  functionality: integer('functionality').default(0),
  usability: integer('usability').default(0),
  reliability: integer('reliability').default(0),
  resolved: integer('resolved').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const conversations = sqliteTable('conversations', {
  conversationId: integer('conversation_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const conversationMessages = sqliteTable('conversation_messages', {
  messageId: integer('message_id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => conversations.conversationId, { onDelete: 'cascade' }),
  sender: text('sender').notNull().default('user'),
  message: text('message'),
  translatedMessage: text('translated_message'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const speechRecords = sqliteTable('speech_records', {
  speechId: integer('speech_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  audioPath: text('audio_path'),
  recognizedText: text('recognized_text'),
  languageDetected: text('language_detected'),
  confidence: real('confidence').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const translations = sqliteTable('translations', {
  translationId: integer('translation_id').primaryKey({ autoIncrement: true }),
  speechId: integer('speech_id')
    .notNull()
    .references(() => speechRecords.speechId, { onDelete: 'cascade' }),
  sourceLanguage: text('source_language'),
  targetLanguage: text('target_language'),
  translatedText: text('translated_text'),
});

export const phraseRecommendations = sqliteTable('phrase_recommendations', {
  recommendationId: integer('recommendation_id').primaryKey({ autoIncrement: true }),
  speechId: integer('speech_id')
    .notNull()
    .references(() => speechRecords.speechId, { onDelete: 'cascade' }),
  recommendedPhrase: text('recommended_phrase'),
  intent: text('intent'),
  confidence: real('confidence').default(0),
});

export const learningModules = sqliteTable('learning_modules', {
  moduleId: integer('module_id').primaryKey({ autoIncrement: true }),
  moduleTitle: text('module_title').notNull(),
  moduleKey: text('module_key'),
  sortOrder: integer('sort_order').default(0),
  difficulty: text('difficulty').default('beginner'),
  language: text('language'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const lessonItems = sqliteTable('lesson_items', {
  itemId: integer('item_id').primaryKey({ autoIncrement: true }),
  moduleId: integer('module_id')
    .notNull()
    .references(() => learningModules.moduleId, { onDelete: 'cascade' }),
  sectionTitle: text('section_title'),
  nativeText: text('native_text').notNull(),
  englishText: text('english_text'),
  note: text('note'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const learningProgress = sqliteTable('learning_progress', {
  progressId: integer('progress_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  moduleId: integer('module_id')
    .notNull()
    .references(() => learningModules.moduleId, { onDelete: 'cascade' }),
  completionPercent: real('completion_percent').default(0),
  masteryScore: real('mastery_score').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
  updatedAt: text('updated_at').default(`datetime('now')`),
});

export const communityPosts = sqliteTable('community_posts', {
  postId: integer('post_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title'),
  content: text('content'),
  phrase: text('phrase'),
  translation: text('translation'),
  category: text('category'),
  likesCount: integer('likes_count').default(0),
  bookmarksCount: integer('bookmarks_count').default(0),
  isFeatured: integer('is_featured').default(0),
  isHidden: integer('is_hidden').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const comments = sqliteTable('comments', {
  commentId: integer('comment_id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  comment: text('comment'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const communityReports = sqliteTable('community_reports', {
  reportId: integer('report_id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').references(() => users.userId, { onDelete: 'set null' }),
  reason: text('reason'),
  status: text('status').default('open'),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const learnerProfiles = sqliteTable('learner_profiles', {
  profileId: integer('profile_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  level: text('level').default('beginner'),
  strengths: text('strengths'),
  weakAreas: text('weak_areas'),
  commonMistakes: text('common_mistakes'),
  totalXp: integer('total_xp').default(0),
  coins: integer('coins').default(0),
  streak: integer('streak').default(0),
  dailyXp: integer('daily_xp').default(0),
  dailyGoal: integer('daily_goal').default(50),
  totalSessions: integer('total_sessions').default(0),
  lastActive: text('last_active'),
});

export const preservedWords = sqliteTable('preserved_words', {
  wordId: integer('word_id').primaryKey({ autoIncrement: true }),
  word: text('word').notNull(),
  definition: text('definition'),
  partOfSpeech: text('part_of_speech'),
  dialectalRegion: text('dialectal_region'),
  bisayaExample: text('bisaya_example'),
  englishExample: text('english_example'),
  pronunciationGuide: text('pronunciation_guide'),
  submittedBy: integer('submitted_by').references(() => users.userId, { onDelete: 'set null' }),
  source: text('source').default('learner'),
  status: text('status').default('pending'),
  verificationCount: integer('verification_count').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const verificationRequests = sqliteTable('verification_requests', {
  requestId: integer('request_id').primaryKey({ autoIncrement: true }),
  wordId: integer('word_id').references(() => preservedWords.wordId, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  audioPath: text('audio_path'),
  recordedText: text('recorded_text'),
  verifierId: integer('verifier_id').references(() => users.userId, { onDelete: 'set null' }),
  score: real('score'),
  feedback: text('feedback'),
  status: text('status').default('pending'),
  createdAt: text('created_at').default(`datetime('now')`),
  verifiedAt: text('verified_at'),
});

export const tutorSessions = sqliteTable('tutor_sessions', {
  sessionId: integer('session_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  messages: text('messages'),
  summary: text('summary'),
  startedAt: text('started_at').default(`datetime('now')`),
  endedAt: text('ended_at'),
  xpEarned: integer('xp_earned').default(0),
});

export const pronunciationAttempts = sqliteTable('pronunciation_attempts', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  word: text('word').notNull(),
  phoneticExpected: text('phonetic_expected').default(''),
  phoneticHeard: text('phonetic_heard').default(''),
  accuracy: real('accuracy').default(0),
  confidence: real('confidence').default(0),
  mistakes: text('mistakes').default('[]'),
  lessonContext: text('lesson_context'),
  timestamp: text('timestamp').default(`datetime('now')`),
});

export const vocabularyReviews = sqliteTable('vocabulary_reviews', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  word: text('word').notNull(),
  translation: text('translation').default(''),
  pronunciation: text('pronunciation').default(''),
  ipa: text('ipa'),
  category: text('category').default('custom'),
  difficulty: integer('difficulty').default(1),
  mastery: real('mastery').default(0),
  reviewCount: integer('review_count').default(0),
  easeFactor: real('ease_factor').default(2.5),
  interval: integer('interval').default(1),
  nextReview: text('next_review').notNull(),
  lastReview: text('last_review'),
  isFavorite: integer('is_favorite').default(0),
  usageFrequency: integer('usage_frequency').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
  updatedAt: text('updated_at').default(`datetime('now')`),
});

export const conversationSummaries = sqliteTable('conversation_summaries', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  topics: text('topics').default('[]'),
  vocabularyLearned: text('vocabulary_learned').default('[]'),
  duration: integer('duration').default(0),
  timestamp: text('timestamp').default(`datetime('now')`),
});

export const xpLogs = sqliteTable(
  'xp_logs',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    source: text('source').notNull(),
    description: text('description'),
    idempotencyKey: text('idempotency_key'),
    timestamp: text('timestamp').default(`datetime('now')`),
  },
  (table) => ({
    uniqueUserIdempotency: unique('idx_xp_logs_idempotency').on(table.userId, table.idempotencyKey),
  })
);

export const aiRecommendations = sqliteTable('ai_recommendations', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  recommendationType: text('recommendation_type').notNull(),
  content: text('content').notNull(),
  priority: integer('priority').default(0),
  isApplied: integer('is_applied').default(0),
  createdAt: text('created_at').default(`datetime('now')`),
  appliedAt: text('applied_at'),
});

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull(),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const notificationPreferences = sqliteTable('notification_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  dailyReminder: integer('daily_reminder').default(1),
  dailyReminderHour: integer('daily_reminder_hour').default(9),
  dailyReminderMinute: integer('daily_reminder_minute').default(0),
  streakReminder: integer('streak_reminder').default(1),
  reviewReminder: integer('review_reminder').default(1),
  weeklyReport: integer('weekly_report').default(1),
  achievementAlerts: integer('achievement_alerts').default(1),
  communityAlerts: integer('community_alerts').default(1),
  updatedAt: text('updated_at').default(`datetime('now')`),
});

export const learningAnalytics = sqliteTable('learning_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  totalSpeakingSeconds: integer('total_speaking_seconds').default(0),
  totalWordsLearned: integer('total_words_learned').default(0),
  totalPronunciationAttempts: integer('total_pronunciation_attempts').default(0),
  avgPronunciationAccuracy: real('avg_pronunciation_accuracy').default(0),
  avgSessionDuration: real('avg_session_duration').default(0),
  favoriteCategory: text('favorite_category'),
  weakestCategory: text('weakest_category'),
  weeklyXp: text('weekly_xp').default('[]'),
  lastCalculated: text('last_calculated'),
});

export const bookmarks = sqliteTable('bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const likes = sqliteTable('likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  timestamp: text('timestamp').default(`datetime('now')`),
});

export const dailyActivity = sqliteTable(
  'daily_activity',
  {
    activityId: integer('activity_id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    activityDate: text('activity_date').notNull(),
    xpEarned: integer('xp_earned').default(0),
  },
  (table) => ({
    uniqueUserDate: unique('idx_daily_activity_user_date').on(table.userId, table.activityDate),
  })
);

export const userAchievements = sqliteTable('user_achievements', {
  userAchievementId: integer('user_achievement_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull(),
  unlockedAt: text('unlocked_at'),
});

export const userBadges = sqliteTable('user_badges', {
  userBadgeId: integer('user_badge_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull(),
  earnedAt: text('earned_at'),
});

export const completedChallenges = sqliteTable(
  'completed_challenges',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    challengeId: text('challenge_id').notNull(),
    type: text('type').notNull().default('daily'),
    completedDate: text('completed_date').notNull(),
    completedAt: text('completed_at').default(`datetime('now')`),
  },
  (table) => ({
    uniqueUserChallengeDate: unique('idx_completed_challenges_user_challenge_date').on(
      table.userId,
      table.challengeId,
      table.completedDate
    ),
  })
);

export const learningSessions = sqliteTable('learning_sessions', {
  sessionId: integer('session_id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  moduleId: integer('module_id').references(() => learningModules.moduleId, {
    onDelete: 'set null',
  }),
  activityType: text('activity_type').notNull(),
  startedAt: text('started_at').default(`datetime('now')`),
  endedAt: text('ended_at'),
  durationSeconds: integer('duration_seconds').default(0),
  xpEarned: integer('xp_earned').default(0),
});

export const follows = sqliteTable('follows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  followerId: integer('follower_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  followingId: integer('following_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(`datetime('now')`),
});

export const verifications = sqliteTable('verifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  verifiedBy: integer('verified_by').references(() => users.userId, { onDelete: 'set null' }),
  status: text('status').default('pending'),
  createdAt: text('created_at').default(`datetime('now')`),
});

/**
 * Public API keys for third-party developers and AI agents.
 *
 * The plaintext key is never stored - only a short lookup prefix and a scrypt
 * hash - so a database leak cannot be replayed as a working credential.
 */
export const apiKeys = sqliteTable('api_keys', {
  keyId: integer('key_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  lookupPrefix: text('lookup_prefix').notNull(),
  keyHash: text('key_hash').notNull(),
  scopes: text('scopes').notNull().default('lexicon:read,g2p:read,pronunciation:write'),
  rateLimitPerMinute: integer('rate_limit_per_minute').notNull().default(60),
  status: text('status').notNull().default('active'),
  ownerUserId: integer('owner_user_id').references(() => users.userId, { onDelete: 'set null' }),
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  revokedAt: text('revoked_at'),
  requestCount: integer('request_count').notNull().default(0),
  createdAt: text('created_at').default(`datetime('now')`),
});
