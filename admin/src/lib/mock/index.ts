import type {
  AiUsageStats,
  AdminSettings,
  AdminUser,
  CommunityPost,
  CommunityReport,
  FeedbackItem,
  LessonModule,
  OverviewResponse,
  PreservedWord,
  ReportStatus,
  SystemHealth,
  UserDetail,
  UserFilters,
  UserRole,
  UserStatus,
  XpOverview,
} from '@/types';
import {
  clone,
  seedFeedback,
  seedLessons,
  seedPosts,
  seedPreserved,
  seedReports,
  seedUsers,
  userDetails,
} from './db';

const ms = 60 + Math.random() * 220;

async function respond<T>(value: T): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  return value;
}

const users = clone(seedUsers);
let lessons = clone(seedLessons);
let posts = clone(seedPosts);
let reports = clone(seedReports);
const feedback = clone(seedFeedback);
const preserved = clone(seedPreserved);
let settings: AdminSettings = {
  maintenanceMode: false,
  allowSignups: true,
  allowCommunity: true,
  requireVerificationForCommunity: false,
  dailyXpGoal: 50,
  maxDailyAiRequests: 100,
  aiProvider: 'groq',
  admins: [
    { id: 1, name: 'Genesis Diaz', email: 'genesis@sultiai.com', role: 'admin' },
    { id: 2, name: 'Miguel Santos', email: 'miguel@sultiai.com', role: 'moderator' },
  ],
  updatedAt: new Date().toISOString(),
};

export const mockApi = {
  // ---- Overview ----
  async getOverview(): Promise<OverviewResponse> {
    const stats = {
      totalUsers: 12842,
      activeToday: 1932,
      weeklyActive: 8411,
      monthlyActive: 11470,
      lessonsCompleted: 48291,
      avgXpPerUser: 214,
      avgSessionMinutes: 12,
      aiRequests: 18421,
      aiFailedRequests: 203,
      communityReports: 12,
      streakDays: 18,
    };
    const health: SystemHealth = {
      status: 'healthy',
      db: 'connected',
      api: 'up',
      groq: 'configured',
      whisper: 'configured',
      storage: 'up',
      lastChecked: new Date().toISOString(),
    };
    const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyActive = week.map((label, i) => ({
      label,
      value: 1480 + i * 97 + ((i * 37) % 120),
    }));
    const lessonsTrend = week.map((label, i) => ({
      label,
      value: 2400 + i * 210 + ((i * 53) % 260),
    }));
    const aiTrend = week.map((label, i) => ({ label, value: 1900 + i * 240 + ((i * 71) % 300) }));
    return respond({ stats, health, weeklyActive, lessonsTrend, aiTrend });
  },

  // ---- Users ----
  async listUsers(filters: UserFilters, page: number, perPage: number) {
    let list = clone(users);
    const q = filters.search.toLowerCase();
    if (q) {
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (filters.role !== 'all') list = list.filter((u) => u.role === filters.role);
    if (filters.status !== 'all') list = list.filter((u) => u.status === filters.status);
    list.sort((a, b) => {
      switch (filters.sort) {
        case 'xp':
          return b.xp - a.xp;
        case 'level':
          return b.level - a.level;
        case 'recent':
          return b.lastActive.localeCompare(a.lastActive);
        default:
          return b.joinedAt.localeCompare(a.joinedAt);
      }
    });
    const total = list.length;
    const start = (page - 1) * perPage;
    return respond({ items: list.slice(start, start + perPage), total, page, perPage });
  },

  async getUser(id: number): Promise<UserDetail> {
    const detail = userDetails.get(id);
    if (!detail) throw new Error('User not found');
    return respond(clone(detail));
  },

  async updateUserRole(id: number, role: UserRole): Promise<AdminUser> {
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('User not found');
    u.role = role;
    return respond(clone(u));
  },

  async updateUserStatus(id: number, status: UserStatus): Promise<AdminUser> {
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('User not found');
    u.status = status;
    return respond(clone(u));
  },

  async verifyUser(id: number, verified: boolean): Promise<AdminUser> {
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('User not found');
    u.verified = verified;
    return respond(clone(u));
  },

  // ---- Lessons ----
  async listLessons(): Promise<LessonModule[]> {
    return respond(clone(lessons));
  },

  async createLesson(
    data: Omit<LessonModule, 'id' | 'completions' | 'avgCompletionPercent' | 'updatedAt'>
  ): Promise<LessonModule> {
    const lesson: LessonModule = {
      ...data,
      id: Math.max(0, ...lessons.map((l) => l.id)) + 1,
      completions: 0,
      avgCompletionPercent: 0,
      updatedAt: new Date().toISOString(),
    };
    lessons.unshift(lesson);
    return respond(clone(lesson));
  },

  async updateLesson(id: number, data: Partial<LessonModule>): Promise<LessonModule> {
    const lesson = lessons.find((l) => l.id === id);
    if (!lesson) throw new Error('Lesson not found');
    Object.assign(lesson, data, { updatedAt: new Date().toISOString() });
    return respond(clone(lesson));
  },

  async deleteLesson(id: number): Promise<void> {
    lessons = lessons.filter((l) => l.id !== id);
    return respond(undefined);
  },

  // ---- Community ----
  async listPosts(): Promise<CommunityPost[]> {
    return respond(clone(posts));
  },

  async toggleFeatured(id: number): Promise<CommunityPost> {
    const p = posts.find((x) => x.id === id);
    if (!p) throw new Error('Post not found');
    p.featured = !p.featured;
    return respond(clone(p));
  },

  async setPostHidden(id: number, hidden: boolean): Promise<CommunityPost> {
    const p = posts.find((x) => x.id === id);
    if (!p) throw new Error('Post not found');
    p.hidden = hidden;
    return respond(clone(p));
  },

  async deletePost(id: number): Promise<void> {
    posts = posts.filter((p) => p.id !== id);
    reports = reports.filter((r) => r.postId !== id);
    return respond(undefined);
  },

  async listReports(): Promise<CommunityReport[]> {
    return respond(clone(reports));
  },

  async updateReportStatus(id: number, status: ReportStatus): Promise<CommunityReport> {
    const r = reports.find((x) => x.id === id);
    if (!r) throw new Error('Report not found');
    r.status = status;
    return respond(clone(r));
  },

  // ---- AI Usage ----
  async getAiUsage(): Promise<AiUsageStats> {
    const data: AiUsageStats = {
      conversations: 4821,
      voiceRequests: 3104,
      whisperRequests: 2241,
      tutorRequests: 8240,
      failedRequests: 203,
      avgResponseMs: 842,
      totalTokens: 4921000,
      providers: [
        { name: 'Groq', requests: 12480, failed: 141 },
        { name: 'Whisper', requests: 2241, failed: 34 },
        { name: 'TTS', requests: 3700, failed: 28 },
      ],
      trend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({
        label,
        value: 2100 + i * 240 + ((i * 61) % 280),
      })),
    };
    return respond(data);
  },

  // ---- XP ----
  async getXpOverview(): Promise<XpOverview> {
    const data: XpOverview = {
      totalXpAwarded: 2749120,
      avgDailyXp: 42180,
      dailyRewardsClaimed: 11304,
      levelDistribution: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => ({
        label: `Lv ${level}`,
        value: 900 - level * 62 + ((level * 47) % 90),
      })),
      topUsers: [...users]
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 8)
        .map((u) => ({ id: u.id, name: u.name, level: u.level, xp: u.xp, streak: u.streak })),
    };
    return respond(data);
  },

  // ---- Feedback ----
  async listFeedback(): Promise<FeedbackItem[]> {
    return respond(clone(feedback));
  },

  async resolveFeedback(id: number): Promise<FeedbackItem> {
    const item = feedback.find((f) => f.id === id);
    if (!item) throw new Error('Feedback not found');
    item.resolved = !item.resolved;
    return respond(clone(item));
  },

  // ---- Preservation ----
  async listPreserved(): Promise<PreservedWord[]> {
    return respond(clone(preserved));
  },

  async verifyPreserved(id: number, status: PreservedWord['status']): Promise<PreservedWord> {
    const word = preserved.find((w) => w.id === id);
    if (!word) throw new Error('Word not found');
    word.status = status;
    return respond(clone(word));
  },

  // ---- Settings ----
  async getSettings(): Promise<AdminSettings> {
    return respond(clone(settings));
  },

  async updateSettings(patch: Partial<AdminSettings>): Promise<AdminSettings> {
    settings = { ...settings, ...patch, updatedAt: new Date().toISOString() };
    return respond(clone(settings));
  },
};
