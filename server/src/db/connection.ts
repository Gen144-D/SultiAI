import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../sultiai.db');
const DIALECT = process.env.DB_DIALECT || 'sqlite';
const DATABASE_URL = process.env.DATABASE_URL || '';

let db: ReturnType<typeof drizzle>;
let sqliteRaw: Database.Database | null = null;
let pgPool: any = null;
let mysqlPool: any = null;

function getDialect() {
  if (DIALECT === 'postgresql' || DIALECT === 'postgres') return 'postgres';
  if (DIALECT === 'mysql') return 'mysql';
  return 'sqlite';
}

function initDatabase() {
  if (!sqliteRaw) return;
  sqliteRaw.pragma('foreign_keys = ON');
  const tables = [
    `CREATE TABLE IF NOT EXISTS avatars (avatar_id INTEGER PRIMARY KEY AUTOINCREMENT, avatar_name TEXT NOT NULL, avatar_image TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, fullname TEXT NOT NULL, username TEXT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, avatar_id INTEGER DEFAULT 1, preferred_lang TEXT DEFAULT 'English', learning_lang TEXT DEFAULT 'Bisaya', country TEXT, role TEXT NOT NULL DEFAULT 'user', role_id INTEGER REFERENCES roles(role_id), status TEXT NOT NULL DEFAULT 'approved', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS user_settings (setting_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, dark_mode INTEGER DEFAULT 0, speech_speed REAL DEFAULT 1.0, voice_gender TEXT DEFAULT 'neutral', FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS saved_phrases (phrase_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, phrase TEXT NOT NULL, language TEXT, category TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notifications (notify_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT, message TEXT, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS feedback (feedback_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, functionality INTEGER DEFAULT 0, usability INTEGER DEFAULT 0, reliability INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversations (conversation_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversation_messages (message_id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, sender TEXT NOT NULL DEFAULT 'user', message TEXT, translated_message TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS speech_records (speech_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, audio_path TEXT, recognized_text TEXT, language_detected TEXT, confidence REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS translations (translation_id INTEGER PRIMARY KEY AUTOINCREMENT, speech_id INTEGER NOT NULL, source_language TEXT, target_language TEXT, translated_text TEXT, FOREIGN KEY (speech_id) REFERENCES speech_records(speech_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS phrase_recommendations (recommendation_id INTEGER PRIMARY KEY AUTOINCREMENT, speech_id INTEGER NOT NULL, recommended_phrase TEXT, intent TEXT, confidence REAL DEFAULT 0, FOREIGN KEY (speech_id) REFERENCES speech_records(speech_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_modules (module_id INTEGER PRIMARY KEY AUTOINCREMENT, module_title TEXT NOT NULL, difficulty TEXT DEFAULT 'beginner', language TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS learning_progress (progress_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, module_id INTEGER NOT NULL, completion_percent REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_posts (post_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT, content TEXT, phrase TEXT, translation TEXT, category TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS comments (comment_id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, comment TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_reports (report_id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, reporter_id INTEGER, reason TEXT, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS learner_profiles (profile_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, level TEXT DEFAULT 'beginner', strengths TEXT, weak_areas TEXT, common_mistakes TEXT, total_xp INTEGER DEFAULT 0, coins INTEGER DEFAULT 0, streak INTEGER DEFAULT 0, daily_xp INTEGER DEFAULT 0, daily_goal INTEGER DEFAULT 50, total_sessions INTEGER DEFAULT 0, last_active TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS tutor_sessions (session_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, messages TEXT, summary TEXT, started_at TEXT DEFAULT (datetime('now')), ended_at TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS daily_activity (activity_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, activity_date TEXT NOT NULL, xp_earned INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_achievements (user_achievement_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, achievement_id TEXT NOT NULL, unlocked_at TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE(user_id, achievement_id))`,
    `CREATE TABLE IF NOT EXISTS user_badges (user_badge_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_id TEXT NOT NULL, earned_at TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE(user_id, badge_id))`,
    `CREATE TABLE IF NOT EXISTS pronunciation_attempts (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, word TEXT NOT NULL, phonetic_expected TEXT DEFAULT '', phonetic_heard TEXT DEFAULT '', accuracy REAL DEFAULT 0, confidence REAL DEFAULT 0, mistakes TEXT DEFAULT '[]', lesson_context TEXT, timestamp TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS vocabulary_reviews (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, word TEXT NOT NULL, translation TEXT DEFAULT '', pronunciation TEXT DEFAULT '', ipa TEXT, category TEXT DEFAULT 'custom', difficulty INTEGER DEFAULT 1, mastery REAL DEFAULT 0, review_count INTEGER DEFAULT 0, ease_factor REAL DEFAULT 2.5, interval INTEGER DEFAULT 1, next_review TEXT NOT NULL, last_review TEXT, is_favorite INTEGER DEFAULT 0, usage_frequency INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversation_summaries (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, summary TEXT NOT NULL, topics TEXT DEFAULT '[]', vocabulary_learned TEXT DEFAULT '[]', duration INTEGER DEFAULT 0, timestamp TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS xp_logs (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, amount INTEGER NOT NULL, source TEXT NOT NULL, description TEXT, timestamp TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ai_recommendations (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, recommendation_type TEXT NOT NULL, content TEXT NOT NULL, priority INTEGER DEFAULT 0, is_applied INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), applied_at TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, refresh_token TEXT NOT NULL, device_info TEXT, ip_address TEXT, expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, daily_reminder INTEGER DEFAULT 1, daily_reminder_hour INTEGER DEFAULT 9, daily_reminder_minute INTEGER DEFAULT 0, streak_reminder INTEGER DEFAULT 1, review_reminder INTEGER DEFAULT 1, weekly_report INTEGER DEFAULT 1, achievement_alerts INTEGER DEFAULT 1, community_alerts INTEGER DEFAULT 1, updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_analytics (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, total_speaking_seconds INTEGER DEFAULT 0, total_words_learned INTEGER DEFAULT 0, total_pronunciation_attempts INTEGER DEFAULT 0, avg_pronunciation_accuracy REAL DEFAULT 0, avg_session_duration REAL DEFAULT 0, favorite_category TEXT, weakest_category TEXT, weekly_xp TEXT DEFAULT '[]', last_calculated TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS bookmarks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, post_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, UNIQUE(user_id, post_id))`,
    `CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, post_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, UNIQUE(user_id, post_id))`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, resource_type TEXT, resource_id TEXT, details TEXT, ip_address TEXT, timestamp TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS roles (role_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS permissions (permission_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, resource TEXT NOT NULL, action TEXT NOT NULL, description TEXT)`,
    `CREATE TABLE IF NOT EXISTS role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE, FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE)`,
  ];
  for (const sql of tables) {
    sqliteRaw.exec(sql);
  }
  const addColumnMigrations: Array<{ table: string; column: string; sql: string }> = [
    {
      table: 'learner_profiles',
      column: 'coins',
      sql: 'ALTER TABLE learner_profiles ADD COLUMN coins INTEGER DEFAULT 0',
    },
    {
      table: 'learner_profiles',
      column: 'streak',
      sql: 'ALTER TABLE learner_profiles ADD COLUMN streak INTEGER DEFAULT 0',
    },
    {
      table: 'learner_profiles',
      column: 'daily_xp',
      sql: 'ALTER TABLE learner_profiles ADD COLUMN daily_xp INTEGER DEFAULT 0',
    },
    {
      table: 'learner_profiles',
      column: 'daily_goal',
      sql: 'ALTER TABLE learner_profiles ADD COLUMN daily_goal INTEGER DEFAULT 50',
    },
    {
      table: 'learner_profiles',
      column: 'hearts',
      sql: 'ALTER TABLE learner_profiles ADD COLUMN hearts INTEGER DEFAULT 5',
    },
    {
      table: 'learner_profiles',
      column: 'xp_to_next_level',
      sql: 'ALTER TABLE learner_profiles ADD COLUMN xp_to_next_level INTEGER DEFAULT 100',
    },
    {
      table: 'tutor_sessions',
      column: 'xp_earned',
      sql: 'ALTER TABLE tutor_sessions ADD COLUMN xp_earned INTEGER DEFAULT 0',
    },
    {
      table: 'users',
      column: 'is_verified',
      sql: 'ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0',
    },
    {
      table: 'users',
      column: 'is_native_speaker',
      sql: 'ALTER TABLE users ADD COLUMN is_native_speaker INTEGER DEFAULT 0',
    },
    { table: 'users', column: 'bio', sql: 'ALTER TABLE users ADD COLUMN bio TEXT' },
    { table: 'users', column: 'clerk_id', sql: 'ALTER TABLE users ADD COLUMN clerk_id TEXT' },
    {
      table: 'community_posts',
      column: 'likes_count',
      sql: 'ALTER TABLE community_posts ADD COLUMN likes_count INTEGER DEFAULT 0',
    },
    {
      table: 'community_posts',
      column: 'bookmarks_count',
      sql: 'ALTER TABLE community_posts ADD COLUMN bookmarks_count INTEGER DEFAULT 0',
    },
    {
      table: 'community_posts',
      column: 'is_featured',
      sql: 'ALTER TABLE community_posts ADD COLUMN is_featured INTEGER DEFAULT 0',
    },
    {
      table: 'feedback',
      column: 'resolved',
      sql: 'ALTER TABLE feedback ADD COLUMN resolved INTEGER DEFAULT 0',
    },
    { table: 'users', column: 'supabase_id', sql: 'ALTER TABLE users ADD COLUMN supabase_id TEXT' },
    {
      table: 'users',
      column: 'status',
      sql: "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'",
    },
    {
      table: 'users',
      column: 'role_id',
      sql: 'ALTER TABLE users ADD COLUMN role_id INTEGER',
    },
  ];
  for (const m of addColumnMigrations) {
    const cols = sqliteRaw.prepare(`PRAGMA table_info(${m.table})`).all() as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === m.column)) {
      sqliteRaw.exec(m.sql);
    }
  }
  const avatarRow = sqliteRaw.prepare('SELECT 1 FROM avatars WHERE avatar_id = 1').get();
  if (!avatarRow) {
    sqliteRaw
      .prepare('INSERT INTO avatars (avatar_id, avatar_name, avatar_image) VALUES (1, ?, ?)')
      .run('Default', 'https://api.dicebear.com/7.x/avataaars/svg?seed=default');
  }

  // Seed RBAC tables
  const roleRow = sqliteRaw.prepare('SELECT 1 FROM roles WHERE name = ?').get('admin');
  if (!roleRow) {
    const insertRole = sqliteRaw.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
    insertRole.run('user', 'Regular user with basic access');
    insertRole.run('moderator', 'Can moderate community content');
    insertRole.run('admin', 'Full system access');

    const insertPerm = sqliteRaw.prepare(
      'INSERT INTO permissions (name, resource, action, description) VALUES (?, ?, ?, ?)'
    );
    const perms = [
      ['users:read', 'users', 'read', 'View user profiles'],
      ['users:write', 'users', 'write', 'Edit user profiles'],
      ['users:delete', 'users', 'delete', 'Delete user accounts'],
      ['users:manage_roles', 'users', 'manage_roles', 'Assign roles to users'],
      ['users:manage_status', 'users', 'manage_status', 'Approve, ban, or suspend users'],
      ['posts:read', 'posts', 'read', 'View community posts'],
      ['posts:write', 'posts', 'write', 'Create and edit posts'],
      ['posts:delete', 'posts', 'delete', 'Delete community posts'],
      ['posts:moderate', 'posts', 'moderate', 'Feature, hide, or remove posts'],
      ['comments:read', 'comments', 'read', 'View comments'],
      ['comments:write', 'comments', 'write', 'Create comments'],
      ['comments:delete', 'comments', 'delete', 'Delete comments'],
      ['verifications:read', 'verifications', 'read', 'View verification requests'],
      ['verifications:approve', 'verifications', 'approve', 'Approve verification requests'],
      ['lessons:read', 'lessons', 'read', 'View learning modules'],
      ['lessons:write', 'lessons', 'write', 'Create and edit lessons'],
      ['lessons:delete', 'lessons', 'delete', 'Delete lessons'],
      ['ai:use', 'ai', 'use', 'Use AI tutor and features'],
      ['achievements:read', 'achievements', 'read', 'View achievements'],
      ['achievements:write', 'achievements', 'write', 'Manage achievements'],
      ['settings:read', 'settings', 'read', 'View platform settings'],
      ['settings:write', 'settings', 'write', 'Modify platform settings'],
      ['feedback:read', 'feedback', 'read', 'View feedback'],
      ['feedback:resolve', 'feedback', 'resolve', 'Resolve feedback items'],
      ['audit:read', 'audit', 'read', 'View audit logs'],
    ];
    for (const p of perms) {
      insertPerm.run(...p);
    }

    // Assign permissions to roles
    const adminRole = sqliteRaw
      .prepare('SELECT role_id FROM roles WHERE name = ?')
      .get('admin') as any;
    const modRole = sqliteRaw
      .prepare('SELECT role_id FROM roles WHERE name = ?')
      .get('moderator') as any;
    const userRole = sqliteRaw
      .prepare('SELECT role_id FROM roles WHERE name = ?')
      .get('user') as any;
    const allPerms = sqliteRaw.prepare('SELECT permission_id FROM permissions').all() as any[];
    const insertRP = sqliteRaw.prepare(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    );

    // Admin gets all
    if (adminRole) {
      for (const p of allPerms) insertRP.run(adminRole.role_id, p.permission_id);
    }

    // Moderator gets limited
    if (modRole) {
      const modPermNames = [
        'users:read',
        'posts:read',
        'posts:write',
        'posts:delete',
        'posts:moderate',
        'comments:read',
        'comments:write',
        'comments:delete',
        'verifications:read',
        'verifications:approve',
        'lessons:read',
        'achievements:read',
        'feedback:read',
        'feedback:resolve',
        'audit:read',
      ];
      for (const name of modPermNames) {
        const perm = sqliteRaw
          .prepare('SELECT permission_id FROM permissions WHERE name = ?')
          .get(name) as any;
        if (perm) insertRP.run(modRole.role_id, perm.permission_id);
      }
    }

    // User gets basic
    if (userRole) {
      const userPermNames = [
        'posts:read',
        'posts:write',
        'comments:read',
        'comments:write',
        'verifications:read',
        'lessons:read',
        'ai:use',
        'achievements:read',
      ];
      for (const name of userPermNames) {
        const perm = sqliteRaw
          .prepare('SELECT permission_id FROM permissions WHERE name = ?')
          .get(name) as any;
        if (perm) insertRP.run(userRole.role_id, perm.permission_id);
      }
    }

    // Link existing users to roles
    const userRoleId = userRole?.role_id;
    if (userRoleId) {
      sqliteRaw.prepare('UPDATE users SET role_id = ? WHERE role_id IS NULL').run(userRoleId);
    }
  }

  // Add roleId column to users if missing (for existing databases)
  const userCols = sqliteRaw.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === 'role_id')) {
    // SQLite doesn't support REFERENCES in ALTER TABLE ADD COLUMN
    sqliteRaw.exec('ALTER TABLE users ADD COLUMN role_id INTEGER');
    // Link existing users by role name
    const defaultRole = sqliteRaw
      .prepare('SELECT role_id FROM roles WHERE name = ?')
      .get('user') as any;
    if (defaultRole) {
      sqliteRaw
        .prepare('UPDATE users SET role_id = ? WHERE role_id IS NULL')
        .run(defaultRole.role_id);
    }
  }

  console.log('Database tables initialized');
}

async function initDatabasePostgres(pool: any) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS avatars (avatar_id SERIAL PRIMARY KEY, avatar_name VARCHAR(255) NOT NULL, avatar_image VARCHAR(500) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS users (user_id SERIAL PRIMARY KEY, fullname VARCHAR(255) NOT NULL, username VARCHAR(100), email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, clerk_id VARCHAR(255), google_id VARCHAR(255), supabase_id VARCHAR(255), avatar_id INT DEFAULT 1, preferred_lang VARCHAR(50) DEFAULT 'English', learning_lang VARCHAR(50) DEFAULT 'Bisaya', country VARCHAR(100), role VARCHAR(20) NOT NULL DEFAULT 'user', role_id INT REFERENCES roles(role_id), status VARCHAR(20) NOT NULL DEFAULT 'approved', is_verified INT DEFAULT 0, is_native_speaker INT DEFAULT 0, bio TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS user_settings (setting_id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE, dark_mode INT DEFAULT 0, speech_speed REAL DEFAULT 1.0, voice_gender VARCHAR(20) DEFAULT 'neutral', FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS saved_phrases (phrase_id SERIAL PRIMARY KEY, user_id INT NOT NULL, phrase VARCHAR(500) NOT NULL, language VARCHAR(50), category VARCHAR(100), created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notifications (notify_id SERIAL PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255), message TEXT, is_read INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS feedback (feedback_id SERIAL PRIMARY KEY, user_id INT NOT NULL, functionality INT DEFAULT 0, usability INT DEFAULT 0, reliability INT DEFAULT 0, resolved INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversations (conversation_id SERIAL PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversation_messages (message_id SERIAL PRIMARY KEY, conversation_id INT NOT NULL, sender VARCHAR(20) NOT NULL DEFAULT 'user', message TEXT, translated_message TEXT, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS speech_records (speech_id SERIAL PRIMARY KEY, user_id INT NOT NULL, audio_path VARCHAR(500), recognized_text TEXT, language_detected VARCHAR(50), confidence REAL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS translations (translation_id SERIAL PRIMARY KEY, speech_id INT NOT NULL, source_language VARCHAR(50), target_language VARCHAR(50), translated_text TEXT, FOREIGN KEY (speech_id) REFERENCES speech_records(speech_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS phrase_recommendations (recommendation_id SERIAL PRIMARY KEY, speech_id INT NOT NULL, recommended_phrase TEXT, intent VARCHAR(100), confidence REAL DEFAULT 0, FOREIGN KEY (speech_id) REFERENCES speech_records(speech_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_modules (module_id SERIAL PRIMARY KEY, module_title VARCHAR(255) NOT NULL, difficulty VARCHAR(50) DEFAULT 'beginner', language VARCHAR(50), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS learning_progress (progress_id SERIAL PRIMARY KEY, user_id INT NOT NULL, module_id INT NOT NULL, completion_percent REAL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_posts (post_id SERIAL PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255), content TEXT, phrase TEXT, translation TEXT, category VARCHAR(100), likes_count INT DEFAULT 0, bookmarks_count INT DEFAULT 0, is_featured INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS comments (comment_id SERIAL PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, comment TEXT, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_reports (report_id SERIAL PRIMARY KEY, post_id INT NOT NULL, reporter_id INT, reason VARCHAR(255), status VARCHAR(20) DEFAULT 'open', created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS learner_profiles (profile_id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE, level VARCHAR(50) DEFAULT 'beginner', strengths TEXT, weak_areas TEXT, common_mistakes TEXT, total_xp INT DEFAULT 0, coins INT DEFAULT 0, streak INT DEFAULT 0, daily_xp INT DEFAULT 0, daily_goal INT DEFAULT 50, total_sessions INT DEFAULT 0, last_active VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS preserved_words (word_id SERIAL PRIMARY KEY, word VARCHAR(255) NOT NULL, definition TEXT, part_of_speech VARCHAR(50), dialectal_region VARCHAR(100), bisaya_example TEXT, english_example TEXT, pronunciation_guide VARCHAR(255), submitted_by INT, source VARCHAR(50) DEFAULT 'learner', status VARCHAR(20) DEFAULT 'pending', verification_count INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS verification_requests (request_id SERIAL PRIMARY KEY, word_id INT, user_id INT NOT NULL, audio_path VARCHAR(500), recorded_text TEXT, verifier_id INT, score REAL, feedback TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), verified_at TIMESTAMP, FOREIGN KEY (word_id) REFERENCES preserved_words(word_id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (verifier_id) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS tutor_sessions (session_id SERIAL PRIMARY KEY, user_id INT NOT NULL, messages TEXT, summary TEXT, xp_earned INT DEFAULT 0, started_at TIMESTAMP DEFAULT NOW(), ended_at TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS pronunciation_attempts (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, word VARCHAR(255) NOT NULL, phonetic_expected VARCHAR(255) DEFAULT '', phonetic_heard VARCHAR(255) DEFAULT '', accuracy REAL DEFAULT 0, confidence REAL DEFAULT 0, mistakes TEXT DEFAULT '[]', lesson_context VARCHAR(255), timestamp VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS vocabulary_reviews (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, word VARCHAR(255) NOT NULL, translation VARCHAR(500) DEFAULT '', pronunciation VARCHAR(255) DEFAULT '', ipa VARCHAR(100), category VARCHAR(100) DEFAULT 'custom', difficulty INT DEFAULT 1, mastery REAL DEFAULT 0, review_count INT DEFAULT 0, ease_factor REAL DEFAULT 2.5, interval INT DEFAULT 1, next_review VARCHAR(50) NOT NULL, last_review VARCHAR(50), is_favorite INT DEFAULT 0, usage_frequency INT DEFAULT 0, created_at VARCHAR(50), updated_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversation_summaries (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, summary TEXT NOT NULL, topics TEXT DEFAULT '[]', vocabulary_learned TEXT DEFAULT '[]', duration INT DEFAULT 0, timestamp VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS xp_logs (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, amount INT NOT NULL, source VARCHAR(100) NOT NULL, description VARCHAR(500), timestamp VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ai_recommendations (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, recommendation_type VARCHAR(100) NOT NULL, content TEXT NOT NULL, priority INT DEFAULT 0, is_applied INT DEFAULT 0, created_at VARCHAR(50), applied_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_sessions (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, refresh_token VARCHAR(500) NOT NULL, device_info VARCHAR(255), ip_address VARCHAR(50), expires_at VARCHAR(50) NOT NULL, created_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE, daily_reminder INT DEFAULT 1, daily_reminder_hour INT DEFAULT 9, daily_reminder_minute INT DEFAULT 0, streak_reminder INT DEFAULT 1, review_reminder INT DEFAULT 1, weekly_report INT DEFAULT 1, achievement_alerts INT DEFAULT 1, community_alerts INT DEFAULT 1, updated_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_analytics (id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE, total_speaking_seconds INT DEFAULT 0, total_words_learned INT DEFAULT 0, total_pronunciation_attempts INT DEFAULT 0, avg_pronunciation_accuracy REAL DEFAULT 0, avg_session_duration REAL DEFAULT 0, favorite_category VARCHAR(100), weakest_category VARCHAR(100), weekly_xp TEXT DEFAULT '[]', last_calculated VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS bookmarks (id SERIAL PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, UNIQUE (user_id, post_id))`,
    `CREATE TABLE IF NOT EXISTS likes (id SERIAL PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, UNIQUE (user_id, post_id))`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INT, action VARCHAR(100) NOT NULL, resource_type VARCHAR(50), resource_id VARCHAR(50), details TEXT, ip_address VARCHAR(50), timestamp TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS daily_activity (activity_id SERIAL PRIMARY KEY, user_id INT NOT NULL, activity_date VARCHAR(50) NOT NULL, xp_earned INT DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_achievements (user_achievement_id SERIAL PRIMARY KEY, user_id INT NOT NULL, achievement_id VARCHAR(100) NOT NULL, unlocked_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE (user_id, achievement_id))`,
    `CREATE TABLE IF NOT EXISTS user_badges (user_badge_id SERIAL PRIMARY KEY, user_id INT NOT NULL, badge_id VARCHAR(100) NOT NULL, earned_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE (user_id, badge_id))`,
    `CREATE TABLE IF NOT EXISTS completed_challenges (id SERIAL PRIMARY KEY, user_id INT NOT NULL, challenge_id VARCHAR(100) NOT NULL, completed_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS follows (id SERIAL PRIMARY KEY, follower_id INT NOT NULL, following_id INT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS verifications (id SERIAL PRIMARY KEY, user_id INT NOT NULL, verified_by INT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL)`,
  ];

  for (const sql of tables) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        console.error(`PostgreSQL init error: ${err.message}`);
      }
    }
  }

  // Seed default avatar
  try {
    const result = await pool.query('SELECT 1 FROM avatars WHERE avatar_id = 1');
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO avatars (avatar_id, avatar_name, avatar_image) VALUES (1, $1, $2)',
        ['Default', 'https://api.dicebear.com/7.x/avataaars/svg?seed=default']
      );
    }
  } catch {}

  console.log('PostgreSQL tables initialized');
}

async function initDatabaseMySQL(pool: any) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS avatars (avatar_id INT AUTO_INCREMENT PRIMARY KEY, avatar_name VARCHAR(255) NOT NULL, avatar_image VARCHAR(500) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS users (user_id INT AUTO_INCREMENT PRIMARY KEY, fullname VARCHAR(255) NOT NULL, username VARCHAR(100), email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, clerk_id VARCHAR(255), google_id VARCHAR(255), supabase_id VARCHAR(255), avatar_id INT DEFAULT 1, preferred_lang VARCHAR(50) DEFAULT 'English', learning_lang VARCHAR(50) DEFAULT 'Bisaya', country VARCHAR(100), role VARCHAR(20) NOT NULL DEFAULT 'user', role_id INT REFERENCES roles(role_id), status VARCHAR(20) NOT NULL DEFAULT 'approved', is_verified INT DEFAULT 0, is_native_speaker INT DEFAULT 0, bio TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS user_settings (setting_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, dark_mode INT DEFAULT 0, speech_speed FLOAT DEFAULT 1.0, voice_gender VARCHAR(20) DEFAULT 'neutral', FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS saved_phrases (phrase_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, phrase VARCHAR(500) NOT NULL, language VARCHAR(50), category VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notifications (notify_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255), message TEXT, is_read INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS feedback (feedback_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, functionality INT DEFAULT 0, usability INT DEFAULT 0, reliability INT DEFAULT 0, resolved INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversations (conversation_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversation_messages (message_id INT AUTO_INCREMENT PRIMARY KEY, conversation_id INT NOT NULL, sender VARCHAR(20) NOT NULL DEFAULT 'user', message TEXT, translated_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS speech_records (speech_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, audio_path VARCHAR(500), recognized_text TEXT, language_detected VARCHAR(50), confidence FLOAT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS translations (translation_id INT AUTO_INCREMENT PRIMARY KEY, speech_id INT NOT NULL, source_language VARCHAR(50), target_language VARCHAR(50), translated_text TEXT, FOREIGN KEY (speech_id) REFERENCES speech_records(speech_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS phrase_recommendations (recommendation_id INT AUTO_INCREMENT PRIMARY KEY, speech_id INT NOT NULL, recommended_phrase TEXT, intent VARCHAR(100), confidence FLOAT DEFAULT 0, FOREIGN KEY (speech_id) REFERENCES speech_records(speech_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_modules (module_id INT AUTO_INCREMENT PRIMARY KEY, module_title VARCHAR(255) NOT NULL, difficulty VARCHAR(50) DEFAULT 'beginner', language VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS learning_progress (progress_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, module_id INT NOT NULL, completion_percent FLOAT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_posts (post_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255), content TEXT, phrase TEXT, translation TEXT, category VARCHAR(100), likes_count INT DEFAULT 0, bookmarks_count INT DEFAULT 0, is_featured INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS comments (comment_id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_reports (report_id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, reporter_id INT, reason VARCHAR(255), status VARCHAR(20) DEFAULT 'open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS learner_profiles (profile_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, level VARCHAR(50) DEFAULT 'beginner', strengths TEXT, weak_areas TEXT, common_mistakes TEXT, total_xp INT DEFAULT 0, coins INT DEFAULT 0, streak INT DEFAULT 0, daily_xp INT DEFAULT 0, daily_goal INT DEFAULT 50, total_sessions INT DEFAULT 0, last_active VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS preserved_words (word_id INT AUTO_INCREMENT PRIMARY KEY, word VARCHAR(255) NOT NULL, definition TEXT, part_of_speech VARCHAR(50), dialectal_region VARCHAR(100), bisaya_example TEXT, english_example TEXT, pronunciation_guide VARCHAR(255), submitted_by INT, source VARCHAR(50) DEFAULT 'learner', status VARCHAR(20) DEFAULT 'pending', verification_count INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS verification_requests (request_id INT AUTO_INCREMENT PRIMARY KEY, word_id INT, user_id INT NOT NULL, audio_path VARCHAR(500), recorded_text TEXT, verifier_id INT, score FLOAT, feedback TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, verified_at TIMESTAMP NULL, FOREIGN KEY (word_id) REFERENCES preserved_words(word_id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (verifier_id) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS tutor_sessions (session_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, messages TEXT, summary TEXT, xp_earned INT DEFAULT 0, started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ended_at TIMESTAMP NULL, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS pronunciation_attempts (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, word VARCHAR(255) NOT NULL, phonetic_expected VARCHAR(255) DEFAULT '', phonetic_heard VARCHAR(255) DEFAULT '', accuracy FLOAT DEFAULT 0, confidence FLOAT DEFAULT 0, mistakes TEXT DEFAULT '[]', lesson_context VARCHAR(255), timestamp VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS vocabulary_reviews (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, word VARCHAR(255) NOT NULL, translation VARCHAR(500) DEFAULT '', pronunciation VARCHAR(255) DEFAULT '', ipa VARCHAR(100), category VARCHAR(100) DEFAULT 'custom', difficulty INT DEFAULT 1, mastery FLOAT DEFAULT 0, review_count INT DEFAULT 0, ease_factor FLOAT DEFAULT 2.5, \`interval\` INT DEFAULT 1, next_review VARCHAR(50) NOT NULL, last_review VARCHAR(50), is_favorite INT DEFAULT 0, usage_frequency INT DEFAULT 0, created_at VARCHAR(50), updated_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS conversation_summaries (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, summary TEXT NOT NULL, topics TEXT DEFAULT '[]', vocabulary_learned TEXT DEFAULT '[]', duration INT DEFAULT 0, timestamp VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS xp_logs (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, amount INT NOT NULL, source VARCHAR(100) NOT NULL, description VARCHAR(500), timestamp VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ai_recommendations (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, recommendation_type VARCHAR(100) NOT NULL, content TEXT NOT NULL, priority INT DEFAULT 0, is_applied INT DEFAULT 0, created_at VARCHAR(50), applied_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_sessions (id VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, refresh_token VARCHAR(500) NOT NULL, device_info VARCHAR(255), ip_address VARCHAR(50), expires_at VARCHAR(50) NOT NULL, created_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, daily_reminder INT DEFAULT 1, daily_reminder_hour INT DEFAULT 9, daily_reminder_minute INT DEFAULT 0, streak_reminder INT DEFAULT 1, review_reminder INT DEFAULT 1, weekly_report INT DEFAULT 1, achievement_alerts INT DEFAULT 1, community_alerts INT DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_analytics (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, total_speaking_seconds INT DEFAULT 0, total_words_learned INT DEFAULT 0, total_pronunciation_attempts INT DEFAULT 0, avg_pronunciation_accuracy FLOAT DEFAULT 0, avg_session_duration FLOAT DEFAULT 0, favorite_category VARCHAR(100), weakest_category VARCHAR(100), weekly_xp TEXT DEFAULT '[]', last_calculated VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS bookmarks (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, UNIQUE KEY unique_user_post (user_id, post_id))`,
    `CREATE TABLE IF NOT EXISTS likes (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, post_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE, UNIQUE KEY unique_user_post (user_id, post_id))`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, action VARCHAR(100) NOT NULL, resource_type VARCHAR(50), resource_id VARCHAR(50), details TEXT, ip_address VARCHAR(50), timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS daily_activity (activity_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, activity_date VARCHAR(50) NOT NULL, xp_earned INT DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS user_achievements (user_achievement_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, achievement_id VARCHAR(100) NOT NULL, unlocked_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE KEY unique_user_achievement (user_id, achievement_id))`,
    `CREATE TABLE IF NOT EXISTS user_badges (user_badge_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, badge_id VARCHAR(100) NOT NULL, earned_at VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE KEY unique_user_badge (user_id, badge_id))`,
    `CREATE TABLE IF NOT EXISTS completed_challenges (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, challenge_id VARCHAR(100) NOT NULL, completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS follows (id INT AUTO_INCREMENT PRIMARY KEY, follower_id INT NOT NULL, following_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS verifications (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, verified_by INT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL)`,
  ];

  for (const sql of tables) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error(`MySQL init error: ${err.message}`);
      }
    }
  }

  const alterCols: string[] = [
    `ALTER TABLE users ADD COLUMN clerk_id VARCHAR(255) AFTER password_hash`,
    `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) AFTER clerk_id`,
    `ALTER TABLE users ADD COLUMN supabase_id VARCHAR(255) AFTER google_id`,
    `ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved' AFTER role`,
    `ALTER TABLE users ADD COLUMN is_verified INT DEFAULT 0 AFTER role`,
    `ALTER TABLE users ADD COLUMN is_native_speaker INT DEFAULT 0 AFTER is_verified`,
    `ALTER TABLE users ADD COLUMN bio TEXT AFTER is_native_speaker`,
    `ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'`,
    `ALTER TABLE community_posts ADD COLUMN likes_count INT DEFAULT 0 AFTER category`,
    `ALTER TABLE community_posts ADD COLUMN bookmarks_count INT DEFAULT 0 AFTER likes_count`,
    `ALTER TABLE community_posts ADD COLUMN is_featured INT DEFAULT 0 AFTER bookmarks_count`,
    `ALTER TABLE feedback ADD COLUMN resolved INT DEFAULT 0 AFTER reliability`,
    `ALTER TABLE tutor_sessions ADD COLUMN xp_earned INT DEFAULT 0 AFTER summary`,
  ];
  for (const sql of alterCols) {
    try {
      await pool.query(sql);
    } catch {
      // Column already exists
    }
  }

  try {
    const [rows] = await pool.query('SELECT 1 FROM avatars WHERE avatar_id = 1');
    if ((rows as any[]).length === 0) {
      await pool.query(
        'INSERT INTO avatars (avatar_id, avatar_name, avatar_image) VALUES (1, ?, ?)',
        ['Default', 'https://api.dicebear.com/7.x/avataaars/svg?seed=default']
      );
    }
  } catch {}

  console.log('MySQL tables initialized');
}

export async function connect() {
  const dialect = getDialect();

  if (dialect === 'sqlite') {
    sqliteRaw = new Database(DB_PATH);
    sqliteRaw.pragma('journal_mode = WAL');
    initDatabase();
    const schema = require('./schema-sqlite');
    db = drizzle(sqliteRaw, { schema });
    console.log(`SQLite connected: ${DB_PATH} (dialect: ${DIALECT})`);
    return db;
  }

  if (dialect === 'postgres') {
    const { Pool } = require('pg');
    const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');
    const schema = require('./schema-pg');

    const connectionString = DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required for PostgreSQL dialect');
    }

    pgPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    await pgPool.query('SELECT NOW()');
    console.log(`PostgreSQL connected (dialect: ${DIALECT})`);

    await initDatabasePostgres(pgPool);

    db = drizzlePg(pgPool, { schema });
    return db;
  }

  if (dialect === 'mysql') {
    const mysql = require('mysql2/promise');
    const { drizzle: drizzleMysql } = require('drizzle-orm/mysql2');
    const schema = require('./schema-mysql');

    let connectionConfig: any;
    if (DATABASE_URL) {
      connectionConfig = { uri: DATABASE_URL };
    } else {
      connectionConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'sultiai',
      };
    }

    mysqlPool = mysql.createPool({
      ...connectionConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await mysqlPool.query('SELECT 1 AS ok');
    console.log(`MySQL connected (dialect: ${DIALECT})`);

    await initDatabaseMySQL(mysqlPool);

    db = drizzleMysql(mysqlPool, { schema, mode: 'default' });
    return db;
  }

  throw new Error(`Unknown dialect: ${dialect}`);
}

export function getDb() {
  if (!db) throw new Error('Database not connected. Call connect() first.');
  return db;
}

export function getSqliteRaw(): Database.Database | null {
  return sqliteRaw;
}

export function getDialectName() {
  return getDialect();
}

export async function closeAll() {
  if (sqliteRaw) sqliteRaw.close();
  if (pgPool) {
    await pgPool.end();
    console.log('PostgreSQL pool closed');
  }
  if (mysqlPool) {
    await mysqlPool.end();
    console.log('MySQL pool closed');
  }
}
