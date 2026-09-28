-- Gamification integrity: dedup constraints for XP/daily-reward/challenge awards,
-- a real learning_sessions table for time-tracking, module-level mastery, and
-- two RLS tightenings (audit_logs forgery, lesson_items anon read).

-- xp_logs: one credited row per (user, idempotency key). Rows with a NULL key
-- are exempt (Postgres treats NULLs as distinct for a plain UNIQUE constraint),
-- so legacy/unkeyed callers keep working as unconditional increments.
ALTER TABLE public.xp_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_logs_idempotency
  ON public.xp_logs (user_id, idempotency_key);

-- daily_activity: one claim per user per day.
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_user_date
  ON public.daily_activity (user_id, activity_date);

-- completed_challenges: add the columns challenge-completion logic already
-- assumes exist, then dedup per user/challenge/day.
ALTER TABLE public.completed_challenges ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE public.completed_challenges ADD COLUMN IF NOT EXISTS completed_date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD');
CREATE UNIQUE INDEX IF NOT EXISTS idx_completed_challenges_user_challenge_date
  ON public.completed_challenges (user_id, challenge_id, completed_date);

-- learning_sessions: real time-tracking behind the Daily Learning Goal
-- (distinct from tutor_sessions, which is chat-message-oriented).
CREATE TABLE IF NOT EXISTS public.learning_sessions (
  session_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES public.learning_modules(module_id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_date
  ON public.learning_sessions (user_id, started_at);

ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own learning sessions" ON public.learning_sessions;
CREATE POLICY "Users manage own learning sessions" ON public.learning_sessions
  FOR ALL USING (user_id = get_user_id() OR is_admin())
  WITH CHECK (user_id = get_user_id() OR is_admin());

-- Module/lesson mastery (only per-vocab-word mastery existed before).
ALTER TABLE public.learning_progress ADD COLUMN IF NOT EXISTS mastery_score REAL DEFAULT 0;
ALTER TABLE public.learning_progress
  DROP CONSTRAINT IF EXISTS learning_progress_mastery_score_check;
ALTER TABLE public.learning_progress
  ADD CONSTRAINT learning_progress_mastery_score_check
  CHECK (mastery_score >= 0 AND mastery_score <= 100);

-- RLS tightening #1: audit_logs must not be forgeable by an arbitrary
-- authenticated/anon caller. Replaces the WITH CHECK (true) policy from
-- 20260904_fix_rls_policies.sql:402 ("System can insert audit logs").
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role and admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (is_admin() OR auth.role() = 'service_role');

-- RLS tightening #2: lesson_items should require authenticated, not anon.
-- Replaces "Anyone can view lesson items" from
-- 20260926_learning_path_integration.sql:48.
DROP POLICY IF EXISTS "Anyone can view lesson items" ON public.lesson_items;
CREATE POLICY "Authenticated users can view lesson items" ON public.lesson_items
  FOR SELECT TO authenticated USING (true);
