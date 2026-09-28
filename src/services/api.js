import { supabase } from '../lib/supabase';

function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  // If env var is set to a non-localhost URL (e.g. a tunnel or production URL), use it directly
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  // In web browser, infer the backend host from the page host.
  // On a physical device (phone) served over the LAN/tunnel, `localhost` would
  // point at the phone itself — so we must mirror the HOST the page was served
  // from, not hardcode localhost. This fixes every phone-driven API + MP3 fetch.
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    // Same-origin proxy (Metro proxy/metro.config.js forwards /api and /audio)
    if (window.__SULTI_USE_SAME_ORIGIN) {
      return `${protocol}//${window.location.host}`;
    }
    if (
      hostname &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      hostname !== '0.0.0.0'
    ) {
      // Served over a real network host (LAN IP or dev tunnel) — target the backend
      // on that same host. Keeps port 3001 when the page itself is the dev server.
      const keepPagePort =
        `${port}` === '8081' || `${port}` === '8082' ? 3001 : port ? Number(port) : 3001;
      return `${protocol}//${hostname}:${keepPagePort}`;
    }
  }
  // Default: localhost for local (single-machine) development
  return envUrl || 'http://localhost:3001';
}

// Allow web code to force same-origin when a proxy is in front (dev tunnels, etc.)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__SULTI_USE_SAME_ORIGIN', {
    configurable: true,
    enumerable: false,
    writable: true,
    // Physical devices (real phones) can never reach a `localhost` backend — the
    // page is served from a dev tunnel / LAN IP, so route ALL traffic (API + /audio
    // MP3s) through that same origin and let Metro's proxy forward to :3001.
    value: true,
  });
}

export const BASE_URL = getBaseUrl();

// Log the resolved API URL in non-production to help debug connectivity
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  console.log('[api] Resolved BASE_URL:', BASE_URL);
  console.log('[api] Window location:', window.location?.href);
  console.log('[api] Same-origin proxy:', !!window.__SULTI_USE_SAME_ORIGIN);
}

const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function getToken() {
  try {
    // Try Supabase session first
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (err) {
    console.warn('[api] Failed to get Supabase session:', err.message);
  }
  return null;
}

async function request(method, path, body = null, timeoutMs = 15000, signal = null) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Send Supabase publishable key for server-side JWKS verification
  if (SUPABASE_PUBLISHABLE_KEY) headers['apikey'] = SUPABASE_PUBLISHABLE_KEY;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Use provided signal if available, otherwise use the timeout controller
  if (signal) {
    // If external signal is provided, we need to handle both it and timeout
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
    opts.signal = signal;
  } else {
    opts.signal = controller.signal;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, opts);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (err instanceof TypeError) {
      throw new Error(
        `Cannot reach server (${BASE_URL}). Please check your connection and try again.`
      );
    }
    throw new Error(err.message || 'Network request failed');
  }
  clearTimeout(timeoutId);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok) {
    const msg =
      (data &&
        ((data.error && (data.error.message || data.error)) || data.detail || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data && typeof data === 'object' && 'data' in data ? data.data : data;
}

export const api = {
  // Auth
  signUp: (email, password, name, native_language, target_language) =>
    request('POST', '/api/auth/signup', {
      fullname: name,
      email,
      password,
      native_language,
      target_language,
    }),
  signIn: (email, password) => request('POST', '/api/auth/signin', { email, password }),
  googleSignIn: (idToken, email, name, avatar) =>
    request('POST', '/api/auth/google', { idToken, email, name, avatar }),

  // Profile
  getProfile: () => request('GET', '/api/user/me'),
  updateProfile: (data) => request('PUT', '/api/user/me', data),

  // Tutor
  tutorChat: (message, audio, sessionId) =>
    request('POST', '/api/tutor/chat', { message, audio, session_id: sessionId }, 30000),
  getTutorLevel: () => request('GET', '/api/tutor/level'),
  getMistakes: () => request('GET', '/api/tutor/mistakes'),
  generateLesson: (situation) => request('POST', '/api/tutor/lesson', { situation }),

  // Conversation / History
  getConversations: () => request('GET', '/api/conversations'),
  saveConversation: (messages, title) => request('POST', '/api/conversations', { messages, title }),
  // Replaces the stored transcript for an existing conversation, so screens
  // that hold the full thread don't append duplicates on every turn.
  updateConversation: (id, messages, title) =>
    request('PUT', `/api/conversations/${id}`, { messages, title }),
  getHistory: () => request('GET', '/api/history'),
  deleteHistory: (id) => request('DELETE', `/api/history/${id}`),

  // AI / Translation
  chat: (message, language, character) =>
    request('POST', '/api/assistant/chat', { message, language, character }),
  groqChat: (messages, nativeLanguage) =>
    request('POST', '/api/groq', { messages, nativeLanguage }),
  translate: (text, from, to) => request('POST', '/api/speech/translate', { text, from, to }),
  transcribe: (audio, language) => request('POST', '/api/speech/transcribe', { audio, language }),
  ttsSynthesize: (text, voice, rate, pitch, language) =>
    request('POST', '/api/speech/synthesize', { text, voice, rate, pitch, language }),
  getVoices: () => request('GET', '/api/speech/voices'),
  analyzeNLP: (text) => request('POST', '/api/speech/nlp/analyze', { text }),
  detectLanguage: (text) => request('POST', '/api/speech/detect', { text }),
  checkPronunciation: (text) => request('POST', '/api/speech/pronunciation/check', { text }),
  checkPronunciationAudio: (audioBase64, expectedText, language) =>
    request('POST', '/api/speech/pronunciation/check', {
      audio: audioBase64,
      expected_text: expectedText,
      language: language || 'ceb',
    }),

  // Phrases
  recommendPhrases: (situation, language) =>
    request('POST', '/api/speech/recommend', { situation, language }),
  getSavedPhrases: () => request('GET', '/api/saved-phrases'),
  savePhrase: (phrase, language, category) =>
    request('POST', '/api/saved-phrases', { phrase, language, category }),
  deleteSavedPhrase: (id) => request('DELETE', `/api/saved-phrases/${id}`),

  // Notifications
  getNotifications: () => request('GET', '/api/notifications'),
  markNotificationRead: (id) => request('PUT', `/api/notifications/${id}`),
  markAllNotificationsRead: () => request('PUT', '/api/notifications/read-all'),

  // Community
  getCommunityPosts: () => request('GET', '/api/community/posts'),
  createCommunityPost: ({ type, title, content, phrase, translation }) =>
    request('POST', '/api/community/posts', { type, title, content, phrase, translation }),
  getPostComments: (postId) => request('GET', `/api/community/posts/${postId}/comments`),
  createPostComment: (postId, comment) =>
    request('POST', `/api/community/posts/${postId}/comments`, { comment }),
  getCommunityResources: () => request('GET', '/api/community/resources'),
  postCommunityResource: (phrase, translation, category) =>
    request('POST', '/api/community/resources', { phrase, translation, category }),

  // Learning
  getLearningModules: () => request('GET', '/api/learning/modules'),
  getLearningModuleLessons: (moduleKey) =>
    request('GET', `/api/learning/modules/${encodeURIComponent(moduleKey)}/lessons`),
  getLearningProgress: () => request('GET', '/api/learning/progress'),
  getLearningDashboard: () => request('GET', '/api/learning/dashboard'),
  updateLearningProgress: (module_id, completion_percent) =>
    request('POST', '/api/learning/progress', { module_id, completion_percent }),
  updateLearningProgressByKey: (module_key, completion_percent) =>
    request('POST', '/api/learning/progress', { module_key, completion_percent }),

  // Settings
  getUserSettings: () => request('GET', '/api/user/settings'),
  updateUserSettings: (settings) => request('PUT', '/api/user/settings', settings),
  updateLanguageSettings: (native_language, learning_language) =>
    request('PUT', '/api/user/settings/language', { native_language, learning_language }),

  // Feedback
  submitFeedback: (functionality, usability, reliability) =>
    request('POST', '/api/feedback', { functionality, usability, reliability }),

  // === NEW ENDPOINTS ===

  // Game / Gamification
  getGameStats: () => request('GET', '/api/game/stats'),
  updateGameStats: (data) => request('PUT', '/api/game/stats', data),
  getLeaderboard: (period = 'weekly') => request('GET', `/api/game/leaderboard?period=${period}`),
  claimDailyReward: () => request('POST', '/api/game/daily-reward'),

  // Achievements / Badges
  getAchievements: () => request('GET', '/api/achievements'),
  getBadges: () => request('GET', '/api/achievements/badges'),
  checkAchievements: (stats) => request('POST', '/api/achievements/check', stats),

  // Vocabulary / Spaced Repetition
  submitVocabReview: (phraseId, score) =>
    request('POST', '/api/vocabulary/review', { phrase_id: phraseId, score }),
  getDueForReview: () => request('GET', '/api/vocabulary/due'),

  // Challenges
  getDailyChallenge: () => request('GET', '/api/challenges/daily'),
  getWeeklyChallenge: () => request('GET', '/api/challenges/weekly'),
  completeChallenge: (challengeId) => request('POST', `/api/challenges/${challengeId}/complete`),

  // Community - Follows
  followUser: (userId) => request('POST', `/api/community/follow/${userId}`),
  unfollowUser: (userId) => request('DELETE', `/api/community/follow/${userId}`),
  getFollowers: (userId) => request('GET', `/api/community/followers/${userId}`),
  getFollowing: (userId) => request('GET', `/api/community/following/${userId}`),

  // Native Speaker Verification
  submitVerification: (audioBase64, phraseId) =>
    request('POST', '/api/community/verify', { audio: audioBase64, phrase_id: phraseId }),
  getVerificationRequests: () => request('GET', '/api/community/verify/requests'),
  approveVerification: (verificationId) =>
    request('POST', `/api/community/verify/${verificationId}/approve`),

  // Analytics
  getLearningAnalytics: () => request('GET', '/api/analytics/learning'),
  getWeeklyProgress: () => request('GET', '/api/analytics/weekly'),
  getStreakData: () => request('GET', '/api/analytics/streak'),
  getPronunciationStats: () => request('GET', '/api/v2/pronunciation/stats'),

  // Whisper AI (Philippine Dialects)
  whisperChat: (message, language) => request('POST', '/api/whisper/chat', { message, language }),
  whisperVoice: (audio, language) => request('POST', '/api/whisper/voice', { audio, language }),
  whisperPhrases: (topic, language) => request('POST', '/api/whisper/phrases', { topic, language }),
  whisperLanguages: () => request('GET', '/api/whisper/languages'),

  // AR Scenarios
  getARScenarios: () => request('GET', '/api/ar/scenarios'),
  getARScenario: (id) => request('GET', `/api/ar/scenarios/${id}`),
  getARScenarioObjects: (id, category) => {
    let path = `/api/ar/scenarios/${id}/objects`;
    if (category) path += `?category=${encodeURIComponent(category)}`;
    return request('GET', path);
  },
  analyzeARImage: (image, scenarioId, mimeType) =>
    request('POST', '/api/ar/analyze', { image, scenario_id: scenarioId, mime_type: mimeType }),

  // Language Preservation Engine
  submitPreservedWord: (data) => request('POST', '/api/preservation/submit', data),
  getLivingLexicon: () => request('GET', '/api/preservation/living'),
  getPreservationCount: () => request('GET', '/api/preservation/count'),
  getPreservedWords: (status, limit, offset) =>
    request(
      'GET',
      `/api/preservation/lexicon?status=${status || ''}&limit=${limit || 50}&offset=${offset || 0}`
    ),
  getDialectalVariations: (word) =>
    request('GET', `/api/preservation/variations?word=${encodeURIComponent(word)}`),
  verifyPreservedWord: (wordId, status) =>
    request('PUT', `/api/preservation/${wordId}/verify`, { status }),

  // Voice Agent (xAI realtime speech-to-speech)
  agentStatus: () => request('GET', '/api/agent/status'),
  agentToken: () => request('POST', '/api/agent/token'),

  // Deepgram real-time voice agent (live streaming)
  agentDeepgramToken: () => request('GET', '/api/agent/deepgram-token'),

  // Voice Pipeline (Groq STT/LLM + msedge-tts / OpenRouter TTS)
  voiceChat: (message, audio, sessionId, signal = null, voice = 'blessica') =>
    request(
      'POST',
      '/api/voice/chat',
      { message, audio, session_id: sessionId, voice },
      45000,
      signal
    ),
  voiceStatus: () => request('GET', '/api/voice/status'),

  // Voice Agent (xAI realtime speech-to-speech)
  // Generic methods for offline sync
  postData: (path, body) => request('POST', path, body),
  putData: (path, body) => request('PUT', path, body),
  patchData: (path, body) => request('PATCH', path, body),
};
