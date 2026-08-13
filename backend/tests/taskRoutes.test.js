const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);
process.env.GEMINI_API_KEY_SECONDARY = 'mock-key';
process.env.ENCRYPTION_KEY = 'mock-key';
process.env.GITHUB_APP_ID = 'mock';
process.env.GITHUB_PRIVATE_KEY = 'mock';

jest.mock('../middleware/authMiddleware.js', () =>
  jest.fn((req, res, next) => {
    req.user = { uid: req.headers['x-test-uid'] || 'owner-uid' };
    next();
  })
);
jest.mock('../services/mailer.js', () => ({ sendZyncEmail: jest.fn(() => Promise.resolve()) }));
jest.mock('../services/pushNotificationService.js', () => ({ sendPushNotification: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/emailTemplates.js', () => ({ getTaskAssignmentEmailHtml: jest.fn(() => '<p>mock</p>') }));
jest.mock('../utils/cache.js', () => ({ getJson: jest.fn(() => null), setJson: jest.fn(), invalidate: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/githubInstallation.js', () => ({ getInstallationOctokit: jest.fn(), invalidateInstallationCaches: jest.fn() }));

const octokitMock = require('octokit');

const { sendZyncEmail } = require('../services/mailer.js');
const { sendPushNotification } = require('../services/pushNotificationService.js');
const { getInstallationOctokit } = require('../utils/githubInstallation.js');
const ProjectTask = require('../models/ProjectTask');
const Project = require('../models/Project');
const Step = require('../models/Step');
const User = require('../models/User');
const Team = require('../models/Team');
const Session = require('../models/Session');
const taskRoutes = require('../routes/taskRoutes');

const mockTaskIO = { emitToProject: jest.fn(), emitToUser: jest.fn() };
let app, mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoServer.getUri());
  app = express();
  app.use(express.json());
  app.get = jest.fn((k) => (k === 'taskIO' ? mockTaskIO : undefined));
  app.use('/tasks', taskRoutes);
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
  await User.create({ uid: 'owner-uid', email: 'o@t.com', displayName: 'Owner', githubIntegration: { installationId: 123, username: 'owner-gh' } });
  await User.create({ uid: 'assignee-uid', email: 'a@t.com', displayName: 'Assignee', githubIntegration: { installationId: 456, username: 'assignee-gh' } });
  await Team.create({ name: 'T', inviteCode: 'CODE123', ownerId: 'owner-uid', members: ['owner-uid', 'assignee-uid'] });
});

async function seedProject() {
  const owner = await User.findOne({ uid: 'owner-uid' });
  return Project.create({ name: 'P', description: 'd', ownerId: owner._id, ownerUid: 'owner-uid', team: ['assignee-uid'], githubRepoOwner: 'owner-gh', githubRepoName: 'repo' });
}

function mockOctokit(logins = ['assignee-gh']) {
  octokitMock.__setMockRequest(jest.fn(async (route) => {
    if (route.includes('collaborators')) return { data: logins.map(l => ({ login: l })) };
    if (route.includes('invitations')) return { data: [] };
    return { data: {} };
  }));
}

// B1: creates task with correct fields
test('B1: POST /assign creates task with correct fields', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'My Task', description: 'Desc', assignedUserId: 'assignee-uid' });
  expect(res.status).toBe(200);
  expect(res.body.tasks).toHaveLength(1);
  const t = res.body.tasks[0];
  expect(t.title).toBe('My Task');
  expect(t.status).toBe('Pending');
  expect(t.assignedTo).toBe('assignee-uid');
  expect(t.commitCode).toMatch(/^\d{10}$/);
  const db = await ProjectTask.findById(t.id);
  expect(db.stepId).toBeDefined();
});

// B2: rejects self-assignment
test('B2: POST /assign rejects self-assignment', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'Self', assignedUserId: 'owner-uid' });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/cannot assign.*yourself/i);
});

// B3: rejects non-owner
test('B3: POST /assign rejects non-owner', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'assignee-uid')
    .send({ projectId: proj._id, taskName: 'X', assignedUserId: 'owner-uid' });
  expect(res.status).toBe(403);
  expect(res.body.message).toMatch(/only.*owner/i);
});

// B4: rejects non-team-member assignee
test('B4: POST /assign rejects non-team-member assignee', async () => {
  const proj = await seedProject();
  await User.create({ uid: 'outsider', email: 'out@t.com', displayName: 'Out', githubIntegration: { installationId: 789, username: 'out-gh' } });
  mockOctokit(['owner-gh']);
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'X', assignedUserId: 'outsider' });
  expect(res.status).toBe(400);
});

// B5: rejects non-collaborator
test('B5: POST /assign rejects non-collaborator', async () => {
  const proj = await seedProject();
  mockOctokit(['owner-gh']);
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'X', assignedUserId: 'assignee-uid' });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/collaborator/i);
});

// B6: rejects multiple assignees
test('B6: POST /assign rejects multiple assignees', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'X', assignedUserIds: ['assignee-uid', 'owner-uid'] });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/only one assignee/i);
});

// B7: sends email + push notification + session log
test('B7: POST /assign sends email, push notification, and logs session', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'Notify Task', assignedUserId: 'assignee-uid' });
  expect(res.status).toBe(200);
  await new Promise(r => setTimeout(r, 100));
  expect(sendZyncEmail).toHaveBeenCalledWith('a@t.com', expect.any(String), expect.any(String), expect.any(String));
  expect(sendPushNotification).toHaveBeenCalledWith('assignee-uid', expect.objectContaining({ title: 'New Task Assigned' }));
  const sessions = await Session.find({ eventType: 'task-assigned' });
  expect(sessions).toHaveLength(1);
  expect(sessions[0].userId).toBe('assignee-uid');
});

// B8: emits socket events task-created and task-assigned
test('B8: POST /assign emits socket events', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'Socket Task', assignedUserId: 'assignee-uid' });
  expect(res.status).toBe(200);
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    String(proj._id), 'task-created',
    expect.objectContaining({ projectId: String(proj._id), actor: 'owner-uid' })
  );
  expect(mockTaskIO.emitToUser).toHaveBeenCalledWith(
    'assignee-uid', 'task-assigned',
    expect.objectContaining({ projectId: String(proj._id) })
  );
});

// B9: invalidates cache for owner + assignee
test('B9: POST /assign invalidates cache for owner and assignee', async () => {
  const proj = await seedProject();
  mockOctokit();
  const res = await request(app)
    .post('/tasks/assign')
    .set('x-test-uid', 'owner-uid')
    .send({ projectId: proj._id, taskName: 'Cache Task', assignedUserId: 'assignee-uid' });
  expect(res.status).toBe(200);
  const cache = require('../utils/cache.js');
  expect(cache.invalidate).toHaveBeenCalledWith('projects:owner-uid', 'projects:assignee-uid');
});
