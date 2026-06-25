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
