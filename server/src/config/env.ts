import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    return '';
  }
  return value;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnvInt('PORT', 3001),
  JWT_SECRET: getEnv('JWT_SECRET', 'dev-secret-key-12345'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-12345'),
  JWT_EXPIRY: getEnv('JWT_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: getEnv('JWT_REFRESH_EXPIRY', '7d'),
  GROQ_API_KEY: getEnv('GROQ_API_KEY'),
  GROQ_MODEL: getEnv('GROQ_MODEL', 'qwen/qwen3.6-27b'),
  XAI_API_KEY: getEnv('XAI_API_KEY'),
  SUPABASE_PUBLISHABLE_KEY: getEnv('SUPABASE_PUBLISHABLE_KEY'),
  DB_PATH: getEnv('DB_PATH', './sultiai.db'),
  DB_DIALECT: getEnv('DB_DIALECT', 'sqlite'),
  DATABASE_URL: getEnv('DATABASE_URL'),
  MONGODB_URI: getEnv('MONGODB_URI'),
  CORS_ORIGINS: getEnv('CORS_ORIGINS', '*'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  AUDIO_CACHE_DIR: getEnv('AUDIO_CACHE_DIR', './audio-cache'),
  MAX_REQUEST_SIZE: getEnv('MAX_REQUEST_SIZE', '10mb'),
  UPSTASH_REDIS_REST_URL: getEnv('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: getEnv('UPSTASH_REDIS_REST_TOKEN'),
  SENTRY_DSN: getEnv('SENTRY_DSN'),
} as const;

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return env.NODE_ENV === 'testing';
}

export function validateEnv(): void {
  if (isProduction()) {
    if (env.JWT_SECRET === 'dev-secret-key-12345') {
      console.warn('WARNING: Using default JWT_SECRET in production!');
    }
    if (!env.GROQ_API_KEY) {
      console.warn('WARNING: GROQ_API_KEY not set in production.');
    }
  }
}
