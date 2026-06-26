/**
 * @fileoverview githubAppWebhook.js
 * @module githubAppWebhook
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