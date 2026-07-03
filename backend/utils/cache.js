/**
 * @fileoverview cache.js
 * @module cache
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
const { getRedisClient, isAvailable } = require('./redisClient'); // WHAT: Import Redis client functions. WHY: Allows interaction with the Redis database for caching.

async function getJson(key) { // WHAT: Function to retrieve and parse JSON from Redis. WHY: Simplifies reading cached objects.
  if (!isAvailable()) return null; // WHAT: Check Redis availability. WHY: Fails gracefully if Redis is down.

  try { // WHAT: Try-catch block. WHY: Prevent application crash on Redis errors.
    const raw = await getRedisClient().get(key); // WHAT: Fetch string value by key. WHY: Reads data from cache.
    if (!raw) return null; // WHAT: Check for cache miss. WHY: Returns null instead of parsing undefined.
    return JSON.parse(raw); // WHAT: Parse JSON string. WHY: Restores original JavaScript object.
  } catch (err) { // WHAT: Catch error. WHY: Handle parsing or connection issues.
    console.warn(`[Cache] getJson failed for "${key}":`, err.message); // WHAT: Log warning. WHY: Debugging without crashing.
    return null; // WHAT: Return null. WHY: Acts as a cache miss fallback.
  }
}

async function setJson(key, value, ttlSeconds) { // WHAT: Function to stringify and store JSON in Redis. WHY: Simplifies caching objects with a time-to-live.
  if (!isAvailable()) return false; // WHAT: Check Redis. WHY: Avoids errors if offline.

  try { // WHAT: Try-catch block. WHY: Safety for network calls.
    await getRedisClient().set(key, JSON.stringify(value), { EX: ttlSeconds }); // WHAT: Stringify and save with expiration. WHY: Stores data and ensures it auto-deletes later.
    return true; // WHAT: Return success. WHY: Caller knows it worked.
  } catch (err) { // WHAT: Catch error. WHY: Prevent crash.
    console.warn(`[Cache] setJson failed for "${key}":`, err.message); // WHAT: Log warning. WHY: Debugging.
    return false; // WHAT: Return failure. WHY: Caller can handle appropriately.
  }
}

async function invalidate(...keys) { // WHAT: Function to delete one or more keys. WHY: Used to clear stale cache when data changes.
  if (!isAvailable() || keys.length === 0) return; // WHAT: Check args and Redis. WHY: Avoids unnecessary operations.

  try { // WHAT: Try-catch block. WHY: Error handling.
    await getRedisClient().del(...keys); // WHAT: Delete keys from Redis. WHY: Removes stale data.
  } catch (err) { // WHAT: Catch error. WHY: Safety.
    console.warn(`[Cache] invalidate failed:`, err.message); // WHAT: Log warning. WHY: Debugging.
  }
}

async function delByPattern(pattern) { // WHAT: Function to delete keys matching a pattern. WHY: Useful for clearing namespaces (e.g., all "user:*" keys).
  if (!isAvailable()) return 0; // WHAT: Check Redis. WHY: Fallback.

  try { // WHAT: Try-catch. WHY: Safety.
    const client = getRedisClient(); // WHAT: Get client instance. WHY: Needed for scanIterator.
    let deleted = 0; // WHAT: Counter for deleted keys. WHY: Returns stat to caller.
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) { // WHAT: Iterate keys matching pattern using SCAN. WHY: Prevents blocking Redis with a massive KEYS command.
      await client.del(key); // WHAT: Delete each key. WHY: Clears the matched cache.
      deleted++; // WHAT: Increment counter. WHY: Tracking.
    }
    return deleted; // WHAT: Return count. WHY: Reporting.
  } catch (err) { // WHAT: Catch error. WHY: Safety.
    console.warn(`[Cache] delByPattern failed for "${pattern}":`, err.message); // WHAT: Log warning. WHY: Debugging.
    return 0; // WHAT: Return 0. WHY: Fallback result.
  }
}

module.exports = { getJson, setJson, invalidate, delByPattern }; // WHAT: Export all utility functions. WHY: Makes them available across the application.
