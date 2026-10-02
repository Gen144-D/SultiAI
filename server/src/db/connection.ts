import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../sultiai.db');
const DIALECT = process.env.DB_DIALECT || 'sqlite';
const DATABASE_URL = process.env.DATABASE_URL || '';

let db: ReturnType<typeof drizzle>;
let sqliteRaw: Database.Database | null = null;
let pgPool: any = null;

function getDialect() {
  if (DIALECT === 'postgresql' || DIALECT === 'postgres') return 'postgres';
  return 'sqlite';
}

function runLearningIntegrityMigrations(handle: Database.Database) {
  handle.exec(
    `UPDATE learning_progress SET completion_percent = 0 WHERE completion_percent IS NULL OR completion_percent < 0`
  );
  handle.exec(
    `UPDATE learning_progress SET completion_percent = 100 WHERE completion_percent > 100`
  );
  handle.exec(`
    DELETE FROM learning_progress
    WHERE progress_id NOT IN (
      SELECT MIN(progress_id) FROM learning_progress GROUP BY user_id, module_id
    )
  `);
  handle.exec(`UPDATE learning_progress SET updated_at = datetime('now') WHERE updated_at IS NULL`);
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_progress_user_module ON learning_progress (user_id, module_id)`
  );
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_modules_key ON learning_modules (module_key) WHERE module_key IS NOT NULL`
  );
  handle.exec(
    `CREATE INDEX IF NOT EXISTS idx_lesson_items_module ON lesson_items (module_id, sort_order)`
  );
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_logs_idempotency ON xp_logs (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`
  );
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity (user_id, activity_date)`
  );
  handle.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_completed_challenges_user_challenge_date ON completed_challenges (user_id, challenge_id, completed_date)`
  );
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
    `CREATE TABLE IF NOT EXISTS learning_modules (module_id INTEGER PRIMARY KEY AUTOINCREMENT, module_title TEXT NOT NULL, module_key TEXT, sort_order INTEGER DEFAULT 0, difficulty TEXT DEFAULT 'beginner', language TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS learning_progress (progress_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, module_id INTEGER NOT NULL, completion_percent REAL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS lesson_items (item_id INTEGER PRIMARY KEY AUTOINCREMENT, module_id INTEGER NOT NULL, section_title TEXT, native_text TEXT NOT NULL, english_text TEXT, note TEXT, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS community_posts (post_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT, content TEXT, phrase TEXT, translation TEXT, category TEXT, is_hidden INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
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
    `CREATE TABLE IF NOT EXISTS completed_challenges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, challenge_id TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'daily', completed_date TEXT NOT NULL DEFAULT (date('now')), completed_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS learning_sessions (session_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, module_id INTEGER, activity_type TEXT NOT NULL, started_at TEXT DEFAULT (datetime('now')), ended_at TEXT, duration_seconds INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS preserved_words (word_id INTEGER PRIMARY KEY AUTOINCREMENT, word TEXT NOT NULL, definition TEXT, part_of_speech TEXT, dialectal_region TEXT, bisaya_example TEXT, english_example TEXT, pronunciation_guide TEXT, submitted_by INTEGER, source TEXT DEFAULT 'learner', status TEXT DEFAULT 'pending', verification_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS verification_requests (request_id INTEGER PRIMARY KEY AUTOINCREMENT, word_id INTEGER, requester_id INTEGER, status TEXT DEFAULT 'pending', notes TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS follows (id INTEGER PRIMARY KEY AUTOINCREMENT, follower_id INTEGER NOT NULL, following_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE, UNIQUE(follower_id, following_id))`,
    `CREATE TABLE IF NOT EXISTS verifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, verified_by INTEGER, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS api_keys (key_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lookup_prefix TEXT NOT NULL, key_hash TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT 'lexicon:read,g2p:read,pronunciation:write', rate_limit_per_minute INTEGER NOT NULL DEFAULT 60, status TEXT NOT NULL DEFAULT 'active', owner_user_id INTEGER, last_used_at TEXT, expires_at TEXT, revoked_at TEXT, request_count INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS roles (role_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS permissions (permission_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, resource TEXT NOT NULL, action TEXT NOT NULL, description TEXT)`,
    `CREATE TABLE IF NOT EXISTS role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE, FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE)`,
  ];
  for (const sql of tables) {
    sqliteRaw.exec(sql);
  }
  // API key lookups hit this index on every authenticated public request.
  sqliteRaw.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_lookup_prefix ON api_keys(lookup_prefix)'
  );
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
      table: 'community_posts',
      column: 'is_hidden',
      sql: 'ALTER TABLE community_posts ADD COLUMN is_hidden INTEGER DEFAULT 0',
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
    {
      table: 'learning_modules',
      column: 'module_key',
      sql: 'ALTER TABLE learning_modules ADD COLUMN module_key TEXT',
    },
    {
      table: 'learning_modules',
      column: 'sort_order',
      sql: 'ALTER TABLE learning_modules ADD COLUMN sort_order INTEGER DEFAULT 0',
    },
    {
      table: 'learning_progress',
      column: 'updated_at',
      sql: 'ALTER TABLE learning_progress ADD COLUMN updated_at TEXT',
    },
    {
      table: 'lesson_items',
      column: 'section_title',
      sql: 'ALTER TABLE lesson_items ADD COLUMN section_title TEXT',
    },
    {
      table: 'xp_logs',
      column: 'idempotency_key',
      sql: 'ALTER TABLE xp_logs ADD COLUMN idempotency_key TEXT',
    },
    {
      table: 'learning_progress',
      column: 'mastery_score',
      sql: 'ALTER TABLE learning_progress ADD COLUMN mastery_score REAL DEFAULT 0',
    },
    {
      table: 'completed_challenges',
      column: 'type',
      sql: "ALTER TABLE completed_challenges ADD COLUMN type TEXT NOT NULL DEFAULT 'daily'",
    },
    {
      table: 'completed_challenges',
      column: 'completed_date',
      sql: "ALTER TABLE completed_challenges ADD COLUMN completed_date TEXT NOT NULL DEFAULT (date('now'))",
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
  runLearningIntegrityMigrations(sqliteRaw);
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
  }

  // Keep users.role_id in sync with the users.role text column. The two drift
  // easily: `role` is what getUserRoleInfo reports, while `role_id` drives the
  // role_permissions join, so a mismatch silently downgrades an admin to the
  // user permission set. `IS NOT` is SQLite's null-safe inequality.
  sqliteRaw
    .prepare(
      `UPDATE users
          SET role_id = (SELECT role_id FROM roles WHERE roles.name = users.role)
        WHERE role_id IS NOT (SELECT role_id FROM roles WHERE roles.name = users.role)`
    )
    .run();

  console.log('Database tables initialized');
}

async function initDatabasePostgresLean(pool: any) {
  const { rows } = await pool.query(`SELECT to_regclass('public.learning_modules') as t`);
  if (!rows[0]?.t) {
    throw new Error(
      'Supabase Postgres schema not found (learning_modules table missing). ' +
        'Run the migrations in supabase/migrations/*.sql against this database first ' +
        '(supabase db push, or the Supabase SQL editor), then restart the server.'
    );
  }
  try {
    const result = await pool.query('SELECT 1 FROM avatars WHERE avatar_id = 1');
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO avatars (avatar_id, avatar_name, avatar_image) VALUES (1, $1, $2)',
        ['Default', 'https://api.dicebear.com/7.x/avataaars/svg?seed=default']
      );
    }
  } catch {}
  console.log('PostgreSQL schema verified (source of truth: supabase/migrations)');
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

    await initDatabasePostgresLean(pgPool);

    db = drizzlePg(pgPool, { schema });
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

/**
 * Resolves the drizzle schema for the *active* dialect. Callers must not
 * hardcode a schema module: the same query has to run on SQLite (dev default),
 * Postgres, and MySQL.
 */
export function getSchema() {
  const dialect = getDialect();
  if (dialect === 'sqlite') return require('./schema-sqlite');
  if (dialect === 'postgres') return require('./schema-pg');
  if (dialect === 'mysql') return require('./schema-mysql');
  throw new Error(`Unknown dialect: ${dialect}`);
}

export async function closeAll() {
  if (sqliteRaw) sqliteRaw.close();
  if (pgPool) {
    await pgPool.end();
    console.log('PostgreSQL pool closed');
  }
}
