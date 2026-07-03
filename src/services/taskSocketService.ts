/**
 * @fileoverview taskSocketService.ts
 * @module taskSocketService
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
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@/lib/utils';

export interface TaskEvent {
  projectId: string;
  stepId?: string;
  taskId?: string;
  task?: any;
  tasks?: any[];
  changes?: any;
  actor?: string;
  projectName?: string;
}

type TaskEventCallback = (data: TaskEvent) => void;

let socket: Socket | null = null;
const createdListeners = new Set<TaskEventCallback>();
const updatedListeners = new Set<TaskEventCallback>();
const deletedListeners = new Set<TaskEventCallback>();
const assignedListeners = new Set<TaskEventCallback>();

const joinedProjects = new Set<string>();

/**
 * Connect to the /tasks namespace. Safe to call multiple times.
 */
export function connectTaskSocket(userId: string): Socket {
  if (socket?.connected) {return socket;}

  const socketUrl = SOCKET_BASE_URL;

  socket = io(`${socketUrl}/tasks`, {
    query: { userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('task-created', (data: TaskEvent) => {
    createdListeners.forEach(cb => cb(data));
  });

  socket.on('task-updated', (data: TaskEvent) => {
    updatedListeners.forEach(cb => cb(data));
  });

  socket.on('task-deleted', (data: TaskEvent) => {
    deletedListeners.forEach(cb => cb(data));
  });

  socket.on('task-assigned', (data: TaskEvent) => {
    assignedListeners.forEach(cb => cb(data));
  });


  socket.on('connect', () => {
    joinedProjects.forEach(projectId => {
      socket?.emit('join-project', projectId);
    });
  });

  return socket;
}

export function disconnectTaskSocket() {
  socket?.disconnect();
  socket = null;
  joinedProjects.clear();
}

export function getTaskSocket(): Socket | null {
  return socket;
}

/** Join a project room to receive its task events */
export function joinProject(projectId: string) {
  joinedProjects.add(projectId);
  socket?.emit('join-project', projectId);
}

/** Leave a project room */
export function leaveProject(projectId: string) {
  joinedProjects.delete(projectId);
  socket?.emit('leave-project', projectId);
}



export function onTaskCreated(cb: TaskEventCallback) {
  createdListeners.add(cb);
  return () => { createdListeners.delete(cb); };
}

export function onTaskUpdated(cb: TaskEventCallback) {
  updatedListeners.add(cb);
  return () => { updatedListeners.delete(cb); };
}

export function onTaskDeleted(cb: TaskEventCallback) {
  deletedListeners.add(cb);
  return () => { deletedListeners.delete(cb); };
}

export function onTaskAssigned(cb: TaskEventCallback) {
  assignedListeners.add(cb);
  return () => { assignedListeners.delete(cb); };
}
