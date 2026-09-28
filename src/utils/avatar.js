export function getUserAvatarUrl(user) {
  const fallback = user?.photoURL || null;
  if (!user?.avatar) return fallback;
  const a = user.avatar;
  if (typeof a === 'string') return a || fallback;
  return a?.image || fallback;
}