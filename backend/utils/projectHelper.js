const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const User = require('../models/User');
const { normalizeDoc, normalizeDocs } = require('./normalize');

const attachOwnerData = async (projects) => {
  if (!projects || projects.length === 0) return projects;

  const ownerUids = [
    ...new Set(projects.map((p) => p.ownerUid).filter(Boolean)),
  ];
  if (ownerUids.length === 0) return projects;

  const owners = await User.find({ uid: { $in: ownerUids } })
    .select('uid displayName photoURL')
    .lean();

  const ownerByUid = new Map(
    owners.map((owner) => [
      owner.uid,
      {
        uid: owner.uid,
        displayName: owner.displayName || 'Unknown',
        photoURL: owner.photoURL || null,
      },
    ])
  );

  return projects.map((project) => ({
    ...project,
    owner: ownerByUid.get(project.ownerUid) || null,
  }));
};

/**
 * Fetch a single project with its steps (ordered) and their tasks.
 * Returns a plain object with `id` instead of `_id`.
 */
async function getProjectWithSteps(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) return null;

  const steps = await Step.find({ projectId: project._id })
    .sort({ order: 1 })
    .lean();

  const stepIds = steps.map((s) => s._id);
  const tasks =
    stepIds.length > 0
      ? await ProjectTask.find({ stepId: { $in: stepIds } }).lean()
      : [];

  const tasksByStep = {};
  tasks.forEach((t) => {
    const key = t.stepId.toString();
    if (!tasksByStep[key]) tasksByStep[key] = [];
    tasksByStep[key].push(normalizeDoc(t));
  });

  const result = normalizeDoc(project);
  result.steps = steps.map((s) => {
    const ns = normalizeDoc(s);
    ns.tasks = tasksByStep[s._id.toString()] || [];
    return ns;
  });

  const [withOwner] = await attachOwnerData([result]);
  return withOwner;
}

/**
 * Fetch multiple projects (by filter) with steps and tasks.
 */
async function getProjectsWithSteps(filter, sort = { createdAt: -1 }) {
  const projects = await Project.find(filter).sort(sort).lean();
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p._id);

  const steps = await Step.find({ projectId: { $in: projectIds } })
    .sort({ order: 1 })
    .lean();

  const stepIds = steps.map((s) => s._id);
  const tasks =
    stepIds.length > 0
      ? await ProjectTask.find({ stepId: { $in: stepIds } }).lean()
      : [];

  // Group tasks by stepId
  const tasksByStep = {};
  tasks.forEach((t) => {
    const key = t.stepId.toString();
    if (!tasksByStep[key]) tasksByStep[key] = [];
    tasksByStep[key].push(normalizeDoc(t));
  });

  // Group steps by projectId
  const stepsByProject = {};
  steps.forEach((s) => {
    const key = s.projectId.toString();
    if (!stepsByProject[key]) stepsByProject[key] = [];
    const ns = normalizeDoc(s);
    ns.tasks = tasksByStep[s._id.toString()] || [];
    stepsByProject[key].push(ns);
  });

  const normalizedProjects = projects.map((p) => {
    const np = normalizeDoc(p);
    np.steps = stepsByProject[p._id.toString()] || [];
    return np;
  });

  return attachOwnerData(normalizedProjects);
}

module.exports = { getProjectWithSteps, getProjectsWithSteps };
