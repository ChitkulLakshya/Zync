/**
 * @fileoverview haveIBeenPwnedService.js
 * @module haveIBeenPwnedService
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Checks if a user's password has been compromised using the Have I Been Pwned API via k-anonymity (sending only a 5-character SHA-1 prefix).
 * Why: Enhances security by warning users against using breached passwords. K-anonymity ensures we never transmit the actual password or even the full hash, preserving complete user privacy.
 */
const crypto = require('crypto'); // WHAT: Imports the built-in Node.js crypto module. WHY: Needed to compute SHA-1 hashes of the password.
const axios = require('axios'); // WHAT: Imports the axios library for HTTP requests. WHY: Needed to query the Have I Been Pwned API.

const PWNED_PASSWORDS_BASE = 'https://api.pwnedpasswords.com/range/'; // WHAT: Base URL for the HIBP k-anonymity API. WHY: This endpoint expects a 5-character SHA-1 prefix.

/**
 * Check if a password has appeared in known data breaches.
 * Uses the free Pwned Passwords API with k-anonymity:
 * only the first 5 characters of the SHA-1 hash are sent.
 *
 * @param {string} password - Plain text password to check
 * @returns {Promise<{ isCompromised: boolean, count: number }>}
 */
const checkPassword = async (password) => { // WHAT: Async function to check password compromise status. WHY: Asynchronous because it makes a network request.
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase(); // WHAT: Computes the full SHA-1 hash of the password and converts it to uppercase. WHY: The HIBP API requires uppercase SHA-1 hashes.
  const prefix = sha1.substring(0, 5); // WHAT: Extracts the first 5 characters of the hash. WHY: Used as the k-anonymity prefix to send to the API.
  const suffix = sha1.substring(5); // WHAT: Extracts the remainder of the hash. WHY: Used to locally match against the API response.

  try { // WHAT: Try block to catch network errors. WHY: Network requests can fail; we must gracefully handle API downtime.
    const response = await axios.get(`${PWNED_PASSWORDS_BASE}${prefix}`, { // WHAT: Sends GET request to the API with the 5-char prefix. WHY: Fetches a list of all breached password suffixes matching this prefix.
      headers: { 'Add-Padding': 'true' }, // WHAT: Adds the 'Add-Padding' header. WHY: Obfuscates the actual number of matches, enhancing privacy against network sniffers.
      timeout: 5000, // WHAT: Sets a 5-second timeout for the request. WHY: Prevents the backend from hanging indefinitely if the HIBP API is unresponsive.
    });

    const lines = response.data.split('\n'); // WHAT: Splits the plaintext response body into individual lines. WHY: Each line contains a suffix and a count, separated by a colon.
    for (const line of lines) { // WHAT: Iterates through each line in the response. WHY: We need to find our specific hash suffix among the results.
      const [hashSuffix, count] = line.trim().split(':'); // WHAT: Trims whitespace and splits the line by colon into suffix and count. WHY: Separates the matched hash part from the number of times it was breached.
      if (hashSuffix === suffix) { // WHAT: Checks if the returned suffix matches our local suffix. WHY: A match means the password has been exposed in a data breach.
        return { isCompromised: true, count: parseInt(count, 10) }; // WHAT: Returns an object indicating the password is compromised and the breach count. WHY: Allows the caller to inform the user how vulnerable the password is.
      }
    }

    return { isCompromised: false, count: 0 }; // WHAT: Returns not compromised if the loop finishes without a match. WHY: Indicates the password is safe (so far).
  } catch (error) { // WHAT: Catches any errors during the HTTP request. WHY: Fallback mechanism in case of failures.
    console.error('HIBP password check failed:', error.message); // WHAT: Logs the error message to the console. WHY: Aids in debugging and monitoring API health.

    return { isCompromised: false, count: 0 }; // WHAT: Returns false by default on error. WHY: Fail-open design; we shouldn't block user registration/login just because a third-party API is down.
  }
};

module.exports = { checkPassword }; // WHAT: Exports the checkPassword function. WHY: Makes it available for use in other parts of the application.
