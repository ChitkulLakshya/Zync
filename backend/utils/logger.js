/**
 * @fileoverview logger.js
 * @module logger
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
// WHAT: Defines a custom logger object. WHY: Acts as a wrapper around standard console methods to suppress output during automated testing.
const logger = { // WHAT: Create logger object. WHY: To group logging functions.
  // WHAT: Defines info method. WHY: To log general information.
  info: (...args) => { // WHAT: Accept arguments via rest operator. WHY: To allow flexible number of arguments.
    // WHAT: Check if environment is not 'test'. WHY: To avoid cluttering test output with logs.
    if (process.env.NODE_ENV !== 'test') { // WHAT: Evaluate environment variable. WHY: Test environment shouldn't show info logs.
      // WHAT: Call console.log. WHY: To print the actual informational messages.
      console.log(...args); // WHAT: Spread arguments. WHY: To pass all received arguments to console.log.
    }
  },
  // WHAT: Defines warn method. WHY: To log non-fatal warnings.
  warn: (...args) => { // WHAT: Accept arguments for warn. WHY: Flexible arguments.
    // WHAT: Suppress warning output if environment is 'test'. WHY: Keep test runner output clean.
    if (process.env.NODE_ENV !== 'test') { // WHAT: Check environment variable. WHY: Conditional logging.
      // WHAT: Call console.warn. WHY: To print standard error stream with warning formatting.
      console.warn(...args); // WHAT: Spread arguments. WHY: Pass all warning details.
    }
  },
  // WHAT: Defines error method. WHY: To log critical failures and exceptions.
  error: (...args) => { // WHAT: Accept arguments for error. WHY: Capture all error details.
    // WHAT: Check environment against 'test'. WHY: Prevent expected errors from cluttering test logs.
    if (process.env.NODE_ENV !== 'test') { // WHAT: Conditional check. WHY: Testing doesn't need to see console errors if they are expected.
      // WHAT: Call console.error. WHY: Print arguments to standard error stream.
      console.error(...args); // WHAT: Spread arguments. WHY: Correct formatting of errors.
    }
  },
  // WHAT: Defines debug method. WHY: Intended for highly verbose, development-only logging.
  debug: (...args) => { // WHAT: Accept arguments for debug. WHY: Debugging might need multiple data points.
    // WHAT: Check environment against production and test. WHY: Performance/security in prod, cleanliness in test.
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') { // WHAT: Evaluate NODE_ENV. WHY: Ensure debug logs only show in development/local environments.
      // WHAT: Call console.log. WHY: Print debug info to standard output.
      console.log(...args); // WHAT: Spread arguments. WHY: Accurately dump all debug data.
    }
  }
};

// WHAT: Exports the logger object. WHY: Allow other files to use it instead of direct console calls.
module.exports = logger; // WHAT: Assign to module.exports. WHY: Expose the object for CommonJS imports.
