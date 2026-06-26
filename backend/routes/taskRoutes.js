/**
 * @fileoverview taskRoutes.js
 * @module taskRoutes
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const Session = require('../models/Session');
const { normalizeDocs } = require('../utils/normalize');
const cache = require('../utils/cache');
const { sendZyncEmail } = require('../services/mailer');
const { getTaskAssignmentEmailHtml } = require('../utils/emailTemplates');

const buildOctokitForInstallation = async (installationId) => {
  const appId = process.env.GITHUB_APP_ID;
  let privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('Server configuration error: Missing GitHub credentials');
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const { App } = await import('octokit');
  const app = new App({ appId, privateKey });
  return app.getInstallationOctokit(Number.parseInt(installationId, 10));
};

const getRepoCollaboratorLogins = async (octokit, owner, repo) => {
  const response = await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
    owner,
    repo,
    per_page: 100,
    affiliation: 'all',
  });

  return new Set((response.data || []).map((collab) => String(collab.login || '').toLowerCase()));
};

const generateUniqueCommitCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const found = await ProjectTask.findOne({ commitCode: code }).select('_id').lean();
    exists = !!found;
  }

  return code;
};

router.post('/assign', verifyToken, async (req, res) => {
  try {
    const { projectId, taskName, description, assignedUserId, assignedUserIds } = req.body || {};
    const requesterUid = req.user?.uid;

    if (!projectId || !taskName?.trim()) {
      return res.status(400).json({ message: 'projectId and taskName are required' });
    }

    const normalizedArray = Array.isArray(assignedUserIds)
      ? [...new Set(assignedUserIds.filter(Boolean))]
      : [];

    const resolvedAssigneeId = assignedUserId || normalizedArray[0] || null;

    if (!resolvedAssigneeId) {
      return res.status(400).json({ message: 'assignedUserId is required' });
    }

    if (normalizedArray.length > 1) {
      return res.status(400).json({ message: 'Only one assignee is allowed' });
    }

    if (resolvedAssigneeId === requesterUid) {
      return res.status(400).json({ message: 'You cannot assign a task to yourself' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.ownerUid !== requesterUid) {
      return res.status(403).json({ message: 'Only the repository owner can assign tasks' });
    }

    if (!project.githubRepoOwner || !project.githubRepoName) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    const requester = await User.findOne({ uid: requesterUid }).lean();
    if (!requester?.githubIntegration?.installationId) {
      return res.status(400).json({ message: 'GitHub App installation is missing for this account' });
    }

    const normalizedAssigneeIds = [resolvedAssigneeId];

    const teams = await Team.find({ members: requesterUid }).select('members').lean();
    const sameTeamUids = new Set(teams.flatMap((team) => team.members || []));

    const assignees = await User.find({ uid: { $in: normalizedAssigneeIds } })
      .select('uid displayName email githubIntegration.username')
      .lean();

    const assigneeMap = new Map(assignees.map((assignee) => [assignee.uid, assignee]));

    const hasInvalidAssignee = normalizedAssigneeIds.some((uid) => {
      const assignee = assigneeMap.get(uid);
      return !assignee || !sameTeamUids.has(uid) || !assignee?.githubIntegration?.username;
    });

    if (hasInvalidAssignee) {
      return res.status(400).json({
        message: 'This user is not connected to ZYNC GitHub or is not in your team.'
      });
    }

    let step = await Step.findOne({ projectId: project._id })
      .sort({ order: 1 })
      .lean();

    if (!step) {
      const createdStep = await Step.create({
        title: 'Backlog',
        description: 'Auto-generated backlog step',
        type: 'Other',
        order: 0,
        projectId: project._id,
      });
      step = createdStep.toObject();
    }

    const octokit = await buildOctokitForInstallation(requester.githubIntegration.installationId);
    const collaboratorLogins = await getRepoCollaboratorLogins(octokit, project.githubRepoOwner, project.githubRepoName);

    const assigneesNotCollaborators = normalizedAssigneeIds.filter((uid) => {
      const assignee = assigneeMap.get(uid);
      const githubUsername = String(assignee?.githubIntegration?.username || '').toLowerCase();
      return !collaboratorLogins.has(githubUsername);
    });

    if (assigneesNotCollaborators.length > 0) {
      return res.status(400).json({ message: 'Selected assignee is not a collaborator on this repository.' });
    }

    if (!project.team?.includes(resolvedAssigneeId) && resolvedAssigneeId !== project.ownerUid) {
      await Project.updateOne(
        { _id: project._id },
        { $addToSet: { team: resolvedAssigneeId } }
      );
    }

    const createdTasksPayload = [];
    for (const uid of normalizedAssigneeIds) {
      const assignee = assigneeMap.get(uid);
      const commitCode = await generateUniqueCommitCode();

      createdTasksPayload.push({
        title: taskName.trim(),
        description: description?.trim() || null,
        status: 'Pending',
        assignedTo: uid,
        assignedUserIds: normalizedAssigneeIds,
        assignedToName: assignee?.displayName || assignee?.email || uid,
        assignedBy: requesterUid,
        createdBy: requesterUid,
        commitCode,
        stepId: step._id,
      });
    }

    const createdTasks = await ProjectTask.insertMany(createdTasksPayload);


    await Promise.all(
      normalizedAssigneeIds.map(async (uid) => {
        const assignee = assigneeMap.get(uid);
        if (!assignee?.email) {
          return;
        }

        const subject = `New Task Assigned: ${taskName.trim()}`;
        const text = `You have been assigned a new task in project "${project.name}".\n\nStep: ${step.title}\nTask: ${taskName.trim()}\nDescription: ${description?.trim() || 'No description'}\nAssigned By: ${requester?.displayName || requester?.email || requesterUid}`;
        const html = getTaskAssignmentEmailHtml({
          projectName: project.name || 'Project',
          lines: [
            { label: 'Step', value: step.title || 'Backlog' },
            { label: 'Task', value: taskName.trim() },
            { label: 'Description', value: description?.trim() || 'No description' },
            { label: 'Assigned By', value: requester?.displayName || requester?.email || requesterUid },
          ],
        });

        try {
          await sendZyncEmail(assignee.email, subject, html, text);
        } catch (emailError) {
          console.error(`Failed to send task assignment email to ${assignee.email}:`, emailError);
        }
      })
    );

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    await Session.insertMany(
      normalizedAssigneeIds.map((uid) => {
        const assignee = assigneeMap.get(uid);
        return {
          userId: uid,
          startTime: now,
          endTime: now,
          duration: 0,
          activeDuration: 0,
          date: today,
          eventType: 'task-assigned',
          title: `New task assigned: ${taskName.trim()}`,
          source: project.name || 'Workspace',
          actorName: requester?.displayName || requester?.email || requesterUid,
          metadata: {
            projectId: String(project._id),
            projectName: project.name || null,
            taskIds: createdTasks.map((task) => String(task._id)),
            assignedToName: assignee?.displayName || assignee?.email || uid,
          },
        };
      })
    );

    await cache.invalidate(`projects:${requesterUid}`, `projects:${resolvedAssigneeId}`);


    const taskIO = req.app.get('taskIO');
    if (taskIO) {
      const normalizedTasks = normalizeDocs(createdTasks.map(t => t.toObject()));
      taskIO.emitToProject(projectId, 'task-created', {
        projectId,
        stepId: String(step._id),
        tasks: normalizedTasks,
        actor: requesterUid,
      });
      for (const uid of normalizedAssigneeIds) {
        taskIO.emitToUser(uid, 'task-assigned', {
          projectId,
          tasks: normalizedTasks,
          projectName: project.name || null,
        });
      }
    }

    return res.status(200).json({
      message: 'Task created successfully.',
      commitCodes: createdTasks.map((task) => task.commitCode),
      tasks: normalizeDocs(createdTasks.map((task) => task.toObject())),
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    return res.status(500).json({ message: 'Failed to assign task', error: error.message });
  }
});

module.exports = router;
