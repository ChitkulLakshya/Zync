/**
 * @fileoverview sessionRoutes.js
 * @module sessionRoutes
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
const express = require('express');
// This line declares a constant variable named 'express' and assigns it the Express application framework.
// It's needed to create and manage the server, define routes, and handle HTTP requests and responses for the API.
const router = express.Router();
// This line declares a constant variable named 'router' and initializes it as an instance of an Express router.
// This router is used to group related route handlers and middleware, making the API structure modular and organized.
const Session = require('../models/Session');
// This line declares a constant variable named 'Session' and assigns it the Mongoose model for session data.
// This model is essential for interacting with the 'sessions' collection in the MongoDB database, allowing for CRUD operations on session documents.
const verifyToken = require('../middleware/authMiddleware');
// This line declares a constant variable named 'verifyToken' and assigns it the authentication middleware function.
// This middleware is crucial for protecting routes by ensuring that only authenticated users with valid JWTs can access them.
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
// This line uses object destructuring to import 'normalizeDoc' and 'normalizeDocs' functions from the 'normalize' utility file.
// These functions are used to transform Mongoose documents into a consistent, plain JavaScript object format, often removing internal Mongoose properties, which is useful for API responses.
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
// This line uses object destructuring to import 'paginateArray' and 'setPaginationHeaders' functions from the 'pagination' utility file.
// These functions are necessary for implementing pagination logic on arrays of data and for adding pagination metadata to HTTP response headers, improving API usability for large datasets.


router.use(verifyToken);
// This line registers the 'verifyToken' middleware to be executed for all routes defined by this 'router'.
// It ensures that every subsequent route in this file is protected and requires a valid authentication token before processing the request.


router.post('/start', async (req, res) => {
  // This line defines a POST route handler for the '/start' endpoint.
  // It's an asynchronous function that will be executed when a client sends a POST request to '/api/sessions/start' (assuming this router is mounted at '/api/sessions'), used to initiate a new user session.
  try {
    // This block initiates a try-catch statement to handle potential errors gracefully during the execution of the route logic.
    const userId = req.user.uid;
    // This line declares a constant variable 'userId' and assigns it the user ID extracted from the authenticated user's token, which is typically attached to 'req.user' by the 'verifyToken' middleware.
    // It's needed to associate the new session with the specific user who initiated it.

    if (!userId) {
      // This line checks if the 'userId' variable is falsy (e.g., null, undefined, empty string).
      // This condition is necessary to ensure that a valid user ID is available before attempting to create a session, preventing database errors.
      console.error('User ID missing from token');
      // This line logs an error message to the console, indicating that the user ID was not found in the authentication token.
      // It's important for debugging and monitoring issues where the token might be malformed or missing critical information.
      return res.status(400).json({ message: 'User ID required' });
      // This line sends an HTTP response with a 400 (Bad Request) status code and a JSON object containing an error message.
      // It informs the client that the request cannot be processed due to a missing user ID, enforcing data integrity.
    }

    const today = new Date().toISOString().split('T')[0];
    // This line declares a constant variable 'today' and assigns it the current date in 'YYYY-MM-DD' format.
    // 'new Date()' creates a Date object, '.toISOString()' converts it to an ISO 8601 string (e.g., "2023-10-27T10:00:00.000Z"), and '.split('T')[0]' extracts only the date part.
    // This is needed to store the session's date in a consistent, easily queryable format in the database.

    const session = await Session.create({
      // This line declares a constant variable 'session' and asynchronously creates a new document in the 'sessions' collection using the Mongoose 'Session' model.
      // The 'await' keyword pauses execution until the database operation completes.
      // This is the core action of starting a session, persisting its initial state to the database.
      userId,
      // This property assigns the 'userId' (obtained from the token) to the 'userId' field of the new session document.
      // It links the session to the specific user.
      startTime: new Date(),
      // This property assigns the current timestamp as the 'startTime' for the new session.
      // It records when the session officially began.
      endTime: new Date(),
      // This property initially assigns the current timestamp as the 'endTime' for the new session.
      // For a newly started session, 'endTime' is often set to 'startTime' or the current time, and will be updated later as the session progresses.
      date: today
      // This property assigns the 'today' string (YYYY-MM-DD) to the 'date' field of the new session document.
      // It provides a convenient way to query sessions by date.
    });

    res.status(201).json(normalizeDoc(session.toObject()));
    // This line sends an HTTP response with a 201 (Created) status code and a JSON representation of the newly created session.
    // 'session.toObject()' converts the Mongoose document to a plain JavaScript object, and 'normalizeDoc()' further processes it for consistent API output.
    // It confirms to the client that the session was successfully started and provides the session details.
  } catch (error) {
    // This block catches any errors that occur within the 'try' block.
    // It's essential for robust error handling, preventing the server from crashing and providing informative feedback to the client.
    console.error('Error starting session:', error);
    // This line logs the error message to the console, prefixed with a descriptive string.
    // It helps developers diagnose issues during session creation.
    if (!res.headersSent) {
      // This line checks if the HTTP headers have already been sent in the response.
      // This condition prevents attempting to send a response multiple times, which would cause an error.
      res.status(500).json({ message: 'Server error', error: error.message });
      // This line sends an HTTP response with a 500 (Internal Server Error) status code and a JSON object containing a generic error message and the specific error details.
      // It informs the client that an unexpected server-side error occurred during session creation.
    }
  }
});


router.post('/batch', async (req, res) => {
  // This line defines a POST route handler for the '/batch' endpoint.
  // It's an asynchronous function designed to fetch sessions for multiple user IDs in a single request, improving efficiency.
  try {
    // This block initiates a try-catch statement to handle potential errors gracefully during the execution of the route logic.
    const { userIds } = req.body;
    // This line uses object destructuring to extract the 'userIds' property from the request body.
    // 'userIds' is expected to be an array of user IDs for which sessions are to be fetched.
    if (!userIds || !Array.isArray(userIds)) {
      // This line checks if 'userIds' is missing or if it's not an array.
      // This validation ensures that the request body contains the necessary data in the correct format.
      return res.status(400).json({ message: 'userIds array is required' });
      // This line sends an HTTP response with a 400 (Bad Request) status code and an error message.
      // It informs the client that the 'userIds' array is a mandatory part of the request.
    }
    const sessions = await Session.find({ userId: { $in: userIds } })
      // This line declares a constant variable 'sessions' and asynchronously queries the 'sessions' collection.
      // 'Session.find()' retrieves documents, and '{ userId: { $in: userIds } }' is a MongoDB query operator that matches documents where the 'userId' field is present in the provided 'userIds' array.
      // This is needed to retrieve all sessions belonging to any of the specified users.
      .sort({ startTime: -1 })
      // This method sorts the retrieved sessions in descending order based on their 'startTime'.
      // This ensures that the most recent sessions appear first in the results.
      .lean();
      // This method tells Mongoose to return plain JavaScript objects instead of full Mongoose documents.
      // This improves performance by skipping the overhead of Mongoose's change tracking and validation, which is not needed when just reading data.
    const { items, pagination } = paginateArray(normalizeDocs(sessions), req.query);
    // This line uses object destructuring to get 'items' (the paginated session data) and 'pagination' (metadata for pagination) from the 'paginateArray' utility function.
    // 'normalizeDocs(sessions)' first converts the lean Mongoose objects into a consistent plain JavaScript object format.
    // 'req.query' provides the pagination parameters (e.g., page, limit) from the URL query string.
    // This is crucial for handling large result sets efficiently and providing a paginated API response.
    setPaginationHeaders(res, pagination);
    // This line calls the 'setPaginationHeaders' utility function to add pagination-related headers (e.g., X-Total-Count, Link) to the HTTP response.
    // These headers provide clients with information about the total number of items and links to other pages, enhancing API discoverability and usability.

    res.json(items);
    // This line sends an HTTP response with a 200 (OK) status code and a JSON array of the paginated session items.
    // It delivers the requested session data to the client.
  } catch (error) {
    // This block catches any errors that occur within the 'try' block.
    // It's essential for robust error handling, preventing the server from crashing and providing informative feedback to the client.
    console.error('Error fetching batch sessions:', error);
    // This line logs the error message to the console, prefixed with a descriptive string.
    // It helps developers diagnose issues during batch session retrieval.
    res.status(500).json({ message: 'Server error' });
    // This line sends an HTTP response with a 500 (Internal Server Error) status code and a generic JSON error message.
    // It informs the client that an unexpected server-side error occurred.
  }
});


const updateSession = async (req, res) => {
  // This line declares a constant asynchronous function named 'updateSession'.
  // This function serves as a reusable route handler for updating a session, called by both PUT and POST methods for a specific session ID.
  try {
    // This block initiates a try-catch statement to handle potential errors gracefully during the execution of the update logic.
    const session = await Session.findById(req.params.id).lean();
    // This line declares a constant variable 'session' and asynchronously queries the database to find a session by its ID, which is extracted from the URL parameters ('req.params.id').
    // '.lean()' is used to return a plain JavaScript object for performance, as no Mongoose-specific methods are needed on this retrieved document.
    // This is needed to retrieve the existing session data before making any updates or performing authorization checks.
    if (!session) return res.status(404).json({ message: 'Session not found' });
    // This line checks if no session was found with the provided ID.
    // If true, it immediately sends an HTTP response with a 404 (Not Found) status code and an error message, indicating that the target session does not exist.

    if (session.userId !== req.user.uid) {
      // This line checks if the 'userId' of the retrieved session does not match the 'uid' (user ID) from the authenticated user's token.
      // This is a critical authorization check to ensure that a user can only update their own sessions.
      return res.status(403).json({ message: 'Unauthorized access to session' });
      // This line sends an HTTP response with a 403 (Forbidden) status code and an error message.
      // It prevents unauthorized users from modifying sessions that do not belong to them.
    }

    const updateData = { endTime: new Date() };
    // This line declares a constant object 'updateData' and initializes it with an 'endTime' property set to the current timestamp.
    // This ensures that the session's 'endTime' is always updated to the current time when an update request is made, reflecting recent activity.

    if (req.body && req.body.lastAction) {
      // This line checks if the request body exists and if it contains a 'lastAction' property.
      // This condition allows for optional updates to the 'lastAction' field of the session.
      updateData.lastAction = req.body.lastAction;
      // This line assigns the value of 'req.body.lastAction' to the 'lastAction' property of the 'updateData' object.
      // It updates the session's last recorded action based on client input.
    }
    if (req.body && req.body.activeIncrement) {
      // This line checks if the request body exists and if it contains an 'activeIncrement' property.
      // This condition allows for optionally incrementing the 'activeDuration' of the session.
      updateData.activeDuration = (session.activeDuration || 0) + req.body.activeIncrement;
      // This line calculates the new 'activeDuration' by adding 'req.body.activeIncrement' to the existing 'session.activeDuration' (defaulting to 0 if it doesn't exist).
      // It updates the total active time for the session, useful for tracking engagement.
    }

    const startTime = session.startTime;
    // This line declares a constant variable 'startTime' and assigns it the 'startTime' value from the retrieved session document.
    // This is needed to calculate the total duration of the session.
    updateData.duration = Math.round((updateData.endTime - startTime) / 1000);
    // This line calculates the total 'duration' of the session in seconds and assigns it to the 'duration' property of 'updateData'.
    // It subtracts the 'startTime' from the newly set 'endTime', divides by 1000 to convert milliseconds to seconds, and 'Math.round()' rounds it to the nearest whole number.
    // This provides a precise measure of the session's length.

    const updated = await Session.findByIdAndUpdate(
      // This line declares a constant variable 'updated' and asynchronously finds a session by its ID and updates it in the database.
      // 'await' pauses execution until the database operation completes.
      // This is the core database operation to persist the changes to the session.
      req.params.id,
      // This is the first argument to 'findByIdAndUpdate', specifying the ID of the document to update, taken from the URL parameters.
      // It targets the specific session to be modified.
      { $set: updateData },
      // This is the second argument, an update object using the MongoDB '$set' operator.
      // '$set' replaces the value of a field with the specified value, or adds the field if it does not exist.
      // It applies all the prepared 'updateData' fields to the session document.
      { returnDocument: 'after', lean: true }
      // This is the third argument, an options object.
      // 'returnDocument: 'after'' ensures that the updated document is returned (rather than the original).
      // 'lean: true' ensures that the returned document is a plain JavaScript object for performance.
    );

    res.json(normalizeDoc(updated));
    // This line sends an HTTP response with a 200 (OK) status code and a JSON representation of the updated session.
    // 'normalizeDoc()' processes the lean Mongoose object for consistent API output.
    // It confirms to the client that the session was successfully updated and provides the latest session details.
  } catch (error) {
    // This block catches any errors that occur within the 'try' block.
    // It's essential for robust error handling, preventing the server from crashing and providing informative feedback to the client.
    console.error('Error updating session:', error);
    // This line logs the error message to the console, prefixed with a descriptive string.
    // It helps developers diagnose issues during session updates.
    res.status(500).json({ message: 'Server error' });
    // This line sends an HTTP response with a 500 (Internal Server Error) status code and a generic JSON error message.
    // It informs the client that an unexpected server-side error occurred.
  }
};

router.put('/:id', updateSession);
// This line defines a PUT route handler for the '/:id' endpoint, using the 'updateSession' function.
// A PUT request to '/api/sessions/:id' (where :id is the session ID) will trigger the 'updateSession' logic, typically for full replacement or idempotent updates.
router.post('/:id', updateSession);
// This line defines a POST route handler for the '/:id' endpoint, also using the 'updateSession' function.
// A POST request to '/api/sessions/:id' will also trigger the 'updateSession' logic, often used for partial updates or when PUT semantics are not strictly followed.


router.get('/:userId', async (req, res) => {
  // This line defines a GET route handler for the '/:userId' endpoint.
  // It's an asynchronous function designed to fetch all sessions for a specific user ID, which is extracted from the URL parameters.
  try {
    // This block initiates a try-catch statement to handle potential errors gracefully during the execution of the route logic.
    if (req.params.userId !== req.user.uid) {
      // This line checks if the 'userId' from the URL parameters does not match the 'uid' (user ID) from the authenticated user's token.
      // This is a critical authorization check to ensure that a user can only view their own sessions.
      return res.status(403).json({ message: 'Unauthorized access to user sessions' });
      // This line sends an HTTP response with a 403 (Forbidden) status code and an error message.
      // It prevents unauthorized users from accessing sessions that do not belong to them.
    }

    const sessions = await Session.find({ userId: req.params.userId })
      // This line declares a constant variable 'sessions' and asynchronously queries the 'sessions' collection.
      // 'Session.find()' retrieves documents, and '{ userId: req.params.userId }' filters documents where the 'userId' field matches the ID from the URL parameters.
      // This is needed to retrieve all sessions belonging to the specified user.
      .sort({ startTime: -1 })
      // This method sorts the retrieved sessions in descending order based on their 'startTime'.
      // This ensures that the most recent sessions appear first in the results.
      .lean();
      // This method tells Mongoose to return plain JavaScript objects instead of full Mongoose documents.
      // This improves performance by skipping the overhead of Mongoose's change tracking and validation, which is not needed when just reading data.
    const { items, pagination } = paginateArray(normalizeDocs(sessions), req.query);
    // This line uses object destructuring to get 'items' (the paginated session data) and 'pagination' (metadata for pagination) from the 'paginateArray' utility function.
    // 'normalizeDocs(sessions)' first converts the lean Mongoose objects into a consistent plain JavaScript object format.
    // 'req.query' provides the pagination parameters (e.g., page, limit) from the URL query string.
    // This is crucial for handling large result sets efficiently and providing a paginated API response.
    setPaginationHeaders(res, pagination);
    // This line calls the 'setPaginationHeaders' utility function to add pagination-related headers (e.g., X-Total-Count, Link) to the HTTP response.
    // These headers provide clients with information about the total number of items and links to other pages, enhancing API discoverability and usability.

    res.json(items);
    // This line sends an HTTP response with a 200 (OK) status code and a JSON array of the paginated session items.
    // It delivers the requested session data to the client.
  } catch (error) {
    // This block catches any errors that occur within the 'try' block.
    // It's essential for robust error handling, preventing the server from crashing and providing informative feedback to the client.
    console.error('Error fetching sessions:', error);
    // This line logs the error message to the console, prefixed with a descriptive string.
    // It helps developers diagnose issues during session retrieval.
    res.status(500).json({ message: 'Server error' });
    // This line sends an HTTP response with a 500 (Internal Server Error) status code and a generic JSON error message.
    // It informs the client that an unexpected server-side error occurred.
  }
});


router.delete('/:id', async (req, res) => {
  // This line defines a DELETE route handler for the '/:id' endpoint.
  // It's an asynchronous function designed to delete a specific session by its ID, which is extracted from the URL parameters.
  try {
    // This block initiates a try-catch statement to handle potential errors gracefully during the execution of the delete logic.
    const session = await Session.findById(req.params.id).lean();
    // This line declares a constant variable 'session' and asynchronously queries the database to find a session by its ID, which is extracted from the URL parameters ('req.params.id').
    // '.lean()' is used to return a plain JavaScript object for performance, as no Mongoose-specific methods are needed on this retrieved document.
    // This is needed to retrieve the existing session data before performing authorization checks.

    if (!session) {
      // This line checks if no session was found with the provided ID.
      // If true, it immediately sends an HTTP response with a 404 (Not Found) status code and an error message, indicating that the target session does not exist.
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.userId !== req.user.uid) {
      // This line checks if the 'userId' of the retrieved session does not match the 'uid' (user ID) from the authenticated user's token.
      // This is a critical authorization check to ensure that a user can only delete their own sessions.
      return res.status(403).json({ message: 'Unauthorized to delete this session' });
      // This line sends an HTTP response with a 403 (Forbidden) status code and an error message.
      // It prevents unauthorized users from deleting sessions that do not belong to them.
    }

    await Session.findByIdAndDelete(req.params.id);
    // This line asynchronously finds a session by its ID and deletes it from the database.
    // 'await' pauses execution until the database operation completes.
    // This is the core database operation to remove the specified session.
    res.json({ message: 'Session deleted' });
    // This line sends an HTTP response with a 200 (OK) status code and a JSON object confirming the deletion.
    // It informs the client that the session was successfully removed.
  } catch (error) {
    // This block catches any errors that occur within the 'try' block.
    // It's essential for robust error handling, preventing the server from crashing and providing informative feedback to the client.
    console.error('Error deleting session:', error);
    // This line logs the error message to the console, prefixed with a descriptive string.
    // It helps developers diagnose issues during session deletion.
    res.status(500).json({ message: 'Server error' });
    // This line sends an HTTP response with a 500 (Internal Server Error) status code and a generic JSON error message.
    // It informs the client that an unexpected server-side error occurred.
  }
});


router.delete('/user/:userId', async (req, res) => {
  // This line defines a DELETE route handler for the '/user/:userId' endpoint.
  // It's an asynchronous function designed to delete all sessions belonging to a specific user ID, which is extracted from the URL parameters.
  try {
    // This block initiates a try-catch statement to handle potential errors gracefully during the execution of the delete logic.
    if (req.params.userId !== req.user.uid) {
      // This line checks if the 'userId' from the URL parameters does not match the 'uid' (user ID) from the authenticated user's token.
      // This is a critical authorization check to ensure that a user can only delete their own sessions.
      return res.status(403).json({ message: 'Unauthorized action' });
      // This line sends an HTTP response with a 403 (Forbidden) status code and an error message.
      // It prevents unauthorized users from deleting all sessions that do not belong to them.
    }

    await Session.deleteMany({ userId: req.params.userId });
    // This line asynchronously deletes all documents from the 'sessions' collection that match the provided query.
    // '{ userId: req.params.userId }' specifies that only sessions belonging to the user ID from the URL parameters should be deleted.
    // 'await' pauses execution until the database operation completes.
    // This is the core database operation to remove all sessions for a specific user.
    res.json({ message: 'All sessions deleted' });
    // This line sends an HTTP response with a 200 (OK) status code and a JSON object confirming the deletion.
    // It informs the client that all sessions for the specified user were successfully removed.
  } catch (error) {
    // This block catches any errors that occur within the 'try' block.
    // It's essential for robust error handling, preventing the server from crashing and providing informative feedback to the client.
    console.error('Error clearing sessions:', error);
    // This line logs the error message to the console, prefixed with a descriptive string.
    // It helps developers diagnose issues during the bulk deletion of sessions.
    res.status(500).json({ message: 'Server error' });
    // This line sends an HTTP response with a 500 (Internal Server Error) status code and a generic JSON error message.
    // It informs the client that an unexpected server-side error occurred.
  }
});

module.exports = router;
// This line exports the 'router' instance, making it available for other parts of the application (e.g., the main server file) to import and use.
// It allows the defined session routes to be mounted and handled by the Express application.