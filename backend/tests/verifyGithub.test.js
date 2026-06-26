/**
 * @fileoverview verifyGithub.test.js
 * @module verifyGithub.test
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
const crypto = require('crypto');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('verifyGithub middleware fail-closed behavior', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  test('loads in production when GITHUB_WEBHOOK_SECRET is missing (fail-closed per request)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GITHUB_WEBHOOK_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        require('../middleware/verifyGithub');
      });
    }).not.toThrow();
  });

  test('returns 500 for requests when webhook secret is missing (development)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const verifyGithub = require('../middleware/verifyGithub');

    const req = {
      headers: {},
      rawBody: Buffer.from('{"ok":true}'),
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 500 for requests when webhook secret is missing (production)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const verifyGithub = require('../middleware/verifyGithub');

    const req = {
      headers: {},
      rawBody: Buffer.from('{"ok":true}'),
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid signature', () => {
    process.env.NODE_ENV = 'development';
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    const verifyGithub = require('../middleware/verifyGithub');

    const req = {
      headers: {
        'x-hub-signature-256': 'sha256=deadbeef',
      },
      rawBody: Buffer.from('{"event":"push"}'),
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next for valid signature', () => {
    process.env.NODE_ENV = 'development';
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    const verifyGithub = require('../middleware/verifyGithub');

    const rawBody = Buffer.from('{"event":"push"}');
    const signature =
      'sha256=' + crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex');

    const req = {
      headers: {
        'x-hub-signature-256': signature,
      },
      rawBody,
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
