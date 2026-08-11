/**
 * @fileoverview user_sync_security.test.js
 * @module user_sync_security.test
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

const createSelectLeanChain = (result) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

const createLeanChain = (result) => ({
  lean: jest.fn().mockResolvedValue(result),
});

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/Team', () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

const mockUserModel = jest.requireMock('../models/User');
const mockTeamModel = jest.requireMock('../models/Team');
const { sendZyncEmail } = jest.requireMock('../services/mailer');
const { appendRow } = jest.requireMock('../services/sheetLogger');

jest.mock('../middleware/authMiddleware', () => {
  return jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader === 'Bearer valid_token') {
      req.user = { uid: 'secure_uid', email: 'test@example.com' };
      return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
  });
});

jest.mock('../utils/encryption', () => ({}));
jest.mock('../utils/regexUtils', () => ({}));
jest.mock('../services/mailer', () => ({
  sendZyncEmail: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../services/sheetLogger', () => ({
  appendRow: jest.fn(() => Promise.resolve()),
}));
jest.mock('../utils/normalize', () => ({
  normalizeDoc: (doc) => doc,
  normalizeDocs: (docs) => docs,
}));
jest.mock('../utils/emailTemplates', () => ({
  getNewUserRegistrationTemplate: jest.fn(() => '<html></html>'),
  getPhoneVerificationEmailHtml: jest.fn(() => '<html></html>'),
  getChatRequestEmailHtml: jest.fn(() => '<html></html>'),
  getAccountDeletionCodeEmailHtml: jest.fn(() => '<html></html>'),
}));
jest.mock('../services/cloudinaryService', () => ({
  deleteCloudinaryAsset: jest.fn(() => Promise.resolve()),
}));

const userRoutes = require('../routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

const defaultUserData = {
  uid: 'secure_uid',
  email: 'test@example.com',
  displayName: 'Secure User',
  teamMemberships: [],
};

const originalNewUserAlertRecipients = process.env.NEW_USER_ALERT_RECIPIENTS;
const originalSupportRecipients = process.env.SUPPORT_RECIPIENTS;

const resetModelMocks = (userData = defaultUserData) => {
  mockUserModel.findOne.mockImplementation(() =>
    createSelectLeanChain(userData)
  );
  mockUserModel.findOneAndUpdate.mockResolvedValue({
    lastErrorObject: { updatedExisting: true },
    value: {
      ...(userData || {}),
      lastSeen: new Date().toISOString(),
      welcomeNotificationSent: true,
    },
  });
  mockUserModel.create.mockImplementation(() => ({
    toObject: () => ({
      ...(userData || {}),
      created: true,
    }),
  }));
  mockTeamModel.findById.mockImplementation(() => createLeanChain(null));
  mockTeamModel.find.mockImplementation(() => createLeanChain([]));
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEW_USER_ALERT_RECIPIENTS = 'alerts@zync.test';
  process.env.SUPPORT_RECIPIENTS = '';
  resetModelMocks();
});

afterAll(() => {
  process.env.NEW_USER_ALERT_RECIPIENTS = originalNewUserAlertRecipients;
  process.env.SUPPORT_RECIPIENTS = originalSupportRecipients;
});

describe('User Sync Security', () => {
  it('should reject request without authorization header', async () => {
    const res = await request(app)
      .post('/api/users/sync')
      .send({ uid: 'some_uid', email: 'test@example.com' });

    expect(res.status).toBe(401);
  });

  it('should accept request with authorization header', async () => {
    const res = await request(app)
      .post('/api/users/sync')
      .set('Authorization', 'Bearer valid_token')
      .send({ uid: 'secure_uid', email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(mockUserModel.findOneAndUpdate).toHaveBeenCalled();
    expect(sendZyncEmail).not.toHaveBeenCalled();
    expect(appendRow).not.toHaveBeenCalled();
  });

  it('should reject request when body uid mismatches token uid', async () => {
    const res = await request(app)
      .post('/api/users/sync')
      .set('Authorization', 'Bearer valid_token')
      .send({ uid: 'another_uid', email: 'test@example.com' });

    expect(res.status).toBe(403);
    expect(mockUserModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should send new user alert only for inserted users', async () => {
    mockUserModel.findOneAndUpdate.mockResolvedValueOnce({
      lastErrorObject: { updatedExisting: false, upserted: 'new_user_oid' },
      value: {
        uid: 'secure_uid',
        email: 'test@example.com',
        displayName: 'Secure User',
        lastSeen: new Date().toISOString(),
        welcomeNotificationSent: true,
      },
    });

    const res = await request(app)
      .post('/api/users/sync')
      .set('Authorization', 'Bearer valid_token')
      .send({
        uid: 'secure_uid',
        email: 'test@example.com',
        displayName: 'Secure User',
      });

    expect(res.status).toBe(200);
    expect(sendZyncEmail).toHaveBeenCalledTimes(1);
    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(sendZyncEmail).toHaveBeenCalledWith(
      'alerts@zync.test',
      expect.any(String),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should send notifications when metadata only has updatedExisting false', async () => {
    mockUserModel.findOneAndUpdate.mockResolvedValueOnce({
      lastErrorObject: { updatedExisting: false },
      value: {
        uid: 'secure_uid',
        email: 'test@example.com',
        displayName: 'Secure User',
        lastSeen: new Date().toISOString(),
        welcomeNotificationSent: true,
      },
    });

    const res = await request(app)
      .post('/api/users/sync')
      .set('Authorization', 'Bearer valid_token')
      .send({
        uid: 'secure_uid',
        email: 'test@example.com',
        displayName: 'Secure User',
      });

    expect(res.status).toBe(200);
    expect(sendZyncEmail).toHaveBeenCalledTimes(1);
    expect(appendRow).toHaveBeenCalledTimes(1);
  });

  it('should skip admin email when recipients are not configured', async () => {
    process.env.NEW_USER_ALERT_RECIPIENTS = '';
    process.env.SUPPORT_RECIPIENTS = '';

    mockUserModel.findOneAndUpdate.mockResolvedValueOnce({
      lastErrorObject: { updatedExisting: false, upserted: 'new_user_oid' },
      value: {
        uid: 'secure_uid',
        email: 'test@example.com',
        displayName: 'Secure User',
        lastSeen: new Date().toISOString(),
        welcomeNotificationSent: true,
      },
    });

    const res = await request(app)
      .post('/api/users/sync')
      .set('Authorization', 'Bearer valid_token')
      .send({
        uid: 'secure_uid',
        email: 'test@example.com',
        displayName: 'Secure User',
      });

    expect(res.status).toBe(200);
    expect(sendZyncEmail).not.toHaveBeenCalled();
    expect(appendRow).toHaveBeenCalledTimes(1);
  });
});
