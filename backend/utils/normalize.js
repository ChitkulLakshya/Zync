/**
 * @fileoverview normalize.js
 * @module normalize
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
/**
 * Normalize a Mongoose doc (lean or full) so the frontend sees `id` instead of `_id`.
 */
function normalizeDoc(doc) { // WHAT: Define function to normalize document. WHY: Standardize formatting for frontend.
  if (!doc) return null; // WHAT: Return null if doc is falsy. WHY: Avoid errors on empty documents.
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }; // WHAT: Convert to plain JS object. WHY: Handle both Mongoose models and lean objects.
  if (obj._id) { // WHAT: Check for _id property. WHY: Needs to be converted to 'id'.
    obj.id = obj._id.toString(); // WHAT: Create 'id' property as string. WHY: Frontend expects string ID.
    delete obj._id; // WHAT: Remove '_id' property. WHY: Ensure frontend consistency and prevent leaks of internal DB fields.
  }
  delete obj.__v; // WHAT: Delete version key. WHY: Not needed by the frontend.


  if (obj.githubIntegration) delete obj.githubIntegration.accessToken; // WHAT: Check and delete github token. WHY: Security, never send tokens to frontend.
  delete obj.deleteConfirmationCode; // WHAT: Delete confirmation code. WHY: Sensitive internal state.
  delete obj.deleteConfirmationExpires; // WHAT: Delete confirmation expiry. WHY: Internal state not useful for frontend.
  delete obj.phoneVerificationCode; // WHAT: Delete phone verification code. WHY: Sensitive data to protect against leaks.
  delete obj.phoneVerificationCodeExpires; // WHAT: Delete phone verification expiry. WHY: Clean up response payload.

  return obj; // WHAT: Return normalized object. WHY: Output the sanitized data.
}

function normalizeDocs(docs) { // WHAT: Define function to normalize array of documents. WHY: Bulk process documents.
  return (docs || []).map(normalizeDoc); // WHAT: Map over documents array. WHY: Apply normalizeDoc to each element, handling null arrays safely.
}

module.exports = { normalizeDoc, normalizeDocs }; // WHAT: Export functions. WHY: Make utilities available to controllers.
