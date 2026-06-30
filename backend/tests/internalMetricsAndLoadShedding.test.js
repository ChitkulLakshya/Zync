/**
 * @fileoverview internalMetricsAndLoadShedding.test.js
 * @module internalMetricsAndLoadShedding.test
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
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
