import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const LS_KEYS = {
  posts: '@sulti/community/posts',
  likes: '@sulti/community/likes',
  saves: '@sulti/community/saves',
  notifications: '@sulti/community/notifications',
  notificationReads: '@sulti/community/notification-reads',
};

export const POST_TYPES = {
  question: { key: 'question', label: 'Question', icon: 'help-circle', color: '#1E6F9F' },
  discussion: { key: 'discussion', label: 'Discussion', icon: 'chatbubbles', color: '#8B5CF6' },
  tip: { key: 'tip', label: 'Learning Tip', icon: 'bulb', color: '#F59E0B' },
  vocabulary: { key: 'vocabulary', label: 'Vocabulary', icon: 'book', color: '#10B981' },
  translation: { key: 'translation', label: 'Translation Help', icon: 'swap-horizontal', color: '#EC4899' },
  pronunciation: { key: 'pronunciation', label: 'Pronunciation', icon: 'mic', color: '#EF4444' },
  culture: { key: 'culture', label: 'Culture', icon: 'color-palette', color: '#14B8A6' },
};

export const POST_TYPE_KEYS = Object.keys(POST_TYPES);

export const FEED_FILTERS = [
  { key: 'all', label: 'For You', icon: 'sparkles' },
  { key: 'following', label: 'Following', icon: 'people' },
  { key: 'latest', label: 'Latest', icon: 'time' },
  { key: 'popular', label: 'Popular', icon: 'flame' },
];

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600e3).toISOString();

export const MOCK_POSTS = [
  {
    id: 'mp1', type: 'question', author_name: 'MariM', author_verified: true, is_native: true,
    native: 'Unsa ang difference sa "kumusta" ug "kamusta"?',
    english: 'What is the difference between "kumusta" and "kamusta"?',
    content: 'Both are widely used. "Kumusta" is closer to the Spanish "¿cómo está?", while "kamusta" is the everyday informal spelling you will hear on the streets of Cebu.',
    bisaya_translation: 'Pareho ra sila. Ang "kumusta" mas duol sa Kinatsila, ang "kamusta" ang naandan nga pagsulat sa kadalanan.',
    tags: ['grammar', 'basics'], likes: 34, comments: 5, created_at: hoursAgo(1),
    ai_explained: true, language: 'Bisaya (Cebuano)',
  },
  {
    id: 'mp2', type: 'tip', author_name: 'LearnerX', author_verified: false, is_native: false,
    native: 'Practiced "Palihug" for 20 minutes today!',
    english: 'The "h" in the middle trips me up. Saying it slowly helps — pa-LIH-oog. Native speakers understood me at the market!',
    content: 'The "h" in the middle trips me up. Saying it slowly helps — pa-LIH-oog. Native speakers understood me at the market!',
    bisaya_translation: 'Ang "h" sa tunga lisod nako. Hinayhinay nga pag-ingon makatabang.',
    tags: ['pronunciation', 'practice'], likes: 18, comments: 3, created_at: hoursAgo(2),
    ai_explained: false, language: 'Bisaya (Cebuano)',
  },
  {
    id: 'mp3', type: 'vocabulary', author_name: 'CebuGirl99', author_verified: true, is_native: true,
    native: '"Way sapayan"',
    english: '"No worries / it\'s fine"',
    content: 'Literal: "no problem/for nothing". Use it when someone says salamat — reply "Way sapayan!" (No worries!).',
    bisaya_translation: 'Wala kay problema. Tubag kung moingon ang usa ka "salamat".',
    tags: ['phrase', 'etiquette'], likes: 52, comments: 7, created_at: hoursAgo(3),
    ai_explained: true, language: 'Bisaya (Cebuano)',
  },
  {
    id: 'mp4', type: 'pronunciation', author_name: 'Jose T.', author_verified: false, is_native: false,
    native: 'Naa ko problema sa pag-pronounce sa "palihog".',
    english: 'I have trouble pronouncing "palihog".',
    content: 'The stress matters — pa-LIH-og with a soft h. Try tapping your tongue lightly behind the teeth.',
    bisaya_translation: 'Ang kapun-an hinungdanon. Sulayi pag-igo ang h sa likod sa ngipon.',
    tags: ['pronunciation'], likes: 21, comments: 4, created_at: hoursAgo(4),
    ai_explained: false, language: 'Bisaya (Cebuano)',
  },
  {
    id: 'mp5', type: 'translation', author_name: 'Ana R.', author_verified: false, is_native: false,
    native: 'Paano sabihin "I used to live here" sa Bisaya?',
    english: 'How do you say "I used to live here" in Bisaya?',
    content: 'Can a native help? I keep confusing past and present habitual.',
    bisaya_translation: 'Kanhi ako nagpuyo diri.',
    tags: ['translation', 'grammar'], likes: 12, comments: 6, created_at: hoursAgo(6),
    ai_explained: true, language: 'Bisaya (Cebuano)',
  },
  {
    id: 'mp6', type: 'culture', author_name: 'JunB', author_verified: true, is_native: true,
    native: 'Sinulog is coming — here is how to say "Happy Fiesta!"',
    english: '"Malipayong pista!" Say it with a big smile. Locals will love you for it.',
    content: '"Malipayong pista!" Say it with a big smile. Locals will love you for it.',
    bisaya_translation: 'Malipayong pista! Iingon kini nga nakapahiyom.',
    tags: ['culture', 'festival'], likes: 61, comments: 2, created_at: hoursAgo(8),
    ai_explained: true, language: 'Bisaya (Cebuano)',
  },
  {
    id: 'mp7', type: 'discussion', author_name: 'AnnaL', author_verified: false, is_native: false,
    native: 'Best way to learn Bisaya fast?',
    english: 'Daily immersion beats flashcards for me — but what works for you?',
    content: 'Daily immersion beats flashcards for me — but what works for you?',
    bisaya_translation: 'Ang adlaw-adlaw nga pagbansay mas maayo alang nako.',
    tags: ['study', 'community'], likes: 29, comments: 24, created_at: hoursAgo(12),
    ai_explained: false, language: 'Bisaya (Cebuano)',
  },
];

export const MOCK_COMMENTS = {
  mp1: [
    { id: 'c1', author_name: 'CebuGirl99', comment: 'Pareho ra sila. Mas formal ang "kumusta".', is_helpful: true, marked_helpful: 0, created_at: hoursAgo(0.5) },
    { id: 'c2', author_name: 'Leo M.', comment: 'Use "kamusta" with friends, "kumusta" in writing. Both correct!', is_helpful: false, marked_helpful: 0, created_at: hoursAgo(0.8) },
  ],
  mp3: [
    { id: 'c3', author_name: 'BisayaBuddy', comment: 'Also "walay sapayan" — no problem at all.', is_helpful: true, marked_helpful: 1, created_at: hoursAgo(2) },
  ],
};

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'answer', title: 'CebuGirl99 answered your question', body: '"Way sapayan" means "no worries".', time: '12m', read: false, icon: 'chatbubble-ellipses' },
  { id: 'n2', type: 'challenge', title: 'Daily challenge available', body: 'Ask 1 question today to earn +10 XP.', time: '1h', read: false, icon: 'trophy' },
  { id: 'n3', type: 'helpful', title: 'Your answer was marked helpful', body: '+15 XP for helping MariM.', time: '3h', read: false, icon: 'thumbs-up' },
  { id: 'n4', type: 'follow', title: 'LearnerX followed you', body: 'Start a conversation to keep your streak!', time: '1d', read: true, icon: 'person-add' },
];

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
 * The API returns snake_case (is_read / message / created_at) while the mock
 * fixtures already carry UI fields (read / body / time). Normalize once here so
 * every consumer of getNotifications() sees a single shape.
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

export const MOCK_PHRASES = [
  { id: 'ph1', native: 'Balik ra ta', english: "We'll be back / See you later", user: 'CebuGirl99', color: '#14B8A6', category: 'Farewell', bisaya_note: '"Balik" = return, "ra" = just, "ta" = we (inclusive).' },
  { id: 'ph2', native: 'Puhon', english: 'God willing / someday', user: 'BisayaBuddy', color: '#8B5CF6', category: 'Expression', bisaya_note: 'Optimistic future marker — "see you, puhon".' },
  { id: 'ph3', native: 'Way sapayan', english: 'No worries / it\'s fine', user: 'JunB', color: '#F59E0B', category: 'Etiquette', bisaya_note: 'Reply after "salamat" — "walay sapayan".' },
  { id: 'ph4', native: 'Kabalo na ko', english: 'I already know', user: 'MariM', color: '#3B82F6', category: 'Expression', bisaya_note: '"kabalo" = know, "na" = already.' },
];

export const MOCK_EXPERTS = [
  { id: 'e1', name: 'CebuGirl99', bio: 'Native · Cebu City', verified: true, followers: 1240, color: '#14B8A6', lastActive: 'today', answers: 214 },
  { id: 'e2', name: 'JunB', bio: 'Native · Davao', verified: true, followers: 890, color: '#F59E0B', lastActive: 'today', answers: 158 },
  { id: 'e3', name: 'BisayaBuddy', bio: 'Native · CDO', verified: true, followers: 651, color: '#8B5CF6', lastActive: 'this week', answers: 97 },
];

export const MOCK_CULTURE = [
  { id: 'cu1', title: 'Sinulog Festival', text: 'Cebu\'s grandest festival every January honors the Santo Niño with street dancing and music.', icon: 'color-palette', color: '#EC4899', category: 'Festival', length: '2 min read' },
  { id: 'cu2', title: 'Bisaya Po & Opo', text: 'Showing respect to elders using "po" and "opo" is deeply ingrained in Filipino culture.', icon: 'hand-left', color: '#10B981', category: 'Etiquette', length: '2 min read' },
  { id: 'cu3', title: 'Barkada Culture', text: 'Filipinos value "barkada" (friend group) deeply — social life revolves around shared meals and trips.', icon: 'people', color: '#F59E0B', category: 'Social', length: '3 min read' },
  { id: 'cu4', title: 'Bayanihan', text: 'A communal spirit where neighbors help each other move houses or complete big tasks together.', icon: 'home', color: '#3B82F6', category: 'Tradition', length: '3 min read' },
];

export const MOCK_EVENTS = [
  { id: 'ev1', title: 'Weekly Language Exchange', date: 'Every Saturday', time: '4:00 PM – 6:00 PM', location: 'Cebu City · Ayala Center (Food Court)', icon: 'chatbubbles', color: '#14B8A6', online: false, going: 15, spots: 8, tags: ['exchange', 'speaking'] },
  { id: 'ev2', title: 'Online Bisaya Storytelling Night', date: 'This Friday', time: '8:00 PM (Zoom)', location: 'Online · Live stream', icon: 'musical-notes', color: '#EC4899', online: true, going: 42, tags: ['storytelling', 'listening'] },
  { id: 'ev3', title: 'Food Trip: Carbon Market', date: 'Next Sunday', time: '9:00 AM – 12:00 PM', location: 'Carbon Market, Cebu', icon: 'restaurant', color: '#F59E0B', online: false, going: 11, spots: 4, tags: ['food', 'culture'] },
];

export const MOCK_LEADERBOARD = [
  { id: 1, name: 'CebuGirl99', xp: 12840, streak: 42, rank: 1 },
  { id: 2, name: 'MariM', xp: 10420, streak: 30, rank: 2 },
  { id: 3, name: 'JunB', xp: 8930, streak: 24, rank: 3 },
  { id: 4, name: 'LearnerX', xp: 7200, streak: 18, rank: 4 },
  { id: 5, name: 'Ana R.', xp: 5440, streak: 12, rank: 5 },
];

const read = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(LS_KEYS[key]);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = async (key, value) => {
  try {
    await AsyncStorage.setItem(LS_KEYS[key], JSON.stringify(value));
  } catch {}
};

export const communityMock = {
  async getPosts() {
    try {
      const data = await api.getCommunityPosts();
      if (Array.isArray(data) && data.length) return { posts: data, live: true };
    } catch {}
    const stored = await read('posts', null);
    return { posts: stored || MOCK_POSTS, live: false };
  },

  async createPost({ type, native, english, content, tags }) {
    const post = {
      id: `mp_${Date.now()}`, type, author_name: 'You', author_verified: false, is_native: false,
      native: native || english, english: english || native, content, bisaya_translation: native,
      tags: tags || [], likes: 0, comments: 0, created_at: new Date().toISOString(),
      ai_explained: false, language: 'Bisaya (Cebuano)',
    };
    try {
      await api.createCommunityPost(post.native, post.content);
    } catch {}
    const current = await read('posts', MOCK_POSTS);
    const next = [post, ...current];
    await write('posts', next);
    return post;
  },

  async getComments(postId) {
    try {
      const data = await api.getPostComments(postId);
      if (Array.isArray(data) && data.length) return data;
    } catch {}
    return MOCK_COMMENTS[postId] || [];
  },

  async addComment(postId, comment) {
    const c = {
      id: `c_${Date.now()}`, author_name: 'You', comment,
      is_helpful: false, marked_helpful: 0, created_at: new Date().toISOString(),
    };
    try {
      await api.createPostComment(postId, comment);
    } catch {}
    return c;
  },

  async toggleLike(postId, current) {
    const likes = await read('likes', {});
    const next = { ...likes, [postId]: !current };
    await write('likes', next);
    return !current;
  },

  async toggleSave(postId, current) {
    const saves = await read('saves', {});
    const next = { ...saves, [postId]: !current };
    await write('saves', next);
    return !current;
  },

  async getSaved() {
    const saves = await read('saves', {});
    const { posts } = await this.getPosts();
    return posts.filter((p) => saves[p.id]);
  },

  async getNotifications() {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data) && data.length) {
        return data.map(normalizeNotification).filter(Boolean);
      }
    } catch {}
    const readMap = await read('notificationReads', {});
    return MOCK_NOTIFICATIONS.map((n) => ({ ...n, read: !!readMap[n.id] }));
  },

  async markNotificationRead(id) {
    try {
      await api.markNotificationRead(id);
    } catch {}
    const readMap = await read('notificationReads', {});
    await write('notificationReads', { ...readMap, [id]: true });
  },

  async markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
    } catch {}
    const readMap = await read('notificationReads', {});
    const next = { ...readMap };
    for (const n of MOCK_NOTIFICATIONS) next[n.id] = true;
    await write('notificationReads', next);
  },

  async getLeaderboard(period = 'weekly') {
    try {
      const data = await api.getLeaderboard(period);
      if (Array.isArray(data) && data.length) return data;
    } catch {}
    return MOCK_LEADERBOARD;
  },
};