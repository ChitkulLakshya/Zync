const request = require('supertest');
const express = require('express');
const {
  waitForWebhookQueueIdle,
  __resetWebhookQueueForTests,
} = require('../services/webhookQueue');

jest.mock('../middleware/verifyGithub', () => (_req, _res, next) => next());

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
