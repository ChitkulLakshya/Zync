/**
 * @fileoverview use-user-sync.ts
 * @module use-user-sync
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
import { useEffect, useRef } from 'react'; // Imports the useEffect and useRef hooks from the 'react' library, which are used for handling side effects and creating mutable references, respectively.
import { auth } from '@/lib/firebase'; // Imports the 'auth' object from the 'firebase' library, which is used for authentication purposes.
import { useQueryClient } from '@tanstack/react-query'; // Imports the useQueryClient hook from the '@tanstack/react-query' library, which is used for managing data fetching and caching.
import { API_BASE_URL } from '@/lib/utils'; // Imports the API_BASE_URL constant from the 'utils' library, which is used as the base URL for API requests.
import { detectLocation } from '@/api/geo'; // Imports the detectLocation function from the 'geo' API, which is used for detecting the user's location.

export const useUserSync = () => { // Defines a custom hook named 'useUserSync', which is used for synchronizing user data.
  const queryClient = useQueryClient(); // Initializes the queryClient variable using the useQueryClient hook, which is used for managing data fetching and caching.
  const syncInProgress = useRef(false); // Initializes the syncInProgress variable using the useRef hook, which is used for creating a mutable reference to track whether the sync is in progress.

  useEffect(() => { // Uses the useEffect hook to handle side effects, such as setting up event listeners or making API requests, when the component mounts or updates.
    const shouldSyncInDev = // Defines a variable 'shouldSyncInDev' to determine whether to sync user data in development mode.
      String(import.meta.env.VITE_ENABLE_DEV_USER_SYNC || '').toLowerCase() === 'true'; // Checks the value of the VITE_ENABLE_DEV_USER_SYNC environment variable and converts it to a boolean value.

    const unsubscribe = auth.onAuthStateChanged(async (user) => { // Sets up an event listener for the 'onAuthStateChanged' event of the 'auth' object, which is triggered when the user's authentication state changes.
      if (user && !syncInProgress.current) { // Checks if the user is authenticated and the sync is not already in progress.
        if (import.meta.env.DEV && !shouldSyncInDev) { // Checks if the application is running in development mode and if the 'shouldSyncInDev' variable is false.
          return; // If the conditions are met, the function returns without executing the rest of the code.
        }
        syncInProgress.current = true; // Sets the 'syncInProgress' variable to true to indicate that the sync is in progress.
        const displayName = user.displayName || ''; // Retrieves the user's display name from the 'user' object, defaulting to an empty string if it's not available.
        const parts = displayName.trim().split(' '); // Splits the display name into individual parts (e.g., first name and last name).
        const firstName = parts[0] || ''; // Retrieves the first part of the display name (e.g., the first name).
        const lastName = parts.slice(1).join(' ') || ''; // Retrieves the remaining parts of the display name (e.g., the last name).


        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Retrieves the user's browser timezone using the 'Intl.DateTimeFormat' API.

        try { // Starts a try-catch block to handle any errors that may occur during the execution of the code.
          const token = await user.getIdToken; // Retrieves the user's ID token using the 'getIdToken' method of the 'user' object.

          const syncRes = await fetch(`${API_BASE_URL}/api/users/sync`, { // Makes a POST request to the '/api/users/sync' endpoint to synchronize the user's data.
            method: 'POST', // Specifies the request method as 'POST'.
            headers: { // Specifies the request headers.
              'Content-Type': 'application/json', // Sets the 'Content-Type' header to 'application/json' to indicate that the request body contains JSON data.
              Authorization: `Bearer ${token}`, // Sets the 'Authorization' header to include the user's ID token.
            },
            body: JSON.stringify({ // Converts the request body to a JSON string.
              uid: user.uid, // Includes the user's UID in the request body.
              email: user.email, // Includes the user's email in the request body.
              displayName: user.displayName, // Includes the user's display name in the request body.
              photoURL: user.photoURL, // Includes the user's photo URL in the request body.
              firstName, // Includes the user's first name in the request body.
              lastName, // Includes the user's last name in the request body.
              timezone: browserTimezone, // Includes the user's browser timezone in the request body.
            }),
          });
          if (!syncRes.ok) { // Checks if the response is not OK (200-299).
            throw new Error(`User sync failed: ${syncRes.status}`); // Throws an error with the response status code if the response is not OK.
          }


          detectLocation().catch(() => {}); // Calls the 'detectLocation' function to detect the user's location, and catches any errors that may occur.


          await queryClient.prefetchQuery({ // Prefetches the user's data using the 'prefetchQuery' method of the 'queryClient' object.
            queryKey: ['me', user.uid], // Specifies the query key as an array containing the string 'me' and the user's UID.
            queryFn: async () => { // Specifies the query function as an async function.
              const res = await fetch(`${API_BASE_URL}/api/users/me`, { // Makes a GET request to the '/api/users/me' endpoint to retrieve the user's data.
                headers: { Authorization: `Bearer ${token}` }, // Includes the user's ID token in the 'Authorization' header.
              });
              if (!res.ok) { // Checks if the response is not OK (200-299).
                if (res.status === 404) { // Checks if the response status code is 404 (Not Found).
                  return null; // Returns null if the response status code is 404.
                }
                throw new Error('Failed to fetch user data'); // Throws an error if the response is not OK and the status code is not 404.
              }
              const data = await res.json(); // Parses the response data as JSON.
              if (!data || typeof data !== 'object' || !data.uid) { // Checks if the data is not a valid object or does not contain a 'uid' property.
                throw new Error('Invalid user data'); // Throws an error if the data is invalid.
              }
              return data; // Returns the user's data if it is valid.
            },
          });
        } catch { // Catches any errors that may occur during the execution of the code.

        } finally { // Executes the code in the finally block regardless of whether an error occurred.
          syncInProgress.current = false; // Sets the 'syncInProgress' variable to false to indicate that the sync is complete.
        }
      } else if (!user) { // Checks if the user is not authenticated.
        syncInProgress.current = false; // Sets the 'syncInProgress' variable to false to indicate that the sync is not in progress.
      }
    });

    return () => unsubscribe(); // Returns a function that unsubscribes from the 'onAuthStateChanged' event listener when the component unmounts.
  }, [queryClient]); // Specifies the 'queryClient' object as a dependency for the useEffect hook, so that the effect is re-run when the 'queryClient' object changes.
};