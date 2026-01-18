const express = require('express');
const router = express.Router();

const Groq = require('groq-sdk');
const User = require('../models/User');
// Removed: const { getUserApp } = require('../utils/githubService'); 
// (We might use getUserApp if we need to verify signature using user's secret, 
// but standard webhooks usually share a secret or we skip verification for MVP dynamic)

const verifyGithub = require('../middleware/verifyGithub');

// ... (previous imports)
const Project = require('../models/Project'); // Correct Mongoose Model
const { analyzeCommit } = require('../utils/commitAnalysisService');

router.post('/github', verifyGithub, async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        console.log(`Received GitHub Header Event: ${event}`);

        if (event === 'ping') {
            return res.json({ message: 'Pong' });
        }

        if (event === 'push') {
            const payload = req.body;
            const commits = payload.commits || [];
            console.log(`Processing push event with ${commits.length} commits.`);

            const io = req.app.get('io'); // Get Socket.IO instance

            for (const commit of commits) {
                const message = commit.message;
                let taskId = null;
                let action = null;

                // 1. Check for Explicit ZYNC Tag [ZYNC-COMPLETE #ID]
                const explicitMatch = message.match(/\[ZYNC-COMPLETE #([a-zA-Z0-9_-]+)\]/i);
                if (explicitMatch) {
                    taskId = explicitMatch[1];
                    action = 'Complete';
                    console.log(`Found Explicit Tag: ${taskId}`);
                } else {
                    // 2. Fallback to AI Analysis
                    const analysis = await analyzeCommit(message);
                    if (analysis.found && analysis.id && analysis.action === 'Complete') {
                        // Removing prefix if present to match DB ID
                        taskId = analysis.id.replace('TASK-', '');
                        action = 'Complete';
                        console.log(`AI identified task: ${taskId}`);
                    }
                }

                if (taskId && action === 'Complete') {
                    // Search for project containing this task
                    // We search in steps.tasks.id OR steps.tasks._id
                    const project = await Project.findOne({
                        $or: [
                            { "steps.tasks.id": taskId },
                            { "steps.tasks._id": taskId } // Support both string ID and ObjectId
                        ]
                    });

                    if (project) {
                        let taskUpdated = false;
                        project.steps.forEach(step => {
                            step.tasks.forEach(task => {
                                if (task.id === taskId || (task._id && task._id.toString() === taskId)) {
                                    task.status = 'Completed';
                                    task.commitInfo = {
                                        message: commit.message,
                                        url: commit.url,
                                        author: commit.author.name,
                                        timestamp: commit.timestamp
                                    };
                                    taskUpdated = true;
                                    console.log(`Marking task ${task.title} as Completed`);
                                }
                            });
                        });

                        if (taskUpdated) {
                            await project.save();
                            console.log(`SUCCESS: Task ${taskId} updated in DB.`);

                            // Emit Socket Event
                            if (io) {
                                io.emit('taskUpdated', {
                                    taskId: taskId,
                                    projectId: project._id,
                                    status: 'Completed',
                                    message: `Task completed via commit: ${message}`
                                });
                                console.log('Socket event emitted: taskUpdated');
                            }
                        }
                    } else {
                        console.warn(`Task ID ${taskId} not found in any project.`);
                    }
                }
            }
            return res.status(200).json({ message: 'Processed' });
        }
        res.status(200).json({ message: 'Ignored' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
