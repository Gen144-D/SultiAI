const express = require('express');
const request = require('supertest');

// Mock security middleware
function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  next();
}

function configureCors(origin, callback) {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}

const app = express();
app.use(setSecurityHeaders);
app.get('/test', (req, res) => res.json({ ok: true }));

describe('Security Middleware', () => {
  describe('Security Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-XSS-Protection header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should set HSTS header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    it('should set Referrer-Policy header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set Content-Security-Policy header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should set Permissions-Policy header', async () => {
      const res = await request(app).get('/test');
      expect(res.headers['permissions-policy']).toBeDefined();
      expect(res.headers['permissions-policy']).toContain('camera=(self)');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', (done) => {
      configureCors('http://localhost:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should allow requests with no origin', (done) => {
      configureCors(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('should reject requests from disallowed origins', (done) => {
      configureCors('http://evil.com', (err, allow) => {
        expect(err).toBeDefined();
        expect(err.message).toBe('Not allowed by CORS');
        done();
      });
    });
  });
});
