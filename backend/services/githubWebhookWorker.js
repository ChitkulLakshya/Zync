const Project = require('../models/Project');
const { analyzeCommit } = require('../utils/commitAnalysisService');
const {
  DELIVERY_CATCHUP_BATCH_SIZE,
  DELIVERY_CATCHUP_MAX_BATCHES,
} = require('../config/freeTierLimits');

const isDebugWebhookEnabled =
  process.env.DEBUG_WEBHOOKS === 'true' ||
  String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug';

const debugWebhookLog = (...args) => {
  if (!isDebugWebhookEnabled) return;
  console.log(...args);
};

const toUniqueStrings = (values) => [
  ...new Set((values || []).map((v) => String(v || '').trim()).filter(Boolean)),
];

const aggregateProjectEffectsFromCommits = (commits = []) => {
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

const TASK_REF_REGEX = /\b(?:TASK-\d+|ID-\d+|#\d+)\b/i;

const analyzeArchitectureImpact = async (commits = []) => {
  const commitMessages = commits
    .map((commit) => String(commit?.message || '').trim())
    .filter(Boolean);
  if (commitMessages.length === 0) {
    return {
      analyzedCommits: 0,
      taskReferenceMentions: 0,
      summary: 'No commit messages available for analysis',
    };
  }

  // Skip expensive remote LLM calls if no key is configured.
  if (!process.env.GROQ_API_KEY) {
    const taskReferenceMentions = commitMessages.filter((message) =>
      TASK_REF_REGEX.test(message)
    ).length;
    return {
      analyzedCommits: commitMessages.length,
      taskReferenceMentions,
      summary:
        taskReferenceMentions > 0
          ? `Detected ${taskReferenceMentions} task reference(s) in commit batch`
          : 'No explicit task references detected in commit batch',
    };
  }

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

const processGithubWebhookJob = async ({
  deliveryId,
  event,
  payload,
  getIo,
}) => {
  if (event === 'installation' || event === 'installation_repositories') {
    return { ignored: true, reason: 'installation_event' };
  }

  if (event !== 'push') {
    return { ignored: true, reason: `event_${event || 'unknown'}_ignored` };
  }

  const { commits, repository, sender } = payload || {};
  if (!Array.isArray(commits) || commits.length === 0) {
    return { ignored: true, reason: 'no_commits' };
  }

  const maxProcessableCommits =
    DELIVERY_CATCHUP_BATCH_SIZE * DELIVERY_CATCHUP_MAX_BATCHES;
  const commitsToProcess = commits.slice(0, maxProcessableCommits);
  const droppedCommits = Math.max(0, commits.length - commitsToProcess.length);

  const linkedProject = await findLinkedProject(repository);
  if (!linkedProject) {
    return {
      ignored: true,
      reason: 'no_linked_project',
      droppedCommits,
    };
  }

  const linkedProjectId = String(linkedProject._id || linkedProject.id);
  const effect = {
    projectId: linkedProjectId,
    projectName: linkedProject.name || repository?.name || 'Project',
    repository: repository?.full_name || null,
    ...aggregateProjectEffectsFromCommits(commitsToProcess),
  };

  const architectureAnalysis =
    await analyzeArchitectureImpact(commitsToProcess);
  const now = new Date();

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

module.exports = {
  processGithubWebhookJob,
};
