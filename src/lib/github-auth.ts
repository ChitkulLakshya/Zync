/**
 * @fileoverview github-auth.ts
 * @module github-auth
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
// Imports the specific authentication provider class for GitHub, a function to trigger a popup window for login, and the User type from Firebase.
import { GithubAuthProvider, linkWithPopup, User } from "firebase/auth";
// Imports the initialized Firebase auth instance to execute the account linking process.
import { auth } from "./firebase";

// Exports an asynchronous function that links a GitHub account to the currently logged-in Firebase user session.
export const linkGithubAccount = async (currentUser: User) => {
  // Checks if a valid user session is provided before attempting to link accounts.
  if (!currentUser) {
    // Throws an error immediately to halt the process if no user is signed in.
    throw new Error("No user is currently logged in.");
  }

  // Instantiates a new GitHub Auth Provider object to configure the specific permissions requested from GitHub.
  const provider = new GithubAuthProvider();

  // Requests the 'repo' scope from GitHub so the application can read and interact with the user's repositories.
  provider.addScope('repo');

  // Requests the 'read:user' scope to access basic profile information like the user's GitHub username and avatar.
  provider.addScope('read:user');

  try {
    // Triggers a browser popup prompting the user to authorize the app via GitHub, linking the result to their current account.
    const result = await linkWithPopup(currentUser, provider);

    // Extracts the GitHub-specific credentials from the successful authentication result.
    const credential = GithubAuthProvider.credentialFromResult(result);
    // Retrieves the raw access token provided by GitHub, required for making authenticated API calls on the user's behalf.
    const accessToken = credential?.accessToken;

    // Checks if the access token was successfully extracted.
    if (!accessToken) {
      // Throws an error if the token is missing, as the backend needs it for integration features.
      throw new Error("Failed to retrieve GitHub Access Token.");
    }

    // Sends a POST request to the custom backend API to securely store the GitHub token and synchronize the user's profile.
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/sync-github`, {
      method: "POST",
      headers: {
        // Specifies that the request body is JSON-formatted.
        "Content-Type": "application/json",
        // Attaches the user's Firebase ID token to authenticate the request with the backend server.
        "Authorization": `Bearer ${await currentUser.getIdToken()}`
      },
      body: JSON.stringify({
        // Sends the user's unique Firebase UID so the backend knows which account to update.
        firebaseUid: currentUser.uid,
        // Sends the raw GitHub access token to be encrypted and stored.
        accessToken: accessToken,
        // Extracts and sends the user's specific GitHub username from the provider data array to link profiles visually.
        username: result.user.providerData.find(p => p.providerId === 'github.com')?.uid
      }),
    });

    // Checks if the backend request was successful.
    if (!response.ok) {
      // Parses the error response from the backend to display a meaningful message to the user.
      const errorData = await response.json();
      // Throws an error containing the backend's message to be caught by the UI.
      throw new Error(errorData.message || "Failed to sync GitHub data with backend.");
    }

    // Returns a success object containing the updated user instance and the retrieved access token for local state updates.
    return {
      success: true,
      user: result.user,
      accessToken
    };

  } catch (error: any) {
    // Logs the full error object to the console for debugging purposes if the linking process fails.
    console.error("Error linking GitHub account:", error);

    // Checks if the error occurred because the GitHub account is already linked to a different Zync user.
    if (error.code === 'auth/credential-already-in-use') {
      // Alerts the user that they cannot link this GitHub account without first unlinking it from the other account.
      alert("This GitHub account is already connected to another Zync account. Please sign in with that account or disconnect it first.");
    } else {
      // Alerts the user with the generic error message for any other type of failure.
      alert(`Error linking GitHub: ${error.message}`);
    }

    // Re-throws the error so the calling component can handle the failure state appropriately (e.g., hiding a loading spinner).
    throw error;
  }
};
