/**
 * @fileoverview githubAppWebhookAggregation.test.js
 * @module githubAppWebhookAggregation.test
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
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
const request = require('supertest');
const express = require('express');
const {
  waitForWebhookQueueIdle,
  __resetWebhookQueueForTests,
} = require('../services/webhookQueue');

jest.mock('../middleware/verifyGithub', () => (_req, _res, next) => next());
jest.mock('../middleware/authMiddleware', () => (_req, _res, next) => next());

const mockProjectFindOne = jest.fn();
const mockProjectUpdateOne = jest.fn();
jest.mock('../models/Project', () => ({
  findOne: (...args) => mockProjectFindOne(...args),
  updateOne: (...args) => mockProjectUpdateOne(...args),
}));

const buildPushPayload = (count) => ({
  repository: {
    id: 123,
    name: 'repo-a',
    full_name: 'owner-a/repo-a',
  },
  sender: {
    login: 'octocat',
  },
  commits: Array.from({ length: count }).map((_, idx) => ({
    id: `sha-${idx + 1}`,
    added: [`src/file-${idx + 1}.js`],
    modified: ['src/shared.js'],
    removed: idx % 2 === 0 ? [`src/old-${idx + 1}.js`] : [],
  })),
});

describe('GitHub webhook aggregation and fanout reduction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetWebhookQueueForTests();
    process.env.NODE_ENV = 'test';
    process.env.DELIVERY_CATCHUP_BATCH_SIZE = '50';
    process.env.DELIVERY_CATCHUP_MAX_BATCHES = '10';
  });

  afterEach(() => {
    __resetWebhookQueueForTests();
  });

  test('10 commits in one push payload => 1 DB write and 1 socket emit', async () => {
    const ioEmit = jest.fn();
    const app = express();
    app.use(express.json());
    app.set('io', { emit: ioEmit });

    mockProjectFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'project-1',
        name: 'Project One',
        githubRepoOwner: 'owner-a',
        githubRepoName: 'repo-a',
      }),
    });
    mockProjectUpdateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

    app.use('/api/github-app', require('../routes/githubAppWebhook'));

    const res = await request(app)
      .post('/api/github-app/webhook')
      .set('x-github-event', 'push')
      .set('x-github-delivery', 'delivery-burst-1')
      .send(buildPushPayload(10));

    expect(res.status).toBe(202);
    await waitForWebhookQueueIdle();

    expect(mockProjectUpdateOne).toHaveBeenCalledTimes(1);
    expect(ioEmit).toHaveBeenCalledTimes(1);
    expect(ioEmit).toHaveBeenCalledWith(
      'projectUpdate',
      expect.objectContaining({
        projectId: 'project-1',
        eventType: 'github_push_aggregated',
        summary: expect.objectContaining({
          commitCount: 10,
        }),
      })
    );
  });
});
