/**
 * @fileoverview generateProjectRoutes.test.js
 * @module generateProjectRoutes.test
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
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express');
const request = require('supertest');

process.env.GROQ_API_KEY = 'dummy_key';

jest.mock('../middleware/authMiddleware', () => {
  return jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader === 'Bearer valid-token') {
      req.user = { uid: 'test-user-id', email: 'test@example.com' };
      return next();
    }
    return res.status(401).json({ message: 'No token provided' });
  });
});

const mockGroqCreate = jest.fn(() =>
  Promise.resolve({
    choices: [
      { message: { content: JSON.stringify({ architecture: {}, steps: [] }) } },
    ],
  })
);
const MockGroq = class {
  constructor() {
    this.chat = { completions: { create: mockGroqCreate } };
  }
};

jest.mock('groq-sdk', () => MockGroq);

jest.mock('../models/User', () => ({
  findOne: jest.fn(() => ({ lean: () => Promise.resolve({ _id: 'user_oid' }) })),
}));
jest.mock('../models/Project', () => ({
  create: jest.fn(() => Promise.resolve({ _id: 'project_oid' })),
}));
jest.mock('../models/Step', () => ({
  insertMany: jest.fn((steps) => Promise.resolve(steps.map((s, idx) => ({ ...s, _id: `step_${idx}` })))),
}));
jest.mock('../models/ProjectTask', () => ({
  insertMany: jest.fn((tasks) => Promise.resolve(tasks.map((t, idx) => ({ ...t, _id: `task_${idx}` })))),
}));
jest.mock('../utils/projectHelper', () => ({
  getProjectWithSteps: jest.fn(() => Promise.resolve({ id: 'new-project-id', name: 'Test Project' })),
}));

const generateProjectRoutes = require('../routes/generateProjectRoutes');

const app = express();
app.use(express.json());
app.use('/', generateProjectRoutes);

describe('Generate Project Routes', () => {
  it('should return 401 if not authenticated (no header)', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test Project', description: 'Test Description' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('No token provided');
  });

  it('should return 201 if authenticated', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Test Project', description: 'Test Description' });

    expect(res.status).toBe(201);
  });
});
