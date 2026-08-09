/**
 * @fileoverview project_security.test.js
 * @module project_security.test
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
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

process.env.ENCRYPTION_KEY = 'mock-encryption-key';

jest.mock('../middleware/authMiddleware.js', () => {
  const mockTracker = jest.fn((req, res, next) => {
    req.user = { uid: 'authenticated-user' };
    next();
  });
  return mockTracker;
});



const mockAuthMiddlewareTracker = require('../middleware/authMiddleware.js');

jest.mock('../services/mailer.js', () => ({
  sendZyncEmail: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/regexUtils.js', () => ({
  escapeRegExp: jest.fn((str) => str),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(() =>
      Promise.resolve({ id: 'user-id', uid: 'authenticated-user' })
    ),
  },
  project: {
    findUnique: jest.fn(() =>
      Promise.resolve({
        id: 'project-id',
        ownerId: 'user-id',
        team: [],
        steps: [],
      })
    ),
    create: jest.fn(() => Promise.resolve({ id: 'new-project-id' })),
    update: jest.fn(() => Promise.resolve({ id: 'project-id' })),
    delete: jest.fn(() => Promise.resolve({ id: 'project-id' })),
    findMany: jest.fn(() => Promise.resolve([])),
  },
  step: {
    findUnique: jest.fn(() => Promise.resolve({ id: 'step-id' })),
    create: jest.fn(() => Promise.resolve({ id: 'new-step-id' })),
    createMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },
  projectTask: {
    findUnique: jest.fn(() => Promise.resolve({ id: 'task-id', stepId: 's1' })),
    create: jest.fn(() => Promise.resolve({ id: 'new-task-id' })),
    update: jest.fn(() => Promise.resolve({ id: 'task-id' })),
    delete: jest.fn(() => Promise.resolve({ id: 'task-id' })),
  },
};

jest.mock('../lib/prisma.js', () => mockPrisma);

const createObjectId = () => new mongoose.Types.ObjectId().toHexString();

const projectRoutes = require('../routes/projectRoutes');

describe('Project Routes Security', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(uri);

    app = express();
    app.use(express.json());

    app.get = (key) => {
      if (key === 'io') return { emit: jest.fn() };
      return undefined;
    };
    app.use('/projects', projectRoutes);
  });

  beforeEach(() => {

    mockAuthMiddlewareTracker.mockClear();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongoServer?.stop();
  });

  it('POST /projects (Create Project) should require auth', async () => {
    await request(app)
      .post('/projects')
      .send({ name: 'Test', description: 'Desc' });

    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });


  it('GET /projects should require auth', async () => {
    await request(app).get('/projects');
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('POST /projects/:id/team should require auth', async () => {
    const projectId = createObjectId();
    await request(app)
      .post(`/projects/${projectId}/team`)
      .send({ userId: 'user2' });
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('GET /projects/:id should require auth', async () => {
    const projectId = createObjectId();
    await request(app).get(`/projects/${projectId}`);
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('DELETE /projects/:id should require auth', async () => {
    const projectId = createObjectId();
    await request(app).delete(`/projects/${projectId}`);
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('PATCH /projects/:id should require auth', async () => {
    const projectId = createObjectId();
    await request(app)
      .patch(`/projects/${projectId}`)
      .send({ name: 'New Name' });
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('POST /projects/:projectId/steps/:stepId/tasks should require auth', async () => {
    const projectId = createObjectId();
    const stepId = createObjectId();
    await request(app)
      .post(`/projects/${projectId}/steps/${stepId}/tasks`)
      .send({ title: 'Task' });
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('PUT /projects/:projectId/steps/:stepId/tasks/:taskId should require auth', async () => {
    const projectId = createObjectId();
    const stepId = createObjectId();
    const taskId = createObjectId();
    await request(app)
      .put(`/projects/${projectId}/steps/${stepId}/tasks/${taskId}`)
      .send({ status: 'Done' });
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('POST /projects/:projectId/quick-task should require auth', async () => {
    const projectId = createObjectId();
    await request(app)
      .post(`/projects/${projectId}/quick-task`)
      .send({ title: 'Quick Task' });
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });

  it('POST /projects/:id/analyze-architecture should require auth', async () => {
    const projectId = createObjectId();
    await request(app)
      .post(`/projects/${projectId}/analyze-architecture`)
      .send({});
    expect(mockAuthMiddlewareTracker).toHaveBeenCalled();
  });
});
