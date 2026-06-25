const request = require('supertest');
const express = require('express');

const ORIGINAL_MEMORY_USAGE = process.memoryUsage;

describe('internal metrics route', () => {
  test('returns memory and webhook queue metrics', async () => {
    const app = express();
    app.use('/internal', require('../routes/internalMetrics'));

    const res = await request(app).get('/internal/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        memoryMb: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
        }),
        webhookQueue: expect.objectContaining({
          depth: expect.any(Number),
          lagMs: expect.any(Number),
          processing: expect.any(Boolean),
          trackedJobs: expect.any(Number),
        }),
        timestamp: expect.any(String),
      })
    );
  });
});

describe('load shedding middleware', () => {
  const loadSheddingPath = '../middleware/loadShedding';

  afterEach(() => {
    jest.resetModules();
    process.memoryUsage = ORIGINAL_MEMORY_USAGE;
    delete process.env.LOAD_SHED_HEAP_LIMIT_MB;
    delete process.env.LOAD_SHED_RETRY_AFTER_SECONDS;
    delete process.env.LOAD_SHED_HEAVY_PATHS;
  });

  test('returns 503 for heavy route when heap limit is crossed', async () => {
    process.env.LOAD_SHED_HEAP_LIMIT_MB = '50';

    const { loadSheddingMiddleware } = require(loadSheddingPath);
    const app = express();
    app.use('/api', loadSheddingMiddleware);
    app.get('/api/generate-project', (_req, res) => res.status(200).json({ ok: true }));

    process.memoryUsage = jest.fn(() => ({
      rss: 800 * 1024 * 1024,
      heapTotal: 600 * 1024 * 1024,
      heapUsed: 550 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    }));

    const res = await request(app).get('/api/generate-project');
    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.body.reason).toBe('load_shedding');
  });

  test('does not block allowlisted sessions path even above limit', async () => {
    process.env.LOAD_SHED_HEAP_LIMIT_MB = '50';

    const { loadSheddingMiddleware } = require(loadSheddingPath);
    const app = express();
    app.use('/api', loadSheddingMiddleware);
    app.get('/api/sessions', (_req, res) => res.status(200).json({ ok: true }));

    process.memoryUsage = jest.fn(() => ({
      rss: 800 * 1024 * 1024,
      heapTotal: 600 * 1024 * 1024,
      heapUsed: 550 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    }));

    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
