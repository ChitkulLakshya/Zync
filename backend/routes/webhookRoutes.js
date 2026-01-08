const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const Groq = require('groq-sdk');
const User = require('../models/User');
// Removed: const { getUserApp } = require('../utils/githubService'); 
// (We might use getUserApp if we need to verify signature using user's secret, 
// but standard webhooks usually share a secret or we skip verification for MVP dynamic)

router.post('/github', async (req, res) => {
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
          // Proceed cautiously or return? 
          // For public hooks on public repos, installation might be missing, but for App webhooks it is there.
          // We will try to process matching repoIds anyway, but we can't key off user without installationId.
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

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      for (const commit of commits) {
        const { message } = commit;

        // Auto-Tick Logic with Groq
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a task manager. Extract the Task ID (e.g., TASK-01) from this commit message and determine if it indicates completion. Return JSON: {\"taskId\": \"string\", \"completed\": boolean}. If no task ID found, return {\"taskId\": null, \"completed\": false}."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                model: "llama3-8b-8192",
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content;
            const analysis = JSON.parse(content || '{}');

            if (analysis.taskId && analysis.completed) {
                console.log(`Task identified: ${analysis.taskId}, Completed: ${analysis.completed}`);

                // Find task where displayId matches AND repoIds contains current repoId
                const task = await prisma.task.findFirst({
                    where: { 
                        displayId: analysis.taskId,
                        repoIds: { has: repoId }
                    }
                });

                if (task) {
                    await prisma.task.update({
                        where: { id: task.id }, 
                        data: {
                            status: 'completed',
                            updatedAt: new Date()
                        }
                    });
                    console.log(`Updated Task ${analysis.taskId} to completed.`);
                } else {
                    console.warn(`Task ${analysis.taskId} not linked to repo ${repoId}.`);
                }
            }
        } catch (groqErr) {
            console.error("Groq Analysis Error:", groqErr);
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
