const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { filterCommitMessage } = require('../utils/groqService');

// Post-MVP: Implement strict HMAC signature verification using 'x-hub-signature-256'
// This requires raw body access which might conflict with global express.json() if not configured carefully.
// const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

router.post('/github', async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        
        if (event === 'ping') {
            return res.json({ message: 'Pong' });
        }

        if (event === 'push') {
            const payload = req.body;
            const commits = payload.commits || [];

            console.log(`Received push event with ${commits.length} commits`);

            for (const commit of commits) {
                const { message, url, timestamp, author } = commit;
                
                // 1. Regex Extraction (Fast & Deterministic)
                const taskMatch = message.match(/\[TASK-([a-f0-9]{24})\]/i);
                
                if (taskMatch && taskMatch[1]) {
                    const taskId = taskMatch[1];
                    console.log(`Found reference to Task ID: ${taskId}`);
                    
                    const project = await Project.findOne({ "steps.tasks._id": taskId });
                    
                    if (project) {
                        let updated = false;
                        
                        for (const step of project.steps) {
                            const task = step.tasks.find(t => t._id.toString() === taskId);
                            
                            if (task) {
                                // 2. Groq AI Analysis (Intelligent Status)
                                let newStatus = 'In Progress'; // Default fallback
                                
                                const analysis = await filterCommitMessage(message, task.title, task.description);
                                
                                if (analysis && analysis.status) {
                                  // Map AI status to Schema Enum
                                  if (analysis.status === 'Done') newStatus = 'Completed';
                                  else if (analysis.status === 'In Progress') newStatus = 'In Progress';
                                  console.log(`Groq AI determined status: ${newStatus}`);
                                } else {
                                  // Fallback logic if AI fails or no key
                                  if (message.toLowerCase().includes('fixed') || message.toLowerCase().includes('completed')) {
                                      newStatus = 'Completed';
                                  }
                                }

                                // Update if status is different or advancing
                                // Only update schema-valid statuses
                                const validStatuses = ['In Progress', 'Completed', 'Done'];
                                if (validStatuses.includes(newStatus)) {
                                    task.status = newStatus === 'Completed' ? 'Done' : newStatus; // Prefer 'Done' for Kanban consistency
                                    task.commitInfo = {
                                        message,
                                        url,
                                        author: author.name || author.email,
                                        timestamp
                                    };
                                    updated = true;
                                    console.log(`Updated task ${taskId} to ${task.status}`);
                                }
                                break;
                            }
                        }
                        
                        if (updated) {
                            await project.save();
                        }
                    } else {
                        console.log(`No project found for Task ID: ${taskId}`);
                    }
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
