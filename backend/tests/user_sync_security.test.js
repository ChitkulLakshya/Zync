
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
