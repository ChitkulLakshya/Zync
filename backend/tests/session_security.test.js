
const express = require('express');
const request = require('supertest');
const path = require('path');

const mockPrisma = {
  session: {
    create: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
    findMany: jest.fn(() => Promise.resolve([])),
    findUnique: jest.fn(() => Promise.resolve({})),
    delete: jest.fn(() => Promise.resolve({})),
    deleteMany: jest.fn(() => Promise.resolve({})),
  },
  $disconnect: jest.fn(() => Promise.resolve()),
};

jest.mock('../lib/prisma', () => mockPrisma);
jest.mock('../middleware/authMiddleware', () =>
  jest.fn((req, res) => res.status(401).json({ message: 'Unauthorized' }))
);

const sessionRoutes = require('../routes/sessionRoutes');

const app = express();
app.use(express.json());

app.use('/api/sessions', sessionRoutes);

describe('Session Routes Security', () => {
  it('GET /:userId should require authentication', async () => {
    const res = await request(app).get('/api/sessions/user123');
    expect(res.status).toBe(401);
  });

  it('POST /start should require authentication', async () => {
    const res = await request(app)
      .post('/api/sessions/start')
      .send({ userId: 'user123' });
    expect(res.status).toBe(401);
  });

  it('POST /batch should require authentication', async () => {
    const res = await request(app)
      .post('/api/sessions/batch')
      .send({ userIds: ['user123'] });
    expect(res.status).toBe(401);
  });

  it('DELETE /user/:userId should require authentication', async () => {
    const res = await request(app).delete('/api/sessions/user/user123');
    expect(res.status).toBe(401);
  });
});
