const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const Project = require('../models/Project');
const verifyToken = require('../middleware/authMiddleware');

// Link a generic repo to a Project
router.post('/link-repo', verifyToken, async (req, res) => {
  const { projectId, githubRepoId } = req.body;

  if (!projectId || !githubRepoId) {
    return res.status(400).json({ message: 'Missing projectId or githubRepoId' });
  }

  try {
    // 1. Update Project in MongoDB
    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }

    // Add to array if not present
    if (!project.githubRepoIds) project.githubRepoIds = [];
    if (!project.githubRepoIds.includes(githubRepoId)) {
        project.githubRepoIds.push(githubRepoId);
        await project.save();
    }

    // 2. Update all Tasks in Prisma associated with this project
    // Note: This assumes tasks have projectId set. 
    // If tasks were created without projectId, this step might miss them unless we infer from userId (dangerous)
    // or if we iterate embedded steps in MongoDB and find matching Prisma tasks.
    
    // Simplest approach: Update by projectId
    await prisma.task.updateMany({
        where: { projectId: projectId },
        data: {
            repoIds: {
                push: githubRepoId 
            }
        }
    });

    res.json({ message: 'Repository linked successfully', project });

  } catch (error) {
    console.error('Link Repo Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
