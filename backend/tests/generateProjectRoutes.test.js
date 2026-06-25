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
