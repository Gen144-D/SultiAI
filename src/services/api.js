import { supabase } from '../lib/supabase';

function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  // If env var is set to a non-localhost URL (e.g. a tunnel or production URL), use it directly
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  // In web browser, use same-origin when behind a dev tunnel.
  // The Metro proxy middleware (metro.config.js) forwards /api/* to the backend on port 3001.
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;
    if (hostname.includes('asse.devtunnels.ms')) {
      // Use the same origin — the proxy server handles routing to the backend
      return `${protocol}//${window.location.host}`;
    }
  }
  // Default: localhost for local development
  return envUrl || 'http://localhost:3001';
}

export const BASE_URL = getBaseUrl();
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function getToken() {
  try {
    // Try Supabase session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (err) {
    console.warn('[api] Failed to get Supabase session:', err.message);
  }
  return null;
}

async function request(method, path, body = null, timeoutMs = 15000) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Send Supabase publishable key for server-side JWKS verification
  if (SUPABASE_PUBLISHABLE_KEY) headers['apikey'] = SUPABASE_PUBLISHABLE_KEY;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  opts.signal = controller.signal;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, opts);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (err instanceof TypeError) {
      throw new Error(`Cannot reach server (${BASE_URL}). Please check your connection and try again.`);
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
    const msg = (data && ((data.error && (data.error.message || data.error)) || data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data && typeof data === 'object' && 'data' in data ? data.data : data;
}

export const api = {
  // Auth
  signUp: (email, password, name, native_language, target_language) =>
    request('POST', '/api/auth/signup', { fullname: name, email, password, native_language, target_language }),
  signIn: (email, password) =>
    request('POST', '/api/auth/signin', { email, password }),
  googleSignIn: (idToken, email, name, avatar) =>
    request('POST', '/api/auth/google', { idToken, email, name, avatar }),

  // Profile
  getProfile: () => request('GET', '/api/user/me'),
  updateProfile: (data) => request('PUT', '/api/user/me', data),

  // Tutor
  tutorChat: (message, audio, sessionId) =>
    request('POST', '/api/tutor/chat', { message, audio, session_id: sessionId }),
  getTutorLevel: () => request('GET', '/api/tutor/level'),
  getMistakes: () => request('GET', '/api/tutor/mistakes'),
  generateLesson: (situation) =>
    request('POST', '/api/tutor/lesson', { situation }),

  // Conversation / History
  getConversations: () => request('GET', '/api/conversations'),
  saveConversation: (messages, title) =>
    request('POST', '/api/conversations', { messages, title }),
  getHistory: () => request('GET', '/api/history'),
  deleteHistory: (id) => request('DELETE', `/api/history/${id}`),

  // AI / Translation
  chat: (message, language, character) =>
    request('POST', '/api/assistant/chat', { message, language, character }),
  groqChat: (messages, nativeLanguage) =>
    request('POST', '/api/groq', { messages, nativeLanguage }),
  translate: (text, from, to) =>
    request('POST', '/api/speech/translate', { text, from, to }),
  transcribe: (audio, language) =>
    request('POST', '/api/speech/transcribe', { audio, language }),
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

  // Community
  getCommunityPosts: () => request('GET', '/api/community/posts'),
  createCommunityPost: (title, content) =>
    request('POST', '/api/community/posts', { title, content }),
  getPostComments: (postId) =>
    request('GET', `/api/community/posts/${postId}/comments`),
  createPostComment: (postId, comment) =>
    request('POST', `/api/community/posts/${postId}/comments`, { comment }),
  getCommunityResources: () => request('GET', '/api/community/resources'),
  postCommunityResource: (phrase, translation, category) =>
    request('POST', '/api/community/resources', { phrase, translation, category }),

  // Learning
  getLearningModules: () => request('GET', '/api/learning/modules'),
  getLearningProgress: () => request('GET', '/api/learning/progress'),
  updateLearningProgress: (module_id, completion_percent) =>
    request('POST', '/api/learning/progress', { module_id, completion_percent }),

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
  getLeaderboard: (period = 'weekly') =>
    request('GET', `/api/game/leaderboard?period=${period}`),
  claimDailyReward: () => request('POST', '/api/game/daily-reward'),

  // Achievements / Badges
  getAchievements: () => request('GET', '/api/achievements'),
  getBadges: () => request('GET', '/api/achievements/badges'),
  checkAchievements: (stats) => request('POST', '/api/achievements/check', stats),

  // Vocabulary / Spaced Repetition
  getVocabularyReview: () => request('GET', '/api/vocabulary/review'),
  submitVocabReview: (phraseId, score) =>
    request('POST', '/api/vocabulary/review', { phrase_id: phraseId, score }),
  getDueForReview: () => request('GET', '/api/vocabulary/due'),

  // Challenges
  getDailyChallenge: () => request('GET', '/api/challenges/daily'),
  getWeeklyChallenge: () => request('GET', '/api/challenges/weekly'),
  completeChallenge: (challengeId) =>
    request('POST', `/api/challenges/${challengeId}/complete`),

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
  whisperChat: (message, language) =>
    request('POST', '/api/whisper/chat', { message, language }),
  whisperVoice: (audio, language) =>
    request('POST', '/api/whisper/voice', { audio, language }),
  whisperPhrases: (topic, language) =>
    request('POST', '/api/whisper/phrases', { topic, language }),
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
    request('GET', `/api/preservation/lexicon?status=${status || ''}&limit=${limit || 50}&offset=${offset || 0}`),
  getDialectalVariations: (word) =>
    request('GET', `/api/preservation/variations?word=${encodeURIComponent(word)}`),
  verifyPreservedWord: (wordId, status) =>
    request('PUT', `/api/preservation/${wordId}/verify`, { status }),

  // Voice Agent (xAI realtime speech-to-speech)
  agentStatus: () => request('GET', '/api/agent/status'),
  agentToken: () => request('POST', '/api/agent/token'),

  // Voice Pipeline (OpenRouter TTS + Groq STT/LLM)
  voiceChat: (message, audio, sessionId, useMetaVoice = false) =>
    request('POST', '/api/voice/chat', { message, audio, session_id: sessionId, use_meta_voice: useMetaVoice }, 45000),
  voiceStatus: () => request('GET', '/api/voice/status'),
  
  // Meta Voice (SeamlessM4T v2 + Spirit LM)
  voiceSpeechToSpeech: (audio, sourceLang = 'auto', targetLang = 'en') =>
    request('POST', '/api/voice/speech-to-speech', { audio, source_lang: sourceLang, target_lang: targetLang }, 60000),
  voiceTranscribeTranslate: (audio, sourceLang = 'auto', targetLang = 'en') =>
    request('POST', '/api/voice/transcribe-translate', { audio, source_lang: sourceLang, target_lang: targetLang }, 60000),

  // RoBERTa Tagalog Base (NLP for Filipino language learning)
  robertaStatus: () => request('GET', '/api/speech/roberta/status'),
  robertaFillMask: (text, topK = 5) =>
    request('POST', '/api/speech/roberta/fill-mask', { text, top_k: topK }),
  robertaVocabularyExercise: (difficulty = 'beginner', topic) =>
    request('POST', '/api/speech/roberta/vocabulary-exercise', { difficulty, topic }),
  robertaSentenceCompletion: (text, context) =>
    request('POST', '/api/speech/roberta/sentence-completion', { text, context }),

  // Voice Agent (xAI realtime speech-to-speech)
  // Generic methods for offline sync
  postData: (path, body) => request('POST', path, body),
  putData: (path, body) => request('PUT', path, body),
  patchData: (path, body) => request('PATCH', path, body),
};
