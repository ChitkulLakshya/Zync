const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const Groq = require('groq-sdk');
const User = require('../models/User');
// Removed: const { getUserApp } = require('../utils/githubService'); 
// (We might use getUserApp if we need to verify signature using user's secret, 
// but standard webhooks usually share a secret or we skip verification for MVP dynamic)

const verifyGithub = require('../middleware/verifyGithub');

router.post('/github', verifyGithub, async (req, res) => {
    try {
        const event = req.headers['x-github-event'];

        if (event === 'ping') {
            return res.json({ message: 'Pong' });
        }

        if (event === 'push') {
            const payload = req.body;
            const installationId = payload.installation?.id?.toString();
            const repoId = payload.repository.id.toString(); // githubRepoId
            const commits = payload.commits || [];

            if (!installationId) {
                console.warn('Webhook received without installation ID');
            } else {
                console.log('Verified Webhook from GitHub for Installation:', installationId);
            }

            console.log(`Received push event from repo ${repoId} (Install: ${installationId}) with ${commits.length} commits`);

            // 1. Find the User associated with this installation to know WHO is "active"
            const user = await User.findOne({ 'integrations.github.installationId': installationId });

            if (user) {
                console.log(`Webhook linked to user: ${user.uid}`);
                // Potential TODO: Use user's specific settings or verify context
            } else {
                console.warn(`No user found for installation ID: ${installationId}`);
                // Logic can still proceed if we just match Tasks by repoId, 
                // but strictly speaking, in multi-tenant SaaS, you might want to stop here.
                // For now, we continue to update tasks based on repoId match.
            }

            // Process Commits
            for (const commit of commits) {
                const { message } = commit;

                // Auto-Tick Logic with Gemini (via commitAnalysisService)
                const { analyzeCommit } = require('../utils/commitAnalysisService');

                try {
                    const analysis = await analyzeCommit(message);

                    if (analysis.found && analysis.id && analysis.action === 'Complete') {
                        console.log(`Task identified: ${analysis.id}, Action: ${analysis.action}`);

                        // Find task where displayId matches AND repoIds contains current repoId
                        const task = await prisma.task.findFirst({
                            where: {
                                displayId: analysis.id,
                                repoIds: { has: repoId }
                            }
                        });

                        if (task) {
                            await prisma.task.update({
                                where: { id: task.id },
                                data: {
                                    status: 'Completed',
                                    updatedAt: new Date()
                                }
                            });
                            console.log(`Updated Task ${analysis.id} to completed.`);
                        } else {
                            console.warn(`Task ${analysis.id} not linked to repo ${repoId}.`);
                        }
                    }
                } catch (err) {
                    console.error("Commit Analysis Error:", err);
                }
            }

            return res.status(200).json({ message: 'Webhook processed' });
        }

        res.status(200).json({ message: 'Ignored event' });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
