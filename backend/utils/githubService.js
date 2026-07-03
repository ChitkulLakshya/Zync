/**
 * @fileoverview githubService.js
 * @module githubService
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
const { App } = require('octokit'); // WHAT: Imports the App class from octokit. WHY: Used to initialize and interact with the GitHub App SDK.
const User = require('../models/User'); // WHAT: Imports the User database model. WHY: Needed to retrieve user data containing GitHub configurations from the database.
const { decrypt } = require('./encryption'); // WHAT: Imports the decrypt utility function. WHY: Required to decrypt the securely stored GitHub credentials for a user.


const getUserApp = async (userId) => { // WHAT: Defines an async function to get a configured Octokit App instance for a user. WHY: Provides an authenticated client ready to interact with GitHub on the user's behalf.
  const user = await User.findOne({ uid: userId }).lean(); // WHAT: Queries the database for a user by their ID and returns a plain JS object. WHY: Retrieves the user's profile to access their GitHub integration settings.
  const github = user?.githubIntegration; // WHAT: Safely extracts the githubIntegration object from the user data. WHY: Convenient shorthand for accessing nested configuration properties.

  if (!user || !github?.encryptedAppId || !github?.encryptedPrivateKey) { // WHAT: Checks if necessary GitHub config data is missing. WHY: Ensures the function doesn't proceed if the user hasn't fully set up their GitHub integration.
    throw new Error('User has not configured GitHub App settings.'); // WHAT: Throws an error if configuration is incomplete. WHY: Alerts the caller that the operation cannot proceed without proper setup.
  }

  const appId = decrypt(github.encryptedAppId); // WHAT: Decrypts the stored GitHub App ID. WHY: The App ID is encrypted at rest and needs to be plaintext to initialize Octokit.
  const privateKey = decrypt(github.encryptedPrivateKey); // WHAT: Decrypts the stored GitHub private key. WHY: Required for cryptographic signing by the Octokit App instance.

  if (!appId || !privateKey) { // WHAT: Validates that decryption was successful and values are present. WHY: Prevents initialization with invalid credentials if decryption fails.
    throw new Error('Failed to decrypt GitHub credentials.'); // WHAT: Throws an error if decryption yields falsy values. WHY: Halts execution to avoid misleading SDK errors later.
  }

  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n'); // WHAT: Formats the private key string to have real newline characters. WHY: The crypto libraries underlying Octokit require standard PEM format with newlines.

  return new App({ // WHAT: Instantiates and returns a new Octokit App. WHY: Creates the client configured with the user's specific GitHub App credentials.
    appId: appId, // WHAT: Passes the decrypted App ID. WHY: Tells Octokit which App this is.
    privateKey: formattedPrivateKey, // WHAT: Passes the correctly formatted private key. WHY: Allows Octokit to sign requests and generate JWTs.
  });
};


const getUserInstallationId = async (userId) => { // WHAT: Defines an async function to retrieve a user's GitHub App installation ID. WHY: Needed to generate access tokens for specific repositories the user has installed the app on.
  const user = await User.findOne({ uid: userId }).lean(); // WHAT: Queries the database for the user profile. WHY: Needed to read the installation ID stored during setup.
  const github = user?.githubIntegration; // WHAT: Safely extracts the GitHub integration sub-document. WHY: Makes accessing the property simpler and avoids undefined errors.
  if (!github?.installationId) { // WHAT: Checks if the installation ID exists. WHY: Handles cases where a user connected their app but hasn't completed the repository installation step.
    return null; // WHAT: Returns null if no installation is found. WHY: Indicates the absence of an installation rather than throwing an error.
  }
  return github.installationId; // WHAT: Returns the valid installation ID. WHY: Provides the ID to the caller for further GitHub API requests.
};


const checkGithubConfig = async (userId) => { // WHAT: Defines a function to verify if a user has configured their GitHub App. WHY: Useful for conditional UI rendering or pre-flight checks before sync operations.
  const user = await User.findOne({ uid: userId }).lean(); // WHAT: Retrieves the user document from the database. WHY: Needed to inspect the current state of their integration.
  const github = user?.githubIntegration; // WHAT: Accesses the integration settings securely. WHY: Prepares for the presence check.
  return !!(github?.encryptedAppId && github?.encryptedPrivateKey); // WHAT: Returns a boolean indicating if both encrypted fields exist. WHY: A simple true/false answers if the basic setup is complete.
};


const getInstallationRepositories = async (userId, installationId) => { // WHAT: Defines a function to list repositories accessible to a specific installation. WHY: Allows the app to show users which repos they can manage or sync.
  try { // WHAT: Opens a try-catch block for API calls. WHY: Ensures robust error handling for network or authentication failures.
    const app = await getUserApp(userId); // WHAT: Retrieves the configured Octokit App instance for the user. WHY: Bootstraps the authenticated client needed for the request.
    const octokit = await app.getInstallationOctokit(installationId); // WHAT: Obtains an Octokit client authenticated specifically for the given installation ID. WHY: Required to access the resources (repositories) granted to that installation.

    const response = await octokit.request('GET /installation/repositories', { // WHAT: Makes a GET request to the GitHub REST API. WHY: Fetches the list of repositories the installation has permission to access.
      headers: { // WHAT: Defines custom headers for the request. WHY: Necessary for versioning and format specification.
        'X-GitHub-Api-Version': '2022-11-28' // WHAT: Specifies the GitHub API version. WHY: Ensures compatibility and stable API behavior.
      },
      per_page: 100 // WHAT: Requests up to 100 repositories per page. WHY: Maximizes the number of results returned in a single call to reduce pagination overhead.
    });

    return response.data.repositories.map(repo => ({ // WHAT: Maps over the returned repository array. WHY: Transforms the complex GitHub response into a simplified, uniform object format for the application.
      id: repo.id.toString(), // WHAT: Extracts and stringifies the repository ID. WHY: Normalizes the ID format to prevent integer overflow issues in JS.
      name: repo.name, // WHAT: Extracts the repository's short name. WHY: Useful for concise display in UI.
      full_name: repo.full_name, // WHAT: Extracts the owner/repo format name. WHY: Required for many other GitHub API operations referencing the repo.
      private: repo.private, // WHAT: Extracts the privacy status. WHY: Helps UI indicate if a repo is public or private.
      html_url: repo.html_url // WHAT: Extracts the web URL. WHY: Allows linking users directly to the repository on GitHub.
    }));

  } catch (error) { // WHAT: Catches any errors from the Octokit API process. WHY: Prevents unhandled rejections and standardizes the error output.
    console.error(`Error fetching repos for installation ${installationId}:`, error.message); // WHAT: Logs the failure details. WHY: Aids in backend debugging and monitoring.
    throw new Error('Failed to fetch repositories from GitHub'); // WHAT: Throws a generic user-friendly error. WHY: Hides potentially sensitive API error details from the frontend while indicating failure.
  }
};

module.exports = { // WHAT: Exports the utility functions. WHY: Exposes the GitHub service methods for use in controllers and other services.
  getUserApp, // WHAT: Exports the getUserApp method.
  getUserInstallationId, // WHAT: Exports the getUserInstallationId method.
  getInstallationRepositories, // WHAT: Exports the getInstallationRepositories method.
  checkGithubConfig // WHAT: Exports the checkGithubConfig method.
};
