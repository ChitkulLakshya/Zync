/**
 * @fileoverview useMe.ts
 * @module useMe
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
import { useQuery } from '@tanstack/react-query'; // Imports the 'useQuery' hook from '@tanstack/react-query' to enable data fetching and caching, which is necessary for this feature to manage data retrieval and updates.
import { auth } from '@/lib/firebase'; // Imports the 'auth' object from the 'firebase' library, which is required to interact with the Firebase authentication system and manage user sessions.
import { API_BASE_URL } from '@/lib/utils'; // Imports the 'API_BASE_URL' constant from the 'utils' module, which defines the base URL for API requests and is needed to construct API endpoints.
import { useState, useEffect } from 'react'; // Imports the 'useState' and 'useEffect' hooks from the 'react' library, which are necessary for managing state and side effects in functional components.
import { onAuthStateChanged, User } from 'firebase/auth'; // Imports the 'onAuthStateChanged' function and 'User' type from the 'firebase/auth' module, which are required to monitor authentication state changes and interact with user data.

export interface Team { // Defines the 'Team' interface, which represents a team entity and is needed to specify the structure of team data.
  id: string; // The unique identifier of the team, which is necessary to distinguish between teams.
  name: string; // The name of the team, which is required to display team information.
  ownerId: string; // The ID of the team owner, which is necessary to manage team membership and permissions.
  members: string[]; // The list of team members, which is required to manage team collaboration and communication.
  inviteCode?: string; // The optional invite code for the team, which can be used to invite new members.
  [key: string]: any; // Allows additional properties to be added to the team object, which provides flexibility in storing custom team data.
}

export interface UserData { // Defines the 'UserData' interface, which represents user data and is necessary to specify the structure of user information.
  id: string; // The unique identifier of the user, which is necessary to distinguish between users.
  uid: string; // The user ID from the authentication system, which is required to interact with user data.
  email: string; // The user's email address, which is necessary for communication and authentication.
  displayName?: string; // The optional display name of the user, which can be used to display user information.
  photoURL?: string; // The optional photo URL of the user, which can be used to display user profiles.
  teamId?: Team | string | null; // The optional team ID or team object, which is necessary to manage team membership and collaboration.
  teamMemberships?: string[]; // The optional list of team memberships, which can be used to manage team collaboration and communication.
  closeFriends?: string[]; // The optional list of close friends, which can be used to manage social relationships.
  timezone?: string | null; // The optional timezone of the user, which can be used to manage date and time formatting.
  country?: string | null; // The optional country of the user, which can be used to manage location-based services.
  countryCode?: string | null; // The optional country code of the user, which can be used to manage location-based services.
  city?: string | null; // The optional city of the user, which can be used to manage location-based services.
  [key: string]: any; // Allows additional properties to be added to the user object, which provides flexibility in storing custom user data.
}

export const useMe = () => { // Defines the 'useMe' hook, which is used to fetch and manage user data and is necessary to provide user information to components.
  const [user, setUser] = useState<User | null>(auth.currentUser); // Initializes the 'user' state variable to the current authenticated user, which is necessary to manage user sessions and authentication state.
  // The 'useState' hook is used to create a state variable and an 'Updater' function to manage the state, which is necessary for functional components to manage state changes.

  useEffect(() => { // Uses the 'useEffect' hook to run a side effect when the component mounts or updates, which is necessary to manage authentication state changes and update the 'user' state variable.
    return onAuthStateChanged(auth, (u) => { // Calls the 'onAuthStateChanged' function to monitor authentication state changes and update the 'user' state variable, which is necessary to manage user sessions and authentication state.
      setUser(u); // Updates the 'user' state variable with the new authentication state, which is necessary to reflect changes in the authentication state.
    });
  }, []); // The empty dependency array means the effect will only run once when the component mounts, which is necessary to prevent unnecessary re-renders and optimize performance.

  return useQuery<UserData | null>({ // Uses the 'useQuery' hook to fetch and manage user data, which is necessary to provide user information to components and manage data fetching and caching.
    queryKey: ['me', user?.uid], // Defines the query key as an array containing the string 'me' and the user's UID, which is necessary to identify the query and manage caching.
    queryFn: async () => { // Defines the query function to fetch user data, which is necessary to retrieve user information from the API.
      if (!user) { // Checks if the 'user' state variable is null or undefined, which is necessary to handle cases where the user is not authenticated.
        return null; // Returns null if the user is not authenticated, which is necessary to handle cases where the user is not authenticated.
      }

      const token = await user.getIdToken(); // Calls the 'getIdToken' method to obtain an ID token for the authenticated user, which is necessary to authenticate API requests.
      const res = await fetch(`${API_BASE_URL}/api/users/me`, { // Makes a GET request to the '/api/users/me' endpoint to fetch user data, which is necessary to retrieve user information from the API.
        headers: { // Defines the request headers, which are necessary to authenticate the request and specify the request format.
          Authorization: `Bearer ${token}`, // Includes the ID token in the 'Authorization' header to authenticate the request, which is necessary to authenticate API requests.
        },
      });

      if (!res.ok) { // Checks if the response is not OK (200-299), which is necessary to handle error cases and exceptions.
        if (res.status === 404) { // Checks if the response status is 404 (Not Found), which is necessary to handle cases where the user data is not found.
          return null; // Returns null if the user data is not found, which is necessary to handle cases where the user data is not found.
        }
        throw new Error('Failed to fetch user data'); // Throws an error if the response is not OK and not 404, which is necessary to handle error cases and exceptions.
      }

      const data = await res.json(); // Parses the response data as JSON, which is necessary to retrieve user information from the response.
      if (!data || typeof data !== 'object' || !data.uid) { // Checks if the response data is invalid or missing the 'uid' property, which is necessary to handle error cases and exceptions.
        throw new Error('Invalid user data'); // Throws an error if the response data is invalid, which is necessary to handle error cases and exceptions.
      }

      if (data.teamId && typeof data.teamId === 'object' && data.teamId.id) { // Checks if the 'teamId' property is an object with an 'id' property, which is necessary to handle cases where the team ID is an object.

      } else if (data.teamId && typeof data.teamId === 'object' && data.teamId._id) { // Checks if the 'teamId' property is an object with an '_id' property, which is necessary to handle cases where the team ID is an object with an '_id' property.
        data.teamId.id = data.teamId._id.toString(); // Converts the '_id' property to a string and assigns it to the 'id' property, which is necessary to normalize the team ID format.
      }

      return data; // Returns the fetched user data, which is necessary to provide user information to components.
    },
    enabled: !!user, // Enables the query only if the 'user' state variable is truthy, which is necessary to prevent unnecessary queries when the user is not authenticated.

    staleTime: Number.POSITIVE_INFINITY, // Sets the stale time to infinity, which means the query will never be considered stale and will always return the cached data, which is necessary to optimize performance and reduce unnecessary re-queries.
    refetchOnMount: false, // Disables refetching on mount, which means the query will not be refetched when the component mounts, which is necessary to prevent unnecessary re-queries and optimize performance.
    refetchOnWindowFocus: false, // Disables refetching on window focus, which means the query will not be refetched when the window regains focus, which is necessary to prevent unnecessary re-queries and optimize performance.
    retry: 2, // Sets the retry count to 2, which means the query will be retried up to 2 times if it fails, which is necessary to handle error cases and exceptions.
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // Defines the retry delay function, which calculates the delay between retries based on the attempt number, which is necessary to handle error cases and exceptions.
  });
};