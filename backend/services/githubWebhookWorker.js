/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Processes incoming GitHub webhooks (specifically push events) to update project states, extract commit metadata, and optionally analyze commit intent using AI.
 * Why: Decoupling webhook processing from the raw endpoint logic allows us to handle large commit payloads, rate limit gracefully, and analyze architecture impact asynchronously without blocking GitHub's delivery.
 */
// WHAT: Import Project model. WHY: Query and update projects.
const Project = require('../models/Project');
// WHAT: Import commit analysis. WHY: Run AI analysis on commits.
const { analyzeCommit } = require('../utils/commitAnalysisService');
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
  // WHAT: Ignore installation. WHY: Irrelevant to commits.
  if (event === 'installation' || event === 'installation_repositories') {
    return { ignored: true, reason: 'installation_event' };
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
