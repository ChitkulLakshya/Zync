/**
 * @fileoverview SocketIOProvider.ts
 * @module SocketIOProvider
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
// Imports the entire Yjs library as 'Y' to handle Conflict-free Replicated Data Types (CRDTs) for real-time collaboration.
import * as Y from 'yjs';
// Imports the Socket.IO client library which establishes a persistent websocket connection to the backend server.
import { io, Socket } from 'socket.io-client';
// Imports Yjs Awareness protocols to track and broadcast ephemeral user states like cursor positions and selections.
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
// Imports the base URL for the socket server from the local utilities file.
import { SOCKET_BASE_URL } from '@/lib/utils';
// Imports the Observable class from lib0 to allow this provider to emit and listen to custom events.
import { Observable } from 'lib0/observable';

// Exports the SocketIOProvider class which acts as the bridge between a local Yjs document and the remote Socket.IO server.
export class SocketIOProvider extends Observable<string> {
  // Stores a reference to the local Yjs document that this provider will synchronize.
  doc: Y.Doc;
  // Stores the active Socket.IO connection instance used to send and receive binary updates.
  socket: Socket;
  // Stores the Yjs Awareness instance to handle presence data (who is online, their colors, etc.).
  awareness: Awareness;
  // Tracks whether the socket is currently connected to the server.
  connected: boolean = false;

  // Initializes the provider with a specific document ID, the Yjs document itself, and the current user's profile data.
  constructor(noteId: string, doc: Y.Doc, user: any) {
    // Calls the parent Observable constructor to initialize event handling capabilities.
    super();
    // Assigns the provided Yjs document to the class instance.
    this.doc = doc;
    // Creates a new Awareness instance bound to this specific Yjs document.
    this.awareness = new Awareness(doc);

    // Sets the local user's presence state in the awareness object so others can see them.
    this.awareness.setLocalStateField('user', {
      // Uses the provided name or defaults to 'Anonymous' if missing.
      name: user.name || 'Anonymous',
      // Uses the provided color or defaults to a specific blue hex code.
      color: user.color || '#3b82f6',
    });

    // Retrieves the socket URL from the environment config.
    const socketUrl = SOCKET_BASE_URL;

    // Initializes the Socket.IO connection specifically to the '/notes' namespace.
    this.socket = io(`${socketUrl}/notes`, {
      // Prioritizes WebSockets for better performance but falls back to polling if necessary.
      transports: ['websocket', 'polling'],
      // Passes the user's ID in the connection query string so the server can identify them.
      query: { userId: user.uid || 'anonymous' },
      // Enables automatic reconnection if the network drops.
      reconnection: true,
      // Limits reconnection attempts to prevent infinite loops when the server is down.
      reconnectionAttempts: 5,
      // Waits 1 second between reconnection attempts.
      reconnectionDelay: 1000,
    });

    // Listens for the successful connection event from the socket server.
    this.socket.on('connect', () => {
      // Logs the successful connection for debugging purposes.
      console.log('[YJS Socket] Connected to room:', noteId);
      // Updates the internal state to reflect the active connection.
      this.connected = true;
      // Emits a custom 'status' event to any listeners (like the UI) that the provider is connected.
      this.emit('status', [{ status: 'connected' }]);
      // Sends a request to the server to join the specific room for this note.
      this.socket.emit('join-note', noteId);


      // Delays the initial state synchronization slightly to ensure the server is ready to receive it.
      setTimeout(() => {
        try {
          // Encodes the entire current state of the local Yjs document into a binary update.
          const stateUpdate = Y.encodeStateAsUpdate(this.doc);
          // Transmits the encoded state to the server so it can be merged with the remote document.
          this.socket.emit('note-update', { noteId, update: Array.from(stateUpdate) });
        } catch (e) {
          // Catches and logs any errors that occur during the initial sync process.
          console.error('[YJS Socket] Failed to send initial state', e);
        }

        // Checks if the local awareness instance has a valid client ID assigned.
        if (this.awareness.clientID) {
          // Encodes the local user's awareness state (presence, cursor) into a binary update.
          const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
          // Broadcasts the awareness update to the server to share with other users in the room.
          this.socket.emit('awareness-update', { noteId, update: Array.from(awarenessUpdate) });
        }
      }, 500);
    });

    // Listens for the disconnection event from the socket server.
    this.socket.on('disconnect', () => {
      // Logs the disconnection for debugging purposes.
      console.log('[YJS Socket] Disconnected');
      // Updates the internal state to reflect the lost connection.
      this.connected = false;
      // Emits a custom 'status' event to notify listeners that the connection dropped.
      this.emit('status', [{ status: 'disconnected' }]);
    });

    // Listens for notifications from the server that a new user has joined the room.
    this.socket.on('user-joined-yjs', () => {

      try {
        // Re-encodes the entire document state to share with the newly joined user so they get the latest data.
        const stateUpdate = Y.encodeStateAsUpdate(this.doc);
        // Transmits the full state update back to the room.
        this.socket.emit('note-update', { noteId, update: Array.from(stateUpdate) });
      } catch (e) {
        // Logs an error if sending the state to the new user fails.
        console.error('[YJS Socket] Failed to send state to new user', e);
      }
    });

    // Listens for incoming document updates from other users via the server.
    this.socket.on('note-update', (update: any) => {
      try {
        // Declares a variable to hold the binary update data formatted as a Uint8Array.
        let uint8;
        // Checks if the incoming update is natively an ArrayBuffer.
        if (update instanceof ArrayBuffer) {
          // Wraps the ArrayBuffer in a Uint8Array for Yjs processing.
          uint8 = new Uint8Array(update);
        } else if (update && update.buffer instanceof ArrayBuffer) {
          // Extracts the Uint8Array from an object that contains an underlying ArrayBuffer.
          uint8 = new Uint8Array(update.buffer, update.byteOffset, update.byteLength);
        } else if (Array.isArray(update)) {
          // Converts a standard JavaScript array into a Uint8Array.
          uint8 = new Uint8Array(update);
        } else if (typeof update === 'object' && update !== null) {
          // Extracts the values from a generic object and converts them into a Uint8Array.
          uint8 = new Uint8Array(Object.values(update));
        } else {
          // Falls back to directly wrapping the update in a Uint8Array as a last resort.
          uint8 = new Uint8Array(update);
        }

        // Applies the processed binary update to the local Yjs document, using 'this' as the transaction origin.
        Y.applyUpdate(this.doc, uint8, this);
      } catch (e) {
        // Logs an error if the incoming update cannot be applied.
        console.error('[YJS Socket] Failed to apply update', e, update);
      }
    });

    // Listens for any local modifications made to the Yjs document.
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      // Checks if the update originated locally (not from the socket) and if the socket is currently connected.
      if (origin !== this && this.connected) {
        // Broadcasts the local update to the server so other users receive the changes.
        this.socket.emit('note-update', { noteId, update: Array.from(update) });
      }
    });

    // Listens for incoming awareness updates (presence changes) from other users.
    this.socket.on('awareness-update', (update: any) => {
      try {
        // Declares a variable to format the awareness update as a Uint8Array.
        let uint8;
        // Normalizes the incoming data into a Uint8Array similar to the document update handler.
        if (update instanceof ArrayBuffer) {
          uint8 = new Uint8Array(update);
        } else if (update && update.buffer instanceof ArrayBuffer) {
          uint8 = new Uint8Array(update.buffer, update.byteOffset, update.byteLength);
        } else if (Array.isArray(update)) {
          uint8 = new Uint8Array(update);
        } else if (typeof update === 'object' && update !== null) {
          uint8 = new Uint8Array(Object.values(update));
        } else {
          uint8 = new Uint8Array(update);
        }
        // Applies the processed awareness update to the local awareness instance.
        applyAwarenessUpdate(this.awareness, uint8, this);
      } catch (e) {
        // Logs an error if the awareness update fails to apply.
        console.error('[YJS Socket] Failed to apply awareness', e, update);
      }
    });

    // Listens for local changes to the awareness state (e.g., the user moved their cursor).
    this.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      // Checks if the awareness change originated locally and if the socket is connected.
      if (origin !== this && this.connected) {
        // Combines all changed client IDs into a single array.
        const changedClients = added.concat(updated).concat(removed);
        // Encodes only the changed awareness states into a binary payload.
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        // Broadcasts the local awareness change to the server.
        this.socket.emit('awareness-update', { noteId, update: Array.from(update) });
      }
    });
  }

  // Defines a cleanup method to run when the provider is no longer needed.
  destroy() {
    // Disconnects the Socket.IO connection to free up server resources.
    this.socket.disconnect();
    // Destroys the Yjs awareness instance to clear presence data and prevent memory leaks.
    this.awareness.destroy();
  }
}
