/**
 * @fileoverview chatRoutes.js
 * @module chatRoutes
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
const express = require('express'); // Declares a constant variable named 'express' and assigns it the Express.js framework module, which is a web application framework for Node.js, used here to build the API server.
const router = express.Router(); // Declares a constant variable named 'router' and initializes it as an instance of an Express router, which is used to define routes for the chat API endpoints.
const mongoose = require('mongoose'); // Declares a constant variable named 'mongoose' and assigns it the Mongoose library module, which is an ODM (Object Data Modeling) library for MongoDB and Node.js, used here to interact with the MongoDB database.
const Message = require('../models/Message'); // Declares a constant variable named 'Message' and assigns it the Mongoose model for messages, imported from the specified path, which defines the structure and behavior of message documents in the database.
const verifyToken = require('../middleware/authMiddleware'); // Declares a constant variable named 'verifyToken' and assigns it the authentication middleware function, imported from the specified path, which is used to validate user tokens before allowing access to protected routes.
const { paginateArray, setPaginationHeaders } = require('../utils/pagination'); // Declares two constant variables, 'paginateArray' and 'setPaginationHeaders', by destructuring them from the module exported by '../utils/pagination.js', which provide utility functions for handling array pagination and setting HTTP pagination headers.


const requireDb = (req, res, next) => { // Declares a constant function named 'requireDb' which acts as a middleware to check the database connection status before processing a request.
  if (mongoose.connection.readyState !== 1) // Checks if the Mongoose connection's readyState property is not equal to 1 (which signifies 'connected'), meaning the database is not currently connected.
    return res.status(503).json({ error: 'Database not available' }); // If the database is not connected, it sends an HTTP 503 (Service Unavailable) status code and a JSON error message to the client, then stops further processing for this request.
  next(); // Calls the 'next' function, passing control to the next middleware function in the stack or the route handler, indicating that the database is connected and the request can proceed.
};

/**
 * GET /api/chat/history/:chatId
 * Paginated chat history. Query params: ?cursor=<messageId>&limit=50
 */
router.get('/history/:chatId', verifyToken, requireDb, async (req, res) => { // Defines a GET route for the path '/history/:chatId', applying 'verifyToken' and 'requireDb' middleware before executing the asynchronous route handler function.
  try { // Starts a try block to handle potential errors that might occur during the execution of the route logic.
    const { chatId } = req.params; // Destructures the 'chatId' property from the 'req.params' object, extracting the chat ID from the URL parameters for use in querying messages.
    const limit = Math.min(parseInt(req.query.limit) || 50, 200); // Declares a constant variable 'limit', parsing the 'limit' query parameter to an integer (defaulting to 50 if not provided or invalid), and ensuring it does not exceed 200, to control the number of messages returned.
    const cursor = req.query.cursor; // Declares a constant variable 'cursor' and assigns it the value of the 'cursor' query parameter, which is used as a starting point (message ID) for pagination.


    const parts = chatId.split('_'); // Declares a constant variable 'parts' and assigns it an array of strings obtained by splitting the 'chatId' string by the '_' character, typically to extract individual user IDs from a combined chat ID.
    if (!parts.includes(req.user.uid)) { // Checks if the 'parts' array (containing user IDs from the chatId) does not include the authenticated user's unique ID ('req.user.uid'), indicating the user is not part of this chat.
      return res.status(403).json({ error: 'Unauthorized' }); // If the user is not part of the chat, it sends an HTTP 403 (Forbidden) status code and a JSON error message, then stops further processing for this request.
    }

    const filter = { chatId }; // Declares a constant object 'filter' and initializes it with the 'chatId' property, which will be used to query messages belonging to a specific chat.
    if (cursor) { // Checks if a 'cursor' value was provided in the query parameters.
      filter._id = { $gt: new mongoose.Types.ObjectId(cursor) }; // If a cursor exists, it adds an '_id' property to the 'filter' object, using the MongoDB '$gt' operator to find messages with an ID greater than the provided cursor, enabling cursor-based pagination.
    }

    const messages = await Message.find(filter) // Declares a constant variable 'messages' and asynchronously queries the 'Message' collection using the constructed 'filter' to find relevant messages.
      .sort({ createdAt: 1 }) // Sorts the found messages in ascending order based on their 'createdAt' timestamp, ensuring they are returned chronologically.
      .limit(limit) // Limits the number of messages returned by the query to the 'limit' value, controlling the size of the history chunk.
      .lean(); // Converts the Mongoose documents returned by the query into plain JavaScript objects, which improves performance by skipping Mongoose's overhead for large result sets.


    const result = messages.map((m) => ({ ...m, id: String(m._id) })); // Declares a constant variable 'result' and maps over the 'messages' array, creating a new array where each message object is spread and its '_id' property is converted to a string and assigned to a new 'id' property, for consistent client-side ID handling.
    res.json(result); // Sends the 'result' array as a JSON response to the client, containing the paginated chat history.
  } catch (error) { // Catches any errors that occur within the try block.
    console.error('[ChatRoutes] history error:', error); // Logs the error to the console with a specific prefix for debugging purposes.
    res.status(500).json({ error: error.message }); // Sends an HTTP 500 (Internal Server Error) status code and a JSON error message containing the error's message property to the client.
  }
});

/**
 * GET /api/chat/conversations
 * Returns the latest message per conversation for the current user.
 */
router.get('/conversations', verifyToken, requireDb, async (req, res) => { // Defines a GET route for the path '/conversations', applying 'verifyToken' and 'requireDb' middleware before executing the asynchronous route handler function.
  try { // Starts a try block to handle potential errors that might occur during the execution of the route logic.
    const uid = req.user.uid; // Declares a constant variable 'uid' and assigns it the unique ID of the authenticated user, extracted from the 'req.user' object provided by the 'verifyToken' middleware.


    const conversations = await Message.aggregate([ // Declares a constant variable 'conversations' and asynchronously executes a Mongoose aggregation pipeline on the 'Message' collection to find the latest message for each conversation involving the current user.
      { $match: { $or: [{ senderId: uid }, { receiverId: uid }] } }, // The first stage of the aggregation pipeline: filters messages where the 'senderId' is the current user's ID OR the 'receiverId' is the current user's ID, ensuring only messages relevant to the user are considered.
      { $sort: { createdAt: -1 } }, // The second stage: sorts the matched messages in descending order based on their 'createdAt' timestamp, placing the most recent messages first within each conversation.
      { // The third stage: groups messages by their 'chatId'.
        $group: { // Specifies the grouping operation.
          _id: '$chatId', // Groups documents by the value of their 'chatId' field, creating a unique group for each conversation.
          doc: { $first: '$$ROOT' }, // For each group, it creates a new field 'doc' and assigns it the entire document of the first message encountered in that group (which is the latest due to the preceding sort).
        },
      },
      { $replaceRoot: { newRoot: '$doc' } }, // The fourth stage: replaces the root document of each output document with the content of the 'doc' field (which contains the latest message for that conversation), effectively promoting the latest message to the top level.
      { $sort: { createdAt: -1 } }, // The fifth stage: sorts the resulting conversation documents again in descending order by 'createdAt', ensuring the list of conversations is ordered from most recent activity to oldest.
    ]);

    const normalized = conversations.map((m) => ({ ...m, id: String(m._id) })); // Declares a constant variable 'normalized' and maps over the 'conversations' array, creating a new array where each conversation message object is spread and its '_id' property is converted to a string and assigned to a new 'id' property, for consistent client-side ID handling.
    const { items, pagination } = paginateArray(normalized, req.query, { // Declares two constant variables, 'items' and 'pagination', by destructuring the result of calling 'paginateArray' with the 'normalized' conversation data, the request query parameters, and pagination options, to apply server-side pagination to the conversation list.
      defaultLimit: 100, // Specifies a default limit of 100 items per page if no limit is provided in the query parameters.
      maxLimit: 200, // Specifies a maximum allowed limit of 200 items per page, preventing excessively large requests.
    });
    setPaginationHeaders(res, pagination); // Calls the 'setPaginationHeaders' function, passing the response object and the 'pagination' object, to add relevant pagination metadata (like total pages, current page, etc.) to the HTTP response headers.

    res.json(items); // Sends the 'items' array (the paginated list of conversations) as a JSON response to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    console.error('[ChatRoutes] conversations error:', error); // Logs the error to the console with a specific prefix for debugging purposes.
    res.status(500).json({ error: error.message }); // Sends an HTTP 500 (Internal Server Error) status code and a JSON error message containing the error's message property to the client.
  }
});

/**
 * GET /api/chat/unread-count
 * Returns total unread count for the current user.
 */
router.get('/unread-count', verifyToken, requireDb, async (req, res) => { // Defines a GET route for the path '/unread-count', applying 'verifyToken' and 'requireDb' middleware before executing the asynchronous route handler function.
  try { // Starts a try block to handle potential errors that might occur during the execution of the route logic.
    const count = await Message.countDocuments({ // Declares a constant variable 'count' and asynchronously calls the 'countDocuments' method on the 'Message' model to count the number of documents that match the specified criteria.
      receiverId: req.user.uid, // Specifies that the 'receiverId' field of the message must match the unique ID of the authenticated user, ensuring only messages intended for the current user are counted.
      seen: false, // Specifies that the 'seen' field of the message must be 'false', indicating that the message has not yet been read by the receiver.
    });
    res.json({ count }); // Sends a JSON response to the client containing an object with a 'count' property, representing the total number of unread messages for the current user.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sends an HTTP 500 (Internal Server Error) status code and a JSON error message containing the error's message property to the client.
  }
});

module.exports = router; // Exports the 'router' instance, making all the defined chat routes available for use in the main Express application.