/**
 * @fileoverview noteSocketHandler.js
 * @module noteSocketHandler
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
const logger = require('../utils/logger'); // WHAT: Import logger. WHY: To log socket events for debugging.

module.exports = (io) => { // WHAT: Export function. WHY: To initialize note socket namespace.
  const notesNamespace = io.of('/notes'); // WHAT: Create /notes namespace. WHY: Isolates note-related events.


  const notePresence = new Map(); // WHAT: Map to store online users per note. WHY: Real-time presence tracking.


  const broadcastPresence = (noteId) => { // WHAT: Helper to broadcast presence. WHY: Updates all users in a note.
    if (!notePresence.has(noteId)) return; // WHAT: Check if note exists in map. WHY: Prevent errors if empty.

    const users = notePresence.get(noteId); // WHAT: Get users for note. WHY: To send to clients.
    const userList = Array.from(users.values()); // WHAT: Convert Map to Array. WHY: Socket.io works with JSON arrays better.


    logger.debug(`[NoteSocket] 📡 Broadcasting presence_update for note ${noteId}:`); // WHAT: Log debug info. WHY: Tracing.
    logger.debug(`[NoteSocket] 📡 User count: ${userList.length}`); // WHAT: Log user count. WHY: Tracing.
    logger.debug(`[NoteSocket] 📡 Users:`, userList.map(u => ({ id: u.id, name: u.name }))); // WHAT: Log users. WHY: Tracing.

    notesNamespace.to(noteId).emit('presence_update', userList); // WHAT: Emit presence_update. WHY: To update UI avatars.
  };

  notesNamespace.on('connection', (socket) => { // WHAT: Listen for new connections. WHY: Entry point for notes socket.
    logger.info('[NoteSocket] ✅ User connected:', socket.id); // WHAT: Log connection. WHY: Tracking.


    socket.on('join_note', ({ noteId, userId, userName, userAvatar, userColor }) => { // WHAT: Listen for join_note. WHY: When user opens a note.

      logger.debug(`[NoteSocket] 🚪 join_note received:`, { noteId, userId, userName }); // WHAT: Log join. WHY: Tracking.


      socket.join(noteId); // WHAT: Join socket room for note. WHY: To receive events for this note.
      socket.noteId = noteId; // WHAT: Attach noteId to socket. WHY: Easy access on disconnect.
      socket.odId = userId; // WHAT: Attach userId to socket. WHY: Easy access on disconnect.


      if (!notePresence.has(noteId)) { // WHAT: Check if note map exists. WHY: Initialization.
        notePresence.set(noteId, new Map()); // WHAT: Initialize Map. WHY: Store users for this note.
      }


      const users = notePresence.get(noteId); // WHAT: Get users map. WHY: To add new user.
      users.set(userId, { // WHAT: Add user to map. WHY: Track their presence state.
        id: userId, // WHAT: User ID. WHY: Unique identifier.
        name: userName || 'Anonymous', // WHAT: User name. WHY: Display name.
        avatarUrl: userAvatar, // WHAT: User avatar. WHY: UI representation.
        color: userColor || '#3b82f6', // WHAT: User cursor color. WHY: Distinct cursors.
        blockId: null, // WHAT: Current focused block. WHY: Cursor tracking.
        lastActive: Date.now() // WHAT: Last active timestamp. WHY: For stale user cleanup.
      });

      logger.info(`[NoteSocket] ✅ ${userName} (${userId}) joined note ${noteId}`); // WHAT: Log success. WHY: Tracking.
      logger.debug(`[NoteSocket] 📊 Total users in note ${noteId}: ${users.size}`); // WHAT: Log stats. WHY: Tracking.


      broadcastPresence(noteId); // WHAT: Broadcast presence. WHY: Notify others that this user joined.
    });


    socket.on('join-note', (noteId) => { // WHAT: Listen for legacy join-note. WHY: Compatibility or Yjs specific.
      socket.join(noteId); // WHAT: Join room. WHY: Socket.io group.
      socket.noteId = noteId; // WHAT: Attach noteId. WHY: Cleanup.
      socket.to(noteId).emit('user-joined-yjs'); // WHAT: Emit yjs join. WHY: Triggers Yjs sync.
    });

    socket.on('presence-join', ({ noteId, odId, displayName, photoURL, color }) => { // WHAT: Alternate presence join event. WHY: Different client integration.
      socket.odId = odId; // WHAT: Attach odId. WHY: Cleanup.

      if (!notePresence.has(noteId)) { // WHAT: Initialize if needed. WHY: Setup.
        notePresence.set(noteId, new Map()); // WHAT: Create map. WHY: Setup.
      }

      const users = notePresence.get(noteId); // WHAT: Get note map. WHY: Add user.
      users.set(odId, { // WHAT: Set user details. WHY: Track presence.
        id: odId, // WHAT: ID. WHY: Identifier.
        name: displayName || 'Anonymous', // WHAT: Name. WHY: UI.
        avatarUrl: photoURL, // WHAT: Avatar. WHY: UI.
        color: color || '#3b82f6', // WHAT: Color. WHY: UI.
        blockId: null, // WHAT: Block. WHY: Cursor.
        lastActive: Date.now() // WHAT: Activity. WHY: Cleanup.
      });

      broadcastPresence(noteId); // WHAT: Broadcast update. WHY: Notify others.
    });


    socket.on('cursor_move', ({ noteId, userId, blockId }) => { // WHAT: Listen for cursor movement. WHY: Show where others are typing.

      logger.debug(`[NoteSocket] 📍 cursor_move received:`, { noteId, userId, blockId }); // WHAT: Log movement. WHY: Tracing.

      if (!notePresence.has(noteId)) { // WHAT: Check if note exists. WHY: Prevent crash.
        logger.warn(`[NoteSocket] ⚠️ No presence map for note ${noteId}`); // WHAT: Log warn. WHY: Debug.
        return; // WHAT: Abort. WHY: Map missing.
      }

      const users = notePresence.get(noteId); // WHAT: Get users. WHY: Update specific user.
      if (users.has(userId)) { // WHAT: Check if user in map. WHY: Safety.
        const user = users.get(userId); // WHAT: Get user object. WHY: To mutate.
        user.blockId = blockId; // WHAT: Update blockId. WHY: New cursor position.
        user.lastActive = Date.now(); // WHAT: Update timestamp. WHY: Keep them alive.

        logger.debug(`[NoteSocket] 📍 Updated ${user.name}'s cursor to block ${blockId}`); // WHAT: Log debug. WHY: Tracing.
        logger.debug(`[NoteSocket] 📍 Emitting cursor_update to all users in note ${noteId}`); // WHAT: Log debug. WHY: Tracing.


        broadcastPresence(noteId); // WHAT: Broadcast presence update. WHY: Updates the whole list.


        notesNamespace.to(noteId).emit('cursor_update', { userId, blockId }); // WHAT: Also emit specific cursor_update. WHY: Optimized update just for cursors.
      } else {
        logger.warn(`[NoteSocket] ⚠️ User ${userId} not found in presence map`); // WHAT: Log warn. WHY: Debug.
      }
    });


    socket.on('presence-cursor', ({ noteId, odId, blockId }) => { // WHAT: Alternate cursor event. WHY: Other client integrations.
      if (!notePresence.has(noteId)) return; // WHAT: Check note. WHY: Safety.

      const users = notePresence.get(noteId); // WHAT: Get users. WHY: Update.
      if (users.has(odId)) { // WHAT: Check user. WHY: Safety.
        const user = users.get(odId); // WHAT: Get user. WHY: Update.
        user.blockId = blockId; // WHAT: Set block. WHY: State.
        user.lastActive = Date.now(); // WHAT: Set time. WHY: Liveness.
        broadcastPresence(noteId); // WHAT: Broadcast. WHY: Notify.
      }
    });


    socket.on('leave_note', ({ noteId, userId }) => { // WHAT: Listen for user leaving. WHY: Clean up state.
      socket.leave(noteId); // WHAT: Leave room. WHY: Stop receiving events.

      if (notePresence.has(noteId)) { // WHAT: Check if note exists. WHY: Safety.
        const users = notePresence.get(noteId); // WHAT: Get users map. WHY: Remove user.
        users.delete(userId); // WHAT: Delete user. WHY: Cleanup.

        broadcastPresence(noteId); // WHAT: Broadcast update. WHY: Remove avatar from UI.
        notesNamespace.to(noteId).emit('user_left', userId); // WHAT: Emit explicit user_left event. WHY: For client side cleanup.


        if (users.size === 0) { // WHAT: Check if empty. WHY: Memory management.
          notePresence.delete(noteId); // WHAT: Delete map. WHY: Free memory.
        }
      }
    });


    socket.on('leave-note', (noteId) => { // WHAT: Alternate leave event. WHY: Client integration.
      socket.leave(noteId); // WHAT: Leave room. WHY: Socket.io group.
    });

    socket.on('presence-leave', ({ noteId, odId }) => { // WHAT: Alternate leave event. WHY: Client integration.
      if (notePresence.has(noteId)) { // WHAT: Check map. WHY: Safety.
        const users = notePresence.get(noteId); // WHAT: Get map. WHY: To delete.
        users.delete(odId); // WHAT: Delete. WHY: Cleanup.
        broadcastPresence(noteId); // WHAT: Broadcast. WHY: UI update.
        notesNamespace.to(noteId).emit('user_left', odId); // WHAT: Emit specific event. WHY: Client handles it.
      }
    });


    socket.on('note-update', ({ noteId, update }) => { // WHAT: Listen for document edits. WHY: Real-time syncing.
      socket.to(noteId).emit('note-update', update); // WHAT: Forward to others. WHY: They apply changes.
    });

    socket.on('awareness-update', ({ noteId, update }) => { // WHAT: Listen for Yjs awareness. WHY: Cursor/selection sync.
      socket.to(noteId).emit('awareness-update', update); // WHAT: Forward to others. WHY: Update UI.
    });


    socket.on('disconnect', () => { // WHAT: Listen for socket disconnection. WHY: Clean up if user closes browser.
      const noteId = socket.noteId; // WHAT: Get cached noteId. WHY: Identify room.
      const odId = socket.odId || socket.handshake?.query?.userId; // WHAT: Get cached userId. WHY: Identify user.

      if (noteId && odId && notePresence.has(noteId)) { // WHAT: Check if all exist. WHY: Ensure safe cleanup.
        const users = notePresence.get(noteId); // WHAT: Get users. WHY: To remove disconnected one.
        users.delete(odId); // WHAT: Delete user. WHY: Update state.

        logger.info(`[NoteSocket] User ${odId} disconnected from note ${noteId}`); // WHAT: Log event. WHY: Tracking.

        broadcastPresence(noteId); // WHAT: Broadcast updated state. WHY: UI update.
        notesNamespace.to(noteId).emit('user_left', odId); // WHAT: Emit user_left. WHY: Explicit client handling.


        if (users.size === 0) { // WHAT: Check if room empty. WHY: Memory management.
          notePresence.delete(noteId); // WHAT: Delete map. WHY: Free memory.
        }
      }
    });
  });


  const cleanupInterval = setInterval(() => { // WHAT: Set interval for stale user cleanup. WHY: Catch users who ghosted without disconnecting.
    if (notePresence.size === 0) { // WHAT: Check if empty. WHY: Skip if nothing to do.
      return; // WHAT: Early return. WHY: Save CPU.
    }

    const now = Date.now(); // WHAT: Get current time. WHY: For staleness check.
    const staleThreshold = 120000; // WHAT: Set threshold (2 mins). WHY: If no activity, assume disconnected.

    for (const [noteId, users] of notePresence.entries()) { // WHAT: Iterate all notes. WHY: Check every active room.
      let hasStaleUsers = false; // WHAT: Flag to track staleness. WHY: Decide if broadcast needed.

      for (const [odId, user] of users.entries()) { // WHAT: Iterate all users in note. WHY: Check their last active time.
        if (now - user.lastActive > staleThreshold) { // WHAT: Check if stale. WHY: Find ghosted users.
          users.delete(odId); // WHAT: Delete stale user. WHY: Cleanup state.
          hasStaleUsers = true; // WHAT: Set flag. WHY: Triggers broadcast.
        }
      }

      if (hasStaleUsers) { // WHAT: Check if any were removed. WHY: Only broadcast if changed.
        broadcastPresence(noteId); // WHAT: Broadcast new state. WHY: Update UI.
      }

      if (users.size === 0) { // WHAT: Check if empty after cleanup. WHY: Memory management.
        notePresence.delete(noteId); // WHAT: Delete map. WHY: Free memory.
      }
    }
  }, 30000); // WHAT: Run every 30 seconds. WHY: Frequent enough to keep UI fresh.

  if (typeof cleanupInterval.unref === 'function') { // WHAT: Check if unref exists. WHY: It does in Node.js, not browsers.
    cleanupInterval.unref(); // WHAT: Unref interval. WHY: Prevents interval from keeping Node process alive.
  }
};
