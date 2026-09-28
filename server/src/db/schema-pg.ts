import { pgTable, text, integer, serial, real, timestamp, unique } from 'drizzle-orm/pg-core';

export const avatars = pgTable('avatars', {
  avatarId: serial('avatar_id').primaryKey(),
  avatarName: text('avatar_name').notNull(),
  avatarImage: text('avatar_image').notNull(),
});

export const roles = pgTable('roles', {
  roleId: serial('role_id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const permissions = pgTable('permissions', {
  permissionId: serial('permission_id').primaryKey(),
  name: text('name').notNull().unique(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.roleId, { onDelete: 'cascade' }),
  permissionId: integer('permission_id')
    .notNull()
    .references(() => permissions.permissionId, { onDelete: 'cascade' }),
});

export const users = pgTable('users', {
  userId: serial('user_id').primaryKey(),
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
  status: text('status').notNull().default('approved'),
  isVerified: integer('is_verified').default(0),
  isNativeSpeaker: integer('is_native_speaker').default(0),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSettings = pgTable('user_settings', {
  settingId: serial('setting_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  darkMode: integer('dark_mode').default(0),
  speechSpeed: real('speech_speed').default(1.0),
  voiceGender: text('voice_gender').default('neutral'),
});

export const savedPhrases = pgTable('saved_phrases', {
  phraseId: serial('phrase_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  phrase: text('phrase').notNull(),
  language: text('language'),
  category: text('category'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  notifyId: serial('notify_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title'),
  message: text('message'),
  isRead: integer('is_read').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feedback = pgTable('feedback', {
  feedbackId: serial('feedback_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  functionality: integer('functionality').default(0),
  usability: integer('usability').default(0),
  reliability: integer('reliability').default(0),
  resolved: integer('resolved').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  conversationId: serial('conversation_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversationMessages = pgTable('conversation_messages', {
  messageId: serial('message_id').primaryKey(),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => conversations.conversationId, { onDelete: 'cascade' }),
  sender: text('sender').notNull().default('user'),
  message: text('message'),
  translatedMessage: text('translated_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const speechRecords = pgTable('speech_records', {
  speechId: serial('speech_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  audioPath: text('audio_path'),
  recognizedText: text('recognized_text'),
  languageDetected: text('language_detected'),
  confidence: real('confidence').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const translations = pgTable('translations', {
  translationId: serial('translation_id').primaryKey(),
  speechId: integer('speech_id')
    .notNull()
    .references(() => speechRecords.speechId, { onDelete: 'cascade' }),
  sourceLanguage: text('source_language'),
  targetLanguage: text('target_language'),
  translatedText: text('translated_text'),
});

export const phraseRecommendations = pgTable('phrase_recommendations', {
  recommendationId: serial('recommendation_id').primaryKey(),
  speechId: integer('speech_id')
    .notNull()
    .references(() => speechRecords.speechId, { onDelete: 'cascade' }),
  recommendedPhrase: text('recommended_phrase'),
  intent: text('intent'),
  confidence: real('confidence').default(0),
});

export const learningModules = pgTable('learning_modules', {
  moduleId: serial('module_id').primaryKey(),
  moduleTitle: text('module_title').notNull(),
  moduleKey: text('module_key'),
  sortOrder: integer('sort_order').default(0),
  difficulty: text('difficulty').default('beginner'),
  language: text('language'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lessonItems = pgTable('lesson_items', {
  itemId: serial('item_id').primaryKey(),
  moduleId: integer('module_id')
    .notNull()
    .references(() => learningModules.moduleId, { onDelete: 'cascade' }),
  sectionTitle: text('section_title'),
  nativeText: text('native_text').notNull(),
  englishText: text('english_text'),
  note: text('note'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const learningProgress = pgTable('learning_progress', {
  progressId: serial('progress_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  moduleId: integer('module_id')
    .notNull()
    .references(() => learningModules.moduleId, { onDelete: 'cascade' }),
  completionPercent: real('completion_percent').default(0),
  masteryScore: real('mastery_score').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const learningSessions = pgTable('learning_sessions', {
  sessionId: serial('session_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  moduleId: integer('module_id').references(() => learningModules.moduleId, {
    onDelete: 'set null',
  }),
  activityType: text('activity_type').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds').default(0),
  xpEarned: integer('xp_earned').default(0),
});

export const communityPosts = pgTable('community_posts', {
  postId: serial('post_id').primaryKey(),
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
  createdAt: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  commentId: serial('comment_id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const communityReports = pgTable('community_reports', {
  reportId: serial('report_id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').references(() => users.userId, { onDelete: 'set null' }),
  reason: text('reason'),
  status: text('status').default('open'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const learnerProfiles = pgTable('learner_profiles', {
  profileId: serial('profile_id').primaryKey(),
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
  hearts: integer('hearts').default(5),
  xpToNextLevel: integer('xp_to_next_level').default(100),
  totalSessions: integer('total_sessions').default(0),
  lastActive: text('last_active'),
});

export const preservedWords = pgTable('preserved_words', {
  wordId: serial('word_id').primaryKey(),
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
  createdAt: timestamp('created_at').defaultNow(),
});

export const verificationRequests = pgTable('verification_requests', {
  requestId: serial('request_id').primaryKey(),
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
  createdAt: timestamp('created_at').defaultNow(),
  verifiedAt: timestamp('verified_at'),
});

export const tutorSessions = pgTable('tutor_sessions', {
  sessionId: serial('session_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  messages: text('messages'),
  summary: text('summary'),
  xpEarned: integer('xp_earned').default(0),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
});

export const pronunciationAttempts = pgTable('pronunciation_attempts', {
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
  timestamp: text('timestamp'),
});

export const vocabularyReviews = pgTable('vocabulary_reviews', {
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
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const conversationSummaries = pgTable('conversation_summaries', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  topics: text('topics').default('[]'),
  vocabularyLearned: text('vocabulary_learned').default('[]'),
  duration: integer('duration').default(0),
  timestamp: text('timestamp'),
});

export const xpLogs = pgTable(
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
    timestamp: text('timestamp'),
  },
  (table) => ({
    uniqueUserIdempotency: unique('idx_xp_logs_idempotency').on(table.userId, table.idempotencyKey),
  })
);

export const aiRecommendations = pgTable('ai_recommendations', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  recommendationType: text('recommendation_type').notNull(),
  content: text('content').notNull(),
  priority: integer('priority').default(0),
  isApplied: integer('is_applied').default(0),
  createdAt: text('created_at'),
  appliedAt: text('applied_at'),
});

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull(),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at'),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
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
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const learningAnalytics = pgTable('learning_analytics', {
  id: serial('id').primaryKey(),
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

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    postId: integer('post_id')
      .notNull()
      .references(() => communityPosts.postId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueUserPost: unique('unique_user_post').on(table.userId, table.postId),
  })
);

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    postId: integer('post_id')
      .notNull()
      .references(() => communityPosts.postId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueUserPost: unique('unique_user_post').on(table.userId, table.postId),
  })
);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const dailyActivity = pgTable(
  'daily_activity',
  {
    activityId: serial('activity_id').primaryKey(),
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

export const userAchievements = pgTable(
  'user_achievements',
  {
    userAchievementId: serial('user_achievement_id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    achievementId: text('achievement_id').notNull(),
    unlockedAt: text('unlocked_at'),
  },
  (table) => ({
    uniqueUserAchievement: unique('unique_user_achievement').on(table.userId, table.achievementId),
  })
);

export const userBadges = pgTable(
  'user_badges',
  {
    userBadgeId: serial('user_badge_id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    badgeId: text('badge_id').notNull(),
    earnedAt: text('earned_at'),
  },
  (table) => ({
    uniqueUserBadge: unique('unique_user_badge').on(table.userId, table.badgeId),
  })
);

export const completedChallenges = pgTable(
  'completed_challenges',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    challengeId: text('challenge_id').notNull(),
    type: text('type').notNull().default('daily'),
    completedDate: text('completed_date').notNull(),
    completedAt: timestamp('completed_at').defaultNow(),
  },
  (table) => ({
    uniqueUserChallengeDate: unique('idx_completed_challenges_user_challenge_date').on(
      table.userId,
      table.challengeId,
      table.completedDate
    ),
  })
);

export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  followingId: integer('following_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  verifiedBy: integer('verified_by').references(() => users.userId, { onDelete: 'set null' }),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
