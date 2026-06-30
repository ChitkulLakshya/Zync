/**
 * @fileoverview redisCacheSampleRoutes.js
 * @module redisCacheSampleRoutes
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
// This line imports the 'express' module, which is a popular Node.js web application framework, to create and manage server-side routes and middleware.
const express = require('express');
// This line imports specific functions, 'getRedisClient' and 'isAvailable', from the local 'redisClient.js' utility file, which are necessary for interacting with the Redis server.
const { getRedisClient, isAvailable } = require('../utils/redisClient');

// This line initializes an Express router instance, which allows for defining modular, mountable route handlers for different parts of the application.
const router = express.Router();

// This line declares a constant string prefix that will be used to construct unique keys for storing task data in Redis, ensuring organization and preventing key collisions.
const TASK_KEY_PREFIX = 'sample:task:';
// This line declares a constant representing the number of seconds in one hour (60 minutes * 60 seconds), which will be used as the Time-To-Live (TTL) for cached items in Redis.
const ONE_HOUR_SEC = 60 * 60;

// This line defines a function named 'redisAvailable' that checks the availability and configuration of the Redis client before attempting any Redis operations.
function redisAvailable(res) {
  // This line checks if the 'REDIS_URL' environment variable is not set, indicating that Redis connection details are missing.
  if (!process.env.REDIS_URL) {
    // This line sends an HTTP 503 (Service Unavailable) status code and a JSON error message to the client, informing them that Redis is not configured.
    res.status(503).json({ message: 'Redis not configured (REDIS_URL missing)' });
    // This line immediately exits the function, returning 'false' to indicate that Redis is not available and further processing should stop.
    return false;
  }
  // This line checks if the Redis client is not currently connected or available, using the 'isAvailable' utility function.
  if (!isAvailable()) {
    // This line sends an HTTP 503 (Service Unavailable) status code and a JSON error message to the client, informing them that Redis is connected but currently unavailable.
    res.status(503).json({ message: 'Redis unavailable (not connected)' });
    // This line immediately exits the function, returning 'false' to indicate that Redis is not available and further processing should stop.
    return false;
  }
  // This line returns 'true' if both the Redis URL is configured and the Redis client is connected, indicating that Redis is ready for use.
  return true;
}

/** POST body: { taskId: string, data: object } — stored as JSON with 1-hour expiration */
// This line defines a POST route handler for the '/tasks' endpoint, which will be used to store new task data in Redis. The 'express.json()' middleware parses incoming JSON request bodies.
router.post('/tasks', express.json(), async (req, res) => {
  // This line calls the 'redisAvailable' function to check if Redis is properly configured and connected before proceeding with the task storage logic.
  if (!redisAvailable(res)) {
    // This line immediately exits the route handler if Redis is not available, as the 'redisAvailable' function has already sent an error response.
    return;
  }

  // This line uses object destructuring to extract 'taskId' and 'data' properties from the request body, which are the payload for the task to be cached.
  const { taskId, data } = req.body;
  // This line checks if 'taskId' is missing or if it's not a string, which are validation rules for the incoming task identifier.
  if (!taskId || typeof taskId !== 'string') {
    // This line sends an HTTP 400 (Bad Request) status code and a JSON error message to the client, indicating that 'taskId' is invalid or missing.
    return res.status(400).json({ message: 'taskId is required' });
  }
  // This line checks if the 'data' property is undefined, which means the actual task payload is missing from the request.
  if (data === undefined) {
    // This line sends an HTTP 400 (Bad Request) status code and a JSON error message to the client, indicating that the 'data' payload is missing.
    return res.status(400).json({ message: 'data is required' });
  }

  // This line constructs the full Redis key by concatenating the predefined prefix with the unique 'taskId', ensuring a unique identifier for the cached task.
  const key = `${TASK_KEY_PREFIX}${taskId}`;
  // This line converts the 'data' object into a JSON string, which is the required format for storing complex objects in Redis.
  const payload = JSON.stringify(data);
  // This line retrieves the active Redis client instance from the utility function, which is needed to perform Redis operations.
  const redisClient = getRedisClient();

  // This line starts a try-catch block to handle potential errors that might occur during the Redis 'setEx' operation.
  try {
    // This line asynchronously sets the 'payload' in Redis using the constructed 'key', with an expiration time defined by 'ONE_HOUR_SEC', ensuring the data is temporary.
    await redisClient.setEx(key, ONE_HOUR_SEC, payload);
    // This line sends an HTTP 201 (Created) status code and a JSON success message to the client, confirming that the task has been successfully cached.
    return res.status(201).json({
      // This property provides a human-readable confirmation message.
      message: 'Task cached',
      // This property returns the Redis key used to store the task, which can be used for retrieval.
      key,
      // This property indicates the Time-To-Live in seconds for the cached task.
      ttlSeconds: ONE_HOUR_SEC,
    });
  // This line catches any errors that occur within the try block during the Redis operation.
  } catch (err) {
    // This line logs the error to the console for debugging purposes, indicating that the Redis SET operation failed.
    console.error('[Redis sample] SET failed:', err);
    // This line sends an HTTP 500 (Internal Server Error) status code and a JSON error message to the client, indicating that saving to Redis failed.
    return res.status(500).json({ message: 'Failed to save to Redis' });
  }
});

/** GET /tasks/:taskId — retrieve cached task JSON */
// This line defines a GET route handler for the '/tasks/:taskId' endpoint, which will be used to retrieve a specific cached task by its ID.
router.get('/tasks/:taskId', async (req, res) => {
  // This line calls the 'redisAvailable' function to check if Redis is properly configured and connected before attempting to retrieve task data.
  if (!redisAvailable(res)) {
    // This line immediately exits the route handler if Redis is not available, as the 'redisAvailable' function has already sent an error response.
    return;
  }

  // This line uses object destructuring to extract the 'taskId' from the request parameters, which identifies the task to be retrieved.
  const { taskId } = req.params;
  // This line constructs the full Redis key by concatenating the predefined prefix with the unique 'taskId', matching how the task was stored.
  const key = `${TASK_KEY_PREFIX}${taskId}`;
  // This line retrieves the active Redis client instance from the utility function, which is needed to perform Redis operations.
  const redisClient = getRedisClient();

  // This line starts a try-catch block to handle potential errors that might occur during the Redis 'get' operation.
  try {
    // This line asynchronously retrieves the raw string value associated with the constructed 'key' from Redis.
    const raw = await redisClient.get(key);
    // This line checks if the 'raw' value retrieved from Redis is null, which indicates that no data was found for the given key (either never existed or expired).
    if (raw === null) {
      // This line sends an HTTP 404 (Not Found) status code and a JSON error message to the client, indicating that the requested task was not found or has expired.
      return res.status(404).json({ message: 'Task not found or expired' });
    }
    // This line sends an HTTP 200 (OK) status code and a JSON response to the client, containing the 'taskId' and the parsed 'data' retrieved from Redis.
    return res.json({ taskId, data: JSON.parse(raw) });
  // This line catches any errors that occur within the try block during the Redis operation or JSON parsing.
  } catch (err) {
    // This line logs the error to the console for debugging purposes, indicating that the Redis GET operation failed.
    console.error('[Redis sample] GET failed:', err);
    // This line sends an HTTP 500 (Internal Server Error) status code and a JSON error message to the client, indicating that reading from Redis failed.
    return res.status(500).json({ message: 'Failed to read from Redis' });
  }
});

// This line exports the configured Express router, making it available for other parts of the application to mount as middleware.
module.exports = router;