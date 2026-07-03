/**
 * @fileoverview query-client.ts
 * @module query-client
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
// Imports the core QueryClient class from TanStack Query to manage the application's global data fetching state and cache.
import { QueryClient } from "@tanstack/react-query";

/** Keep cached query data on disk (PersistQueryClient) and in memory for a week. */
// Defines a constant representing exactly one week in milliseconds (1000ms * 60s * 60m * 24h * 7d) to determine how long inactive cache data is kept before garbage collection.
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

/** Default: treat server data as fresh for 24h so navigation/refresh uses cache first. */
// Defines a constant representing exactly one day in milliseconds to prevent redundant network requests for data that changes infrequently.
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

// Instantiates and exports a singleton QueryClient that will wrap the entire React application.
export const queryClient = new QueryClient({
  // Configures the global fallback settings for all queries that do not specify their own individual options.
  defaultOptions: {
    queries: {
      // Sets the garbage collection time (gcTime) to one week, ensuring offline data persists across sessions.
      gcTime: ONE_WEEK_MS,
      // Sets the stale time to one day, meaning data fetched within the last 24 hours is considered fresh and won't trigger automatic background refetches.
      staleTime: ONE_DAY_MS,
      // Disables automatic refetching when the user switches browser tabs and returns, reducing unnecessary server load.
      refetchOnWindowFocus: false,
      // Enables automatic refetching when the device regains network connectivity after being offline.
      refetchOnReconnect: true,
      // Configures queries to automatically retry failed network requests up to 2 times before throwing an error to the UI.
      retry: 2,
    },
  },
});
