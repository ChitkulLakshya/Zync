const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);
process.env.GEMINI_API_KEY_SECONDARY = 'mock-key';
process.env.ENCRYPTION_KEY = 'mock-key';

jest.mock('../utils/commitAnalysisService.js', () => ({
  analyzeCommit: jest.fn(() => Promise.resolve({ found: false })),
}));
jest.mock('../utils/githubInstallation.js', () => ({
  persistInstallationId: jest.fn(() => Promise.resolve()),
  invalidateInstallationCaches: jest.fn(() => Promise.resolve()),
}));
jest.mock('../utils/cache.js', () => ({
  getJson: jest.fn(() => null),
  setJson: jest.fn(),
  invalidate: jest.fn(() => Promise.resolve()),
}));

const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const User = require('../models/User');
const { processGithubWebhookJob } = require('../services/githubWebhookWorker');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  for (const k of Object.keys(mongoose.connection.collections))
    await mongoose.connection.collections[k].deleteMany({});
  const user = await User.create({ uid: 'owner-uid', email: 'o@t.com', displayName: 'Owner' });
  await Project.create({
    name: 'P', description: 'd', ownerId: user._id, ownerUid: 'owner-uid',
    team: [], githubRepoOwner: 'owner-gh', githubRepoName: 'repo',
  });
});

async function seedTask(overrides = {}) {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await Step.create({ title: 'Backlog', order: 0, projectId: project._id });
  return ProjectTask.create({
    title: 'Test Task',
    status: 'Ready',
    assignedTo: 'assignee-uid',
    stepId: step._id,
    githubBranchName: 'task/test-task-abc123',
    completionCommitMessage: 'Complete Task: abc123',
    ...overrides,
  });
}

const mockTaskIO = { emitToProject: jest.fn() };

function pushPayload(branchName, commits = []) {
  return {
    event: 'push',
    payload: {
      ref: `refs/heads/${branchName}`,
      commits,
      repository: { id: 99, name: 'repo', full_name: 'owner-gh/repo' },
      sender: { login: 'octocat' },
    },
    getIo: () => ({ emit: jest.fn(), to: () => ({ emit: jest.fn() }) }),
    getTaskIO: () => mockTaskIO,
  };
}

function prPayload(branchName, prNumber = 42) {
  return {
    event: 'pull_request',
    payload: {
      action: 'opened',
      pull_request: { head: { ref: branchName }, html_url: 'https://github.com/owner-gh/repo/pull/42', number: prNumber },
      repository: { id: 99, name: 'repo', full_name: 'owner-gh/repo' },
      sender: { login: 'octocat' },
    },
    getIo: () => ({ emit: jest.fn(), to: () => ({ emit: jest.fn() }) }),
    getTaskIO: () => mockTaskIO,
  };
}

// W1: push to task/* branch → In Progress
test('W1: push to task/* branch updates status to In Progress', async () => {
  const task = await seedTask({ status: 'Ready' });
  const result = await processGithubWebhookJob(pushPayload('task/test-task-abc123', [
    { id: 'abc123def456', message: 'initial commit', added: ['a.js'], modified: [], removed: [] },
  ]));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('In Progress');
});

// W2: push with completion commit → Done
test('W2: push with completion commit updates status to Done', async () => {
  const task = await seedTask({ status: 'In Progress' });
  const result = await processGithubWebhookJob(pushPayload('task/test-task-abc123', [
    { id: 'abc123def456', message: 'Complete Task: abc123', added: [], modified: ['b.js'], removed: [] },
  ]));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('Done');
  expect(updated.commitCode).toBe('abc123d');
  expect(updated.commitMessage).toBe('Complete Task: abc123');
});

// W3: push when already Done → no regression
test('W3: push when already Done does not regress status', async () => {
  const task = await seedTask({ status: 'Done' });
  await processGithubWebhookJob(pushPayload('task/test-task-abc123', [
    { id: 'newcommit12345', message: 'fix something', added: [], modified: ['c.js'], removed: [] },
  ]));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('Done');
});

// W4: push when already PR Raised → no regression
test('W4: push when already PR Raised does not regress status', async () => {
  const task = await seedTask({ status: 'PR Raised' });
  await processGithubWebhookJob(pushPayload('task/test-task-abc123', [
    { id: 'newcommit12345', message: 'fix something', added: [], modified: ['c.js'], removed: [] },
  ]));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('PR Raised');
});

// W5: push to non-task branch → no task update
test('W5: push to non-task branch does not update any task', async () => {
  const task = await seedTask({ status: 'Ready' });
  await processGithubWebhookJob(pushPayload('main', [
    { id: 'abc123def456', message: 'commit on main', added: [], modified: ['d.js'], removed: [] },
  ]));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('Ready');
});

// W6: PR opened on task branch → PR Raised
test('W6: PR opened on task branch updates status to PR Raised', async () => {
  const task = await seedTask({ status: 'Done' });
  await processGithubWebhookJob(prPayload('task/test-task-abc123'));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('PR Raised');
  expect(updated.githubPrUrl).toBe('https://github.com/owner-gh/repo/pull/42');
  expect(updated.githubPrNumber).toBe(42);
});

// W7: PR opened on non-task branch → ignored
test('W7: PR opened on non-task branch is ignored', async () => {
  const task = await seedTask({ status: 'Ready' });
  const result = await processGithubWebhookJob(prPayload('feature/some-feature'));
  expect(result.ignored).toBe(true);
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('Ready');
});

// W8: push to task/* branch broadcasts task-updated so the Kanban board moves live
test('W8: push to task/* branch emits task-updated via taskIO', async () => {
  const task = await seedTask({ status: 'Ready' });
  await processGithubWebhookJob(pushPayload('task/test-task-abc123', [
    { id: 'abc123def456', message: 'initial commit', added: ['a.js'], modified: [], removed: [] },
  ]));
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    expect.any(String),
    'task-updated',
    expect.objectContaining({
      taskId: String(task._id),
      changes: expect.objectContaining({ status: 'In Progress' }),
    })
  );
});

// W9: PR opened on task branch broadcasts task-updated so the Kanban board moves live
test('W9: PR opened on task branch emits task-updated via taskIO', async () => {
  const task = await seedTask({ status: 'Done' });
  await processGithubWebhookJob(prPayload('task/test-task-abc123'));
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    expect.any(String),
    'task-updated',
    expect.objectContaining({
      taskId: String(task._id),
      changes: expect.objectContaining({ status: 'PR Raised', githubPrNumber: 42 }),
    })
  );
});
