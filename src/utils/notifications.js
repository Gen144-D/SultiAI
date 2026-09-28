const NOTIFICATION_ICON_RULES = [
  [/answer|question|repl/i, 'chatbubble-ellipses'],
  [/challenge|trophy|streak|goal/i, 'trophy'],
  [/helpful|like|\bxp\b|badge/i, 'thumbs-up'],
  [/follow/i, 'person-add'],
  [/welcome|resource|update|available/i, 'sparkles'],
];

function notificationIcon(title) {
  for (const [pattern, icon] of NOTIFICATION_ICON_RULES) {
    if (pattern.test(title || '')) return icon;
  }
  return 'notifications';
}

export function relativeTime(value) {
  if (!value) return '';
  const raw = String(value);
  // SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? `${raw.replace(' ', 'T')}Z` : raw;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return raw;

  const diff = Date.now() - ts;
  if (diff < 60e3) return 'just now';
  const mins = Math.floor(diff / 60e3);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString();
}

/**
 * The API returns snake_case (is_read / message / created_at). Normalize once
 * so screens only ever deal with { read, body, time, icon }.
 */
export function normalizeNotification(raw) {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  return {
    id: raw.id,
    title: raw.title || '',
    body: raw.body || raw.message || '',
    time: raw.time || relativeTime(raw.created_at),
    read: typeof raw.read === 'boolean' ? raw.read : !!raw.is_read,
    icon: raw.icon || notificationIcon(raw.title),
  };
}
