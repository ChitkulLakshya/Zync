/**
 * @fileoverview chatSocketHandler.js
 * @module chatSocketHandler
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
const Message = require('../models/Message'); // WHAT: Import Message model. WHY: Needed to query and save chat messages in the database.
const mongoose = require('mongoose'); // WHAT: Import mongoose. WHY: Needed to check database connection status before performing operations.
const logger = console; // WHAT: Assign console to logger. WHY: Provides a simple logging mechanism for socket events.

/** Helper: is Mongoose connected? */
const isDbReady = () => mongoose.connection.readyState === 1; // WHAT: Function to check DB readiness. WHY: Prevents socket operations from failing if the DB is disconnected.

/**
 * Chat Socket Handler — replaces Firebase Firestore for real-time messaging.
 *
 * Protocol:
 *   Client connects to  io.of('/chat')  with query  { userId }
 *   Events IN  → send-message, mark-seen, clear-chat, typing
 *   Events OUT → new-message, message-delivered, message-seen, messages-cleared, user-typing
 */
module.exports = (io) => { // WHAT: Export a function accepting the Socket.IO instance. WHY: Allows the main server file to initialize chat sockets.
  const chatNamespace = io.of('/chat'); // WHAT: Create a namespace for chat. WHY: Isolates chat events from other socket namespaces.
  const DELIVERY_CATCHUP_BATCH_SIZE = Number.parseInt( // WHAT: Parse batch size from env. WHY: Controls how many undelivered messages are processed at once to avoid memory bloat.
    process.env.DELIVERY_CATCHUP_BATCH_SIZE || '200', // WHAT: Fallback to 200. WHY: Ensures a default batch size exists if env var is missing.
    10 // WHAT: Radix 10. WHY: Ensures standard decimal parsing.
  );
  const DELIVERY_CATCHUP_MAX_BATCHES = Number.parseInt( // WHAT: Parse max batches from env. WHY: Limits the total number of catch-up operations to prevent infinite loops or server overload.
    process.env.DELIVERY_CATCHUP_MAX_BATCHES || '10', // WHAT: Fallback to 10. WHY: Ensures a sensible default exists.
    10 // WHAT: Radix 10. WHY: standard decimal.
  );


  const userSockets = new Map(); // WHAT: Map to store user IDs to their socket IDs. WHY: A user might have multiple active connections (e.g., mobile + web).


  const addSocket = (userId, socketId) => { // WHAT: Function to map a socket to a user. WHY: Keeps track of connected devices for targeted emissions.
    if (!userSockets.has(userId)) userSockets.set(userId, new Set()); // WHAT: Initialize Set if user doesn't exist. WHY: Ensures we can call .add() without errors.
    userSockets.get(userId).add(socketId); // WHAT: Add socket ID to user's Set. WHY: Registers the new connection for this user.
  };

  const removeSocket = (userId, socketId) => { // WHAT: Function to remove a disconnected socket. WHY: Prevents emitting to dead sockets and memory leaks.
    const sockets = userSockets.get(userId); // WHAT: Get user's active sockets. WHY: Need to remove the specific socket ID.
    if (!sockets) return; // WHAT: Early return if none found. WHY: Avoids null reference errors.
    sockets.delete(socketId); // WHAT: Remove the socket ID. WHY: Cleans up disconnected session.
    if (sockets.size === 0) userSockets.delete(userId); // WHAT: Delete user entry if no sockets left. WHY: Frees up memory if the user is completely offline.
  };

  /** Emit to every socket that belongs to `userId` */
  const emitToUser = (userId, event, data) => { // WHAT: Helper to send events to a specific user. WHY: Abstracts the loop over multiple socket connections.
    const sockets = userSockets.get(userId); // WHAT: Get all socket IDs for user. WHY: To iterate and emit to each.
    if (!sockets) return; // WHAT: Skip if user offline. WHY: Nothing to emit to.
    for (const sid of sockets) { // WHAT: Loop through each socket ID. WHY: Ensures all user's devices receive the event.
      chatNamespace.to(sid).emit(event, data); // WHAT: Emit event to the socket ID. WHY: Sends real-time data to the client.
    }
  };


  chatNamespace.on('connection', async (socket) => { // WHAT: Listen for new connections. WHY: Entry point for client interactions in the chat namespace.
    const userId = socket.handshake.query.userId; // WHAT: Extract userId from connection query. WHY: Authenticates/identifies the user connecting.
    if (!userId) { // WHAT: Check if userId exists. WHY: Prevents anonymous or malformed connections.
      socket.disconnect(); // WHAT: Disconnect invalid socket. WHY: Security and resource protection.
      return; // WHAT: Stop execution. WHY: Socket is closed.
    }

    addSocket(userId, socket.id); // WHAT: Register the new socket. WHY: Tracks this user's active presence.
    logger.log(`[ChatSocket] ✅ ${userId} connected (${socket.id})`); // WHAT: Log connection. WHY: For debugging and monitoring.


    if (isDbReady()) { // WHAT: Check DB readiness. WHY: Can't fetch undelivered messages if DB is down.
      try { // WHAT: Try-catch block. WHY: Prevents crash if DB query fails.
        for ( // WHAT: Loop for catch-up batches. WHY: Processes undelivered messages incrementally.
          let batchIndex = 0; // WHAT: Init batch counter. WHY: Tracks iterations.
          batchIndex < DELIVERY_CATCHUP_MAX_BATCHES; // WHAT: Check against max limit. WHY: Prevents server stalling.
          batchIndex++ // WHAT: Increment batch index. WHY: Advance loop.
        ) {
          const undelivered = await Message.find({ // WHAT: Query for messages not yet delivered to this user. WHY: To catch them up on missed chats.
            receiverId: userId, // WHAT: Match user as receiver. WHY: Only fetch their messages.
            delivered: false, // WHAT: Match undelivered. WHY: Filter out already synced messages.
          })
            .select('_id senderId') // WHAT: Select only needed fields. WHY: Optimizes memory and query speed.
            .sort({ _id: 1 }) // WHAT: Sort by oldest first. WHY: Processes in chronological order.
            .limit(DELIVERY_CATCHUP_BATCH_SIZE) // WHAT: Limit batch size. WHY: Prevents loading too many docs at once.
            .lean(); // WHAT: Return plain objects. WHY: Faster performance since Mongoose magic isn't needed.

          if (undelivered.length === 0) break; // WHAT: Break loop if no messages. WHY: Optimization, nothing left to do.

          const ids = undelivered.map((m) => m._id); // WHAT: Extract message IDs. WHY: Needed for bulk update.
          await Message.updateMany( // WHAT: Update messages as delivered. WHY: Marks them synced in DB.
            { _id: { $in: ids } }, // WHAT: Match by IDs. WHY: Target the specific batch.
            { $set: { delivered: true, deliveredAt: new Date() } } // WHAT: Set delivered status and timestamp. WHY: Accurate tracking of delivery time.
          );


          const senderIds = [...new Set(undelivered.map((m) => m.senderId))]; // WHAT: Get unique senders. WHY: To notify them that their messages were delivered.
          for (const sid of senderIds) { // WHAT: Iterate through senders. WHY: Send individualized delivery receipts.
            const msgIds = undelivered // WHAT: Filter messages for this sender. WHY: Group receipts by sender.
              .filter((m) => m.senderId === sid) // WHAT: Match sender ID. WHY: Isolates their messages.
              .map((m) => String(m._id)); // WHAT: Stringify IDs. WHY: Safe transmission over socket.
            emitToUser(sid, 'message-delivered', { messageIds: msgIds }); // WHAT: Notify sender. WHY: Updates sender's UI with "delivered" tick.
          }

          if (undelivered.length < DELIVERY_CATCHUP_BATCH_SIZE) break; // WHAT: Break if fetched less than batch size. WHY: Means we've reached the end of undelivered messages.
        }
      } catch (err) { // WHAT: Catch errors. WHY: Graceful error handling.
        logger.error('[ChatSocket] delivery-catchup error:', err.message); // WHAT: Log error. WHY: For debugging issues with catch-up logic.
      }
    }


    socket.on('send-message', async (payload) => { // WHAT: Listen for outgoing messages. WHY: Handles user sending a text/file.
      if (!isDbReady()) { // WHAT: Check DB status. WHY: Can't save message if DB is down.
        socket.emit('chat-error', { error: 'Database not available' }); // WHAT: Emit error to sender. WHY: Informs UI of failure.
        return; // WHAT: Abort. WHY: DB unavailable.
      }
      try { // WHAT: Try-catch block. WHY: Protects against DB write errors.
        const { // WHAT: Destructure payload. WHY: Easy access to message properties.
          chatId, // WHAT: Chat room ID. WHY: Groups messages in a chat.
          text, // WHAT: Message text. WHY: The actual content.
          receiverId, // WHAT: Target user. WHY: Knows who to send to.
          senderName, // WHAT: Sender's display name. WHY: For push notifications/UI.
          senderPhotoURL, // WHAT: Sender's avatar. WHY: UI display.
          type = 'text', // WHAT: Message type (text/image/etc). WHY: Handles different rendering logic.
          fileUrl, // WHAT: URL if it's a file. WHY: Access to the attachment.
          fileName, // WHAT: Name of file. WHY: Display attachment name.
          fileSize, // WHAT: Size of file. WHY: Display attachment size.
          projectId, // WHAT: Related project ID. WHY: Context if chat is project-specific.
          projectName, // WHAT: Related project name. WHY: Context.
          projectOwnerId, // WHAT: Owner of related project. WHY: Context/permissions.
        } = payload;

        const msg = await Message.create({ // WHAT: Insert message into DB. WHY: Persists chat history.
          chatId, // WHAT: Assign chat ID. WHY: DB relation.
          text: text || null, // WHAT: Assign text. WHY: DB relation.
          senderId: userId, // WHAT: Assign sender ID from socket query. WHY: Prevents spoofing sender ID in payload.
          senderName: senderName || 'User', // WHAT: Assign name. WHY: DB relation.
          senderPhotoURL: senderPhotoURL || null, // WHAT: Assign photo. WHY: DB relation.
          receiverId, // WHAT: Assign receiver. WHY: DB relation.
          type, // WHAT: Assign type. WHY: DB relation.
          fileUrl: fileUrl || null, // WHAT: Assign file URL. WHY: DB relation.
          fileName: fileName || null, // WHAT: Assign file name. WHY: DB relation.
          fileSize: fileSize ? parseInt(fileSize, 10) : null, // WHAT: Parse file size safely. WHY: Ensures DB type correctness.
          projectId: projectId || null, // WHAT: Assign project ID. WHY: DB relation.
          projectName: projectName || null, // WHAT: Assign project Name. WHY: DB relation.
          projectOwnerId: projectOwnerId || null, // WHAT: Assign owner. WHY: DB relation.
          delivered: userSockets.has(receiverId), // WHAT: Mark delivered immediately if online. WHY: Skips catch-up logic later.
          deliveredAt: userSockets.has(receiverId) ? new Date() : null, // WHAT: Set delivery timestamp. WHY: UI tracking.
        });

        const msgObj = msg.toObject(); // WHAT: Convert Mongoose doc to plain object. WHY: Prepares for socket emission.
        msgObj.id = String(msgObj._id); // WHAT: Map _id to id. WHY: Client-side convention.


        emitToUser(userId, 'new-message', msgObj); // WHAT: Echo message back to sender. WHY: Updates sender's other devices.


        emitToUser(receiverId, 'new-message', msgObj); // WHAT: Send message to receiver. WHY: Real-time delivery.

        if (userSockets.has(receiverId)) { // WHAT: Check if receiver got it. WHY: To notify sender immediately.
          emitToUser(userId, 'message-delivered', { messageId: msgObj.id }); // WHAT: Send receipt to sender. WHY: Real-time tick update.
        }
      } catch (err) { // WHAT: Catch errors. WHY: Graceful failure.
        logger.error('[ChatSocket] send-message error:', err); // WHAT: Log error. WHY: Debugging.
        socket.emit('chat-error', { error: 'Failed to send message' }); // WHAT: Notify client. WHY: UI feedback.
      }
    });


    socket.on('mark-seen', async ({ messageIds, senderId }) => { // WHAT: Listen for read receipts. WHY: Tracks when messages are read.
      if (!isDbReady()) return; // WHAT: Check DB. WHY: Can't update without DB.
      try { // WHAT: Try-catch block. WHY: Safely update DB.
        if (!messageIds || messageIds.length === 0) return; // WHAT: Validate input. WHY: Avoid empty queries.

        await Message.updateMany( // WHAT: Update read status in DB. WHY: Persists read receipts.
          { _id: { $in: messageIds }, receiverId: userId }, // WHAT: Match IDs and ensure user is the receiver. WHY: Security - can't mark others' messages.
          { $set: { seen: true, seenAt: new Date() } } // WHAT: Update fields. WHY: Sets status.
        );


        emitToUser(senderId, 'message-seen', { messageIds }); // WHAT: Notify original sender. WHY: Updates their UI with double-blue-ticks.
      } catch (err) { // WHAT: Catch DB errors. WHY: Prevent crash.
        logger.error('[ChatSocket] mark-seen error:', err); // WHAT: Log error. WHY: Debugging.
      }
    });


    socket.on('typing', ({ chatId, receiverId, isTyping }) => { // WHAT: Listen for typing indicators. WHY: Real-time UX feature.
      emitToUser(receiverId, 'user-typing', { chatId, userId, isTyping }); // WHAT: Forward to receiver. WHY: Shows "User is typing..." in UI.
    });


    socket.on('clear-chat', async ({ chatId, otherUserId }) => { // WHAT: Listen for chat clear request. WHY: User wants to delete history.
      if (!isDbReady()) { // WHAT: Check DB. WHY: Can't delete without DB.
        socket.emit('chat-error', { error: 'Database not available' }); // WHAT: Error to client. WHY: UX.
        return; // WHAT: Abort. WHY: No DB.
      }
      try { // WHAT: Try-catch for safety. WHY: Prevent crash.
        await Message.deleteMany({ chatId }); // WHAT: Delete all messages in room. WHY: Actually clears the history.
        emitToUser(userId, 'messages-cleared', { chatId }); // WHAT: Notify self. WHY: Syncs other devices.
        emitToUser(otherUserId, 'messages-cleared', { chatId }); // WHAT: Notify other user. WHY: Syncs their UI so messages disappear.
      } catch (err) { // WHAT: Catch error. WHY: Safety.
        logger.error('[ChatSocket] clear-chat error:', err); // WHAT: Log error. WHY: Debugging.
      }
    });


    socket.on('disconnect', () => { // WHAT: Listen for socket disconnect. WHY: Handle cleanup when user closes app.
      removeSocket(userId, socket.id); // WHAT: Remove from active sockets map. WHY: Prevents memory leaks and bad emits.
      logger.log(`[ChatSocket] ❌ ${userId} disconnected (${socket.id})`); // WHAT: Log disconnect. WHY: Debugging.
    });
  });
};
