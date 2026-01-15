const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const Project = require('../models/Project');
const { getInstallationAccessToken } = require('../utils/githubAppAuth');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Middleware to verify GitHub Webhook Signature
 */
const verifySignature = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'];
    if (!WEBHOOK_SECRET) {
        console.warn("GITHUB_WEBHOOK_SECRET not set. Skipping verification.");
        return next();
    }
    if (!signature) {
        return res.status(401).json({ error: 'No signature found' });
    }
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        next();
    } else {
        return res.status(401).json({ error: 'Invalid signature' });
    }
};

router.post('/', verifySignature, async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'ping') return res.json({ message: 'Pong' });

    if (event === 'push') {
        const { commits, repository, installation } = payload;
        const installationId = installation?.id;

        console.log(`Received push event for ${repository.full_name} with ${commits.length} commits.`);

        try {
            // Get Installation Token for Bot Comments
            let installToken = null;
            try {
                if (installationId) {
                    installToken = await getInstallationAccessToken(installationId);
                }
            } catch (err) {
                console.error("Failed to get installation token:", err.message);
            }

            for (const commit of commits) {
                const message = commit.message;
                // Regex to find [ZYNC-COMPLETE #TaskID]
                // Case insensitive, matching # followed by alphanumeric ID
                const match = message.match(/\[ZYNC-COMPLETE #([a-zA-Z0-9_-]+)\]/i);

                if (match) {
                    const taskId = match[1];
                    console.log(`Found completion tag for Task ID: ${taskId}`);

                    // 1. Find and Update Task in Database
                    // We need to find which project/step contains this task.
                    // Assuming 'id' in TaskSchema is unique enough or we search all.
                    const project = await Project.findOne({ "steps.tasks.id": taskId });

                    if (project) {
                        let taskFound = false;
                        let taskTitle = "";

                        // Locate and update the exact task object
                        project.steps.forEach(step => {
                            step.tasks.forEach(task => {
                                if (task.id === taskId) {
                                    task.status = 'Completed';
                                    task.commitInfo = {
                                        message: commit.message,
                                        url: commit.url,
                                        author: commit.author.name,
                                        timestamp: commit.timestamp
                                    };
                                    taskFound = true;
                                    taskTitle = task.title;
                                }
                            });
                        });

                        if (taskFound) {
                            await project.save();
                            console.log(`Task ${taskId} marked as completed in DB.`);

                            // 2. Post Bot Comment to GitHub
                            if (installToken) {
                                try {
                                    await axios.post(
                                        `https://api.github.com/repos/${repository.full_name}/commits/${commit.id}/comments`,
                                        {
                                            body: `✅ **Zync Bot**: Task **#${taskId}** ("${taskTitle}") has been automatically marked as completed in your workspace! 🚀`
                                        },
                                        {
                                            headers: {
                                                'Authorization': `token ${installToken}`,
                                                'Accept': 'application/vnd.github.v3+json'
                                            }
                                        }
                                    );
                                    console.log(`Posted comment on commit ${commit.id}`);
                                } catch (commentErr) {
                                    console.error("Failed to post GitHub comment:", commentErr.message);
                                }
                            }

                            // Emit socket event for real-time update
                            const io = req.app.get('io');
                            if (io) {
                                io.emit('taskUpdated', {
                                    taskId: taskId,
                                    projectId: project._id,
                                    status: 'Completed',
                                    message: `Task completed via commit`
                                });
                            }
                        }
                    } else {
                        console.log(`Task ${taskId} not found in any project.`);
                    }
                }
            }
        } catch (error) {
            console.error("Error processing push webhook:", error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    res.json({ success: true });
});

module.exports = router;
