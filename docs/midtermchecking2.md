# SultiAI Access Control & Authorization (30pts) - Codebase Overview

## Client-Side Authorization (src/context/UserContext.js - lines 271-278, 291-295)

### Role Helper Functions
- **`isAdmin`**: `user?.role === 'admin'` - Checks if current user is admin
- **`isModerator`**: `user?.role === 'moderator' || isAdmin` - Checks moderator or admin
- **`hasPermission(permission)`**: Callback that checks permissions:
  - Admin → always returns `true`
  - Regular users → checks `user.permissions?.includes(permission)`

### Usage in Screens
- Protected content conditional rendering
- Role-based UI elements visibility

### RoleGuard Component (src/components/RoleGuard.js - 88 lines)
```javascript
// Usage:
// <RoleGuard allowedRoles={['admin']}>...</RoleGuard>
// <RoleGuard allowedRoles={['admin', 'moderator']}>...</RoleGuard>
// <PermissionGate permission="posts:moderate">...</PermissionGate>
```
- Conditionally renders children based on user role
- Shows fallback UI when access denied
- Handles loading state

### PermissionGate Component
- Checks for specific permission string (e.g., "posts:moderate")
- Falls back to null when permission not granted

## Server-Side Authorization (server/src/middleware/rbac.ts)

### Middleware Functions

| Middleware | Purpose | Usage |
|------------|---------|-------|
| `requireRole(...roles)` | Enforces role check | `requireRole('admin')`, `requireRole('admin', 'moderator')` |
| `requirePermission(permission)` | Enforces permission check | `requirePermission('posts:delete')` |
| `requireOwnership(ownerField, ...bypassRoles)` | Resource ownership check | `requireOwnership('userId')` |
| `authWithRole` | Authenticates + sets userRole | For routes needing role info without enforcement |

### RBAC Utility (server/src/utils/rbac.ts)

#### `UserRoleInfo` Interface
```typescript
interface UserRoleInfo {
  role: string;        // 'admin' | 'moderator' | 'user'
  roleId: number | null; // DB role_id if set
  permissions: string[]; // List of permission strings
}
```

#### `getUserRoleInfo(userId)` - Core Function
1. Fetches user's `role` and `roleId` from `schema.users`
2. If `roleId` exists → fetches permissions from `role_permissions` join table with `permissions` table
3. If no `roleId` → uses default permissions based on role name

#### Default Permissions by Role

| Role | Permission Count | Example Permissions |
|------|-----------------|---------------------|
| **admin** | 38 | `users:read`, `users:delete`, `posts:moderate`, `ai:use`, `audit:read` |
| **moderator** | 19 | `posts:moderate`, `comments:delete`, `verifications:approve` |
| **user (default)** | 13 | `posts:read`, `posts:write`, `ai:use`, `achievements:read` |

#### `userHasPermission(userId, permission)` & `userHasRole(userId, ...roles)` - Helper Functions

## Data Flow: Authorization Check

```
User makes API request
    ↓
Server authMiddleware (verify JWT + resolve user)
    ↓
Set req.user + req.userRole
    ↓
Route middleware (requireRole/requirePermission) checks:
    - JWT role claim (fast path) OR
    - DB role info (full path)
    ↓
If check fails → 403 Forbidden with descriptive message
    ↓
If check passes → next() → route handler executes
```

## Route Integration Examples

```javascript
// Protected admin routes
router.post('/users', requireRole('admin'), admin_controller_1.createUser);
router.put('/users/:id/role', requireRole('admin'), admin_controller_1.updateUserRole);

// Permission-specific routes
router.post('/posts/:id/moderate', requirePermission('posts:moderate'), moderation_controller_1.moderatePost);

// Ownership routes
router.get('/conversations/:conversationId', requireOwnership('conversationId'), conversation_controller_1.getConversation);

// Auth + role info needed
router.get('/profile', authWithRole, profile_controller_1.getProfile);
```

## Security Summary

| Threat | Mitigation |
|--------|-----------|
| Unauthorized access | `requireRole` / `requirePermission` middleware on all sensitive routes |
| Privilege escalation | Role-based permission sets (38 for admin, 19 for mod, 13 for user) |
| Resource tampering | `requireOwnership` checks user ID matches resource owner |
| Missing permissions | Clear 403 errors: "Missing required permission: X" or "Access denied. Required role: Y" |
| Default permission fallback | If `role_permissions` table missing, defaults assigned based on role name |