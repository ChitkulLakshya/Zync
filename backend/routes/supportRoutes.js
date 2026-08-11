/**
 * @fileoverview supportRoutes.js
 * @module supportRoutes
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
// Declares a constant variable 'express' and assigns it the Express.js module, which is a web application framework for Node.js.
// This is needed to import the Express library, which provides tools and functionalities for building web servers and defining API routes.
const express = require('express');
// Declares a constant variable 'router' and initializes it with a new instance of an Express router.
// This creates a modular, mountable route handler that can define its own routes, middleware, and even sub-routers, keeping the application structure organized.
const router = express.Router();
// Uses object destructuring to extract the 'sendZyncEmail' function from the module exported by '../services/mailer.js'.
// This imports a specific function responsible for sending emails, making it available for use in this route handler to send support notifications.
const { sendZyncEmail } = require('../services/mailer');
// Uses object destructuring to extract the 'getSupportNotificationTemplate' function from the module exported by '../utils/emailTemplates.js'.
// This imports a utility function that generates the HTML content for the support notification email, ensuring consistent and dynamic email formatting.
const { getSupportNotificationTemplate } = require('../utils/emailTemplates');

// Defines a route handler for HTTP POST requests to the root path ('/') relative to where this router is mounted.
// The 'async' keyword indicates that this function will perform asynchronous operations, typically involving Promises.
// 'req' is the request object containing information about the HTTP request, and 'res' is the response object used to send back the HTTP response.
// This sets up the specific API endpoint that clients will call to submit a support request, allowing the server to process the incoming data.
router.post('/', async (req, res) => {
  // Starts a 'try' block, which encloses code that might throw an error during its execution.
  // This is used for error handling; any errors occurring within this block will be caught by the subsequent 'catch' block, preventing the server from crashing and allowing a graceful error response.
  try {
    // Uses object destructuring to extract specific properties ('firstName', 'lastName', 'email', 'phone', 'message') from the 'req.body' object.
    // 'req.body' contains the data sent in the POST request's body (e.g., from a form submission).
    // This extracts the user-provided support request details from the incoming HTTP request, making them easily accessible for processing.
    const { firstName, lastName, email, phone, message } = req.body;

    // Checks if any of the required fields ('firstName', 'email', 'message') are falsy (e.g., null, undefined, or an empty string).
    // The '!' operator negates the boolean value of the variable.
    // This performs basic input validation to ensure that essential information for a support request is provided, preventing incomplete requests from proceeding.
    if (!firstName || !email || !message) {
      // Returns from the function, preventing further execution of the route handler.
      // This immediately stops processing the request if validation fails, sending an error response back to the client.
      return res
        // Sets the HTTP status code of the response to 400 (Bad Request).
        // This indicates to the client that their request could not be understood or processed due to invalid syntax or missing parameters.
        .status(400)
        // Sends a JSON response back to the client.
        // This formats the error message as a JSON object, which is a common and easily parsable format for API responses.
        .json({
          // Defines a property 'message' within the JSON response object with a descriptive string.
          // This provides a user-friendly explanation of why the request failed, guiding the client on how to correct their input.
          message: 'Please provide at least first name, email, and a message.',
        });
    }

    // Declares a constant variable 'recipientsString' and assigns it the value of the 'SUPPORT_RECIPIENTS' environment variable.
    // If the environment variable is not set (falsy), it defaults to 'consolemaster.app@gmail.com'. 'process.env' is a Node.js object containing user environment variables.
    // This retrieves the configured email addresses for support notifications, allowing the application to be easily configured for different environments without code changes, while providing a fallback.
    const recipientsString =
      process.env.SUPPORT_RECIPIENTS || 'consolemaster.app@gmail.com';
    // Declares a constant variable 'recipients' and processes the 'recipientsString'.
    // '.split(',')' divides the string into an array of substrings using the comma as a delimiter.
    // '.map((email) => email.trim())' iterates over each email string and removes leading/trailing whitespace.
    // '.filter(Boolean)' removes any falsy values (like empty strings) from the array, ensuring only valid email strings remain.
    // This converts the comma-separated string of email addresses into a clean array, making it easier to process each recipient individually and preventing issues from malformed entries.
    const recipients = recipientsString
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    // Checks if the 'recipients' array is empty (i.e., has no elements).
    // This validates that at least one valid support recipient email address was configured, as there's no point in sending an email if there's no one to send it to.
    if (recipients.length === 0) {
      // Calls 'console.error()' to log an error message to the server's console.
      // This logs a critical error, alerting developers that the application is misconfigured and cannot send support notifications.
      console.error(
        'No support recipients configured in environment variables'
      );
      // Returns from the function, sending an HTTP 500 (Internal Server Error) response with a JSON message.
      // This informs the client that the server encountered an unexpected configuration problem, preventing the request from being fulfilled, and stops further processing.
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Declares a constant variable 'htmlContent' and assigns it the return value of the 'getSupportNotificationTemplate' function.
    // This function is called with an object containing the user's submitted details.
    // This prepares the dynamic HTML content for the support notification email, populating it with the user's submitted details for a personalized message.
    const htmlContent = getSupportNotificationTemplate({
      // Passes the 'firstName' variable as a property with the same name to the template function.
      // This provides the user's first name to be included in the email template.
      firstName,
      // Passes the 'lastName' variable as a property with the same name to the template function.
      // This provides the user's last name to be included in the email template.
      lastName,
      // Passes the 'email' variable as a property named 'userEmail' to the template function.
      // This provides the user's email address to be included in the email template, potentially under a different key name for clarity within the template.
      userEmail: email,
      // Passes the 'phone' variable as a property with the same name to the template function.
      // This provides the user's phone number to be included in the email template.
      message,
    });

    // Declares a constant variable 'subject' and assigns it a string literal using template literals (backticks `` ` ``).
    // It embeds the 'firstName' and 'lastName' variables to create a dynamic subject line.
    // This dynamically creates a descriptive subject line for the support email, making it easy for recipients to identify the sender and purpose of the email.
    const subject = `[SUPPORT] New Message from ${firstName} ${lastName}`;

    // Declares a constant variable 'emailPromises' and assigns it a new array created by mapping over the 'recipients' array.
    // For each 'recipientEmail', it calls 'sendZyncEmail' which is expected to return a Promise.
    // This prepares an array of Promises, where each Promise represents the asynchronous operation of sending an email to a single recipient, allowing for parallel execution.
    const emailPromises = recipients.map((recipientEmail) =>
      // Calls the 'sendZyncEmail' function with the current recipient's email, the generated subject, and the HTML content.
      // This initiates the email sending process for each individual recipient, creating a Promise for each send operation.
      sendZyncEmail(recipientEmail, subject, htmlContent)
    );

    // Calls 'Promise.allSettled()' with the 'emailPromises' array. This method returns a single Promise that resolves after all of the input Promises have settled (either fulfilled or rejected).
    // '.then((results) => { ... })' registers a callback to be executed when the Promise returned by 'Promise.allSettled' resolves, providing an array of objects describing the outcome of each Promise.
    // This allows the application to wait for all email sending attempts to complete, regardless of whether they succeeded or failed, before logging their collective status.
    Promise.allSettled(emailPromises).then((results) => {
      // Declares a constant variable 'successful' and assigns it the count of Promises that were fulfilled (i.e., emails successfully sent).
      // 'filter((r) => r.status === 'fulfilled')' creates a new array with only the fulfilled results, and '.length' gets the count.
      // This counts how many emails were successfully sent, providing a metric for the operation's success.
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      // Declares a constant variable 'failed' and assigns it the count of Promises that were rejected (i.e., emails that failed to send).
      // This counts how many emails failed to send, providing a metric for the operation's failures.
      const failed = results.filter((r) => r.status === 'rejected').length;
      // Calls 'console.log()' to output a message to the server's console.
      // This logs the summary of email sending attempts, providing operational insight into the support notification process.
      console.log(
        `Support notification status: ${successful} sent, ${failed} failed`
      );
    });

    // Sets the HTTP status code of the response to 200 (OK) and sends a JSON response.
    // This indicates to the client that the support request was successfully received and processed, even if some emails might have failed internally.
    res.status(200).json({
      // Defines a boolean property 'success' with a value of 'true' in the JSON response.
      // This provides a clear flag for the client to easily determine if their request was accepted by the server.
      success: true,
      // Defines a property 'message' in the JSON response with a user-friendly confirmation string.
      // This informs the user that their message has been forwarded and that a response is expected.
      message:
        'Your message has been sent to our developers. We will get back to you soon!',
    });
  // Catches any error that was thrown in the preceding 'try' block. The 'error' object contains details about the exception.
  // This block handles unexpected errors that occur during the processing of the support request, preventing the server from crashing and allowing a controlled error response.
  } catch (error) {
    // Calls 'console.error()' to log the error message and the error object to the server's console.
    // This logs detailed error information, which is crucial for debugging and monitoring unexpected issues.
    console.error('Support Route Error:', error);
    // Sets the HTTP status code of the response to 500 (Internal Server Error) and sends a JSON response.
    // This indicates to the client that an unexpected server-side error occurred, preventing the request from being fulfilled.
    res.status(500).json({
      // Defines a property 'message' in the JSON response, using a template literal to include the error's message.
      // This provides a general error message to the client, optionally including more specific details from the error object.
      message: `Failed to process support request: ${error.message}`,
      // Defines an 'error' property in the JSON response. It uses a ternary operator:
      // if the 'NODE_ENV' environment variable is 'development', the actual 'error' object is included; otherwise, 'undefined' is included (effectively omitting it from the JSON).
      // This conditionally exposes detailed error information only in development environments for debugging, while preventing sensitive error details from being exposed in production for security reasons.
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Exports the 'router' object as the module's primary export.
// 'module.exports' is a Node.js object used to define what a module exports when it is 'require()'d by another file.
// This makes the configured Express router available for other files (e.g., the main 'app.js' file) to import and use, allowing the routes defined here to be integrated into the larger Express application.
module.exports = router;