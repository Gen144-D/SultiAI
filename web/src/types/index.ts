export type SystemStatus = 'healthy' | 'degraded' | 'down';

export interface HealthReport {
  status: SystemStatus;
  uptimeSeconds: number;
  db: 'connected' | 'error';
  groq: 'configured' | 'not_set';
  whisper: 'configured' | 'not_set';
  message: string;
}

export interface AppInfo {
  name: string;
  tagline: string;
  version: string;
  platform: 'android' | 'ios' | 'web';
  packageName: string;
  playStoreUrl: string;
  sizeMb: number;
  minAndroidVersion: string;
  targetAndroidVersion: string;
  lastUpdated: string;
  status: SystemStatus;
  ratings: { average: number; count: number };
  downloads: number;
  supportedLanguages: string[];
}

export interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface NewsletterSubscription {
  email: string;
}

export interface ApiResult<T> {
  data: T;
  message?: string;
}

export type ContactResponse = ApiResult<{ received: boolean; ticketId: string }>;

export type NewsletterResponse = ApiResult<{ subscribed: boolean }>;

export type HealthResponse = ApiResult<HealthReport>;

export type AppInfoResponse = ApiResult<AppInfo>;
