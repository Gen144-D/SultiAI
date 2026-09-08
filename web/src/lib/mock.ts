import type { AppInfo, HealthReport, ContactSubmission, NewsletterSubscription } from '@/types';

const now = Date.now();

export const mockAppInfo: AppInfo = {
  name: 'SultiAI',
  tagline: 'Learn Bisaya with AI',
  version: '1.2.0',
  platform: 'android',
  packageName: 'com.sultiai.app',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sultiai.app',
  sizeMb: 64,
  minAndroidVersion: 'Android 8.0 (API 26)',
  targetAndroidVersion: 'Android 16 (API 36)',
  lastUpdated: '2026-08-01',
  status: 'healthy',
  ratings: { average: 4.8, count: 1243 },
  downloads: 48291,
  supportedLanguages: ['Bisaya (Cebuano)', 'English'],
};

export const mockHealth: HealthReport = {
  status: 'healthy',
  uptimeSeconds: Math.floor(now / 1000) - 1630000000,
  db: 'connected',
  groq: 'configured',
  whisper: 'configured',
  message: 'All systems operational.',
};

function mockRequest<T>(handler: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => {
        try {
          resolve(handler());
        } catch (err) {
          reject(err);
        }
      },
      120 + Math.random() * 280
    );
  });
}

export const mockApi = {
  getHealth: (): Promise<HealthReport> => mockRequest(() => mockHealth),

  getAppInfo: (): Promise<AppInfo> => mockRequest(() => mockAppInfo),

  submitContact: (
    submission: ContactSubmission
  ): Promise<{ received: boolean; ticketId: string }> =>
    mockRequest(() => {
      if (!submission.email.includes('@')) {
        throw new Error('Invalid email address');
      }
      if (submission.message.trim().length < 10) {
        throw new Error('Message must be at least 10 characters');
      }
      return {
        received: true,
        ticketId: `SULT-${Math.floor(1000 + Math.random() * 9000)}`,
      };
    }),

  subscribeNewsletter: (sub: NewsletterSubscription): Promise<{ subscribed: boolean }> =>
    mockRequest(() => {
      if (!sub.email.includes('@')) {
        throw new Error('Invalid email address');
      }
      return { subscribed: true };
    }),
};
