const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { analyzeCommitWithGroq } = require('../utils/groqService');
// Prisma Client with Driver Adapter
const prisma = require('../lib/prisma');

// Initialize Prisma Client
// Ensure you have generated the client: npx prisma generate

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
  // req.rawBody must be enabled in express.json() config
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    next();
  } else {
    return res.status(401).json({ error: 'Invalid signature' });
  }
};

router.post('/', verifySignature, async (req, res) => {
  const event = req.headers['x-github-event'];

  if (event === 'ping') {
    return res.json({ message: 'Pong' });
  }

  if (event === 'push') {
    const { repository, commits } = req.body;
    
    // Extract Repository Info
    const githubRepoId = repository.id.toString();
    const repoName = repository.full_name;

    console.log(`Received push for repo ${repoName} (${githubRepoId}) with ${commits.length} commits.`);

    // Upsert Repository in Database
    try {
        await prisma.repository.upsert({
            where: { github_repo_id: githubRepoId },
            update: { repo_name: repoName },
            create: {
                github_repo_id: githubRepoId,
                repo_name: repoName
            }
        });
    } catch (dbError) {
        console.error("Failed to upsert repository:", dbError);
    }

    // Process Commits
    for (const commit of commits) {
        const { message } = commit;
        console.log(`Analyzing commit: "${message}"`);

        // Use Groq to analyze commit
        const analysis = await analyzeCommitWithGroq(message);

        if (analysis && analysis.id && analysis.completed) {
            console.log(`Groq identified Task ID: ${analysis.id} as completed.`);
            
            try {
                // Update Task in Database using Prisma
                const updatedTask = await prisma.task.update({
                    where: { display_id: analysis.id },
                    data: {
                        status: 'Completed'
                    }
                });
                console.log(`Updated Task ${updatedTask.display_id} to status 'Completed'`);

                // Real-time update via Socket.io
                const io = req.app.get('io');
                if (io) {
                    io.emit('taskUpdated', { 
                        taskId: updatedTask.display_id, 
                        status: 'Completed',
                        commitMessage: message 
                    });
                }

            } catch (error) {
                if (error.code === 'P2025') {
                    console.log(`Task ${analysis.id} not found in database.`);
                } else {
                    console.error(`Failed to update task ${analysis.id}:`, error);
                }
            }
        }
    }
  }

  res.json({ success: true });
});

module.exports = router;
