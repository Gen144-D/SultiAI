import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

interface SanitizeOptions {
  body?: boolean;
  query?: boolean;
  params?: boolean;
}

const defaultOptions: SanitizeOptions = {
  body: true,
  query: true,
  params: true,
};

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = xss(key, { whiteList: {}, stripIgnoreTag: true });
    sanitized[sanitizedKey] = sanitizeValue(value);
  }

  return sanitized;
}

export function sanitizeInput(options: SanitizeOptions = defaultOptions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (options.body && req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (options.query && req.query) {
      const sanitizedQuery = sanitizeObject(req.query as Record<string, unknown>);
      Object.assign(req.query, sanitizedQuery);
    }

    if (options.params && req.params) {
      const sanitizedParams = sanitizeObject(req.params);
      Object.assign(req.params, sanitizedParams);
    }

    next();
  };
}

export function detectSqlInjection(req: Request, res: Response, next: NextFunction): void {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE|TRUNCATE)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(CHAR\(|CONCAT\(|0x[0-9a-f]+)/i,
    /(\bWAITFOR\b\s+\bDELAY\b)/i,
    /(\bSLEEP\s*\()/i,
    /(\bBENCHMARK\s*\()/i,
  ];

  const isBase64Like = (value: string): boolean =>
    value.length >= 64 && /^[A-Za-z0-9+/=\r\n]+$/.test(value);

  const checkValue = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    // Skip audio/image base64 blobs — they are not user SQL and routinely
    // contain false-positive matches like "0x<hex>".
    if (isBase64Like(value)) return false;
    return sqlPatterns.some((pattern) => pattern.test(value));
  };

  const checkObject = (obj: Record<string, unknown>): boolean => {
    for (const value of Object.values(obj)) {
      if (checkValue(value)) return true;
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          if (
            value.some(
              (v) =>
                checkValue(v) ||
                (v && typeof v === 'object' && checkObject(v as Record<string, unknown>))
            )
          ) {
            return true;
          }
        } else if (checkObject(value as Record<string, unknown>)) {
          return true;
        }
      }
    }
    return false;
  };

  if (req.body && typeof req.body === 'object' && checkObject(req.body)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid input detected',
      },
    });
    return;
  }

  if (
    req.query &&
    typeof req.query === 'object' &&
    checkObject(req.query as Record<string, unknown>)
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid query parameters detected',
      },
    });
    return;
  }

  next();
}
