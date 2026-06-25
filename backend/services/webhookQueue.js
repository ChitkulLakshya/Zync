const { getSafeEnvInt } = require('../utils/safeEnv');

const MAX_STORED_JOBS = getSafeEnvInt('WEBHOOK_QUEUE_MAX_STORED_JOBS', 100, 5000, 1000);

const jobsByDeliveryId = new Map();
const queue = [];

let isDraining = false;
let webhookProcessor = null;

const toIsoNow = () => new Date().toISOString();

const toPublicJob = (job) => {
  if (!job) return null;
  return {
    deliveryId: job.deliveryId,
    event: job.event,
    status: job.status,
    attempts: job.attempts,
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    updatedAt: job.updatedAt,
    result: job.result || null,
    error: job.error || null,
  };
};

const pruneOldJobs = () => {
  if (jobsByDeliveryId.size <= MAX_STORED_JOBS) return;
  const removable = jobsByDeliveryId.size - MAX_STORED_JOBS;
  let removed = 0;
  for (const [deliveryId, job] of jobsByDeliveryId.entries()) {
    if (removed >= removable) break;
    if (job.status === 'completed' || job.status === 'failed') {
      jobsByDeliveryId.delete(deliveryId);
      removed += 1;
    }
  }
};

const processOneJob = async (queuedItem) => {
  const job = jobsByDeliveryId.get(queuedItem.deliveryId);
  if (!job) return;
  if (!webhookProcessor) {
    throw new Error('Webhook queue processor is not registered');
  }

  job.status = 'processing';
  job.attempts += 1;
  job.startedAt = job.startedAt || toIsoNow();
  job.updatedAt = toIsoNow();

  try {
    const result = await webhookProcessor(queuedItem);
    job.status = 'completed';
    job.result = result || null;
    job.completedAt = toIsoNow();
    job.updatedAt = toIsoNow();
  } catch (error) {
    job.status = 'failed';
    job.error = error?.message || 'Unknown worker error';
    job.completedAt = toIsoNow();
    job.updatedAt = toIsoNow();
  }
};

const drainQueue = async () => {
  if (isDraining) return;
  isDraining = true;
  try {
    while (queue.length > 0) {
      const queuedItem = queue.shift();
      await processOneJob(queuedItem);
    }
  } finally {
    isDraining = false;
  }
};

const scheduleDrain = () => {
  setImmediate(() => {
    drainQueue().catch((error) => {
      console.error('[WebhookQueue] Drain failure:', error);
    });
  });
};

const registerWebhookProcessor = (processor) => {
  webhookProcessor = processor;
};

const enqueueWebhookJob = ({ deliveryId, event, payload, getIo }) => {
  const normalizedDeliveryId = String(deliveryId || '').trim();
  if (!normalizedDeliveryId) {
    throw new Error('deliveryId is required for webhook queue idempotency');
  }

  const existingJob = jobsByDeliveryId.get(normalizedDeliveryId);
  if (existingJob) {
    return {
      duplicate: true,
      job: toPublicJob(existingJob),
    };
  }

  const job = {
    deliveryId: normalizedDeliveryId,
    event: String(event || '').trim() || null,
    status: 'queued',
    attempts: 0,
    createdAt: toIsoNow(),
    updatedAt: toIsoNow(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
  };
  jobsByDeliveryId.set(normalizedDeliveryId, job);

  queue.push({
    deliveryId: normalizedDeliveryId,
    event: job.event,
    payload: payload || {},
    getIo: typeof getIo === 'function' ? getIo : null,
  });
  pruneOldJobs();
  scheduleDrain();

  return {
    duplicate: false,
    job: toPublicJob(job),
  };
};

const getWebhookJobStatus = (deliveryId) => {
  const normalizedDeliveryId = String(deliveryId || '').trim();
  if (!normalizedDeliveryId) return null;
  const job = jobsByDeliveryId.get(normalizedDeliveryId);
  return toPublicJob(job);
};

const getWebhookQueueMetrics = () => {
  const now = Date.now();
  const queuedAgesMs = queue
    .map((queuedItem) => {
      const job = jobsByDeliveryId.get(queuedItem.deliveryId);
      if (!job?.createdAt) return 0;
      const createdAtMs = Date.parse(job.createdAt);
      if (!Number.isFinite(createdAtMs)) return 0;
      return Math.max(0, now - createdAtMs);
    })
    .filter((age) => Number.isFinite(age));

  return {
    depth: queue.length,
    lagMs: queuedAgesMs.length > 0 ? Math.max(...queuedAgesMs) : 0,
    processing: isDraining,
    trackedJobs: jobsByDeliveryId.size,
  };
};

const waitForWebhookQueueIdle = async (timeoutMs = 3000) => {
  const start = Date.now();
  while (isDraining || queue.length > 0) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for webhook queue to drain');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const __resetWebhookQueueForTests = () => {
  queue.splice(0, queue.length);
  jobsByDeliveryId.clear();
  isDraining = false;
  webhookProcessor = null;
};

module.exports = {
  registerWebhookProcessor,
  enqueueWebhookJob,
  getWebhookJobStatus,
  getWebhookQueueMetrics,
  waitForWebhookQueueIdle,
  __resetWebhookQueueForTests,
};
