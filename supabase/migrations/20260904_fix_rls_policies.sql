-- SultiAI RLS Policy Fix Migration
-- Replaces all USING(true) policies with proper role-based and ownership policies

-- ============================================
-- Helper function: check if user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users
    WHERE supabase_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper function: check if user is moderator or admin
-- ============================================
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'moderator')
    FROM public.users
    WHERE supabase_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Helper function: get user_id from supabase auth.uid
-- ============================================
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT user_id
    FROM public.users
    WHERE supabase_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Drop all existing USING(true) policies
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- 1. Users Table
-- ============================================
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (supabase_id = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (supabase_id = auth.uid()::text);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can view all users" ON public.users
  FOR SELECT USING (is_moderator_or_admin());

-- ============================================
-- 2. User Settings
-- ============================================
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all settings" ON public.user_settings
  FOR SELECT USING (is_admin());

-- ============================================
-- 3. Saved Phrases
-- ============================================
CREATE POLICY "Users can manage own phrases" ON public.saved_phrases
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all phrases" ON public.saved_phrases
  FOR SELECT USING (is_admin());

-- ============================================
-- 4. Notifications
-- ============================================
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (is_admin());

-- ============================================
-- 5. Feedback
-- ============================================
CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (user_id = get_user_id());

CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Admins can manage all feedback" ON public.feedback
  FOR ALL USING (is_admin());

-- ============================================
-- 6. Conversations
-- ============================================
CREATE POLICY "Users can manage own conversations" ON public.conversations
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT USING (is_admin());

-- ============================================
-- 7. Conversation Messages
-- ============================================
CREATE POLICY "Users can manage own messages" ON public.conversation_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversations WHERE user_id = get_user_id()
    )
  );

CREATE POLICY "Admins can view all messages" ON public.conversation_messages
  FOR SELECT USING (is_admin());

-- ============================================
-- 8. Speech Records
-- ============================================
CREATE POLICY "Users can manage own speech" ON public.speech_records
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all speech" ON public.speech_records
  FOR SELECT USING (is_admin());

-- ============================================
-- 9. Translations
-- ============================================
CREATE POLICY "Users can view own translations" ON public.translations
  FOR SELECT USING (
    speech_id IN (
      SELECT speech_id FROM public.speech_records WHERE user_id = get_user_id()
    )
  );

CREATE POLICY "Admins can view all translations" ON public.translations
  FOR SELECT USING (is_admin());

-- ============================================
-- 10. Phrase Recommendations
-- ============================================
CREATE POLICY "Users can view own recommendations" ON public.phrase_recommendations
  FOR SELECT USING (
    speech_id IN (
      SELECT speech_id FROM public.speech_records WHERE user_id = get_user_id()
    )
  );

CREATE POLICY "Admins can view all recommendations" ON public.phrase_recommendations
  FOR SELECT USING (is_admin());

-- ============================================
-- 11. Learning Modules (public read)
-- ============================================
CREATE POLICY "Anyone can view modules" ON public.learning_modules
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage modules" ON public.learning_modules
  FOR ALL USING (is_admin());

-- ============================================
-- 12. Learning Progress
-- ============================================
CREATE POLICY "Users can view own progress" ON public.learning_progress
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can manage own progress" ON public.learning_progress
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all progress" ON public.learning_progress
  FOR SELECT USING (is_admin());

-- ============================================
-- 13. Community Posts
-- ============================================
CREATE POLICY "Anyone can view published posts" ON public.community_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create posts" ON public.community_posts
  FOR INSERT WITH CHECK (user_id = get_user_id());

CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (user_id = get_user_id());

CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE USING (user_id = get_user_id());

CREATE POLICY "Admins can manage all posts" ON public.community_posts
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can moderate posts" ON public.community_posts
  FOR UPDATE USING (is_moderator_or_admin());

CREATE POLICY "Moderators can delete posts" ON public.community_posts
  FOR DELETE USING (is_moderator_or_admin());

-- ============================================
-- 14. Comments
-- ============================================
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (user_id = get_user_id());

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (user_id = get_user_id());

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (user_id = get_user_id());

CREATE POLICY "Admins can manage all comments" ON public.comments
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can delete comments" ON public.comments
  FOR DELETE USING (is_moderator_or_admin());

-- ============================================
-- 15. Community Reports
-- ============================================
CREATE POLICY "Users can create reports" ON public.community_reports
  FOR INSERT WITH CHECK (reporter_id = get_user_id());

CREATE POLICY "Users can view own reports" ON public.community_reports
  FOR SELECT USING (reporter_id = get_user_id());

CREATE POLICY "Admins can manage all reports" ON public.community_reports
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can view and update reports" ON public.community_reports
  FOR SELECT USING (is_moderator_or_admin());

CREATE POLICY "Moderators can update reports" ON public.community_reports
  FOR UPDATE USING (is_moderator_or_admin());

-- ============================================
-- 16. Learner Profiles
-- ============================================
CREATE POLICY "Users can view own profile" ON public.learner_profiles
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can update own profile" ON public.learner_profiles
  FOR UPDATE USING (user_id = get_user_id());

CREATE POLICY "Admins can view all profiles" ON public.learner_profiles
  FOR SELECT USING (is_admin());

-- ============================================
-- 17. Preserved Words
-- ============================================
CREATE POLICY "Anyone can view approved words" ON public.preserved_words
  FOR SELECT USING (status = 'approved' OR is_moderator_or_admin());

CREATE POLICY "Users can submit words" ON public.preserved_words
  FOR INSERT WITH CHECK (submitted_by = get_user_id());

CREATE POLICY "Admins can manage all words" ON public.preserved_words
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can verify words" ON public.preserved_words
  FOR UPDATE USING (is_moderator_or_admin());

-- ============================================
-- 18. Tutor Sessions
-- ============================================
CREATE POLICY "Users can manage own sessions" ON public.tutor_sessions
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all sessions" ON public.tutor_sessions
  FOR SELECT USING (is_admin());

-- ============================================
-- 19. Pronunciation Attempts
-- ============================================
CREATE POLICY "Users can manage own attempts" ON public.pronunciation_attempts
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all attempts" ON public.pronunciation_attempts
  FOR SELECT USING (is_admin());

-- ============================================
-- 20. Vocabulary Reviews
-- ============================================
CREATE POLICY "Users can manage own vocabulary" ON public.vocabulary_reviews
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all vocabulary" ON public.vocabulary_reviews
  FOR SELECT USING (is_admin());

-- ============================================
-- 21. Conversation Summaries
-- ============================================
CREATE POLICY "Users can manage own summaries" ON public.conversation_summaries
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all summaries" ON public.conversation_summaries
  FOR SELECT USING (is_admin());

-- ============================================
-- 22. XP Logs
-- ============================================
CREATE POLICY "Users can view own XP" ON public.xp_logs
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Admins can view all XP" ON public.xp_logs
  FOR SELECT USING (is_admin());

-- ============================================
-- 23. AI Recommendations
-- ============================================
CREATE POLICY "Users can manage own recommendations" ON public.ai_recommendations
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all recommendations" ON public.ai_recommendations
  FOR SELECT USING (is_admin());

-- ============================================
-- 24. User Sessions (refresh tokens)
-- ============================================
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (is_admin());

-- ============================================
-- 25. Notification Preferences
-- ============================================
CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all preferences" ON public.notification_preferences
  FOR SELECT USING (is_admin());

-- ============================================
-- 26. Learning Analytics
-- ============================================
CREATE POLICY "Users can view own analytics" ON public.learning_analytics
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Admins can view all analytics" ON public.learning_analytics
  FOR SELECT USING (is_admin());

-- ============================================
-- 27. Bookmarks
-- ============================================
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all bookmarks" ON public.bookmarks
  FOR SELECT USING (is_admin());

-- ============================================
-- 28. Likes
-- ============================================
CREATE POLICY "Users can manage own likes" ON public.likes
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all likes" ON public.likes
  FOR SELECT USING (is_admin());

-- ============================================
-- 29. Audit Logs (admin only)
-- ============================================
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 30. Daily Activity
-- ============================================
CREATE POLICY "Users can view own activity" ON public.daily_activity
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can manage own activity" ON public.daily_activity
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all activity" ON public.daily_activity
  FOR SELECT USING (is_admin());

-- ============================================
-- 31. User Achievements
-- ============================================
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Admins can manage all achievements" ON public.user_achievements
  FOR ALL USING (is_admin());

-- ============================================
-- 32. User Badges
-- ============================================
CREATE POLICY "Users can view own badges" ON public.user_badges
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Admins can manage all badges" ON public.user_badges
  FOR ALL USING (is_admin());

-- ============================================
-- 33. Completed Challenges
-- ============================================
CREATE POLICY "Users can view own challenges" ON public.completed_challenges
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can manage own challenges" ON public.completed_challenges
  FOR ALL USING (user_id = get_user_id());

CREATE POLICY "Admins can view all challenges" ON public.completed_challenges
  FOR SELECT USING (is_admin());

-- ============================================
-- 34. Follows
-- ============================================
CREATE POLICY "Users can manage own follows" ON public.follows
  FOR ALL USING (follower_id = get_user_id());

CREATE POLICY "Users can view own followers" ON public.follows
  FOR SELECT USING (following_id = get_user_id());

CREATE POLICY "Admins can view all follows" ON public.follows
  FOR SELECT USING (is_admin());

-- ============================================
-- 35. Verifications
-- ============================================
CREATE POLICY "Users can view own verifications" ON public.verifications
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can create verifications" ON public.verifications
  FOR INSERT WITH CHECK (user_id = get_user_id());

CREATE POLICY "Admins can manage all verifications" ON public.verifications
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can verify submissions" ON public.verifications
  FOR UPDATE USING (is_moderator_or_admin());

-- ============================================
-- 36. Verification Requests
-- ============================================
CREATE POLICY "Users can view own requests" ON public.verification_requests
  FOR SELECT USING (user_id = get_user_id());

CREATE POLICY "Users can create requests" ON public.verification_requests
  FOR INSERT WITH CHECK (user_id = get_user_id());

CREATE POLICY "Admins can manage all requests" ON public.verification_requests
  FOR ALL USING (is_admin());

CREATE POLICY "Moderators can view and approve requests" ON public.verification_requests
  FOR SELECT USING (is_moderator_or_admin());

CREATE POLICY "Moderators can approve requests" ON public.verification_requests
  FOR UPDATE USING (is_moderator_or_admin());

-- ============================================
-- 37. Avatars (public read)
-- ============================================
CREATE POLICY "Anyone can view avatars" ON public.avatars
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage avatars" ON public.avatars
  FOR ALL USING (is_admin());

-- ============================================
-- 38. Platform Settings (admin only)
-- ============================================
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can read platform settings" ON public.platform_settings
  FOR SELECT USING (auth.role() = 'authenticated');
