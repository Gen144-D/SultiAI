-- SultiAI RBAC Migration
-- Adds roles, permissions, and role_permissions tables

-- ============================================
-- 1. Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  role_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Permissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.permissions (
  permission_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT
);

-- ============================================
-- 3. Role-Permissions Junction Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id INTEGER NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- 4. Add roleId FK to users table
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES public.roles(role_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- ============================================
-- 5. Seed Default Roles
-- ============================================
INSERT INTO public.roles (name, description) VALUES
  ('user', 'Regular user with basic access'),
  ('moderator', 'Can moderate community content'),
  ('admin', 'Full system access')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. Seed Permissions
-- ============================================
INSERT INTO public.permissions (name, resource, action, description) VALUES
  -- User management
  ('users:read', 'users', 'read', 'View user profiles'),
  ('users:write', 'users', 'write', 'Edit user profiles'),
  ('users:delete', 'users', 'delete', 'Delete user accounts'),
  ('users:manage_roles', 'users', 'manage_roles', 'Assign roles to users'),
  ('users:manage_status', 'users', 'manage_status', 'Approve, ban, or suspend users'),
  -- Community
  ('posts:read', 'posts', 'read', 'View community posts'),
  ('posts:write', 'posts', 'write', 'Create and edit posts'),
  ('posts:delete', 'posts', 'delete', 'Delete community posts'),
  ('posts:moderate', 'posts', 'moderate', 'Feature, hide, or remove posts'),
  ('comments:read', 'comments', 'read', 'View comments'),
  ('comments:write', 'comments', 'write', 'Create comments'),
  ('comments:delete', 'comments', 'delete', 'Delete comments'),
  -- Verifications
  ('verifications:read', 'verifications', 'read', 'View verification requests'),
  ('verifications:approve', 'verifications', 'approve', 'Approve verification requests'),
  -- Lessons
  ('lessons:read', 'lessons', 'read', 'View learning modules'),
  ('lessons:write', 'lessons', 'write', 'Create and edit lessons'),
  ('lessons:delete', 'lessons', 'delete', 'Delete lessons'),
  -- AI features
  ('ai:use', 'ai', 'use', 'Use AI tutor and features'),
  -- Achievements
  ('achievements:read', 'achievements', 'read', 'View achievements'),
  ('achievements:write', 'achievements', 'write', 'Manage achievements'),
  -- Settings
  ('settings:read', 'settings', 'read', 'View platform settings'),
  ('settings:write', 'settings', 'write', 'Modify platform settings'),
  -- Feedback
  ('feedback:read', 'feedback', 'read', 'View feedback'),
  ('feedback:resolve', 'feedback', 'resolve', 'Resolve feedback items'),
  -- Audit
  ('audit:read', 'audit', 'read', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. Seed Role-Permission Mappings
-- ============================================

-- Admin gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Moderator gets limited permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.name = 'moderator'
  AND p.name IN (
    'users:read',
    'posts:read', 'posts:write', 'posts:delete', 'posts:moderate',
    'comments:read', 'comments:write', 'comments:delete',
    'verifications:read', 'verifications:approve',
    'lessons:read',
    'achievements:read',
    'feedback:read', 'feedback:resolve',
    'audit:read'
  )
ON CONFLICT DO NOTHING;

-- Regular user gets basic permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.name = 'user'
  AND p.name IN (
    'posts:read', 'posts:write',
    'comments:read', 'comments:write',
    'verifications:read',
    'lessons:read',
    'ai:use',
    'achievements:read'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Enable RLS on new tables
-- ============================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for role management
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL USING (true);
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL USING (true);
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL USING (true);
