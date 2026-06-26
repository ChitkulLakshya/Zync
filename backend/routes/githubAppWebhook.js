const express = require('express'); // Imports the Express.js framework, which is essential for building web applications and APIs in Node.js.
const router = express.Router(); // Creates a new router object from Express, allowing for modular route definitions separate from the main application.
const verifyGithub = require('../middleware/verifyGithub'); // Imports a custom middleware function responsible for verifying the authenticity of incoming GitHub webhooks.
const { processGithubWebhookJob } = require('../services/githubWebhookWorker'); // Imports the function that contains the core logic for processing a GitHub webhook event.
const { // Starts an object destructuring assignment to extract specific functions from the webhook queue service.
  registerWebhookProcessor, // Extracts the function used to register a worker that processes jobs from the queue.
  enqueueWebhookJob, // Extracts the function used to add new webhook events as jobs to the processing queue.
  getWebhookJobStatus, // Extracts the function used to retrieve the current status of a specific webhook job.
} = require('../services/webhookQueue'); // Imports the module containing functions for managing the webhook queue.

const isDebugWebhookEnabled = // Declares a constant variable to store a boolean indicating if debug logging for webhooks is enabled.
  process.env.DEBUG_WEBHOOKS === 'true' || String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug'; // Checks if the DEBUG_WEBHOOKS environment variable is 'true' OR if LOG_LEVEL is 'debug' (case-insensitive), determining if debug logs should be active.

const debugWebhookLog = (...args) => { // Declares a constant variable `debugWebhookLog` and assigns it an arrow function that accepts any number of arguments.
  if (!isDebugWebhookEnabled) return; // Checks if debug logging is not enabled; if so, it immediately exits the function to prevent logging.
  console.log(...args); // If debug logging is enabled, this line prints all provided arguments to the console.
};

registerWebhookProcessor(processGithubWebhookJob); // Registers the `processGithubWebhookJob` function as the worker that will handle jobs pulled from the webhook queue.


router.post('/webhook', verifyGithub, async (req, res) => { // Defines an HTTP POST route for the '/webhook' path, applying the `verifyGithub` middleware before the asynchronous handler function.
  try { // Starts a try block to encapsulate code that might throw errors, allowing for graceful error handling.
    const event = req.headers['x-github-event']; // Extracts the GitHub event type (e.g., 'push', 'pull_request') from the request headers.
    const deliveryId = req.headers['x-github-delivery']; // Extracts the unique delivery ID for the webhook from the request headers.
    const normalizedDeliveryId = String(deliveryId || '').trim(); // Converts the delivery ID to a string (defaulting to empty if null/undefined) and removes leading/trailing whitespace for consistency.

    if (!normalizedDeliveryId) { // Checks if the normalized delivery ID is empty or falsy, indicating a missing or invalid header.
      return res.status(400).json({ // Sends an HTTP 400 (Bad Request) response with a JSON body and exits the function.
        message: 'Missing x-github-delivery header', // Provides a descriptive message indicating the reason for the bad request.
      });
    }

    const enqueueResult = enqueueWebhookJob({ // Calls the `enqueueWebhookJob` function to add the incoming webhook to the processing queue, storing the result.
      deliveryId: normalizedDeliveryId, // Passes the unique, normalized delivery ID for tracking the job in the queue.
      event, // Passes the GitHub event type to the job data.
      payload: req.body, // Passes the entire request body (the webhook payload) to the job data for processing.
      getIo: () => req.app.get('io'), // Provides a function to lazily retrieve the Socket.IO instance from the Express app, allowing the worker to emit real-time updates.
    });

    debugWebhookLog( // Calls the debug logging function to output information about the enqueued webhook.
      `[GitHub App Webhook] delivery=${normalizedDeliveryId} event=${event || 'unknown'} duplicate=${enqueueResult.duplicate}` // Constructs a log message detailing the delivery ID, event type (defaulting to 'unknown'), and whether it was a duplicate.
    );

    return res.status(202).json({ // Sends an HTTP 202 (Accepted) response with a JSON body, indicating the webhook was successfully received and queued.
      message: enqueueResult.duplicate ? 'Duplicate delivery already queued/processed' : 'Webhook accepted', // Provides a message indicating if the webhook was a duplicate or newly accepted.
      duplicate: enqueueResult.duplicate, // Includes a boolean flag indicating if the webhook was identified as a duplicate.
      deliveryId: normalizedDeliveryId, // Returns the normalized delivery ID for the client's reference.
      job: enqueueResult.job, // Returns details about the enqueued job (e.g., its ID) for potential status queries.
    });
  } catch (error) { // Catches any errors that occur within the try block.
    console.error('[GitHub App Webhook] Error:', error); // Logs the error to the console, providing details for debugging.
    return res.status(500).json({ message: 'Webhook enqueue failed', error: error.message }); // Sends an HTTP 500 (Internal Server Error) response with a JSON body, indicating a failure during enqueueing.
  }
});


router.get('/webhook/jobs/:deliveryId', (req, res) => { // Defines an HTTP GET route for '/webhook/jobs/:deliveryId', allowing clients to query the status of a specific job.
  const { deliveryId } = req.params; // Uses object destructuring to extract the `deliveryId` parameter from the URL.
  const job = getWebhookJobStatus(deliveryId); // Calls `getWebhookJobStatus` to retrieve the status of the job associated with the extracted delivery ID.
  if (!job) { // Checks if no job was found for the given delivery ID.
    return res.status(404).json({ message: 'Job not found', deliveryId }); // Sends an HTTP 404 (Not Found) response with a JSON body, indicating the job was not found.
  }
  return res.json({ job }); // Sends a successful JSON response containing the details of the found job.
});

module.exports = router; // Exports the configured router object, making these routes available to be used by the main Express application.