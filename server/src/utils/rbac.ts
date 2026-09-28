import { getDb } from '../db/connection';
import * as schema from '../db/schema-pg';
import { eq } from 'drizzle-orm';

export interface UserRoleInfo {
  role: string;
  roleId: number | null;
  permissions: string[];
}

/**
 * Fetch a user's role name and permissions list from the database.
 * Falls back to the text-based role column if roleId is not set.
 */
export async function getUserRoleInfo(userId: number): Promise<UserRoleInfo> {
  const db = getDb();

  // Get user's role text and roleId
  const rows = await (db as any)
    .select({
      role: schema.users.role,
      roleId: schema.users.roleId,
    })
    .from(schema.users)
    .where(eq(schema.users.userId, userId))
    .limit(1);

  if (!rows.length) {
    return { role: 'user', roleId: null, permissions: [] };
  }

  const user = rows[0];
  const roleName = user.role || 'user';
  const roleId = user.roleId;

  // If roleId is set, fetch permissions from role_permissions join
  if (roleId) {
    try {
      const perms = await (db as any)
        .select({
          name: schema.permissions.name,
        })
        .from(schema.rolePermissions)
        .innerJoin(
          schema.permissions,
          eq(schema.rolePermissions.permissionId, schema.permissions.permissionId)
        )
        .where(eq(schema.rolePermissions.roleId, roleId));

      return {
        role: roleName,
        roleId,
        permissions: perms.map((p: any) => p.name),
      };
    } catch {
      // role_permissions table might not exist yet
    }
  }

  // Fallback: assign permissions based on role name string
  return {
    role: roleName,
    roleId,
    permissions: getDefaultPermissions(roleName),
  };
}

/**
 * Default permissions for roles when role_permissions table is not available.
 */
function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'admin':
      return [
        'users:read',
        'users:write',
        'users:delete',
        'users:manage_roles',
        'users:manage_status',
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
        'lessons:write',
        'lessons:delete',
        'ai:use',
        'achievements:read',
        'achievements:write',
        'settings:read',
        'settings:write',
        'feedback:read',
        'feedback:resolve',
        'audit:read',
      ];
    case 'moderator':
      return [
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
    default:
      return [
        'posts:read',
        'posts:write',
        'comments:read',
        'comments:write',
        'verifications:read',
        'lessons:read',
        'ai:use',
        'achievements:read',
      ];
  }
}

/**
 * Check if a user has a specific permission.
 */
export async function userHasPermission(userId: number, permission: string): Promise<boolean> {
  const info = await getUserRoleInfo(userId);
  return info.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified roles.
 */
export async function userHasRole(userId: number, ...roles: string[]): Promise<boolean> {
  const info = await getUserRoleInfo(userId);
  return roles.includes(info.role);
}
