/**
 * @fileoverview googleMeet.js
 * @module googleMeet
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
 * What: Manages Google APIs integration to programmatically create Google Meet spaces and send emails via Gmail.
 * Why: By using an authenticated OAuth2 client to interface with Google Services, we can automate real-time communication features like instant meetings and notification emails seamlessly within our app's flows.
 */
// WHAT: Import Google API. WHY: Access Google services.
const { google } = require('googleapis');

// WHAT: Instantiate OAuth2 client. WHY: Authenticate requests.
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000"
);


// WHAT: Check refresh token. WHY: Needed for long-lived server auth.
if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN.trim() });
}

// WHAT: Create Meet space. WHY: Generates on-demand meeting links.
const create_meeting = async () => {
    try {
        console.log('Creating Google Meet space with Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');


        // WHAT: Verify refresh token. WHY: Will fail without it.
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        // WHAT: Init Meet client. WHY: Prepare service requests.
        const meet = google.meet({ version: 'v2', auth: oauth2Client });


        // WHAT: Request space creation. WHY: Creates a meeting room.
        const response = await meet.spaces.create({
            requestBody: {
                config: {
                    accessType: 'OPEN',
                    entryPointAccess: 'ALL'
                }
            }
        });

        // WHAT: Extract space data. WHY: Contains meeting details.
        const space = response.data;
        if (space.meetingUri) {
            console.log('Generated Meet Space:', space.meetingUri);
            return space.meetingUri;
        } else {
            console.error('No meetingUri in response data:', space);
            throw new Error('Failed to generate Google Meet link.');
        }

    } catch (error) {

        console.error('Error in create_meeting:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        throw error;
    }
};

// WHAT: Send email via Gmail. WHY: Automates notifications.
const send_ZYNC_email = async (to, subject, bodyHtml, bodyText = null) => {
    try {
        console.log(`Sending email to ${to}...`);

        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        // WHAT: Init Gmail client. WHY: Interface to send messages.
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // WHAT: Encode subject. WHY: Ensures correct rendering in clients.
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const boundary = `boundary_${Date.now().toString(36)}`;

        // WHAT: Store message parts. WHY: Construct raw email array.
        let messageParts;

        // WHAT: Check if plain text provided. WHY: Needs multipart email if so.
        if (bodyText) {

            const boundary = `boundary_${Date.now().toString(36)}`;
            const textBase64 = Buffer.from(bodyText).toString('base64');
            const htmlBase64 = Buffer.from(bodyHtml).toString('base64');

            messageParts = [
                `To: ${to}`,
                `Subject: ${utf8Subject}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=utf-8',
                'Content-Transfer-Encoding: base64',
                '',
                textBase64,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: base64',
                '',
                htmlBase64,
                '',
                `--${boundary}--`
            ];
        } else {

            const htmlBase64 = Buffer.from(bodyHtml).toString('base64');
            messageParts = [
                `To: ${to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                'Content-Transfer-Encoding: base64',
                `Subject: ${utf8Subject}`,
                '',
                htmlBase64
            ];
        }

        // WHAT: Join parts. WHY: Creates raw email string.
        const message = messageParts.join('\n');


        // WHAT: Base64 encode message. WHY: Gmail API expects base64url.
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // WHAT: Send message via API. WHY: Dispatches email.
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log('Email sent successfully:', res.data.id);
        return res.data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// WHAT: Export functions. WHY: Available to other parts of app.
module.exports = {
    create_meeting,
    send_ZYNC_email,
    createInstantMeet: create_meeting
};
