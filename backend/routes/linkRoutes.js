const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const Repository = require('../models/Repository');
const { normalizeDoc } = require('../utils/normalize');
const { getProjectWithSteps } = require('../utils/projectHelper');


router.post('/link-repo', authMiddleware, async (req, res) => {
  try {
    const { projectId, githubRepoId } = req.body;
    const uid = req.user.uid;

    if (!projectId || !githubRepoId) {
      return res.status(400).json({ message: 'projectId and githubRepoId are required' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== uid && !project.team.includes(uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }


    let repo = await Repository.findOne({ githubRepoId }).lean();
    if (!repo) {
      repo = (await Repository.create({ githubRepoId, repoName: githubRepoId })).toObject();
    }


    const currentIds = project.githubRepoIds || [];
    if (!currentIds.includes(githubRepoId)) {
      const newIds = [...currentIds, githubRepoId];
      await Project.updateOne({ _id: projectId }, { $set: { githubRepoIds: newIds } });
    }

    const updatedProject = await getProjectWithSteps(projectId);
    res.json(updatedProject);
  } catch (error) {
    console.error('Error linking repo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/unlink-repo', authMiddleware, async (req, res) => {
  try {
    const { projectId, githubRepoId } = req.body;
    const uid = req.user.uid;

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== uid && !project.team.includes(uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const currentIds = project.githubRepoIds || [];
    const newIds = currentIds.filter(id => id !== githubRepoId);
    await Project.updateOne({ _id: projectId }, { $set: { githubRepoIds: newIds } });

    const updatedProject = await getProjectWithSteps(projectId);
    res.json(updatedProject);
  } catch (error) {
    console.error('Error unlinking repo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
