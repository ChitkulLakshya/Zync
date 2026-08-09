/**
 * @fileoverview webhookRoutes.js
 * @module webhookRoutes
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const verifyGithub = require('../middleware/verifyGithub');
const { analyzeCommit } = require('../utils/commitAnalysisService');
const ProjectTask = require('../models/ProjectTask');
const Project = require('../models/Project');
const Step = require('../models/Step');
const Session = require('../models/Session');
const { normalizeDoc } = require('../utils/normalize');
const { getProjectWithSteps } = require('../utils/projectHelper');

const normalizeTaskStatus = (value) => String(value || '').trim().toLowerCase();
const COMMIT_CODE_REGEX = /\b\d{10}\b/g;

const extractCommitCodes = (message) => {
  const matches = String(message || '').match(COMMIT_CODE_REGEX);
  return [...new Set(matches || [])];
};

const computeStatusFromCommit = ({ fromStatus, hasOwnerGeneratedCommitCode }) => {
  const normalizedFrom = normalizeTaskStatus(fromStatus);

  if (hasOwnerGeneratedCommitCode) {
    return 'Done';
  }

  if (normalizedFrom === 'done' || normalizedFrom === 'pr raised') {
    return null;
  }

  return 'In Progress';
};

async function logTaskProgressActivity({ recipients, taskTitle, projectName, actorName, projectId, taskId, fromStatus, toStatus }) {
  const uniqueRecipients = [...new Set((recipients || []).filter(Boolean))];
  if (uniqueRecipients.length === 0) return;

  const now = new Date();
  await Session.insertMany(
    uniqueRecipients.map((uid) => ({
      userId: uid,
      startTime: now,
      endTime: now,
      duration: 0,
      activeDuration: 0,
      date: now.toISOString().split('T')[0],
      eventType: 'task-progressed',
      title: `Task moved to ${toStatus}: ${taskTitle}`,
      source: projectName || 'Tasks',
      actorName: actorName || 'GitHub',
      metadata: {
        projectId: String(projectId || ''),
        taskId: String(taskId || ''),
        projectName: projectName || null,
        fromStatus: fromStatus || null,
        toStatus: toStatus || null,
        trigger: 'commit',
      },
    }))
  );
}


router.post('/github', verifyGithub, async (req, res) => {
  try {
    const event = req.headers['x-github-event'];

    if (event !== 'push') {
      return res.status(200).json({ message: `Ignoring event: ${event}` });
    }

    const { commits, repository, sender } = req.body;

    if (!commits || commits.length === 0) {
      return res.status(200).json({ message: 'No commits to process' });
    }

    const results = [];

    for (const commit of commits) {
      const message = commit.message;
      const analysis = await analyzeCommit(message);
      const commitCodesInMessage = extractCommitCodes(message);

      let task = null;
      let displayId = analysis.id || null;

      if (analysis.found && analysis.id) {
        displayId = analysis.id;
        task = await ProjectTask.findOne({ displayId }).lean();
        if (!task) {
          const taskByDisplayRegex = await ProjectTask.findOne({
            displayId: { $regex: `^${String(displayId).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: 'i' }
          }).lean();
          task = taskByDisplayRegex || null;
        }
      }

      if (!task && commitCodesInMessage.length > 0) {
        task = await ProjectTask.findOne({ commitCode: { $in: commitCodesInMessage } }).lean();
      }

      if (!task) {
        results.push({ commit: commit.id, status: 'no_task_found' });
        continue;
      }


      const fromStatus = task.status;
      const hasOwnerGeneratedCommitCode = Boolean(task.commitCode && commitCodesInMessage.includes(String(task.commitCode)));
      const updateData = {
        commitMessage: message,
        commitUrl: commit.url,
        commitAuthor: sender?.login || commit.author?.name || 'Unknown',
        commitTimestamp: commit.timestamp || new Date().toISOString(),
      };
      const nextStatus = computeStatusFromCommit({
        fromStatus,
        hasOwnerGeneratedCommitCode,
      });
      if (nextStatus) {
        updateData.status = nextStatus;
      }

      await ProjectTask.updateOne({ _id: task._id }, { $set: updateData });


      const step = await Step.findById(task.stepId).lean();
      if (step) {
        const project = await Project.findById(step.projectId).lean();
        if (updateData.status && updateData.status !== fromStatus) {
          await logTaskProgressActivity({
            recipients: [project?.ownerUid, ...(project?.team || []), task.assignedTo],
            taskTitle: task.title,
            projectName: project?.name,
            actorName: sender?.login || commit.author?.name || 'GitHub',
            projectId: step.projectId,
            taskId: task._id,
            fromStatus,
            toStatus: updateData.status,
          });
        }

        const projectData = await getProjectWithSteps(step.projectId);
        const io = req.app.get('io');
        if (io) {
          const updatedTask = normalizeDoc({ ...task, ...updateData });
          io.emit('taskUpdated', {
            task: updatedTask,
            taskId: String(task._id),
            status: updateData.status || task.status,
            projectId: step.projectId.toString(),
          });
          io.emit('projectUpdate', { projectId: projectData.id, project: projectData });
        }
      }

      results.push({
        commit: commit.id,
        displayId: task.displayId || displayId || null,
        status: 'updated',
        action: hasOwnerGeneratedCommitCode ? 'Complete' : 'In Progress',
      });
    }

    res.json({ message: 'Webhook processed', results });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ message: 'Webhook processing failed', error: error.message });
  }
});

module.exports = router;
