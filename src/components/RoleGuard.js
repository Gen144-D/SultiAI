import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';

/**
 * RoleGuard component - conditionally renders children based on user role.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['admin']}>
 *     <AdminPanel />
 *   </RoleGuard>
 *
 *   <RoleGuard allowedRoles={['admin', 'moderator']}>
 *     <ModerationTools />
 *   </RoleGuard>
 *
 *   <RoleGuard fallback={<Text>Admin only</Text>}>
 *     <AdminContent />
 *   </RoleGuard>
 */
export default function RoleGuard({ allowedRoles = [], children, fallback = null }) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.text}>Sign in required</Text>
      </View>
    );
  }

  const userRole = user.role || 'user';
  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!hasAccess) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.text}>Access denied</Text>
        <Text style={styles.subtext}>Required role: {allowedRoles.join(' or ')}</Text>
      </View>
    );
  }

  return children;
}

/**
 * PermissionGate component - conditionally renders based on a specific permission.
 *
 * Usage:
 *   <PermissionGate permission="posts:moderate">
 *     <ModerateButton />
 *   </PermissionGate>
 */
export function PermissionGate({ permission, children, fallback = null }) {
  const { user, loading, hasPermission } = useUser();

  if (loading) return null;

  if (!user || !hasPermission(permission)) {
    return fallback || null;
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  subtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
