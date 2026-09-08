import type { AppInfo, ContactSubmission, HealthReport, NewsletterSubscription } from '@/types';
import { mockApi } from './mock';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async getHealth(): Promise<HealthReport> {
    if (USE_MOCK) return mockApi.getHealth();
    return http<HealthReport>('GET', '/api/health');
  },

  async getAppInfo(): Promise<AppInfo> {
    if (USE_MOCK) return mockApi.getAppInfo();
    return http<AppInfo>('GET', '/api/public/app-info');
  },

  async submitContact(
    submission: ContactSubmission
  ): Promise<{ received: boolean; ticketId: string }> {
    if (USE_MOCK) return mockApi.submitContact(submission);
    return http<{ received: boolean; ticketId: string }>('POST', '/api/public/contact', submission);
  },

  async subscribeNewsletter(sub: NewsletterSubscription): Promise<{ subscribed: boolean }> {
    if (USE_MOCK) return mockApi.subscribeNewsletter(sub);
    return http<{ subscribed: boolean }>('POST', '/api/public/newsletter', sub);
  },
};
