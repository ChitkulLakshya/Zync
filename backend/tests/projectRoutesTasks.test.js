const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);
process.env.GEMINI_API_KEY_SECONDARY = 'mock-key';
process.env.ENCRYPTION_KEY = 'mock-key';

jest.mock('../middleware/authMiddleware.js', () =>
  jest.fn((req, res, next) => {
    req.user = { uid: req.headers['x-test-uid'] || 'owner-uid' };
    next();
  })
);
jest.mock('../services/mailer.js', () => ({ sendZyncEmail: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/emailTemplates.js', () => ({ getTaskAssignmentEmailHtml: jest.fn(() => '<p>mock</p>') }));
jest.mock('../utils/cache.js', () => ({ getJson: jest.fn(() => null), setJson: jest.fn(), invalidate: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/githubInstallation.js', () => ({
  getInstallationOctokit: jest.fn(() => Promise.resolve({ request: jest.fn(() => Promise.resolve({ data: {} })) })),
  invalidateInstallationCaches: jest.fn(() => Promise.resolve()),
}));

const { sendZyncEmail } = require('../services/mailer.js');
const ProjectTask = require('../models/ProjectTask');
const Project = require('../models/Project');
const Step = require('../models/Step');
const User = require('../models/User');
const projectRoutes = require('../routes/projectRoutes');

const mockIo = { emit: jest.fn() };
const mockTaskIO = { emitToProject: jest.fn(), emitToUser: jest.fn() };
let app, mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoServer.getUri());
  app = express();
  app.use(express.json());
  app.get = jest.fn((k) => {
    if (k === 'io') return mockIo;
    if (k === 'taskIO') return mockTaskIO;
    return undefined;
  });
  app.use('/projects', projectRoutes);
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
  const owner = await User.create({ uid: 'owner-uid', email: 'o@t.com', displayName: 'Owner' });
  await User.create({ uid: 'member-uid', email: 'm@t.com', displayName: 'Member' });
  await Project.create({
    name: 'P', description: 'd', ownerId: owner._id, ownerUid: 'owner-uid',
    team: ['member-uid'],
  });
});

async function seedStep(title = 'Backlog') {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  return Step.create({ title, order: 0, projectId: project._id });
}

async function seedTask(overrides = {}) {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await Step.findOne({ projectId: project._id }) || await seedStep();
  return ProjectTask.create({
    title: 'Test Task', status: 'Ready', stepId: step._id,
    commitCode: String(Date.now()) + Math.floor(Math.random() * 1000),
    ...overrides,
  });
}

// B10: POST task creates task with status Ready
test('B10: POST task creates task with status Ready', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const res = await request(app)
    .post(`/projects/${project._id}/steps/${step._id}/tasks`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'New Task', description: 'Desc' });
  expect(res.status).toBe(201);
  const task = await ProjectTask.findOne({ title: 'New Task' });
  expect(task).toBeTruthy();
  expect(task.status).toBe('Ready');
  expect(task.stepId.toString()).toBe(step._id.toString());
});

// B11: POST task rejects missing title
test('B11: POST task rejects missing title', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const res = await request(app)
    .post(`/projects/${project._id}/steps/${step._id}/tasks`)
    .set('x-test-uid', 'owner-uid')
    .send({ description: 'No title' });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/title is required/i);
});

// B12: POST task rejects non-team-member
test('B12: POST task rejects non-team-member', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  await User.create({ uid: 'outsider', email: 'out@t.com', displayName: 'Out' });
  const res = await request(app)
    .post(`/projects/${project._id}/steps/${step._id}/tasks`)
    .set('x-test-uid', 'outsider')
    .send({ title: 'X' });
  expect(res.status).toBe(403);
});

// B13: PUT task updates status
test('B13: PUT task updates status', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask();
  const res = await request(app)
    .put(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid')
    .send({ status: 'In Progress' });
  expect(res.status).toBe(200);
  const updated = await ProjectTask.findById(task._id);
  expect(updated.status).toBe('In Progress');
});

// B14: PUT task emits socket event task-updated
test('B14: PUT task emits task-updated socket event', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask();
  await request(app)
    .put(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid')
    .send({ status: 'Active' });
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    String(project._id), 'task-updated',
    expect.objectContaining({ taskId: String(task._id), actor: 'owner-uid' })
  );
});

// B15: PUT task reassigns and sends email
test('B15: PUT task reassigns and sends email', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask({ assignedTo: null });
  const res = await request(app)
    .put(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid')
    .send({ assignedTo: 'member-uid', assignedToName: 'Member' });
  expect(res.status).toBe(200);
  expect(sendZyncEmail).toHaveBeenCalledWith('m@t.com', expect.any(String), expect.any(String), expect.any(String));
  const updated = await ProjectTask.findById(task._id);
  expect(updated.assignedTo).toBe('member-uid');
  expect(updated.assignedToName).toBe('Member');
});

// B16: DELETE task removes task
test('B16: DELETE task removes task', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask();
  const res = await request(app)
    .delete(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid');
  expect(res.status).toBe(200);
  expect(await ProjectTask.findById(task._id)).toBeNull();
});

// B17: DELETE task rejects non-owner
test('B17: DELETE task rejects non-owner', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask();
  const res = await request(app)
    .delete(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'member-uid');
  expect(res.status).toBe(403);
  expect(res.body.message).toMatch(/only.*owner/i);
});

// B18: DELETE task blocks when PR Raised
test('B18: DELETE task blocks when PR Raised', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask({ status: 'PR Raised' });
  const res = await request(app)
    .delete(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid');
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/pull request/i);
});

// B19: POST quick-task creates task
test('B19: POST quick-task creates task', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const res = await request(app)
    .post(`/projects/${project._id}/quick-task`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'Quick Task' });
  expect(res.status).toBe(200);
  expect(res.body.task).toBeTruthy();
  expect(res.body.task.title).toBe('Quick Task');
  expect(res.body.task.status).toBe('Ready');
});

// B20: POST quick-task auto-creates Backlog step
test('B20: POST quick-task auto-creates Backlog step', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const res = await request(app)
    .post(`/projects/${project._id}/quick-task`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'Auto Step Task' });
  expect(res.status).toBe(200);
  const step = await Step.findOne({ projectId: project._id });
  expect(step).toBeTruthy();
  expect(step.title).toBe('Backlog');
});

// B21: POST quick-task rejects non-team-member
test('B21: POST quick-task rejects non-team-member', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  await User.create({ uid: 'outsider2', email: 'out2@t.com', displayName: 'Out2' });
  const res = await request(app)
    .post(`/projects/${project._id}/quick-task`)
    .set('x-test-uid', 'outsider2')
    .send({ title: 'X' });
  expect(res.status).toBe(403);
});

// B22: PUT task on non-existent task returns 404
test('B22: PUT task on non-existent task returns 404', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const fakeId = new mongoose.Types.ObjectId();
  const res = await request(app)
    .put(`/projects/${project._id}/steps/${step._id}/tasks/${fakeId}`)
    .set('x-test-uid', 'owner-uid')
    .send({ status: 'Done' });
  expect(res.status).toBe(404);
  expect(res.body.message).toMatch(/task not found/i);
});

// B23: DELETE task emits task-deleted socket event
test('B23: DELETE task emits task-deleted socket event', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask();
  await request(app)
    .delete(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid');
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    String(project._id), 'task-deleted',
    expect.objectContaining({ taskId: String(task._id), actor: 'owner-uid' })
  );
});

// B24: PUT task emits projectUpdate via io
test('B24: PUT task emits projectUpdate via io', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const task = await seedTask();
  await request(app)
    .put(`/projects/${project._id}/steps/${step._id}/tasks/${task._id}`)
    .set('x-test-uid', 'owner-uid')
    .send({ status: 'Done' });
  expect(mockIo.emit).toHaveBeenCalledWith('projectUpdate', expect.objectContaining({ projectId: String(project._id) }));
});

// B25: POST task emits task-created socket event
test('B25: POST task emits task-created socket event', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const res = await request(app)
    .post(`/projects/${project._id}/steps/${step._id}/tasks`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'Socket Task', description: 'Desc' });
  expect(res.status).toBe(201);
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    String(project._id), 'task-created',
    expect.objectContaining({
      projectId: String(project._id),
      stepId: String(step._id),
      actor: 'owner-uid',
    })
  );
});

// B26: POST task with assignee emits task-assigned to the assignee
test('B26: POST task with assignee emits task-assigned to assignee', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const step = await seedStep();
  const res = await request(app)
    .post(`/projects/${project._id}/steps/${step._id}/tasks`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'Assigned Task', assignedTo: 'member-uid', assignedToName: 'Member' });
  expect(res.status).toBe(201);
  expect(mockTaskIO.emitToUser).toHaveBeenCalledWith(
    'member-uid', 'task-assigned',
    expect.objectContaining({
      projectId: String(project._id),
      actor: 'owner-uid',
    })
  );
});

// B27: POST quick-task emits task-created socket event
test('B27: POST quick-task emits task-created socket event', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const res = await request(app)
    .post(`/projects/${project._id}/quick-task`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'Quick Socket Task' });
  expect(res.status).toBe(200);
  expect(mockTaskIO.emitToProject).toHaveBeenCalledWith(
    String(project._id), 'task-created',
    expect.objectContaining({
      projectId: String(project._id),
      actor: 'owner-uid',
    })
  );
});

// B28: POST quick-task with assignee emits task-assigned to assignee
test('B28: POST quick-task with assignee emits task-assigned to assignee', async () => {
  const project = await Project.findOne({ ownerUid: 'owner-uid' });
  const res = await request(app)
    .post(`/projects/${project._id}/quick-task`)
    .set('x-test-uid', 'owner-uid')
    .send({ title: 'Quick Assigned', assignedTo: 'member-uid', assignedToName: 'Member' });
  expect(res.status).toBe(200);
  expect(mockTaskIO.emitToUser).toHaveBeenCalledWith(
    'member-uid', 'task-assigned',
    expect.objectContaining({
      projectId: String(project._id),
      actor: 'owner-uid',
    })
  );
});
