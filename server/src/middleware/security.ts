import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config';

export function setSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.groq.com"
  );
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  next();
}

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.groq.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
});

export function configureCors(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (env.CORS_ORIGINS === '*') {
    callback(null, true);
    return;
  }
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}
