const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const User = require('../models/User');
const { getProjectWithSteps, getProjectsWithSteps } = require('../utils/projectHelper');

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
  for (const k of Object.keys(mongoose.connection.collections))
    await mongoose.connection.collections[k].deleteMany({});
});

async function seedFullProject() {
  const user = await User.create({ uid: 'owner-uid', email: 'o@t.com', displayName: 'Owner' });
  const project = await Project.create({
    name: 'TestProject', description: 'desc',
    ownerId: user._id, ownerUid: 'owner-uid', team: [],
  });
  const step1 = await Step.create({ title: 'Step 1', order: 0, projectId: project._id });
  const step2 = await Step.create({ title: 'Step 2', order: 1, projectId: project._id });
  const task1 = await ProjectTask.create({ title: 'Task A', status: 'Ready', stepId: step1._id, commitCode: '1111111111' });
  const task2 = await ProjectTask.create({ title: 'Task B', status: 'Done', stepId: step2._id, commitCode: '2222222222' });
  return { project, step1, step2, task1, task2, user };
}

// P1: getProjectWithSteps returns nested structure
test('P1: getProjectWithSteps returns nested project > steps > tasks', async () => {
  const { project, step1, step2, task1, task2 } = await seedFullProject();
  const result = await getProjectWithSteps(project._id);
  expect(result).toBeTruthy();
  expect(result.id).toBe(String(project._id));
  expect(result.steps).toHaveLength(2);
  expect(result.steps[0].title).toBe('Step 1');
  expect(result.steps[0].tasks).toHaveLength(1);
  expect(result.steps[0].tasks[0].title).toBe('Task A');
  expect(result.steps[1].title).toBe('Step 2');
  expect(result.steps[1].tasks[0].title).toBe('Task B');
  expect(result.owner).toBeTruthy();
  expect(result.owner.displayName).toBe('Owner');
});

// P2: getProjectsWithSteps batch fetches efficiently
test('P2: getProjectsWithSteps returns all projects with nested steps and tasks', async () => {
  await seedFullProject();
  const user2 = await User.create({ uid: 'owner2', email: 'o2@t.com', displayName: 'Owner2' });
  const proj2 = await Project.create({ name: 'Proj2', ownerId: user2._id, ownerUid: 'owner2' });
  await Step.create({ title: 'S1', order: 0, projectId: proj2._id });

  const results = await getProjectsWithSteps({});
  expect(results).toHaveLength(2);
  const names = results.map(p => p.name).sort();
  expect(names).toEqual(['Proj2', 'TestProject']);
  const tp = results.find(p => p.name === 'TestProject');
  expect(tp.steps).toHaveLength(2);
  expect(tp.steps[0].tasks).toHaveLength(1);
});

// P3: getProjectsWithSteps empty result
test('P3: getProjectsWithSteps returns empty array when no projects match', async () => {
  const results = await getProjectsWithSteps({ name: 'Nonexistent' });
  expect(results).toEqual([]);
});
