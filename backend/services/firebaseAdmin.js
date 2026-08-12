/**
 * @fileoverview firebaseAdmin.js
 * @module firebaseAdmin
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
 * What: Initializes and provides access to the Firebase Admin SDK and Firestore database instance.
 * Why: Ensures that Firebase is initialized exactly once per backend lifecycle (singleton pattern) using secure credentials, avoiding initialization errors during hot reloads or multiple invocations.
 */
// WHAT: Import Firebase app management. WHY: Necessary to set up Firebase Admin SDK.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
// WHAT: Import Firestore accessor. WHY: Allows getting a database reference.
const { getFirestore } = require('firebase-admin/firestore');

// WHAT: Hold Firestore instance. WHY: Implements singleton pattern for database.
let firestoreInstance = null;
// WHAT: Track init attempts. WHY: Prevents multiple initialization loops on failure.
let attemptedInit = false;

// WHAT: Parse service account JSON. WHY: Environment vars often mangle strings.
const parseServiceAccount = () => {
  // WHAT: Read raw key. WHY: Keeps credentials out of source.
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  // WHAT: Return null if missing. WHY: Graceful fallback.
  if (!raw) return null;

  // WHAT: Trim whitespace. WHY: Removes accidental spaces.
  let normalized = raw.trim();
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1);
  }

  // WHAT: Parse to object. WHY: Firebase SDK requires an object.
  const parsed = JSON.parse(normalized);
  if (parsed?.private_key && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
};

// WHAT: Get Firestore instance. WHY: Centralized database access.
const getFirestoreAdmin = () => {
  // WHAT: Return existing instance. WHY: Enforces singleton.
  if (firestoreInstance) return firestoreInstance;
  if (attemptedInit) return null;

  // WHAT: Mark init attempt. WHY: Prevents retry loops.
  attemptedInit = true;
  try {
    // WHAT: Parse credentials. WHY: Required to authenticate with GCP.
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      console.warn('[FirebaseAdmin] GCP_SERVICE_ACCOUNT_KEY not set; Firestore sync disabled.');
      return null;
    }

    // WHAT: Check if already initialized. WHY: Prevents "app already exists" errors.
    if (!getApps().length) {
      // WHAT: Initialize default app. WHY: Establishes connection.
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }

    // WHAT: Retrieve Firestore instance. WHY: Creates client for data access.
    firestoreInstance = getFirestore();
    return firestoreInstance;
  } catch (error) {
    console.error('[FirebaseAdmin] Failed to initialize firebase-admin:', error.message);
    return null;
  }
};

// WHAT: Export getter. WHY: Exposes Firestore to other modules.
module.exports = { getFirestoreAdmin };
