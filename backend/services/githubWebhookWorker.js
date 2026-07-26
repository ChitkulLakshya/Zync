/**
 * @fileoverview githubWebhookWorker.js
 * @module githubWebhookWorker
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
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Processes incoming GitHub webhooks (specifically push events) to update project states, extract commit metadata, and optionally analyze commit intent using AI.
 * Why: Decoupling webhook processing from the raw endpoint logic allows us to handle large commit payloads, rate limit gracefully, and analyze architecture impact asynchronously without blocking GitHub's delivery.
 */
// WHAT: Import Project model. WHY: Query and update projects.
const Project = require('../models/Project');
// WHAT: Import User model. WHY: Query user for webhook updates.
const User = require('../models/User');
// WHAT: Import cache utility. WHY: Clear caches on GitHub changes.
const cache = require('../utils/cache');
// WHAT: Import commit analysis. WHY: Run AI analysis on commits.
const { analyzeCommit } = require('../utils/commitAnalysisService');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const {
  DELIVERY_CATCHUP_BATCH_SIZE,
  DELIVERY_CATCHUP_MAX_BATCHES,
} = require('../config/freeTierLimits');

// WHAT: Determine debug logging. WHY: Allows detailed logs during dev.
const isDebugWebhookEnabled =
  process.env.DEBUG_WEBHOOKS === 'true' || String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug';

// WHAT: Conditional logger. WHY: Wraps console.log for debug mode.
const debugWebhookLog = (...args) => {
  if (!isDebugWebhookEnabled) return;
  console.log(...args);
};

// WHAT: Deduplicate array helper. WHY: Cleans lists of IDs/files.
const toUniqueStrings = (values) =>
  [...new Set((values || []).map((v) => String(v || '').trim()).filter(Boolean))];

// WHAT: Aggregate changed files and SHAs. WHY: Summarizes push impact.
const aggregateProjectEffectsFromCommits = (commits = []) => {
  // WHAT: Initialize SHAs array. WHY: Accumulate IDs.
  const commitShas = [];
  const changedFiles = [];
  for (const commit of commits) {
    if (commit?.id) commitShas.push(String(commit.id));
    if (Array.isArray(commit?.added)) changedFiles.push(...commit.added);
    if (Array.isArray(commit?.modified)) changedFiles.push(...commit.modified);
    if (Array.isArray(commit?.removed)) changedFiles.push(...commit.removed);
  }
  return {
    commitShas: toUniqueStrings(commitShas),
    changedFiles: toUniqueStrings(changedFiles),
    commitCount: commits.length,
  };
};

// WHAT: Regex for task IDs. WHY: Fallback heuristic to find task links.
const TASK_REF_REGEX = /\b(?:TASK-\d+|ID-\d+|#\d+)\b/i;

// WHAT: Analyze architecture impact. WHY: Understand meaning of changes.
const analyzeArchitectureImpact = async (commits = []) => {
  // WHAT: Extract messages. WHY: We need text for analysis.
  const commitMessages = commits.map((commit) => String(commit?.message || '').trim()).filter(Boolean);
  if (commitMessages.length === 0) {
    return {
      analyzedCommits: 0,
      taskReferenceMentions: 0,
      summary: 'No commit messages available for analysis',
    };
  }


  // WHAT: Check AI API key. WHY: Determines fallback or deep analysis.
  if (!process.env.GROQ_API_KEY) {
    const taskReferenceMentions = commitMessages.filter((message) => TASK_REF_REGEX.test(message)).length;
    return {
      analyzedCommits: commitMessages.length,
      taskReferenceMentions,
      summary:
        taskReferenceMentions > 0
          ? `Detected ${taskReferenceMentions} task reference(s) in commit batch`
          : 'No explicit task references detected in commit batch',
    };
  }

  // WHAT: Limit sample size. WHY: Prevents hitting rate limits.
  const sampleSize = Math.min(3, commitMessages.length);
  let taskReferenceMentions = 0;
  for (const message of commitMessages.slice(0, sampleSize)) {
    const analysis = await analyzeCommit(message);
    if (analysis?.found) {
      taskReferenceMentions += 1;
    }
  }

  return {
    analyzedCommits: sampleSize,
    taskReferenceMentions,
    summary:
      taskReferenceMentions > 0
        ? `AI analysis found ${taskReferenceMentions} task-linked commit(s) in sampled batch`
        : 'AI analysis found no task-linked commits in sampled batch',
  };
};

// WHAT: Find associated project. WHY: Maps webhook to our database.
const findLinkedProject = async (repository) => {
  const repoFullName = repository?.full_name;
  const repoId = repository?.id?.toString();
  let linkedProject = null;

  if (repoFullName) {
    const [repoOwner, repoName] = repoFullName.split('/');
    linkedProject = await Project.findOne({
      githubRepoOwner: repoOwner,
      githubRepoName: repoName,
    }).lean();
  }

  if (!linkedProject && repoId) {
    linkedProject = await Project.findOne({ githubRepoIds: repoId }).lean();
  }

  return linkedProject;
};

// WHAT: Process GitHub webhook payload. WHY: Orchestrates update logic.
const processGithubWebhookJob = async ({ deliveryId, event, payload, getIo }) => {
  // WHAT: Handle installation. WHY: Invalidate repo cache.
  if (event === 'installation' || event === 'installation_repositories') {
    const installationId = payload.installation?.id;
    if (installationId) {
      const user = await User.findOne({ 'githubIntegration.installationId': installationId.toString() }).lean();
      if (user) {
        await cache.invalidate(`gh:user-repos:${user.uid}`);
        debugWebhookLog(`Cleared repo cache for user ${user.uid} upon installation event`);
        return { processed: true, action: 'cleared_repo_cache' };
      }
    }
    return { ignored: true, reason: 'installation_event_user_not_found' };
  }

  // WHAT: Handle repository deletion. WHY: Keeps Zync DB synced with GitHub.
  if (event === 'repository' && payload.action === 'deleted') {
    const { repository } = payload;
    const linkedProject = await findLinkedProject(repository);
    if (linkedProject) {
      const steps = await Step.find({ projectId: linkedProject._id }).select('_id').lean();
      const stepIds = steps.map((s) => s._id);
      
      if (stepIds.length > 0) {
        await ProjectTask.deleteMany({ stepId: { $in: stepIds } });
      }
      await Step.deleteMany({ projectId: linkedProject._id });
      await Project.deleteOne({ _id: linkedProject._id });
      
      const uids = [linkedProject.ownerUid, ...(linkedProject.team || [])];
      const keys = uids.map((uid) => `projects:${uid}`);
      await cache.invalidate(...keys);
      await cache.invalidate(`gh:user-repos:${linkedProject.ownerUid}`);
      
      debugWebhookLog(`Deleted project ${linkedProject._id} because github repo was deleted`);
      return { processed: true, action: 'deleted_project' };
    }
    return { ignored: true, reason: 'repository_deleted_but_not_linked' };
  }

  // WHAT: Handle Pull Requests. WHY: Alerts admin when PR is raised for a task.
  if (event === 'pull_request' && payload.action === 'opened') {
    const { pull_request, repository } = payload;
    const branchName = pull_request.head.ref;
    
    // Find task linked to this branch
    const task = await ProjectTask.findOne({ githubBranchName: branchName });
    if (task) {
      await ProjectTask.updateOne(
        { _id: task._id }, 
        { 
          $set: { 
            status: 'PR Raised', 
            githubPrUrl: pull_request.html_url,
            githubPrNumber: pull_request.number 
          } 
        }
      );
      
      // Optionally alert the admin (owner of the project)
      const linkedProject = await findLinkedProject(repository);
      if (linkedProject) {
        const owner = await User.findOne({ uid: linkedProject.ownerUid }).lean();
        if (owner && owner.email) {
          const { sendZyncEmail } = require('../utils/emailTemplates'); // assuming we can import or have a generic mail sender
          // We can just log it for now if email is complex, or let UI handle it via websocket.
          if (getIo) {
            getIo().to(linkedProject.ownerUid).emit('notification', {
              title: 'PR Raised',
              message: `A PR has been raised for task "${task.title}"`,
              type: 'info'
            });
          }
        }
        await cache.invalidate(`projects:${linkedProject.ownerUid}`);
      }
      
      return { processed: true, action: 'pr_raised_linked_to_task' };
    }
    return { ignored: true, reason: 'pr_not_linked_to_task' };
  }

  // WHAT: Ignore non-push events. WHY: We only track code changes.
  if (event !== 'push') {
    return { ignored: true, reason: `event_${event || 'unknown'}_ignored` };
  }

  // WHAT: Extract payload data. WHY: Isolates needed fields.
  const { commits, repository, sender } = payload || {};
  if (!Array.isArray(commits) || commits.length === 0) {
    return { ignored: true, reason: 'no_commits' };
  }

  // WHAT: Calculate max processable commits. WHY: Protects against huge pushes.
  const maxProcessableCommits = DELIVERY_CATCHUP_BATCH_SIZE * DELIVERY_CATCHUP_MAX_BATCHES;
  const commitsToProcess = commits.slice(0, maxProcessableCommits);
  const droppedCommits = Math.max(0, commits.length - commitsToProcess.length);

  // WHAT: Find linked project. WHY: Determines which document to update.
  const linkedProject = await findLinkedProject(repository);
  if (!linkedProject) {
    return {
      ignored: true,
      reason: 'no_linked_project',
      droppedCommits,
    };
  }

  // WHAT: Auto-progress the task's Kanban status based on branch activity. WHY: The board
  // moves on its own according to real developer activity instead of manual drag/drop.
  const ref = payload.ref; // e.g. refs/heads/task/something
  if (ref && ref.startsWith('refs/heads/task/')) {
    const branchName = ref.replace('refs/heads/', '');
    const task = await ProjectTask.findOne({ githubBranchName: branchName });
    if (task) {
      const currentStatus = String(task.status || '').toLowerCase();
      const isBeforeInProgress = ['ready', 'active'].includes(currentStatus);
      const isBeforeDone = isBeforeInProgress || currentStatus === 'in progress';

      const taskUpdate = {};

      // Any commit pushed to the branch signals work has started ("In Progress").
      if (isBeforeInProgress) {
        taskUpdate.status = 'In Progress';
      }

      // A commit matching the Zync-generated completion message marks the task "Done",
      // as long as a PR hasn't already been raised for it.
      if (task.completionCommitMessage) {
        const match = commitsToProcess.find(
          (c) => c.message.trim() === task.completionCommitMessage.trim()
        );
        if (match) {
          taskUpdate.commitCode = match.id.substring(0, 7);
          taskUpdate.commitMessage = match.message;
          if (isBeforeDone) {
            taskUpdate.status = 'Done';
          }

          if (getIo) {
            getIo().to(linkedProject.ownerUid).emit('notification', {
              title: 'Task Code Complete',
              message: `Code for task "${task.title}" has been pushed to the branch!`,
              type: 'info',
            });
          }
        }
      }

      if (Object.keys(taskUpdate).length > 0) {
        await ProjectTask.updateOne({ _id: task._id }, { $set: taskUpdate });

        const taskIO = req?.app?.get ? req.app.get('taskIO') : null;
        if (taskIO) {
          taskIO.emitToProject(String(linkedProject._id), 'task-updated', {
            projectId: String(linkedProject._id),
            stepId: String(task.stepId),
            taskId: String(task._id),
            changes: taskUpdate,
            actor: sender?.login || 'github',
          });
        }
      }
    }
  }

  const linkedProjectId = String(linkedProject._id || linkedProject.id);
  // WHAT: Aggregate project effects. WHY: Combines basic details with files/SHAs.
  const effect = {
    projectId: linkedProjectId,
    projectName: linkedProject.name || repository?.name || 'Project',
    repository: repository?.full_name || null,
    ...aggregateProjectEffectsFromCommits(commitsToProcess),
  };

  // WHAT: Run AI analysis. WHY: Generates summary of changes.
  const architectureAnalysis = await analyzeArchitectureImpact(commitsToProcess);
  const now = new Date();

  // WHAT: Update database. WHY: Persists webhook processing results.
  await Project.updateOne(
    { _id: effect.projectId },
    {
      $set: {
        lastWebhookEventAt: now,
        lastWebhookCommitCount: effect.commitCount,
        lastWebhookCommitShas: effect.commitShas,
        lastWebhookChangedFiles: effect.changedFiles,
        lastWebhookPusher: sender?.login || null,
        lastWebhookAiSummary: architectureAnalysis.summary,
        lastWebhookAiTaskMentions: architectureAnalysis.taskReferenceMentions,
        lastWebhookAiAnalyzedCommits: architectureAnalysis.analyzedCommits,
        lastWebhookDeliveryId: String(deliveryId || ''),
        updatedAt: now,
      },
    }
  );

  // WHAT: Retrieve Socket.IO instance. WHY: Enables real-time updates.
  const io = typeof getIo === 'function' ? getIo() : null;
  if (io) {
    io.emit('projectUpdate', {
      projectId: effect.projectId,
      eventType: 'github_push_aggregated',
      summary: {
        projectName: effect.projectName,
        repository: effect.repository,
        commitCount: effect.commitCount,
        changedFiles: effect.changedFiles,
        pusher: sender?.login || null,
        aiSummary: architectureAnalysis.summary,
        processedAt: now.toISOString(),
      },
    });
  }

  debugWebhookLog(
    `[GitHub Worker] Delivery ${deliveryId} processed (${effect.commitCount} commits) for project ${effect.projectId}`
  );

  return {
    projectId: effect.projectId,
    commitCount: effect.commitCount,
    changedFilesCount: effect.changedFiles.length,
    droppedCommits,
    aiSummary: architectureAnalysis.summary,
  };
};

// WHAT: Export worker function. WHY: Used by webhook route.
module.exports = {
  processGithubWebhookJob,
};
