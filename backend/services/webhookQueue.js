/**
 * EDUCATIONAL COMMENT: What and Why
 * What: An in-memory queue designed to handle incoming webhooks, deduplicate deliveries, and process jobs sequentially.
 * Why: Prevents our backend from being overwhelmed during massive traffic spikes (like batch webhook deliveries). It ensures idempotent processing by tracking delivery IDs and provides metrics on queue depth.
 */
const { getSafeEnvInt } = require('../utils/safeEnv'); // WHAT: Imports utility to safely parse integer environment variables. WHY: Used to configure limits safely without crashing on bad config.

const MAX_STORED_JOBS = getSafeEnvInt('WEBHOOK_QUEUE_MAX_STORED_JOBS', 100, 5000, 1000); // WHAT: Sets maximum retained job history. WHY: Prevents infinite memory growth over time.

const jobsByDeliveryId = new Map(); // WHAT: In-memory map to store job states by delivery ID. WHY: Allows fast deduplication and status lookups.
const queue = []; // WHAT: Array acting as a FIFO queue for pending jobs. WHY: Maintains the execution order of incoming webhooks.

let isDraining = false; // WHAT: Flag to indicate if the queue is currently processing. WHY: Prevents concurrent overlapping execution loops (ensures sequential processing).
let webhookProcessor = null; // WHAT: Holds a reference to the registered processor function. WHY: Allows decoupling the queue logic from the actual webhook business logic.

const toIsoNow = () => new Date().toISOString(); // WHAT: Helper to get the current time as an ISO string. WHY: Shorthand for consistent timestamp formatting.

const toPublicJob = (job) => { // WHAT: Sanitizes a job object for public consumption. WHY: Hides internal or sensitive data before returning status over an API.
  if (!job) return null; // WHAT: Checks for null job. WHY: Failsafe.
  return { // WHAT: Returns a new object with only allowed fields. WHY: Controlled data exposure.
    deliveryId: job.deliveryId, // WHAT: Exposes the ID. WHY: Essential for identification.
    event: job.event, // WHAT: Exposes the event type. WHY: Good for logging.
    status: job.status, // WHAT: Exposes the current status. WHY: To know if it's pending, processing, completed, or failed.
    attempts: job.attempts, // WHAT: Exposes attempt count. WHY: Observability.
    createdAt: job.createdAt, // WHAT: Exposes creation time. WHY: Auditing.
    startedAt: job.startedAt || null, // WHAT: Exposes start time. WHY: Auditing.
    completedAt: job.completedAt || null, // WHAT: Exposes completion time. WHY: Auditing.
    updatedAt: job.updatedAt, // WHAT: Exposes last update time. WHY: Auditing.
    result: job.result || null, // WHAT: Exposes the result. WHY: To provide feedback.
    error: job.error || null, // WHAT: Exposes any error message. WHY: For debugging failed webhooks.
  };
};

const pruneOldJobs = () => { // WHAT: Cleans up old jobs from the map. WHY: Keeps memory usage bounded.
  if (jobsByDeliveryId.size <= MAX_STORED_JOBS) return; // WHAT: Checks if we are under the limit. WHY: Fast return if no cleanup is needed.
  const removable = jobsByDeliveryId.size - MAX_STORED_JOBS; // WHAT: Calculates how many items to remove. WHY: We only remove what's strictly necessary.
  let removed = 0; // WHAT: Counter for removed items. WHY: Tracks progress against the limit.
  for (const [deliveryId, job] of jobsByDeliveryId.entries()) { // WHAT: Iterates over the map. WHY: Maps iterate in insertion order, so the oldest are first.
    if (removed >= removable) break; // WHAT: Stops if we've removed enough. WHY: Efficiency.
    if (job.status === 'completed' || job.status === 'failed') { // WHAT: Only deletes finished jobs. WHY: We don't want to delete pending or processing jobs.
      jobsByDeliveryId.delete(deliveryId); // WHAT: Removes the job from the map. WHY: Frees up memory.
      removed += 1; // WHAT: Increments the counter. WHY: Tracks progress.
    }
  }
};

const processOneJob = async (queuedItem) => { // WHAT: Processes a single job from the queue. WHY: Encapsulates the execution and state transitions of one unit of work.
  const job = jobsByDeliveryId.get(queuedItem.deliveryId); // WHAT: Retrieves the tracking object for this job. WHY: We need to update its state.
  if (!job) return; // WHAT: Early return if job was somehow deleted. WHY: Failsafe.
  if (!webhookProcessor) { // WHAT: Checks if a processor is registered. WHY: We can't do work without knowing how.
    throw new Error('Webhook queue processor is not registered'); // WHAT: Throws an error. WHY: Fails loudly if misconfigured.
  }

  job.status = 'processing'; // WHAT: Updates status. WHY: State machine progression.
  job.attempts += 1; // WHAT: Increments attempts. WHY: Tracks retries (though this simple version just does 1 attempt).
  job.startedAt = job.startedAt || toIsoNow(); // WHAT: Sets startedAt if not set. WHY: Auditing.
  job.updatedAt = toIsoNow(); // WHAT: Updates modified time. WHY: Auditing.

  try { // WHAT: Try block wrapping the processor execution. WHY: Webhook processors can throw errors if parsing or business logic fails.
    const result = await webhookProcessor(queuedItem); // WHAT: Awaits the external processor function. WHY: Executes the actual work.
    job.status = 'completed'; // WHAT: Marks as completed on success. WHY: State machine progression.
    job.result = result || null; // WHAT: Stores the result. WHY: Auditing.
    job.completedAt = toIsoNow(); // WHAT: Sets completion time. WHY: Auditing.
    job.updatedAt = toIsoNow(); // WHAT: Updates modified time. WHY: Auditing.
  } catch (error) { // WHAT: Catches processor errors. WHY: Prevents the queue from crashing completely on a bad payload.
    job.status = 'failed'; // WHAT: Marks as failed. WHY: State machine progression.
    job.error = error?.message || 'Unknown worker error'; // WHAT: Stores the error message safely. WHY: For debugging.
    job.completedAt = toIsoNow(); // WHAT: Sets completion time. WHY: Auditing.
    job.updatedAt = toIsoNow(); // WHAT: Updates modified time. WHY: Auditing.
  }
};

const drainQueue = async () => { // WHAT: Empties the queue by processing jobs one by one. WHY: The main event loop for the queue.
  if (isDraining) return; // WHAT: Checks if already running. WHY: Prevents concurrent execution.
  isDraining = true; // WHAT: Acquires the 'lock'. WHY: Signals that the loop is running.
  try { // WHAT: Try block to ensure the lock is released. WHY: If processOneJob throws unhandled, we must unlock.
    while (queue.length > 0) { // WHAT: Loops as long as there are jobs. WHY: Processes the entire backlog.
      const queuedItem = queue.shift(); // WHAT: Removes the first item (FIFO). WHY: Retrieves the oldest pending job.
      await processOneJob(queuedItem); // WHAT: Processes it. WHY: Executes the work sequentially.
    }
  } finally { // WHAT: Finally block. WHY: Guarantees execution regardless of errors in the while loop.
    isDraining = false; // WHAT: Releases the 'lock'. WHY: Allows future calls to scheduleDrain to start the loop again.
  }
};

const scheduleDrain = () => { // WHAT: Schedules the drainQueue function to run. WHY: Decouples the enqueueing action from the execution phase.
  setImmediate(() => { // WHAT: Uses setImmediate. WHY: Defers execution to the next event loop iteration, unblocking the current request thread quickly.
    drainQueue().catch((error) => { // WHAT: Catches unexpected drain errors. WHY: Prevents unhandled promise rejections from crashing Node.js.
      console.error('[WebhookQueue] Drain failure:', error); // WHAT: Logs fatal drain errors. WHY: Visibility into queue collapse.
    });
  });
};

const registerWebhookProcessor = (processor) => { // WHAT: Sets the processor function. WHY: Allows dependency injection of the business logic.
  webhookProcessor = processor; // WHAT: Assigns the variable. WHY: State update.
};

const enqueueWebhookJob = ({ deliveryId, event, payload, getIo }) => { // WHAT: Adds a new job to the queue. WHY: Entry point for incoming webhooks.
  const normalizedDeliveryId = String(deliveryId || '').trim(); // WHAT: Normalizes the ID. WHY: Ensures consistent string matching.
  if (!normalizedDeliveryId) { // WHAT: Validates the ID. WHY: Deduplication is impossible without it.
    throw new Error('deliveryId is required for webhook queue idempotency'); // WHAT: Throws if missing. WHY: Enforces strict idempotency constraints.
  }

  const existingJob = jobsByDeliveryId.get(normalizedDeliveryId); // WHAT: Checks if this delivery ID was already seen. WHY: The core of the idempotency logic.
  if (existingJob) { // WHAT: If seen before. WHY: We shouldn't process it again.
    return { // WHAT: Returns early. WHY: Acknowledges the duplicate gracefully.
      duplicate: true, // WHAT: Flags as duplicate. WHY: Caller might want to know.
      job: toPublicJob(existingJob), // WHAT: Returns current state. WHY: Caller can check if it's done or pending.
    };
  }

  const job = { // WHAT: Creates a new tracking object. WHY: Stores state for the new delivery.
    deliveryId: normalizedDeliveryId, // WHAT: Sets the ID. WHY: Identification.
    event: String(event || '').trim() || null, // WHAT: Sets the event type. WHY: Auditing.
    status: 'queued', // WHAT: Sets initial status. WHY: State machine start.
    attempts: 0, // WHAT: Initializes attempts. WHY: Metric.
    createdAt: toIsoNow(), // WHAT: Sets creation time. WHY: Auditing.
    updatedAt: toIsoNow(), // WHAT: Sets modified time. WHY: Auditing.
    startedAt: null, // WHAT: Initializes empty start time. WHY: Placeholder.
    completedAt: null, // WHAT: Initializes empty complete time. WHY: Placeholder.
    result: null, // WHAT: Initializes empty result. WHY: Placeholder.
    error: null, // WHAT: Initializes empty error. WHY: Placeholder.
  };
  jobsByDeliveryId.set(normalizedDeliveryId, job); // WHAT: Adds to the map. WHY: Registers it for deduplication immediately.

  queue.push({ // WHAT: Pushes the actual work payload to the queue array. WHY: Enqueues for execution.
    deliveryId: normalizedDeliveryId, // WHAT: Passes ID. WHY: So processOneJob can find the state.
    event: job.event, // WHAT: Passes event. WHY: Might be needed by processor.
    payload: payload || {}, // WHAT: Passes the actual webhook payload. WHY: The data to be processed.
    getIo: typeof getIo === 'function' ? getIo : null, // WHAT: Passes the websocket getter. WHY: Allows the processor to emit real-time updates.
  });
  pruneOldJobs(); // WHAT: Triggers a cleanup. WHY: Ensures map doesn't grow indefinitely on every enqueue.
  scheduleDrain(); // WHAT: Kicks off processing. WHY: Ensures the job will eventually be run.

  return { // WHAT: Returns success. WHY: Acknowledges the enqueue.
    duplicate: false, // WHAT: Indicates it's a new job. WHY: Information for the caller.
    job: toPublicJob(job), // WHAT: Returns public state. WHY: So caller has the ID and status.
  };
};

const getWebhookJobStatus = (deliveryId) => { // WHAT: Fetches public status of a job. WHY: Allows API clients to poll for completion.
  const normalizedDeliveryId = String(deliveryId || '').trim(); // WHAT: Normalizes ID. WHY: Consistency.
  if (!normalizedDeliveryId) return null; // WHAT: Failsafe. WHY: Handles bad input gracefully.
  const job = jobsByDeliveryId.get(normalizedDeliveryId); // WHAT: Looks up the job. WHY: State retrieval.
  return toPublicJob(job); // WHAT: Returns safe version. WHY: Data protection.
};

const getWebhookQueueMetrics = () => { // WHAT: Calculates queue health metrics. WHY: For observability dashboards or health check endpoints.
  const now = Date.now(); // WHAT: Grabs current timestamp. WHY: Needed to calculate age.
  const queuedAgesMs = queue // WHAT: Maps queue to get ages. WHY: Determines how old the pending jobs are.
    .map((queuedItem) => {
      const job = jobsByDeliveryId.get(queuedItem.deliveryId); // WHAT: Gets the job state. WHY: We need its creation time.
      if (!job?.createdAt) return 0; // WHAT: Failsafe. WHY: Avoids NaN.
      const createdAtMs = Date.parse(job.createdAt); // WHAT: Parses timestamp. WHY: Converts to milliseconds.
      if (!Number.isFinite(createdAtMs)) return 0; // WHAT: Failsafe. WHY: Handles bad dates.
      return Math.max(0, now - createdAtMs); // WHAT: Calculates delta. WHY: Yields age in ms.
    })
    .filter((age) => Number.isFinite(age)); // WHAT: Filters out bad calculations. WHY: Ensures clean metrics.

  return { // WHAT: Returns the metrics object. WHY: Summarizes the queue's health.
    depth: queue.length, // WHAT: Queue length. WHY: Shows backlog size.
    lagMs: queuedAgesMs.length > 0 ? Math.max(...queuedAgesMs) : 0, // WHAT: Max age. WHY: Shows maximum processing delay.
    processing: isDraining, // WHAT: Drain status. WHY: Shows if the queue is actively working or idle.
    trackedJobs: jobsByDeliveryId.size, // WHAT: Map size. WHY: Shows memory footprint against MAX_STORED_JOBS.
  };
};

const waitForWebhookQueueIdle = async (timeoutMs = 3000) => { // WHAT: Helper to wait for the queue to finish. WHY: Primarily useful for testing or graceful shutdown.
  const start = Date.now(); // WHAT: Grabs start time. WHY: For timeout tracking.
  while (isDraining || queue.length > 0) { // WHAT: Loops while working. WHY: Blocking check.
    if (Date.now() - start > timeoutMs) { // WHAT: Checks timeout. WHY: Prevents infinite hanging.
      throw new Error('Timed out waiting for webhook queue to drain'); // WHAT: Throws if too long. WHY: Fails safely.
    }
    await new Promise((resolve) => setTimeout(resolve, 10)); // WHAT: Yields event loop briefly. WHY: Prevents blocking Node completely while polling.
  }
};

const __resetWebhookQueueForTests = () => { // WHAT: Test helper to nuke state. WHY: Ensures test isolation.
  queue.splice(0, queue.length); // WHAT: Empties array in place. WHY: Resets queue.
  jobsByDeliveryId.clear(); // WHAT: Empties map. WHY: Resets deduplication.
  isDraining = false; // WHAT: Resets flag. WHY: Resets execution state.
  webhookProcessor = null; // WHAT: Drops processor. WHY: Resets configuration.
};

module.exports = { // WHAT: Exports the public API. WHY: Makes the queue usable by the main application.
  registerWebhookProcessor,
  enqueueWebhookJob,
  getWebhookJobStatus,
  getWebhookQueueMetrics,
  waitForWebhookQueueIdle,
  __resetWebhookQueueForTests,
};
