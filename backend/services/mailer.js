/**
 * @fileoverview mailer.js
 * @module mailer
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
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: A wrapper around the email-sending capabilities, primarily using the configured Google Meet/Gmail service.
 * Why: Provides a simplified, centralized interface for dispatching emails across the application, adding robust error handling for authentication failures and network issues.
 */
const { send_ZYNC_email } = require('./googleMeet'); // WHAT: Imports the core email sending function from a local module. WHY: Centralizes the actual SMTP/API logic in one place.

const sendZyncEmail = async (to, subject, html, text) => { // WHAT: Defines an async wrapper function for sending emails. WHY: Provides a standardized signature and adds error handling on top of the underlying mailer.
    try { // WHAT: Try block wrapping the email sending process. WHY: To catch and handle authentication or network failures gracefully.

        const result = await send_ZYNC_email(to, subject, html, text); // WHAT: Awaits the execution of the actual email sending logic. WHY: We need the result to know if it succeeded before continuing.
        return result; // WHAT: Returns the result object if successful. WHY: Allows the caller to verify success or access message IDs.
    } catch (error) { // WHAT: Catch block to handle any errors thrown during sending. WHY: Prevents the application from crashing and allows for specific error handling.
        if (error.code === 'EAUTH' || (error.response && error.response.status === 401)) { // WHAT: Checks if the error is specifically an authentication failure. WHY: Distinguishes between bad credentials (which need admin fixing) and generic network errors.
            console.error('Email Authentication Failed (Bad Credentials). Email was NOT sent.'); // WHAT: Logs a specific, actionable error message. WHY: Helps developers quickly identify that SMTP/API credentials are invalid.
            return null; // WHAT: Returns null instead of throwing on auth errors. WHY: Prevents the system from failing completely if email notifications break.
        }
        console.error('Error sending email:', error); // WHAT: Logs generic errors to the console. WHY: Provides context for debugging other types of failures.
        throw error; // WHAT: Re-throws non-authentication errors. WHY: Allows upstream callers to handle other types of failures appropriately.
    }
};

module.exports = { sendZyncEmail }; // WHAT: Exports the wrapped function. WHY: Makes it available for other services to send emails.
