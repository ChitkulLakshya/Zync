/**
 * @fileoverview postLoginRedirect.ts
 * @module postLoginRedirect
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
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
// Imports the User type from Firebase to strongly type the user object passed into the redirect function.
import type { User } from 'firebase/auth';
// Imports the NavigateFunction type from React Router to type the navigation handler.
import type { NavigateFunction } from 'react-router-dom';
// Imports the base API URL to dynamically construct requests to the backend server.
import { API_BASE_URL } from '@/lib/utils';

/** Show Welcome flow for accounts created within this window (first visit only). */
// Defines the time window (48 hours in milliseconds) during which an account is considered "new" and eligible for the welcome screen.
const NEW_USER_WINDOW_MS = 48 * 60 * 60 * 1000;
// Defines a much shorter time window (2 minutes) to detect if the user's current sign-in is their very first sign-in.
const FRESH_SIGNIN_MATCH_WINDOW_MS = 2 * 60 * 1000;

// Defines a helper function that generates a unique local storage key based on the user's ID to track if they've completed the welcome flow.
const welcomeDoneKey = (uid: string) => `zync_welcome_done_${uid}`;

// Defines an asynchronous function to fetch the user's profile from the backend, with built-in retry logic to handle delayed database syncs.
async function fetchMeWithRetry(
  token: string,
  attempts = 5
): Promise<Record<string, unknown> | null> {
  // Loops up to the specified number of attempts to allow the backend time to create the user record after Firebase auth succeeds.
  for (let i = 0; i < attempts; i++) {
    // Sends a GET request to the /me endpoint, passing the Firebase JWT token for authentication.
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // If the request succeeds (status 200-299), parses and returns the JSON response data immediately.
    if (res.ok) {
      return (await res.json()) as Record<string, unknown>;
    }
    // If the record wasn't found (404) and we haven't exhausted our attempts, wait before trying again using an exponential-like backoff.
    if (res.status === 404 && i < attempts - 1) {
      // Delays the next attempt by 400ms multiplied by the current iteration to reduce server load.
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      // Continues to the next iteration of the loop.
      continue;
    }
    // Returns null if the request failed for a reason other than 404 or if all attempts are exhausted.
    return null;
  }
  // Fallback return null if the loop exits without success.
  return null;
}

// Defines a function to evaluate whether a Firebase user account is completely fresh based on its metadata timestamps.
function isFreshFirebaseAccount(user: User): boolean {
  // Extracts the account creation timestamp in milliseconds, handling potential missing data gracefully by returning NaN.
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).getTime()
    : NaN;
  // Extracts the last sign-in timestamp in milliseconds, also handling missing data safely.
  const lastSignIn = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).getTime()
    : NaN;

  // If the creation time is invalid or missing, we cannot safely assume it's a new account, so return false.
  if (Number.isNaN(createdAt)) {
    return false;
  }
  // If the last sign-in time is missing, check if the creation time falls within the generic "new user" window (48 hours).
  if (Number.isNaN(lastSignIn)) {
    return Date.now() - createdAt < NEW_USER_WINDOW_MS;
  }

  // Returns true if the difference between creation and last sign-in is extremely small (within 2 minutes), strongly implying this is their first login.
  return Math.abs(lastSignIn - createdAt) <= FRESH_SIGNIN_MATCH_WINDOW_MS;
}

/**
 * After Firebase auth succeeds, send users to `/welcome` (new accounts) or `/dashboard`.
 * Retries `/me` briefly so Mongo upsert from `useUserSync` can finish.
 */
// Exports the primary routing function called immediately after a user successfully logs in.
export async function postLoginRedirect(navigate: NavigateFunction, user: User): Promise<void> {
  // Checks local storage to see if this specific user has already completed the welcome onboarding flow on this device.
  const done =
    typeof localStorage !== 'undefined' && localStorage.getItem(welcomeDoneKey(user.uid));
  // Initially determines if the account is new based purely on Firebase metadata.
  let isFreshAccount = isFreshFirebaseAccount(user);

  try {
    // Generates a fresh JWT token to authorize the backend fetch request.
    const token = await user.getIdToken();
    // Attempts to fetch the complete user profile from the backend, retrying if the record is still being created.
    const me = await fetchMeWithRetry(token);
    // If the backend returns a valid profile with a createdAt timestamp, use that timestamp for a more accurate evaluation.
    if (me?.createdAt) {
      // Parses the backend creation timestamp into milliseconds.
      const created = new Date(String(me.createdAt)).getTime();
      // If the parsed date is valid, recalculate the fresh account status based on the backend data instead of Firebase.
      if (!Number.isNaN(created)) {
        isFreshAccount = Date.now() - created < NEW_USER_WINDOW_MS;
      }
    }
  } catch {
    // Silently catches and ignores any errors during the fetch, falling back to the initial Firebase-based evaluation.
  }

  // Evaluates the final conditions to determine where the user should be sent.
  if (isFreshAccount && !done) {
    // Navigates new users who haven't completed onboarding to the welcome screen, replacing the current history entry so they can't hit 'back' to return to login.
    navigate('/welcome', { replace: true });
  } else {
    // Navigates returning users directly to the main dashboard.
    navigate('/dashboard', { replace: true });
  }
}

// Exports a utility function used by the welcome screen to mark the onboarding process as complete.
export function markWelcomeComplete(uid: string): void {
  try {
    // Writes a specific flag to local storage using the unique key for this user.
    localStorage.setItem(welcomeDoneKey(uid), '1');
  } catch {
    // Silently ignores errors if local storage is unavailable or restricted (e.g., in incognito mode).
  }
}
