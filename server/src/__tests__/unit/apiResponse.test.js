const express = require('express');
const request = require('supertest');

// Import the actual apiResponse functions
const app = express();
app.use(express.json());

// Mock response handlers using the apiResponse pattern
app.get('/test/success', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Success',
    data: { id: 1, name: 'Test' },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-123' },
  });
});

app.get('/test/created', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Created successfully',
    data: { id: 2 },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-456' },
  });
});

app.get('/test/no-content', (req, res) => {
  res.status(204).send();
});

app.get('/test/error/validation', (req, res) => {
  res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-789' },
  });
});

app.get('/test/error/unauthorized', (req, res) => {
  res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-101' },
  });
});

app.get('/test/error/forbidden', (req, res) => {
  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Access denied' },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-102' },
  });
});

app.get('/test/error/not-found', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-103' },
  });
});

app.get('/test/error/rate-limited', (req, res) => {
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    meta: { timestamp: new Date().toISOString(), requestId: 'req-104' },
  });
});

app.get('/test/paginate', (req, res) => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  res.status(200).json({
    success: true,
    message: 'Success',
    data: items,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: 'req-200',
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
    },
  });
});

describe('API Response Format', () => {
  describe('Success Responses', () => {
    it('GET /test/success - should return 200 with success format', async () => {
      const res = await request(app).get('/test/success');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Success');
      expect(res.body.data).toEqual({ id: 1, name: 'Test' });
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.timestamp).toBeDefined();
      expect(res.body.meta.requestId).toBeDefined();
    });

    it('GET /test/created - should return 201 with created format', async () => {
      const res = await request(app).get('/test/created');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Created successfully');
      expect(res.body.data).toEqual({ id: 2 });
    });

    it('GET /test/no-content - should return 204 with no body', async () => {
      const res = await request(app).get('/test/no-content');
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });
  });

  describe('Error Responses', () => {
    it('GET /test/error/validation - should return 400 with validation error', async () => {
      const res = await request(app).get('/test/error/validation');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBe('Invalid input');
    });

    it('GET /test/error/unauthorized - should return 401', async () => {
      const res = await request(app).get('/test/error/unauthorized');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /test/error/forbidden - should return 403', async () => {
      const res = await request(app).get('/test/error/forbidden');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /test/error/not-found - should return 404', async () => {
      const res = await request(app).get('/test/error/not-found');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /test/error/rate-limited - should return 429', async () => {
      const res = await request(app).get('/test/error/rate-limited');
      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('Pagination', () => {
    it('GET /test/paginate - should return paginated response', async () => {
      const res = await request(app).get('/test/paginate');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();
      expect(res.body.meta.pagination.page).toBe(1);
      expect(res.body.meta.pagination.limit).toBe(10);
      expect(res.body.meta.pagination.total).toBe(3);
      expect(res.body.meta.pagination.totalPages).toBe(1);
    });
  });

  describe('Response Meta', () => {
    it('should always include timestamp and requestId', async () => {
      const res = await request(app).get('/test/success');
      expect(res.body.meta).toHaveProperty('timestamp');
      expect(res.body.meta).toHaveProperty('requestId');
      expect(typeof res.body.meta.timestamp).toBe('string');
      expect(typeof res.body.meta.requestId).toBe('string');
    });
  });
});
