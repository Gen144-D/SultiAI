import type {
  AdminSettings,
  AdminUser,
  AiUsageStats,
  CommunityPost,
  CommunityReport,
  FeedbackItem,
  LessonModule,
  OverviewResponse,
  PreservedWord,
  ReportStatus,
  UserDetail,
  UserFilters,
  UserListResponse,
  UserRole,
  UserStatus,
  XpOverview,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('sultiai_admin_session');
    if (!raw) return '';
    const session = JSON.parse(raw);
    return session.token || '';
  } catch (e) {
    console.warn('[AdminAPI] Failed to parse session token:', e);
    return '';
  }
}

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new Error(err.error || `Request failed (${res.status}): ${path}`);
  }
  const json = await res.json();
  // Server wraps data in { data: ..., message: ... } — unwrap it
  return (json.data ?? json) as T;
}

export const api = {
  getOverview: (): Promise<OverviewResponse> => http('GET', '/api/admin/analytics/overview'),

  listUsers: (filters: UserFilters, page: number, perPage: number): Promise<UserListResponse> =>
    http(
      'GET',
      `/api/admin/users?page=${page}&perPage=${perPage}&search=${encodeURIComponent(filters.search || '')}&role=${filters.role}&status=${filters.status}&sort=${filters.sort}`
    ),

  getUser: (id: number): Promise<{ detail: UserDetail }> => http('GET', `/api/admin/users/${id}`),

  updateUserRole: (id: number, role: UserRole): Promise<AdminUser> =>
    http('PATCH', `/api/admin/users/${id}/role`, { role }),

  updateUserStatus: (id: number, status: UserStatus): Promise<AdminUser> =>
    http('PATCH', `/api/admin/users/${id}/status`, { status }),

  verifyUser: (id: number, verified: boolean): Promise<AdminUser> =>
    http('POST', `/api/admin/users/${id}/verify`, { verified }),

  createUser: (data: {
    fullname: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<{ id: number; name: string; email: string; role: string }> =>
    http('POST', '/api/admin/users', data),

  deleteUser: (id: number): Promise<void> => http('DELETE', `/api/admin/users/${id}`),

  listPendingUsers: (): Promise<{ items: AdminUser[]; total: number }> =>
    http('GET', '/api/admin/users/pending'),

  approveUser: (id: number): Promise<{ id: number; status: string }> =>
    http('POST', `/api/admin/users/${id}/approve`),

  rejectUser: (id: number, reason?: string): Promise<{ id: number; status: string }> =>
    http('POST', `/api/admin/users/${id}/reject`, { reason }),

  bulkApproveUsers: (userIds: number[]): Promise<{ approved: number }> =>
    http('POST', '/api/admin/users/bulk-approve', { userIds }),

  listLessons: (): Promise<LessonModule[]> => http('GET', '/api/admin/lessons'),

  createLesson: (data: Partial<LessonModule>): Promise<LessonModule> =>
    http('POST', '/api/admin/lessons', data),

  updateLesson: (id: number, data: Partial<LessonModule>): Promise<LessonModule> =>
    http('PUT', `/api/admin/lessons/${id}`, data),

  deleteLesson: (id: number): Promise<void> => http('DELETE', `/api/admin/lessons/${id}`),

  listPosts: (): Promise<CommunityPost[]> => http('GET', '/api/admin/community/posts'),

  toggleFeatured: (id: number): Promise<CommunityPost> =>
    http('PATCH', `/api/admin/community/posts/${id}`, { toggleFeatured: true }),

  setPostHidden: (id: number, hidden: boolean): Promise<CommunityPost> =>
    http('PATCH', `/api/admin/community/posts/${id}`, { hidden }),

  deletePost: (id: number): Promise<void> => http('DELETE', `/api/admin/community/posts/${id}`),

  listReports: (): Promise<CommunityReport[]> => http('GET', '/api/admin/community/reports'),

  updateReportStatus: (id: number, status: ReportStatus): Promise<CommunityReport> =>
    http('PATCH', `/api/admin/community/reports/${id}`, { status }),

  getAiUsage: (): Promise<AiUsageStats> => http('GET', '/api/admin/ai/usage'),

  getXpOverview: (): Promise<XpOverview> => http('GET', '/api/admin/xp/overview'),

  listFeedback: (): Promise<FeedbackItem[]> => http('GET', '/api/admin/feedback'),

  resolveFeedback: (id: number): Promise<FeedbackItem> =>
    http('PATCH', `/api/admin/feedback/${id}`),

  listPreserved: (): Promise<PreservedWord[]> => http('GET', '/api/admin/preservation'),

  verifyPreserved: (id: number, status: PreservedWord['status']): Promise<PreservedWord> =>
    http('POST', `/api/admin/preservation/${id}`, { status }),

  getSettings: (): Promise<AdminSettings> => http('GET', '/api/admin/settings'),

  updateSettings: (patch: Partial<AdminSettings>): Promise<AdminSettings> =>
    http('PUT', '/api/admin/settings', patch),
};
