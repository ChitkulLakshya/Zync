/**
 * @fileoverview presenceSocketHandler.js
 * @module presenceSocketHandler
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
const onlineUsers = new Map(); // WHAT: Map to store online users. WHY: Central source of truth for who is currently online.

module.exports = (io) => { // WHAT: Export the socket handler. WHY: Allows integration into the main Socket.IO server.
    const presenceNamespace = io.of('/presence'); // WHAT: Create a namespace for presence. WHY: Isolates presence logic from other features like chat or notes.

    presenceNamespace.on('connection', async (socket) => { // WHAT: Listen for new connections. WHY: Detect when a user comes online.
        const { userId } = socket.handshake.query; // WHAT: Extract userId from connection query. WHY: Identifies the user connecting.

        if (!userId) { // WHAT: Validate userId presence. WHY: Prevents anonymous or invalid connections.
            socket.disconnect(); // WHAT: Disconnect if no userId. WHY: Protects the system from tracking bad state.
            return; // WHAT: Stop execution. WHY: Connection is terminated.
        }

        socket.join(userId); // WHAT: Make socket join a room with their userId. WHY: Allows sending direct events to this specific user later.


        const now = new Date(); // WHAT: Get current timestamp. WHY: Record exactly when the user came online.
        onlineUsers.set(userId, { status: 'online', lastSeen: now }); // WHAT: Add user to online map. WHY: Updates the server's state to reflect their presence.


        const initialStatus = []; // WHAT: Array to hold status of other users. WHY: Prepare data to send to the connecting user.
        for (const [uid, data] of onlineUsers.entries()) { // WHAT: Iterate all online users. WHY: To build the current presence snapshot.
            if (uid !== userId) { // WHAT: Exclude the connecting user. WHY: They don't need to be told they are online.
                initialStatus.push({ uid, ...data }); // WHAT: Add user data to array. WHY: Collects state.
            }
        }
        socket.emit('initial-status', initialStatus); // WHAT: Send the snapshot to the new user. WHY: Gives them the current state of everyone else.


        socket.broadcast.emit('user-status-changed', { // WHAT: Broadcast to everyone else. WHY: Notify others that this user is now online.
            userId, // WHAT: Include userId. WHY: So clients know who changed.
            status: 'online', // WHAT: Include new status. WHY: Explicitly state they are online.
            lastSeen: now // WHAT: Include timestamp. WHY: Synchronize timing across clients.
        });

        socket.on('disconnect', async () => { // WHAT: Listen for disconnection. WHY: Detect when a user goes offline.
            const now = new Date(); // WHAT: Get timestamp. WHY: Record when they left.
            onlineUsers.set(userId, { status: 'offline', lastSeen: now }); // WHAT: Update map status to offline. WHY: Server state must reflect they left.

            socket.broadcast.emit('user-status-changed', { // WHAT: Broadcast offline status. WHY: Update UI for all other clients.
                userId, // WHAT: Identify user. WHY: Client needs this to update UI.
                status: 'offline', // WHAT: Explicitly set offline. WHY: Changes green dot to grey.
                lastSeen: now // WHAT: Send timestamp. WHY: Client can show "last seen at X".
            });


            setTimeout(() => { // WHAT: Delay actual deletion from map. WHY: Allows for brief disconnects/reconnects without losing state or causing churn.
                const entry = onlineUsers.get(userId); // WHAT: Get user entry again. WHY: Check if they reconnected in the meantime.
                if (entry && entry.status === 'offline') { // WHAT: Verify they are still offline. WHY: Don't delete if they reconnected and status is 'online'.
                    onlineUsers.delete(userId); // WHAT: Actually remove from map. WHY: Free up memory for truly offline users.
                }
            }, 30000); // WHAT: 30 second delay. WHY: Common grace period for network blips.
        });


        socket.on('update-status', async (newStatus) => { // WHAT: Listen for manual status updates (e.g., "away", "dnd"). WHY: User wants to change their displayed status.
            const now = new Date(); // WHAT: Get timestamp. WHY: Record time of change.
            onlineUsers.set(userId, { status: newStatus, lastSeen: now }); // WHAT: Update map. WHY: Save the new custom status.

            socket.broadcast.emit('user-status-changed', { // WHAT: Broadcast the change. WHY: Let others know the user is now "away" or similar.
                userId, // WHAT: Identify user. WHY: Client routing.
                status: newStatus, // WHAT: The new status. WHY: Update the UI icon/text.
                lastSeen: now // WHAT: Timestamp. WHY: For sorting or display.
            });
        });
    });
};
