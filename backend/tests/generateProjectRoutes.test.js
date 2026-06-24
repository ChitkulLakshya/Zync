import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
const express = require('express');
const request = require('supertest');

process.env.GROQ_API_KEY = 'dummy_key';

const mockVerifyIdToken = mock(() =>
  Promise.resolve({ uid: 'test-user-id', email: 'test@example.com' })
);
const mockAuth = mock(() => ({
  verifyIdToken: mockVerifyIdToken,
}));

mock.module('firebase-admin', () => ({
  apps: [],
  initializeApp: mock(),
  credential: { cert: mock() },
  auth: mockAuth,
  default: {
    apps: [],
    initializeApp: mock(),
    credential: { cert: mock() },
    auth: mockAuth,
  },
}));

const mockGroqCreate = mock(() =>
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

const groqPath = require.resolve('groq-sdk');
mock.module(groqPath, () => {
  return {
    Groq: MockGroq,
    default: { Groq: MockGroq },
  };
});
mock.module('groq-sdk', () => {
  return {
    Groq: MockGroq,
    default: { Groq: MockGroq },
  };
});

const mockUserFindUnique = mock(() =>
  Promise.resolve({ id: 'user-id', uid: 'test-user-id' })
);
const mockProjectCreate = mock(() =>
  Promise.resolve({ id: 'new-project-id', name: 'Test Project' })
);

mock.module('../lib/prisma', () => ({
  user: {
    findUnique: mockUserFindUnique,
  },
  project: {
    create: mockProjectCreate,
  },
  $disconnect: mock(() => Promise.resolve()),
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
    mockVerifyIdToken.mockClear();

    const res = await request(app)
      .post('/')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Test Project', description: 'Test Description' });

    expect(res.status).toBe(201);
    expect(mockVerifyIdToken).toHaveBeenCalled();
  });
});
