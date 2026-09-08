import { mysqlTable, text, int, float, varchar, timestamp } from 'drizzle-orm/mysql-core';

export const avatars = mysqlTable('avatars', {
  avatarId: int('avatar_id').primaryKey().autoincrement(),
  avatarName: varchar('avatar_name', { length: 255 }).notNull(),
  avatarImage: varchar('avatar_image', { length: 500 }).notNull(),
});

export const users = mysqlTable('users', {
  userId: int('user_id').primaryKey().autoincrement(),
  fullname: varchar('fullname', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  clerkId: varchar('clerk_id', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }),
  supabaseId: varchar('supabase_id', { length: 255 }),
  avatarId: int('avatar_id').default(1),
  preferredLang: varchar('preferred_lang', { length: 50 }).default('English'),
  learningLang: varchar('learning_lang', { length: 50 }).default('Bisaya'),
  country: varchar('country', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  status: varchar('status', { length: 20 }).notNull().default('approved'),
  isVerified: int('is_verified').default(0),
  isNativeSpeaker: int('is_native_speaker').default(0),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSettings = mysqlTable('user_settings', {
  settingId: int('setting_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  darkMode: int('dark_mode').default(0),
  speechSpeed: float('speech_speed').default(1.0),
  voiceGender: varchar('voice_gender', { length: 20 }).default('neutral'),
});

export const savedPhrases = mysqlTable('saved_phrases', {
  phraseId: int('phrase_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  phrase: varchar('phrase', { length: 500 }).notNull(),
  language: varchar('language', { length: 50 }),
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = mysqlTable('notifications', {
  notifyId: int('notify_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  message: text('message'),
  isRead: int('is_read').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feedback = mysqlTable('feedback', {
  feedbackId: int('feedback_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  functionality: int('functionality').default(0),
  usability: int('usability').default(0),
  reliability: int('reliability').default(0),
  resolved: int('resolved').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = mysqlTable('conversations', {
  conversationId: int('conversation_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversationMessages = mysqlTable('conversation_messages', {
  messageId: int('message_id').primaryKey().autoincrement(),
  conversationId: int('conversation_id')
    .notNull()
    .references(() => conversations.conversationId, { onDelete: 'cascade' }),
  sender: varchar('sender', { length: 20 }).notNull().default('user'),
  message: text('message'),
  translatedMessage: text('translated_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const speechRecords = mysqlTable('speech_records', {
  speechId: int('speech_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  audioPath: varchar('audio_path', { length: 500 }),
  recognizedText: text('recognized_text'),
  languageDetected: varchar('language_detected', { length: 50 }),
  confidence: float('confidence').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const translations = mysqlTable('translations', {
  translationId: int('translation_id').primaryKey().autoincrement(),
  speechId: int('speech_id')
    .notNull()
    .references(() => speechRecords.speechId, { onDelete: 'cascade' }),
  sourceLanguage: varchar('source_language', { length: 50 }),
  targetLanguage: varchar('target_language', { length: 50 }),
  translatedText: text('translated_text'),
});

export const phraseRecommendations = mysqlTable('phrase_recommendations', {
  recommendationId: int('recommendation_id').primaryKey().autoincrement(),
  speechId: int('speech_id')
    .notNull()
    .references(() => speechRecords.speechId, { onDelete: 'cascade' }),
  recommendedPhrase: text('recommended_phrase'),
  intent: varchar('intent', { length: 100 }),
  confidence: float('confidence').default(0),
});

export const learningModules = mysqlTable('learning_modules', {
  moduleId: int('module_id').primaryKey().autoincrement(),
  moduleTitle: varchar('module_title', { length: 255 }).notNull(),
  difficulty: varchar('difficulty', { length: 50 }).default('beginner'),
  language: varchar('language', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const learningProgress = mysqlTable('learning_progress', {
  progressId: int('progress_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  moduleId: int('module_id')
    .notNull()
    .references(() => learningModules.moduleId, { onDelete: 'cascade' }),
  completionPercent: float('completion_percent').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const communityPosts = mysqlTable('community_posts', {
  postId: int('post_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  content: text('content'),
  phrase: varchar('phrase', { length: 500 }),
  translation: varchar('translation', { length: 500 }),
  category: varchar('category', { length: 100 }),
  likesCount: int('likes_count').default(0),
  bookmarksCount: int('bookmarks_count').default(0),
  isFeatured: int('is_featured').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const comments = mysqlTable('comments', {
  commentId: int('comment_id').primaryKey().autoincrement(),
  postId: int('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const communityReports = mysqlTable('community_reports', {
  reportId: int('report_id').primaryKey().autoincrement(),
  postId: int('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  reporterId: int('reporter_id').references(() => users.userId, { onDelete: 'set null' }),
  reason: varchar('reason', { length: 255 }),
  status: varchar('status', { length: 20 }).default('open'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const learnerProfiles = mysqlTable('learner_profiles', {
  profileId: int('profile_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  level: varchar('level', { length: 50 }).default('beginner'),
  strengths: text('strengths'),
  weakAreas: text('weak_areas'),
  commonMistakes: text('common_mistakes'),
  totalXp: int('total_xp').default(0),
  coins: int('coins').default(0),
  streak: int('streak').default(0),
  dailyXp: int('daily_xp').default(0),
  dailyGoal: int('daily_goal').default(50),
  totalSessions: int('total_sessions').default(0),
  lastActive: varchar('last_active', { length: 50 }),
});

export const preservedWords = mysqlTable('preserved_words', {
  wordId: int('word_id').primaryKey().autoincrement(),
  word: varchar('word', { length: 255 }).notNull(),
  definition: text('definition'),
  partOfSpeech: varchar('part_of_speech', { length: 50 }),
  dialectalRegion: varchar('dialectal_region', { length: 100 }),
  bisayaExample: text('bisaya_example'),
  englishExample: text('english_example'),
  pronunciationGuide: varchar('pronunciation_guide', { length: 255 }),
  submittedBy: int('submitted_by').references(() => users.userId, { onDelete: 'set null' }),
  source: varchar('source', { length: 50 }).default('learner'),
  status: varchar('status', { length: 20 }).default('pending'),
  verificationCount: int('verification_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verificationRequests = mysqlTable('verification_requests', {
  requestId: int('request_id').primaryKey().autoincrement(),
  wordId: int('word_id').references(() => preservedWords.wordId, { onDelete: 'cascade' }),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  audioPath: varchar('audio_path', { length: 500 }),
  recordedText: text('recorded_text'),
  verifierId: int('verifier_id').references(() => users.userId, { onDelete: 'set null' }),
  score: float('score'),
  feedback: text('feedback'),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  verifiedAt: timestamp('verified_at'),
});

export const tutorSessions = mysqlTable('tutor_sessions', {
  sessionId: int('session_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  messages: text('messages'),
  summary: text('summary'),
  xpEarned: int('xp_earned').default(0),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
});

export const pronunciationAttempts = mysqlTable('pronunciation_attempts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  word: varchar('word', { length: 255 }).notNull(),
  phoneticExpected: varchar('phonetic_expected', { length: 255 }).default(''),
  phoneticHeard: varchar('phonetic_heard', { length: 255 }).default(''),
  accuracy: float('accuracy').default(0),
  confidence: float('confidence').default(0),
  mistakes: text('mistakes').default('[]'),
  lessonContext: varchar('lesson_context', { length: 255 }),
  timestamp: varchar('timestamp', { length: 50 }),
});

export const vocabularyReviews = mysqlTable('vocabulary_reviews', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  word: varchar('word', { length: 255 }).notNull(),
  translation: varchar('translation', { length: 500 }).default(''),
  pronunciation: varchar('pronunciation', { length: 255 }).default(''),
  ipa: varchar('ipa', { length: 100 }),
  category: varchar('category', { length: 100 }).default('custom'),
  difficulty: int('difficulty').default(1),
  mastery: float('mastery').default(0),
  reviewCount: int('review_count').default(0),
  easeFactor: float('ease_factor').default(2.5),
  interval: int('interval').default(1),
  nextReview: varchar('next_review', { length: 50 }).notNull(),
  lastReview: varchar('last_review', { length: 50 }),
  isFavorite: int('is_favorite').default(0),
  usageFrequency: int('usage_frequency').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversationSummaries = mysqlTable('conversation_summaries', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  topics: text('topics').default('[]'),
  vocabularyLearned: text('vocabulary_learned').default('[]'),
  duration: int('duration').default(0),
  timestamp: varchar('timestamp', { length: 50 }),
});

export const xpLogs = mysqlTable('xp_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  amount: int('amount').notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const aiRecommendations = mysqlTable('ai_recommendations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  recommendationType: varchar('recommendation_type', { length: 100 }).notNull(),
  content: text('content').notNull(),
  priority: int('priority').default(0),
  isApplied: int('is_applied').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  appliedAt: timestamp('applied_at'),
});

export const userSessions = mysqlTable('user_sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  refreshToken: varchar('refresh_token', { length: 500 }).notNull(),
  deviceInfo: varchar('device_info', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 50 }),
  expiresAt: varchar('expires_at', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationPreferences = mysqlTable('notification_preferences', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  dailyReminder: int('daily_reminder').default(1),
  dailyReminderHour: int('daily_reminder_hour').default(9),
  dailyReminderMinute: int('daily_reminder_minute').default(0),
  streakReminder: int('streak_reminder').default(1),
  reviewReminder: int('review_reminder').default(1),
  weeklyReport: int('weekly_report').default(1),
  achievementAlerts: int('achievement_alerts').default(1),
  communityAlerts: int('community_alerts').default(1),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const learningAnalytics = mysqlTable('learning_analytics', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: 'cascade' }),
  totalSpeakingSeconds: int('total_speaking_seconds').default(0),
  totalWordsLearned: int('total_words_learned').default(0),
  totalPronunciationAttempts: int('total_pronunciation_attempts').default(0),
  avgPronunciationAccuracy: float('avg_pronunciation_accuracy').default(0),
  avgSessionDuration: float('avg_session_duration').default(0),
  favoriteCategory: varchar('favorite_category', { length: 100 }),
  weakestCategory: varchar('weakest_category', { length: 100 }),
  weeklyXp: text('weekly_xp').default('[]'),
  lastCalculated: varchar('last_calculated', { length: 50 }),
});

export const bookmarks = mysqlTable('bookmarks', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  postId: int('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const likes = mysqlTable('likes', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  postId: int('post_id')
    .notNull()
    .references(() => communityPosts.postId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 50 }),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const dailyActivity = mysqlTable('daily_activity', {
  activityId: int('activity_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  activityDate: varchar('activity_date', { length: 50 }).notNull(),
  xpEarned: int('xp_earned').default(0),
});

export const userAchievements = mysqlTable('user_achievements', {
  userAchievementId: int('user_achievement_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  achievementId: varchar('achievement_id', { length: 100 }).notNull(),
  unlockedAt: varchar('unlocked_at', { length: 50 }),
});

export const userBadges = mysqlTable('user_badges', {
  userBadgeId: int('user_badge_id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  badgeId: varchar('badge_id', { length: 100 }).notNull(),
  earnedAt: varchar('earned_at', { length: 50 }),
});

export const completedChallenges = mysqlTable('completed_challenges', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  challengeId: varchar('challenge_id', { length: 100 }).notNull(),
  completedAt: timestamp('completed_at').defaultNow(),
});

export const follows = mysqlTable('follows', {
  id: int('id').primaryKey().autoincrement(),
  followerId: int('follower_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  followingId: int('following_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verifications = mysqlTable('verifications', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  verifiedBy: int('verified_by').references(() => users.userId, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
