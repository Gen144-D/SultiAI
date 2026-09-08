import * as Sentry from '@sentry/node';
import { env } from '../config';

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0.5,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.apikey;
      }
      return event;
    },
  });
}

export function sentryErrorHandler() {
  return Sentry.Handlers?.errorHandler?.() ?? ((_err: any, _req: any, _res: any, next: any) => next());
}

export function captureException(error: Error, context?: Record<string, any>): void {
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}
