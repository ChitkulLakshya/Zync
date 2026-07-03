/**
 * @fileoverview use-task-updates.ts
 * @module use-task-updates
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
import { useEffect, useCallback, useRef } from 'react'; // Imports the useEffect, useCallback, and useRef hooks from the 'react' library, which are used for handling side effects, memoizing functions, and creating references to DOM nodes or values, respectively.
import {
  connectTaskSocket, // Imports the connectTaskSocket function, which establishes a connection to the task socket, allowing the application to receive task updates.
  disconnectTaskSocket, // Imports the disconnectTaskSocket function, which severs the connection to the task socket, stopping the flow of task updates.
  joinProject, // Imports the joinProject function, which adds the user to a specific project room, enabling them to receive task updates for that project.
  leaveProject, // Imports the leaveProject function, which removes the user from a specific project room, preventing them from receiving task updates for that project.
  onTaskCreated, // Imports the onTaskCreated function, which sets up a listener for when a new task is created, triggering a callback with the task data.
  onTaskUpdated, // Imports the onTaskUpdated function, which sets up a listener for when a task is updated, triggering a callback with the updated task data.
  onTaskDeleted, // Imports the onTaskDeleted function, which sets up a listener for when a task is deleted, triggering a callback with the deleted task data.
  onTaskAssigned, // Imports the onTaskAssigned function, which sets up a listener for when a task is assigned, triggering a callback with the assigned task data.
  TaskEvent, // Imports the TaskEvent type, which represents the data associated with a task event, such as creation, update, deletion, or assignment.
} from '@/services/taskSocketService'; // Imports these functions and types from the taskSocketService module, which handles the underlying task socket connection and event listeners.

interface UseTaskUpdatesOptions { // Defines the UseTaskUpdatesOptions interface, which specifies the shape of the options object passed to the useTaskUpdates hook.
  userId: string | undefined; // The userId property, which is either a string representing the user's ID or undefined if no user is logged in.
  projectIds?: string[]; // The projectIds property, which is an optional array of strings representing the IDs of the projects to join.
  onTaskChange?: (event: 'created' | 'updated' | 'deleted' | 'assigned', data: TaskEvent) => void; // The onTaskChange property, which is an optional callback function that will be triggered when a task event occurs, receiving the event type and task data as arguments.
}

/**
 * Hook that connects to the task socket and triggers a callback
 * whenever task data changes. Optionally joins specific project rooms.
 */
export function useTaskUpdates({ userId, projectIds, onTaskChange }: UseTaskUpdatesOptions) { // Defines the useTaskUpdates hook, which takes an options object with userId, projectIds, and onTaskChange properties.
  const onTaskChangeRef = useRef(onTaskChange); // Creates a reference to the onTaskChange callback function using the useRef hook, allowing it to be updated and accessed across re-renders.
  onTaskChangeRef.current = onTaskChange; // Updates the current value of the onTaskChangeRef to the latest onTaskChange callback function, ensuring that the correct callback is used when handling task events.

  useEffect(() => { // Uses the useEffect hook to handle the side effect of connecting to the task socket when the component mounts or the userId changes.
    if (!userId) { return; } // If the userId is falsy, returns immediately, as there is no user to connect to the task socket.

    connectTaskSocket(userId); // Connects to the task socket using the provided userId, enabling the application to receive task updates.

    return () => { // Returns a cleanup function that will be executed when the component unmounts or the userId changes.
      disconnectTaskSocket(); // Disconnects from the task socket, stopping the flow of task updates.
    };
  }, [userId]); // Specifies that the effect should re-run when the userId changes, ensuring that the task socket connection is updated accordingly.

  const prevProjectIdsRef = useRef<Set<string>>(new Set()); // Creates a reference to a set of previous project IDs using the useRef hook, allowing it to be updated and accessed across re-renders.

  useEffect(() => { // Uses the useEffect hook to handle the side effect of joining or leaving project rooms when the projectIds change.
    if (!userId || !projectIds) { return; } // If the userId or projectIds are falsy, returns immediately, as there is no user or projects to join.

    const currentIds = new Set(projectIds); // Creates a set of the current project IDs from the projectIds array.
    const prevIds = prevProjectIdsRef.current; // Retrieves the previous set of project IDs from the prevProjectIdsRef.

    for (const id of currentIds) { // Iterates over the current project IDs.
      if (!prevIds.has(id)) { // If the previous set of project IDs does not include the current ID, joins the project room.
        joinProject(id); // Joins the project room with the specified ID, enabling the application to receive task updates for that project.
      }
    }

    for (const id of prevIds) { // Iterates over the previous set of project IDs.
      if (!currentIds.has(id)) { // If the current set of project IDs does not include the previous ID, leaves the project room.
        leaveProject(id); // Leaves the project room with the specified ID, preventing the application from receiving task updates for that project.
      }
    }

    prevProjectIdsRef.current = currentIds; // Updates the previous set of project IDs to the current set.

    return () => { // Returns a cleanup function that will be executed when the component unmounts or the projectIds change.
      for (const id of currentIds) { // Iterates over the current project IDs.
        leaveProject(id); // Leaves the project room with the specified ID, preventing the application from receiving task updates for that project.
      }
    };
  }, [userId, projectIds]); // Specifies that the effect should re-run when the userId or projectIds change, ensuring that the project room membership is updated accordingly.

  useEffect(() => { // Uses the useEffect hook to handle the side effect of setting up task event listeners when the component mounts or the userId changes.
    if (!userId) { return; } // If the userId is falsy, returns immediately, as there is no user to set up task event listeners for.

    const unsubCreated = onTaskCreated((data) => { // Sets up a listener for when a new task is created, triggering a callback with the task data.
      onTaskChangeRef.current?.('created', data); // Calls the onTaskChange callback function with the 'created' event type and task data, if it exists.
    });

    const unsubUpdated = onTaskUpdated((data) => { // Sets up a listener for when a task is updated, triggering a callback with the updated task data.
      onTaskChangeRef.current?.('updated', data); // Calls the onTaskChange callback function with the 'updated' event type and task data, if it exists.
    });

    const unsubDeleted = onTaskDeleted((data) => { // Sets up a listener for when a task is deleted, triggering a callback with the deleted task data.
      onTaskChangeRef.current?.('deleted', data); // Calls the onTaskChange callback function with the 'deleted' event type and task data, if it exists.
    });

    const unsubAssigned = onTaskAssigned((data) => { // Sets up a listener for when a task is assigned, triggering a callback with the assigned task data.
      onTaskChangeRef.current?.('assigned', data); // Calls the onTaskChange callback function with the 'assigned' event type and task data, if it exists.
    });

    return () => { // Returns a cleanup function that will be executed when the component unmounts or the userId changes.
      unsubCreated(); // Unsubscribes from the task created event listener.
      unsubUpdated(); // Unsubscribes from the task updated event listener.
      unsubDeleted(); // Unsubscribes from the task deleted event listener.
      unsubAssigned(); // Unsubscribes from the task assigned event listener.
    };
  }, [userId]); // Specifies that the effect should re-run when the userId changes, ensuring that the task event listeners are updated accordingly.
}