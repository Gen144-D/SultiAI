import { env } from '../config';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[(env.LOG_LEVEL as LogLevel) || 'info'];

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= currentLevel;
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}]`;
  if (meta) {
    return `${base} ${message} ${JSON.stringify(meta)}`;
  }
  return `${base} ${message}`;
}

function getFileStream(level: LogLevel) {
  return level === 'error' || level === 'warn' ? process.stderr : process.stdout;
}

export const logger = {
  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      getFileStream('error').write(formatMessage('error', message, meta) + '\n');
    }
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      getFileStream('warn').write(formatMessage('warn', message, meta) + '\n');
    }
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      getFileStream('info').write(formatMessage('info', message, meta) + '\n');
    }
  },

  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      getFileStream('debug').write(formatMessage('debug', message, meta) + '\n');
    }
  },

  request(method: string, path: string, statusCode: number, durationMs: number): void {
    if (shouldLog('info')) {
      const level = statusCode >= 400 ? 'warn' : 'info';
      getFileStream(level).write(
        formatMessage(level, `${method} ${path} ${statusCode}`, { duration: `${durationMs}ms` }) +
          '\n'
      );
    }
  },

  ai(service: string, operation: string, durationMs: number, success: boolean): void {
    if (shouldLog('info')) {
      const level = success ? 'info' : 'warn';
      getFileStream(level).write(
        formatMessage(level, `AI:${service}:${operation}`, {
          duration: `${durationMs}ms`,
          success,
        }) + '\n'
      );
    }
  },
};

export default logger;
