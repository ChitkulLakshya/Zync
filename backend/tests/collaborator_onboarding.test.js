const request = require('supertest');
const express = require('express');

process.env.GCP_SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: "service_account",
  project_id: "mock-project-id",
  private_key: "mock-private-key"
});

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail
  })
}));

// Mock firebase-admin
const mockDocSet = jest.fn().mockResolvedValue({});
const mockDoc = jest.fn().mockReturnValue({
  set: mockDocSet
});
const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc
});
const mockFirestore = jest.fn().mockReturnValue({
  collection: mockCollection
});

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: mockFirestore
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const collaboratorRoutes = require('../routes/collaboratorRoutes');

const app = express();
app.use(express.json());
app.use('/api/onboard', collaboratorRoutes);

describe('Collaborator Onboarding API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GITHUB_ADMIN_TOKEN: 'mock_admin_token',
      GITHUB_ORG: 'ChitkulLakshya',
      GITHUB_REPO: 'Zync',
      GMAIL_USER: 'zync.meet@gmail.com',
      GOOGLE_CLIENT_ID: 'client_id',
      GOOGLE_CLIENT_SECRET: 'client_secret',
      GOOGLE_REFRESH_TOKEN: 'refresh_token',
      ADMIN_EMAIL: 'admin@zync.test'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 400 if username is missing', async () => {
    const res = await request(app)
      .post('/api/onboard')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/api/onboard')
      .send({ username: 'gituser' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('should return 500 if GITHUB_ADMIN_TOKEN is not configured', async () => {
    delete process.env.GITHUB_ADMIN_TOKEN;

    const res = await request(app)
      .post('/api/onboard')
      .send({ username: 'gituser', email: 'test@example.com' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('not configured');
  });

  it('should return 400 if GitHub API returns non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not Found' })
    });

    const res = await request(app)
      .post('/api/onboard')
      .send({ username: 'nonexistent', email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('GitHub invite failed: Not Found');
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should successfully invite user to GitHub and send notification email', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 12345 })
    });

    const res = await request(app)
      .post('/api/onboard')
      .send({ username: 'gituser', email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Invitation sent');

    // Verify GitHub API call
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/ChitkulLakshya/Zync/collaborators/gituser',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Authorization': 'token mock_admin_token',
          'User-Agent': 'Zync-Onboarding-App'
        })
      })
    );

    // Verify email call
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@zync.test',
        text: expect.stringContaining('Automated Invite Successful. User gituser (test@example.com) has been invited to the Zync repository.')
      })
    );

    // Verify Firestore database save
    expect(mockFirestore).toHaveBeenCalled();
    expect(mockCollection).toHaveBeenCalledWith('collaborators');
    expect(mockDoc).toHaveBeenCalledWith('gituser');
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'gituser',
        email: 'test@example.com',
        status: 'invited',
        repoOwner: 'ChitkulLakshya',
        repoName: 'Zync'
      })
    );
  });
});
