/**
 * @fileoverview githubAppWebhookIdempotency.test.js
 * @module githubAppWebhookIdempotency.test
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

jest.mock('../middleware/verifyGithub', () => (_req, _res, next) => next());

const mockProcessGithubWebhookJob = jest.fn();
jest.mock('../services/githubWebhookWorker', () => ({
  processGithubWebhookJob: (...args) => mockProcessGithubWebhookJob(...args),
}));

const {
  waitForWebhookQueueIdle,
  __resetWebhookQueueForTests,
} = require('../services/webhookQueue');

const buildPushPayload = () => ({
  repository: {
    id: 99,
    name: 'repo-a',
    full_name: 'owner-a/repo-a',
  },
  sender: {
    login: 'octocat',
  },
  commits: [
    {
      id: 'sha-1',
      message: 'feat: update architecture flow',
      added: ['src/a.js'],
      modified: ['src/b.js'],
      removed: [],
    },
  ],
});

describe('GitHub webhook queue idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetWebhookQueueForTests();
    mockProcessGithubWebhookJob.mockResolvedValue({
      projectId: 'project-1',
      commitCount: 1,
    });
  });

  afterEach(() => {
    __resetWebhookQueueForTests();
  });

  test('same delivery ID submitted twice only queues/processes once', async () => {
    const app = express();
    app.use(express.json());
    app.set('io', { emit: jest.fn() });
    app.use('/api/github-app', require('../routes/githubAppWebhook'));

    const first = await request(app)
      .post('/api/github-app/webhook')
      .set('x-github-event', 'push')
      .set('x-github-delivery', 'delivery-dup-1')
      .send(buildPushPayload());

    const second = await request(app)
      .post('/api/github-app/webhook')
      .set('x-github-event', 'push')
      .set('x-github-delivery', 'delivery-dup-1')
      .send(buildPushPayload());

    expect(first.status).toBe(202);
    expect(first.body.duplicate).toBe(false);
    expect(second.status).toBe(202);
    expect(second.body.duplicate).toBe(true);

    await waitForWebhookQueueIdle();
    expect(mockProcessGithubWebhookJob).toHaveBeenCalledTimes(1);
  });
});
